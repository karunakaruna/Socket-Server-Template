import json
import uuid
import base64
import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from .encoders import EncoderRegistry

class Coretex:
    def __init__(self, master_key):
        self.master_key = master_key
        self.store = {}
        self.ephemera_store = {}
        self.whisper_store = {}
        self.current_time = "2025-01-04T20:28:36-08:00"
        self.default_encoder = "ascii"  # Use ASCII encoder by default

    def _encrypt(self, data, encryption_key):
        """Encrypt data using the specified encoder"""
        # Combine master key and encryption key
        combined_key = self.master_key + encryption_key
        
        # Add encryption metadata
        data_with_key = {
            "data": data,
            "key": encryption_key,
            "timestamp": self.current_time
        }
        
        # Get encoder and encode
        encoder = EncoderRegistry.get_encoder(self.default_encoder)
        return encoder.encode(data_with_key)

    def _decrypt(self, glyphs, encryption_key):
        """Decrypt data using the specified encoder"""
        # Get encoder and decode
        encoder = EncoderRegistry.get_encoder(self.default_encoder)
        decoded = encoder.decode(glyphs)
        
        # Verify encryption key
        if decoded["key"] != encryption_key:
            raise ValueError("Invalid encryption key")
            
        return decoded["data"]

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
            encrypted_data = self._encrypt(obj_data, encryption_key)
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
            encrypted_data = self._encrypt(obj_data, encryption_key)
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
            encrypted_data = self._encrypt(obj_data, encryption_key)
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
            obj = self._decrypt(stored_obj["data"], encryption_key)
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
            encrypted_data = self._encrypt(obj, encryption_key)
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
            obj = self._decrypt(stored_obj["data"], encryption_key)
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

        encrypted_data = self._encrypt(obj, encryption_key)
        stored_obj["data"] = encrypted_data
        return obj

# Initialize Flask app and Coretex instance
app = Flask(__name__, static_url_path='', static_folder='static')
CORS(app)
master_key = "CORETEX_MASTER_KEY_2025"
coretex = Coretex(master_key)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/keyforge')
def keyforge():
    return send_from_directory('static', 'keyforge.html')

@app.route('/encoders', methods=['GET'])
def list_encoders():
    """List available encoders"""
    return jsonify(EncoderRegistry.list_encoders())

@app.route('/create', methods=['POST'])
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
                result["example"] = obj["data"]  # Remove truncation
        
        return jsonify(result), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/retrieve/<uuid>', methods=['GET'])
def retrieve(uuid):
    try:
        obj_type = request.args.get('type', 'object')
        encryption_key = request.args.get('key')
        if not encryption_key:
            return jsonify({"error": "Encryption key required"}), 400

        result = coretex.retrieve_object(uuid, encryption_key, obj_type)
        if not result:
            return jsonify({"error": "Object not found"}), 404
        if "error" in result:
            return jsonify(result), 403
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/modify/<uuid>', methods=['POST'])
def modify(uuid):
    try:
        modifications = request.get_json()
        if not modifications:
            return jsonify({"error": "No modifications provided"}), 400
        
        encryption_key = request.args.get('key')
        if not encryption_key:
            return jsonify({"error": "Encryption key required"}), 400

        result = coretex.modify_object(uuid, encryption_key, modifications)
        if not result:
            return jsonify({"error": "Object not found"}), 404
        if "error" in result:
            return jsonify(result), 403
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_glyphs():
    """Analyze encoded glyph message"""
    try:
        data = request.get_json()
        glyphs = data.get('glyphs')
        if not glyphs:
            return jsonify({"error": "No glyphs provided"}), 400
            
        # Try each encoder
        results = {}
        for name in EncoderRegistry.list_encoders():
            try:
                encoder = EncoderRegistry.get_encoder(name)
                decoded = encoder.decode(glyphs)
                results[name] = {
                    "success": True,
                    "decoded": decoded,
                    "length": {
                        "glyphs": len(glyphs),
                        "bytes": len(glyphs.encode('utf-8')),
                        "chars": sum(1 for c in glyphs if not c.isspace())
                    }
                }
            except:
                results[name] = {
                    "success": False,
                    "error": "Failed to decode with this encoder"
                }
                
        return jsonify({
            "results": results,
            "analysis": {
                "total_length": len(glyphs),
                "byte_length": len(glyphs.encode('utf-8')),
                "char_count": sum(1 for c in glyphs if not c.isspace()),
                "unicode_ranges": [
                    f"U+{ord(c):04X}" for c in sorted(set(glyphs))
                ]
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
