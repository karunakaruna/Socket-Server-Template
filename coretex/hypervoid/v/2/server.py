import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Set, Any, Optional

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidServer:
    def __init__(self, host='127.0.0.1', port=8767):
        self.host = host
        self.port = port
        self.clients: Dict[str, asyncio.StreamWriter] = {}
        self.quantum_states: Dict[str, Dict[str, Any]] = {}
        self.entangled_pairs: Set[tuple] = set()
        self.running = True

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        client_id = str(uuid.uuid4())
        peername = writer.get_extra_info('peername')
        logger.info(f"New connection from {peername} (ID: {client_id})")
        
        self.clients[client_id] = writer
        self.quantum_states[client_id] = {
            "id": client_id,
            "state_vector": {},
            "last_updated": datetime.now().isoformat()
        }
        
        try:
            while self.running:
                try:
                    data = await reader.readline()
                    if not data:
                        break
                        
                    message = data.decode().strip()
                    logger.debug(f"Received from {client_id}: {message}")
                    
                    if message.startswith('/'):
                        await self.handle_command(client_id, message[1:])
                    else:
                        await self.broadcast_message(client_id, message)
                        
                except ConnectionError as e:
                    logger.error(f"Connection error with {client_id}: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
            
        finally:
            logger.info(f"Client {client_id} disconnected")
            writer.close()
            try:
                await writer.wait_closed()
            except:
                pass
            self.clients.pop(client_id, None)
            self.quantum_states.pop(client_id, None)
            # Remove any entangled pairs involving this client
            self.entangled_pairs = {pair for pair in self.entangled_pairs 
                                  if client_id not in pair}

    async def send_message(self, client_id: str, message: Any):
        if client_id in self.clients:
            writer = self.clients[client_id]
            try:
                if isinstance(message, (dict, list)):
                    data = json.dumps(message)
                else:
                    data = str(message)
                writer.write(data.encode() + b'\n')
                await writer.drain()
                logger.debug(f"Sent to {client_id}: {data}")
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")
                
    async def broadcast_message(self, sender_id: str, message: str):
        broadcast_data = {
            "type": "broadcast",
            "client_id": sender_id,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        for client_id, writer in self.clients.items():
            if client_id != sender_id:
                await self.send_message(client_id, broadcast_data)

    async def handle_command(self, client_id: str, command: str):
        try:
            parts = command.split()
            cmd = parts[0].lower()
            args = parts[1:] if len(parts) > 1 else []
            
            handlers = {
                'help': self.cmd_help,
                'users': self.cmd_users,
                'whisper': self.cmd_whisper,
                'broadcast': self.cmd_broadcast,
                'state': self.cmd_state,
                'entangle': self.cmd_entangle
            }
            
            if cmd in handlers:
                await handlers[cmd](client_id, args)
            else:
                await self.send_message(client_id, {
                    "error": f"Unknown command: {cmd}"
                })
                
        except Exception as e:
            logger.error(f"Error handling command from {client_id}: {e}")
            await self.send_message(client_id, {
                "error": f"Error processing command: {str(e)}"
            })

    async def cmd_help(self, client_id: str, args: list):
        commands = {
            "/help": "Show this help message",
            "/users": "List connected users",
            "/whisper <user> <message>": "Send a private message",
            "/broadcast <message>": "Send a message to all users",
            "/state": "View your quantum state",
            "/entangle <user>": "Entangle with another user"
        }
        await self.send_message(client_id, {
            "command": "help",
            "available_commands": commands
        })

    async def cmd_users(self, client_id: str, args: list):
        users = list(self.clients.keys())
        await self.send_message(client_id, {
            "command": "users",
            "users": users
        })

    async def cmd_whisper(self, client_id: str, args: list):
        if len(args) < 2:
            await self.send_message(client_id, {
                "error": "Usage: /whisper <user> <message>"
            })
            return
            
        target_id = args[0]
        message = ' '.join(args[1:])
        
        if target_id in self.clients:
            await self.send_message(target_id, {
                "type": "whisper",
                "from": client_id,
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
        else:
            await self.send_message(client_id, {
                "error": f"User {target_id} not found"
            })

    async def cmd_broadcast(self, client_id: str, args: list):
        if not args:
            await self.send_message(client_id, {
                "error": "Usage: /broadcast <message>"
            })
            return
            
        message = ' '.join(args)
        await self.broadcast_message(client_id, message)

    async def cmd_state(self, client_id: str, args: list):
        if client_id in self.quantum_states:
            await self.send_message(client_id, {
                "type": "quantum_state",
                "state": self.quantum_states[client_id]
            })

    async def cmd_entangle(self, client_id: str, args: list):
        if not args:
            await self.send_message(client_id, {
                "error": "Usage: /entangle <user>"
            })
            return
            
        target_id = args[0]
        if target_id not in self.clients:
            await self.send_message(client_id, {
                "error": f"User {target_id} not found"
            })
            return
            
        if (client_id, target_id) not in self.entangled_pairs and \
           (target_id, client_id) not in self.entangled_pairs:
            self.entangled_pairs.add((client_id, target_id))
            entangle_key = str(uuid.uuid4())
            
            for user_id in (client_id, target_id):
                await self.send_message(user_id, {
                    "type": "entangle",
                    "entangle_key": entangle_key,
                    "message": f"Entangled with {target_id if user_id == client_id else client_id}"
                })

    async def run(self):
        try:
            server = await asyncio.start_server(
                self.handle_client,
                self.host,
                self.port,
                reuse_address=True
            )
            logger.info(f"Server running on {self.host}:{self.port}")
            await asyncio.Event().wait()  # Run forever
        except Exception as e:
            logger.error(f"Server error: {e}")
            self.running = False

def main():
    server = HyperVoidServer()
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(server.run())
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()

if __name__ == '__main__':
    main()
