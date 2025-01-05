import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from flask import Flask, request, jsonify, send_from_directory, send_file
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

# Set up static file handling
@app.route('/')
def serve_index():
    return send_file('public/index.html')

@app.route('/viewer')
def serve_viewer():
    return send_file('public/viewer.html')

@app.route('/key')
def serve_key():
    return send_file('public/key.html')

@app.route('/keyforge')
def serve_keyforge():
    return send_from_directory('coretex/static', 'keyforge.html')

@app.route('/<path:path>')
def serve_static(path):
    # First try coretex/static directory (so CSS references work)
    try:
        return send_from_directory('coretex/static', path)
    except:
        try:
            # Then try public directory
            return send_from_directory('public', path)
        except:
            return f"File not found: {path}", 404

# Initialize Coretex
master_key = os.environ.get('CORETEX_MASTER_KEY', 'CORETEX_MASTER_KEY_2025')
coretex = Coretex(master_key)

# User management
users = {}
num_users = 0
page_connections = {}  # Track which page each user is on

# Coretex routes
@app.route('/api/encoders', methods=['GET'])
def list_encoders():
    return jsonify(coretex.list_encoders())

@app.route('/api/create', methods=['POST'])
def create():
    return jsonify(coretex.create(request.json))

@app.route('/api/retrieve/<uuid>', methods=['GET'])
def retrieve(uuid):
    return jsonify(coretex.retrieve(uuid))

@app.route('/api/modify/<uuid>', methods=['POST'])
def modify(uuid):
    return jsonify(coretex.modify(uuid, request.json))

@app.route('/api/analyze', methods=['POST'])
def analyze():
    return jsonify(coretex.analyze_glyphs(request.json))

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
    port = int(os.environ.get('PORT', 5000))
    max_retries = 3
    current_try = 0
    
    while current_try < max_retries:
        try:
            print(f"Attempting to start server on port {port}...")
            socketio.run(app, host='0.0.0.0', port=port, debug=True)
            break
        except OSError as e:
            if "Address already in use" in str(e):
                current_try += 1
                if current_try < max_retries:
                    print(f"Port {port} is in use, trying port {port + 1}")
                    port += 1
                else:
                    print(f"Could not find an available port after {max_retries} attempts")
                    print("Please ensure no other instances of the server are running")
                    print("You can use Task Manager to close any existing Python processes")
                    sys.exit(1)
            else:
                print(f"An error occurred: {e}")
                sys.exit(1)
