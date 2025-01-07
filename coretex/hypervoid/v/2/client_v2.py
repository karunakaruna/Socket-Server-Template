import asyncio
import json
import logging
import sys
from datetime import datetime

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class HyperVoidClient:
    def __init__(self, host='127.0.0.1', port=8767):
        self.host = host
        self.port = port
        self.reader = None
        self.writer = None
        self.running = True
        logger.info(f"Initializing client for {host}:{port}")

    async def connect(self):
        try:
            logger.info("Attempting to connect...")
            self.reader, self.writer = await asyncio.open_connection(self.host, self.port)
            logger.info(f"Successfully connected to {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            return False

    async def send_message(self, message: str):
        if not self.writer:
            logger.error("Not connected to server")
            return False

        try:
            logger.debug(f"Sending message: {message}")
            self.writer.write(f"{message}\n".encode())
            await self.writer.drain()
            logger.debug("Message sent successfully")
            return True
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            return False

    async def receive_messages(self):
        while self.running:
            try:
                if not self.reader:
                    logger.error("Not connected to server")
                    break

                data = await self.reader.readline()
                if not data:
                    logger.info("Server closed connection")
                    break

                message = data.decode().strip()
                logger.debug(f"Received: {message}")
                print(f"Server: {message}")

            except Exception as e:
                logger.error(f"Error receiving message: {str(e)}")
                break

        self.running = False

    async def run(self):
        if not await self.connect():
            logger.error("Failed to connect")
            return

        # Start receiving messages
        loop = asyncio.get_event_loop()
        receive_future = asyncio.ensure_future(self.receive_messages())
        
        try:
            # Keep client running
            while self.running:
                try:
                    # Get input (non-blocking)
                    message = await loop.run_in_executor(None, input, "Enter message: ")
                    message = message.strip()
                    
                    if message:
                        if message.lower() == 'quit':
                            logger.info("Quit command received")
                            break
                            
                        if not await self.send_message(message):
                            logger.error("Failed to send message")
                            break
                            
                except EOFError:
                    logger.info("EOF received")
                    break
                except Exception as e:
                    logger.error(f"Error in input loop: {str(e)}")
                    break
                    
        finally:
            logger.info("Cleaning up...")
            self.running = False
            
            # Cancel receive task
            receive_future.cancel()
            try:
                await receive_future
            except:
                pass
                
            # Close connection
            if self.writer:
                try:
                    self.writer.close()
                except Exception as e:
                    logger.error(f"Error during cleanup: {str(e)}")
            
            logger.info("Client shutdown complete")

def main():
    client = HyperVoidClient()
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(client.run())
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error(f"Main loop error: {str(e)}")
    finally:
        try:
            loop.close()
        except:
            pass
        logger.info("Event loop closed")

if __name__ == '__main__':
    main()
