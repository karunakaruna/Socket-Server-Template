import asyncio
import json
import logging
import ssl
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HyperVoidServer:
    def __init__(self, host='127.0.0.1', port=8766):
        self.host = host
        self.port = port
        self.clients = {}
        self.start_time = datetime(2025, 1, 6, 20, 30, 22)
        self.message_count = 0
        self.commands = {
            '/help': self.cmd_help,
            '/users': self.cmd_users,
            '/whisper': self.cmd_whisper,
            '/broadcast': self.cmd_broadcast
        }

    async def cmd_help(self, client_id, args):
        help_text = {
            "command": "help",
            "available_commands": {
                "/help": "Show this help message",
                "/users": "List all connected users",
                "/whisper <user> <message>": "Send private message to user",
                "/broadcast <message>": "Broadcast message to all users"
            }
        }
        await self.send_to_client(client_id, help_text)

    async def cmd_users(self, client_id, args):
        users = list(self.clients.values())
        response = {
            "command": "users",
            "users": users
        }
        await self.send_to_client(client_id, response)

    async def cmd_whisper(self, client_id, args):
        if len(args) < 2:
            await self.send_to_client(client_id, {"error": "Usage: /whisper <user> <message>"})
            return
        
        target_user = args[0]
        message = ' '.join(args[1:])
        target_writer = None
        
        for writer, user_id in self.clients.items():
            if user_id == target_user:
                target_writer = writer
                break
        
        if target_writer:
            response = {
                "type": "whisper",
                "from": client_id,
                "message": message
            }
            await self.send_to_client(target_user, response)
        else:
            await self.send_to_client(client_id, {"error": f"User {target_user} not found"})

    async def cmd_broadcast(self, client_id, args):
        if not args:
            await self.send_to_client(client_id, {"error": "Usage: /broadcast <message>"})
            return
        
        message = ' '.join(args)
        response = {
            "type": "broadcast",
            "from": client_id,
            "message": message
        }
        await self.broadcast_message(response)

    async def handle_client(self, reader, writer):
        client_id = f"client_{len(self.clients)}"
        self.clients[writer] = client_id
        logger.info(f"New client connected: {client_id}")

        try:
            while True:
                data = await reader.read(8192)
                if not data:
                    break

                message = data.decode()
                self.message_count += 1
                logger.info(f"Received from {client_id}: {message}")

                # Handle commands
                if message.startswith('/'):
                    parts = message[1:].split()
                    command = parts[0]
                    args = parts[1:]
                    
                    if command in self.commands:
                        await self.commands[command](client_id, args)
                    else:
                        await self.send_to_client(client_id, {"error": f"Unknown command: {command}"})
                else:
                    # Regular message
                    response = {
                        "type": "message",
                        "client_id": client_id,
                        "message": message,
                        "timestamp": datetime.now().isoformat()
                    }
                    await self.broadcast_message(response)

        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            writer.close()
            del self.clients[writer]
            logger.info(f"Client {client_id} disconnected")

    async def send_to_client(self, client_id, message):
        for writer, cid in self.clients.items():
            if cid == client_id:
                try:
                    writer.write(json.dumps(message).encode() + b'\n')
                    await writer.drain()
                except:
                    logger.error(f"Failed to send to client {client_id}")

    async def broadcast_message(self, message):
        for writer in self.clients:
            try:
                writer.write(json.dumps(message).encode() + b'\n')
                await writer.drain()
            except:
                logger.error("Failed to broadcast to a client")

    def run(self):
        loop = asyncio.get_event_loop()
        
        coro = asyncio.start_server(
            self.handle_client, 
            self.host, 
            self.port
        )
        
        server = loop.run_until_complete(coro)
        logger.info(f'Serving on {self.host}:{self.port}')

        try:
            loop.run_forever()
        except KeyboardInterrupt:
            pass

        server.close()
        loop.run_until_complete(server.wait_closed())
        loop.close()

if __name__ == '__main__':
    server = HyperVoidServer()
    server.run()
