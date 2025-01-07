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
        self.commands = {
            'help': self.cmd_help,
            'whisper': self.cmd_whisper,
            'list': self.cmd_list,
            'state': self.cmd_state,
            'entangle': self.cmd_entangle,
            'menu': self.cmd_menu
        }

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        client_id = str(uuid.uuid4())[:8]  # Shorter ID for readability
        peername = writer.get_extra_info('peername')
        logger.info(f"New connection from {peername} (ID: {client_id})")
        
        self.clients[client_id] = writer
        self.quantum_states[client_id] = {
            "id": client_id,
            "state_vector": {},
            "last_updated": datetime.now().isoformat()
        }
        
        # Send welcome message
        welcome = {
            "type": "system",
            "message": f"Welcome! Your client ID is {client_id}. Type /help for available commands."
        }
        await self.send_message(client_id, welcome)
        
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
        logger.info(f"Broadcasting message from {sender_id}: {message}")
        for client_id, writer in self.clients.items():
            if client_id != sender_id:
                await self.send_message(client_id, broadcast_data)
            else:
                # Echo back to sender with different format
                echo = {
                    "type": "echo",
                    "message": message,
                    "timestamp": broadcast_data["timestamp"]
                }
                await self.send_message(sender_id, echo)

    async def handle_command(self, client_id: str, command: str):
        try:
            parts = command.split()
            cmd = parts[0].lower()
            args = parts[1:] if len(parts) > 1 else []
            
            if cmd in self.commands:
                await self.commands[cmd](client_id, args)
            else:
                error = {
                    "type": "error",
                    "message": f"Unknown command '{cmd}'. Type /help for available commands."
                }
                await self.send_message(client_id, error)
                
        except Exception as e:
            logger.error(f"Error handling command from {client_id}: {e}")
            error = {
                "type": "error",
                "message": f"Error processing command: {str(e)}"
            }
            await self.send_message(client_id, error)

    async def cmd_help(self, client_id: str, args: list):
        help_data = {
            "type": "help",
            "commands": {
                "help": "Show this help message",
                "whisper <client_id> <message>": "Send a private message to another client",
                "list": "List all connected clients",
                "state": "View your quantum state",
                "entangle <client_id>": "Request quantum entanglement with another client",
                "menu": "Show available actions"
            }
        }
        await self.send_message(client_id, help_data)

    async def cmd_whisper(self, client_id: str, args: list):
        if len(args) < 2:
            error = {
                "type": "error",
                "message": "Usage: /whisper <client_id> <message>"
            }
            await self.send_message(client_id, error)
            return
            
        target_id, message = args[0], ' '.join(args[1:])
        if target_id not in self.clients:
            error = {
                "type": "error",
                "message": f"Client {target_id} not found"
            }
            await self.send_message(client_id, error)
            return
            
        whisper_data = {
            "type": "whisper",
            "from": client_id,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        await self.send_message(target_id, whisper_data)
        
        # Confirm to sender
        confirm = {
            "type": "whisper_sent",
            "to": target_id,
            "message": message
        }
        await self.send_message(client_id, confirm)

    async def cmd_list(self, client_id: str, args: list):
        client_list = {
            "type": "client_list",
            "clients": list(self.clients.keys())
        }
        await self.send_message(client_id, client_list)

    async def cmd_state(self, client_id: str, args: list):
        if client_id in self.quantum_states:
            state_data = {
                "type": "quantum_state",
                "state": self.quantum_states[client_id]
            }
            await self.send_message(client_id, state_data)

    async def cmd_entangle(self, client_id: str, args: list):
        if not args:
            error = {
                "type": "error",
                "message": "Usage: /entangle <client_id>"
            }
            await self.send_message(client_id, error)
            return
            
        target_id = args[0]
        if target_id not in self.clients:
            error = {
                "type": "error",
                "message": f"Client {target_id} not found"
            }
            await self.send_message(client_id, error)
            return
            
        pair = tuple(sorted([client_id, target_id]))
        self.entangled_pairs.add(pair)
        
        entangle_data = {
            "type": "entangle",
            "message": f"You are now entangled with {target_id}",
            "pair": list(pair)
        }
        await self.send_message(client_id, entangle_data)
        
        entangle_data["message"] = f"You are now entangled with {client_id}"
        await self.send_message(target_id, entangle_data)

    async def cmd_menu(self, client_id: str, args: list):
        menu_data = {
            "type": "menu",
            "actions": [
                "Send a message (just type your message)",
                "Send a private message (/whisper)",
                "View quantum state (/state)",
                "Entangle with another client (/entangle)",
                "List connected clients (/list)",
                "View help (/help)"
            ]
        }
        await self.send_message(client_id, menu_data)

async def main():
    server = HyperVoidServer()
    server_task = await asyncio.start_server(
        server.handle_client, server.host, server.port)

    addr = server_task.sockets[0].getsockname()
    logger.info(f'Serving on {addr}')

    try:
        await server_task.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
        server.running = False
        server_task.close()
        await server_task.wait_closed()
        logger.info("Server stopped")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
