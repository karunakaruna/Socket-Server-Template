from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import uuid
import base64
import os
import threading
from datetime import datetime, timedelta
import asyncio
import websockets

class Coretex:
    def __init__(self, master_key):
        self.master_key = master_key
        self.store = {}
        self.ephemera_store = {}
        self.whisper_store = {}
        self.current_time = "2025-01-04T20:28:36-08:00"
        self.default_encoder = "ascii"
        self.ws_thread = None

    def _encrypt(self, data, encryption_key):
        """Encrypt data using base64"""
        try:
            combined = f"{data}:{encryption_key}"
            return base64.b64encode(combined.encode()).decode()
        except Exception as e:
            print(f"Encryption error: {e}")
            raise

    def _decrypt(self, encrypted_data, decryption_key):
        """Decrypt data using base64"""
        try:
            decoded = base64.b64decode(encrypted_data).decode()
            data, key = decoded.split(":")
            if key != decryption_key:
                raise ValueError("Invalid key")
            return data
        except Exception as e:
            print(f"Decryption error: {e}")
            raise

    def generate_encryption_key(self):
        # Generate a secure random key
        key_bytes = os.urandom(32)
        return base64.b64encode(key_bytes).decode('utf-8')

    def create_object(self, data, obj_type="object"):
        encryption_key = self.generate_encryption_key()
        
        if obj_type == "object":
            obj_uuid = str(uuid.uuid4())
            obj_data = {
                "type": "object",
                "uuid": obj_uuid,
                "data": {
                    "name": data.get("name", "Unnamed Object"),
                    "description": data.get("description", ""),
                    "created": self.current_time,
                    "modified": self.current_time,
                    "age": 0,
                    "previous_owners": [],
                    "current_owner": data.get("creator_id", "anonymous"),
                    "tags": data.get("tags", []),
                    "attributes": data.get("attributes", {}),
                    "content": data.get("content", {})
                },
                "meta": {
                    "modifications": [],
                    "access_count": 0,
                    "encryption_version": "1.0",
                    "checksum": "sha256_" + uuid.uuid4().hex
                }
            }
            encrypted_data = self._encrypt(json.dumps(obj_data), encryption_key)
            self.store[obj_uuid] = {
                "data": encrypted_data, 
                "type": "object",
                "encryption_key": encryption_key
            }
            return {
                "uuid": obj_uuid, 
                "encryption_key": encryption_key,
                "type": "object"
            }

        elif obj_type == "ephemera":
            obj_data = {
                "type": "ephemera",
                "data": {
                    "name": data.get("name", "Temporary Note"),
                    "content": data.get("content", ""),
                    "created": self.current_time,
                    "deletion_time": (datetime.fromisoformat(self.current_time) + 
                                   timedelta(seconds=data.get("ttl_seconds", 86400))).isoformat(),
                    "ttl_seconds": data.get("ttl_seconds", 86400),
                    "creator": data.get("creator_id", "anonymous"),
                    "access_limit": data.get("access_limit", 5),
                    "current_access_count": 0,
                    "tags": data.get("tags", []),
                    "attributes": data.get("attributes", {})
                },
                "meta": {
                    "modifications": [],
                    "encryption_version": "1.0",
                    "checksum": "sha256_" + uuid.uuid4().hex
                }
            }
            ephemera_id = str(uuid.uuid4())
            encrypted_data = self._encrypt(json.dumps(obj_data), encryption_key)
            self.ephemera_store[ephemera_id] = {
                "data": encrypted_data, 
                "type": "ephemera",
                "encryption_key": encryption_key
            }
            return {
                "uuid": ephemera_id, 
                "encryption_key": encryption_key,
                "type": "ephemera"
            }

        elif obj_type == "whisper":
            recipient_key = self.generate_encryption_key()  # Generate separate key for recipient
            obj_data = {
                "type": "whisper",
                "data": {
                    "message": self._encrypt(data.get("message", ""), encryption_key),
                    "created": self.current_time,
                    "sender": data.get("sender_id", "anonymous"),
                    "recipient": data.get("recipient_id", "anyone"),
                    "read_time": None,
                    "encryption_keys": {
                        "public_key": recipient_key,
                        "nonce": uuid.uuid4().hex
                    },
                    "deletion_trigger": "on_read"
                },
                "meta": {
                    "status": "unread",
                    "encryption_version": "1.0",
                    "checksum": "sha256_" + uuid.uuid4().hex
                }
            }
            whisper_id = str(uuid.uuid4())
            encrypted_data = self._encrypt(json.dumps(obj_data), encryption_key)
            self.whisper_store[whisper_id] = {
                "data": encrypted_data, 
                "type": "whisper",
                "encryption_key": encryption_key,
                "recipient_key": recipient_key
            }
            return {
                "uuid": whisper_id, 
                "encryption_key": encryption_key,
                "recipient_key": recipient_key,
                "type": "whisper"
            }

    def retrieve_object(self, obj_uuid, encryption_key, obj_type="object"):
        store = {
            "object": self.store,
            "ephemera": self.ephemera_store,
            "whisper": self.whisper_store
        }.get(obj_type)

        if not store or obj_uuid not in store:
            return None

        stored_obj = store[obj_uuid]
        if stored_obj["encryption_key"] != encryption_key:
            return {"error": "Invalid encryption key"}

        try:
            obj = json.loads(self._decrypt(stored_obj["data"], encryption_key))
        except Exception:
            return {"error": "Decryption failed"}

        if obj_type == "ephemera":
            if datetime.fromisoformat(obj["data"]["deletion_time"]) < datetime.fromisoformat(self.current_time):
                del self.ephemera_store[obj_uuid]
                return {"error": "Object expired"}
            obj["data"]["current_access_count"] += 1
            if obj["data"]["current_access_count"] >= obj["data"]["access_limit"]:
                del self.ephemera_store[obj_uuid]
                return {"message": "Final access", "data": obj}
            encrypted_data = self._encrypt(json.dumps(obj), encryption_key)
            stored_obj["data"] = encrypted_data
            return obj

        elif obj_type == "whisper":
            if obj["meta"]["status"] == "read":
                return {"error": "Message already read"}
            obj["data"]["read_time"] = self.current_time
            obj["meta"]["status"] = "read"
            message = self._decrypt(obj["data"]["message"], encryption_key)
            del self.whisper_store[obj_uuid]
            return {"message": message, "meta": obj["meta"]}

        return obj

    def modify_object(self, obj_uuid, encryption_key, modifications, obj_type="object"):
        if obj_type != "object":
            return {"error": "Only standard objects can be modified"}

        if obj_uuid not in self.store:
            return None

        stored_obj = self.store[obj_uuid]
        if stored_obj["encryption_key"] != encryption_key:
            return {"error": "Invalid encryption key"}

        try:
            obj = json.loads(self._decrypt(stored_obj["data"], encryption_key))
        except Exception:
            return {"error": "Decryption failed"}
        
        for key, value in modifications.items():
            if key in obj["data"]:
                obj["data"][key] = value

        obj["data"]["modified"] = self.current_time
        obj["meta"]["modifications"].append({
            "timestamp": self.current_time,
            "keys": list(modifications.keys())
        })

        encrypted_data = self._encrypt(json.dumps(obj), encryption_key)
        stored_obj["data"] = encrypted_data
        return obj

    def start_websocket_client(self):
        """Start WebSocket client in a separate thread"""
        async def run_websocket():
            uri = "ws://localhost:3001"
            while True:
                try:
                    async with websockets.connect(uri) as websocket:
                        print("Connected to Node.js server")
                        await websocket.send(json.dumps({
                            "type": "connect",
                            "service": "coretex"
                        }))
                        
                        while True:
                            try:
                                message = await websocket.recv()
                                data = json.loads(message)
                                if data.get('type') == 'lock_update':
                                    lock_id = data.get('lock_id')
                                    if lock_id in self.store:
                                        await websocket.send(json.dumps({
                                            'type': 'lock_state',
                                            'lock_id': lock_id,
                                            'encrypted': self.store[lock_id]['encrypted']
                                        }))
                            except Exception as e:
                                print(f"Error handling message: {e}")
                                break
                except websockets.exceptions.ConnectionClosed:
                    print("Connection to Node.js server closed")
                    await asyncio.sleep(5)  # Wait before reconnecting
                except Exception as e:
                    print(f"WebSocket error: {e}")
                    await asyncio.sleep(5)  # Wait before reconnecting

        def run_async_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(run_websocket())

        if self.ws_thread is None or not self.ws_thread.is_alive():
            self.ws_thread = threading.Thread(target=run_async_loop, daemon=True)
            self.ws_thread.start()

