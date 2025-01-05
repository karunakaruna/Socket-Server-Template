import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from flask import Flask, request, jsonify, send_from_directory, send_file, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
import json
import uuid
from coretex.coretex import Coretex
from coretex.encoders import EncoderRegistry
from werkzeug.middleware.shared_data import SharedDataMiddleware

# Initialize Flask app
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Coretex
master_key = os.environ.get('CORETEX_MASTER_KEY', 'CORETEX_MASTER_KEY_2025')
coretex = Coretex(master_key)

# Routes for static files
@app.route('/')
def serve_index():
    response = make_response(send_file('public/index.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/viewer')
def serve_viewer():
    response = make_response(send_file('public/viewer.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/key')
def serve_key():
    response = make_response(send_file('public/key.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/keyforge')
def serve_keyforge():
    response = make_response(send_file('public/keyforge.html'))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/coretex/<path:path>')
def serve_coretex_static(path):
    response = make_response(send_from_directory('coretex/static', path))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/<path:path>')
def serve_static(path):
    response = None
    try:
        # Try public directory
        response = make_response(send_from_directory('public', path))
    except:
        return f"File not found: {path}", 404
    
    if response:
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

# Coretex API routes
@app.route('/api/encoders', methods=['GET'])
def list_encoders():
    """List available encoders"""
    return jsonify(EncoderRegistry.list_encoders())

@app.route('/api/create', methods=['POST'])
def create():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Get encoder preference
        encoder_type = data.pop("encoder", "box")
        if encoder_type not in EncoderRegistry.list_encoders():
            return jsonify({"error": "Invalid encoder type"}), 400
            
        coretex.default_encoder = encoder_type
        
        obj_type = data.pop("type", "object")
        result = coretex.create_object(data, obj_type)
        
        # Add example of how the encoded data looks
        if "uuid" in result:
            obj = coretex.store.get(result["uuid"])
            if obj:
                result["example"] = obj["data"]
        
        return jsonify(result), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/retrieve/<uuid>', methods=['GET'])
def retrieve(uuid):
    try:
        encryption_key = request.args.get('key')
        if not encryption_key:
            return jsonify({"error": "No encryption key provided"}), 400
            
        obj_type = request.args.get('type', 'object')
        result = coretex.retrieve_object(uuid, encryption_key, obj_type)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/modify/<uuid>', methods=['POST'])
def modify(uuid):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        encryption_key = data.pop('key', None)
        if not encryption_key:
            return jsonify({"error": "No encryption key provided"}), 400
            
        obj_type = data.pop('type', 'object')
        result = coretex.modify_object(uuid, encryption_key, data, obj_type)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_glyphs():
    try:
        data = request.get_json()
        if not data or 'glyphs' not in data:
            return jsonify({"error": "No glyphs provided"}), 400
            
        encoder_name = data.get('encoder')
        result = EncoderRegistry.decode(data['glyphs'], encoder_name)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# User management
users = {}
num_users = 0
page_connections = {}  # Track which page each user is on

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    global num_users
    num_users += 1
    print(f"Client connected from page: {request.referrer}. Total users: {num_users}")

@socketio.on('disconnect')
def handle_disconnect():
    global num_users
    if hasattr(request, 'sid') and request.sid in users:
        user_id = users[request.sid]['id']
        page = users[request.sid]['page']
        if page in page_connections:
            page_connections[page].remove(user_id)
        del users[request.sid]
        num_users -= 1
        emit('user_disconnected', {'userId': user_id}, broadcast=True)
        print(f"User {user_id} disconnected from page {page}. Total users: {num_users}")

@socketio.on('initialize')
def handle_initialize(data):
    user_id = str(uuid.uuid4())
    page = data.get('page', 'unknown')  # Track which page the user is on
    users[request.sid] = {
        'id': user_id,
        'name': data.get('name', f'User_{user_id[:8]}'),
        'lastSeen': datetime.now().isoformat(),
        'listeningTo': [],
        'page': page
    }
    page_connections.setdefault(page, set()).add(user_id)
    
    # Send only relevant users based on the page
    page_users = {sid: user for sid, user in users.items() if user['page'] == page}
    emit('initialized', {'userId': user_id, 'users': page_users})
    
    # Broadcast new user to others on the same page
    emit('user_connected', {'user': users[request.sid]}, broadcast=True, include_self=False)

@socketio.on('coordinates')
def handle_coordinates(data):
    if request.sid in users:
        user_id = users[request.sid]['id']
        emit('coordinate_update', {
            'senderId': user_id,
            'coordinates': data['coordinates']
        }, broadcast=True)

@socketio.on('updatelisteningto')
def handle_listening_update(data):
    if request.sid in users and 'newListeningTo' in data:
        users[request.sid]['listeningTo'] = data['newListeningTo']
        emit('user_update', {
            'userId': users[request.sid]['id'],
            'update': {'listeningTo': data['newListeningTo']}
        }, broadcast=True)

if __name__ == '__main__':
    start_port = int(os.environ.get('PORT', 5000))
    port = start_port
    max_retries = 5
    
    while max_retries > 0:
        try:
            print(f"Starting server on port {port}...")
            socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
            break
        except OSError as e:
            if "Address already in use" in str(e):
                print(f"Port {port} is in use, trying port {port + 1}")
                port += 1
                max_retries -= 1
                if max_retries == 0:
                    print("Could not find an available port")
                    sys.exit(1)
            else:
                print(f"Error: {e}")
                sys.exit(1)
