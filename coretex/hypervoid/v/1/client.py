import asyncio
import json
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HyperVoidClient:
    def __init__(self, host='127.0.0.1', port=8766):
        self.host = host
        self.port = port
        self.reader = None
        self.writer = None
        self.connected = False

    async def connect(self):
        try:
            self.reader, self.writer = await asyncio.open_connection(
                self.host, 
                self.port
            )
            self.connected = True
            logger.info(f"Connected to server at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False

    async def send_message(self, message):
        if not self.connected or not self.writer:
            logger.error("Not connected to server")
            return False

        try:
            self.writer.write(message.encode())
            await self.writer.drain()
            return True
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.connected = False
            return False

    def handle_server_message(self, message):
        try:
            data = json.loads(message)
            
            if "error" in data:
                logger.error(f"Server error: {data['error']}")
            elif data.get("type") == "whisper":
                logger.info(f"[Private] {data['from']}: {data['message']}")
            elif data.get("type") == "broadcast":
                logger.info(f"[Broadcast] {data['from']}: {data['message']}")
            elif data.get("command") == "help":
                logger.info("\nAvailable Commands:")
                for cmd, desc in data["available_commands"].items():
                    logger.info(f"{cmd}: {desc}")
            elif data.get("command") == "users":
                logger.info(f"\nOnline Users: {', '.join(data['users'])}")
            else:
                logger.info(f"{data.get('client_id', 'Unknown')}: {data.get('message', '')}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid message format: {message}")

    async def receive_messages(self):
        if not self.connected or not self.reader:
            logger.error("Not connected to server")
            return

        try:
            while True:
                data = await self.reader.read(8192)
                if not data:
                    break

                message = data.decode()
                self.handle_server_message(message)

        except Exception as e:
            logger.error(f"Error receiving messages: {e}")
            self.connected = False

    async def close(self):
        if self.writer:
            self.writer.close()
        self.connected = False
        logger.info("Connection closed")

def print_welcome():
    logger.info("""
HyperVoid Client - Available Commands:
/help - Show all available commands
/users - List all connected users
/whisper <user> <message> - Send private message
/broadcast <message> - Send message to all users
Just type normally to send a regular message
Type 'quit' to exit
""")

def run_client():
    loop = asyncio.get_event_loop()
    client = HyperVoidClient()

    async def client_loop():
        if not await client.connect():
            return

        print_welcome()
        receive_future = asyncio.ensure_future(client.receive_messages())

        try:
            while True:
                message = input("Enter message (or 'quit' to exit): ")
                if message.lower() == 'quit':
                    break

                if not await client.send_message(message):
                    break

        except (EOFError, KeyboardInterrupt):
            pass
        finally:
            receive_future.cancel()
            await client.close()

    try:
        loop.run_until_complete(client_loop())
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()

if __name__ == '__main__':
    run_client()
