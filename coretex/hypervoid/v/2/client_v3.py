import asyncio
import json
import logging
import sys
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidClient:
    def __init__(self, host='127.0.0.1', port=8767):
        self.host = host
        self.port = port
        self.reader = None
        self.writer = None
        self.running = True
        self.reconnect_delay = 1  # Start with 1 second delay
        self.max_reconnect_delay = 30  # Maximum delay between reconnection attempts
        
    async def connect(self):
        """Connect to the server"""
        try:
            self.reader, self.writer = await asyncio.open_connection(self.host, self.port)
            logger.info(f"Connected to {self.host}:{self.port}")
            self.reconnect_delay = 1  # Reset delay on successful connection
            return True
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
            
    async def reconnect(self):
        """Attempt to reconnect to the server"""
        logger.info("Attempting to reconnect...")
        while self.running:
            if await self.connect():
                return True
            logger.info(f"Reconnection failed, waiting {self.reconnect_delay} seconds...")
            await asyncio.sleep(self.reconnect_delay)
            self.reconnect_delay = min(self.reconnect_delay * 2, self.max_reconnect_delay)
        return False
            
    async def start(self):
        """Start the client"""
        if not await self.connect():
            logger.error("Failed to connect to server")
            return
            
        try:
            # Send /help command on startup
            await self.send_message("/help")
            
            # Start input and output tasks
            input_task = asyncio.ensure_future(self.handle_input())
            output_task = asyncio.ensure_future(self.handle_output())
            
            # Wait for either task to complete
            done, pending = await asyncio.wait(
                [input_task, output_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
                
        except Exception as e:
            logger.error(f"Error in client: {e}")
        finally:
            self.running = False
            if self.writer:
                self.writer.close()
                try:
                    await self.writer.wait_closed()
                except:
                    pass
                    
    async def handle_input(self):
        """Handle user input"""
        while self.running:
            try:
                message = await self.get_input()
                if message.lower() == '/quit':
                    self.running = False
                    break
                elif message.lower() == '/reconnect':
                    if await self.reconnect():
                        logger.info("Reconnected successfully")
                    else:
                        logger.error("Failed to reconnect")
                else:
                    await self.send_message(message)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error handling input: {e}")
                if not await self.reconnect():
                    break
                    
    async def handle_output(self):
        """Handle server messages"""
        while self.running:
            try:
                data = await self.reader.readline()
                if not data:
                    logger.info("Server closed connection")
                    if not await self.reconnect():
                        break
                    continue
                    
                message = data.decode().strip()
                try:
                    # Try to parse as JSON
                    data = json.loads(message)
                    if isinstance(data, dict):
                        if data.get('type') == 'system':
                            print(f"System: {data['message']}")
                        elif data.get('type') == 'broadcast':
                            print(f"{data['client_id']}: {data['message']}")
                        elif data.get('type') == 'whisper':
                            print(f"[Whisper from {data['from']}]: {data['message']}")
                        elif data.get('type') == 'error':
                            print(f"Error: {data['message']}")
                        elif data.get('type') == 'help':
                            print("\nAvailable commands:")
                            for cmd, desc in data['commands'].items():
                                print(f"/{cmd}: {desc}")
                        else:
                            print(f"Server: {message}")
                except json.JSONDecodeError:
                    print(f"Server: {message}")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error handling output: {e}")
                if not await self.reconnect():
                    break
                    
    async def send_message(self, message):
        """Send a message to the server"""
        try:
            self.writer.write(f"{message}\n".encode())
            await self.writer.drain()
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            if not await self.reconnect():
                self.running = False
                
    async def get_input(self):
        """Get input from the user"""
        return await asyncio.get_event_loop().run_in_executor(None, input)

def main():
    # Use ProactorEventLoop on Windows
    if sys.platform == 'win32':
        loop = asyncio.ProactorEventLoop()
        asyncio.set_event_loop(loop)
    else:
        loop = asyncio.get_event_loop()
        
    client = HyperVoidClient()
    try:
        loop.run_until_complete(client.start())
    except KeyboardInterrupt:
        logger.info("Client shutting down...")
        client.running = False
    finally:
        loop.close()

if __name__ == '__main__':
    main()