# Initialize Flask app and Coretex instance
app = Flask(__name__, static_url_path='', static_folder='static')
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

master_key = "CORETEX_MASTER_KEY_2025"
coretex = Coretex(master_key)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Start WebSocket client when the app starts
@app.before_request
def before_request():
    if not hasattr(app, '_websocket_started'):
        app._websocket_started = True
        coretex.start_websocket_client()

@app.route('/api/lock/create', methods=['POST', 'OPTIONS'])
def create_lock():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        if not data or 'message' not in data or 'key' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400
            
        message = data['message']
        key = data['key']
        
        lock_id = str(uuid.uuid4())
        encrypted_data = coretex._encrypt(message, key)
        
        # Store the lock data
        coretex.store[lock_id] = {
            'encrypted': encrypted_data,
            'key': key,
            'created': coretex.current_time
        }
        
        return jsonify({
            'status': 'success',
            'lock_id': lock_id,
            'encrypted': encrypted_data
        })
    except Exception as e:
        print(f"Error creating lock: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/lock/<lock_id>/decrypt', methods=['POST', 'OPTIONS'])
def decrypt_lock(lock_id):
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        if not data or 'key' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing key'
            }), 400
            
        lock_data = coretex.store.get(lock_id)
        if not lock_data:
            return jsonify({
                'status': 'error',
                'message': 'Lock not found'
            }), 404
            
        decrypted = coretex._decrypt(lock_data['encrypted'], data['key'])
        
        return jsonify({
            'status': 'success',
            'decrypted': decrypted
        })
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': 'Invalid key'
        }), 403
    except Exception as e:
        print(f"Error decrypting lock: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

if __name__ == '__main__':
    app.run(port=5000, debug=True)
