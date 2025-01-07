import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class HyperVoidClient:
    def __init__(self, host='127.0.0.1', port=8767):
        self.host = host
        self.port = port
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.running = True
        logger.info(f"Initializing client for {host}:{port}")

    async def connect(self):
        retries = 3
        retry_delay = 1  # seconds
        
        for attempt in range(retries):
            try:
                logger.info(f"Attempting to connect (attempt {attempt + 1}/{retries})")
                self.reader, self.writer = await asyncio.open_connection(
                    self.host, self.port
                )
                logger.info(f"Successfully connected to {self.host}:{self.port}")
                return True
            except ConnectionRefusedError:
                logger.error(f"Connection refused (attempt {attempt + 1}/{retries})")
                if attempt < retries - 1:
                    logger.info(f"Waiting {retry_delay} seconds before retrying...")
                    await asyncio.sleep(retry_delay)
            except Exception as e:
                logger.error(f"Connection error: {str(e)}")
                if attempt < retries - 1:
                    logger.info(f"Waiting {retry_delay} seconds before retrying...")
                    await asyncio.sleep(retry_delay)
        
        logger.error("Failed to connect after all retries")
        self.running = False
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
            self.running = False
            return False

    async def receive_messages(self):
        if not self.reader:
            logger.error("Not connected to server")
            return

        while self.running:
            try:
                logger.debug("Waiting for message...")
                data = await self.reader.readline()
                if not data:
                    logger.info("Server closed connection")
                    self.running = False
                    break

                try:
                    message = data.decode().strip()
                    logger.debug(f"Received raw message: {message}")
                    
                    try:
                        parsed = json.loads(message)
                        if isinstance(parsed, dict):
                            if "error" in parsed:
                                logger.error(f"Server error: {parsed['error']}")
                                print(f"Error: {parsed['error']}")
                            elif "command" in parsed:
                                if parsed["command"] == "help":
                                    print("\nAvailable commands:")
                                    for cmd, desc in parsed["available_commands"].items():
                                        print(f"  {cmd} - {desc}")
                                else:
                                    print(f"Command response: {parsed}")
                            elif "type" in parsed:
                                if parsed["type"] == "broadcast":
                                    print(f"{parsed['client_id']}: {parsed['message']}")
                                elif parsed["type"] == "whisper":
                                    print(f"[Whisper from {parsed['from']}]: {parsed['message']}")
                                elif parsed["type"] == "quantum_state":
                                    print(f"Quantum state: {parsed['state']}")
                                elif parsed["type"] == "entangle":
                                    print(f"Entanglement: {parsed['message']}")
                            else:
                                print(f"Received: {parsed}")
                    except json.JSONDecodeError:
                        # Plain text message
                        print(message)
                        
                except Exception as e:
                    logger.error(f"Error processing message: {str(e)}")

            except asyncio.CancelledError:
                logger.info("Receive task cancelled")
                break
            except Exception as e:
                logger.error(f"Error receiving message: {str(e)}")
                self.running = False
                break

    async def cleanup(self):
        logger.info("Starting cleanup...")
        if self.writer:
            try:
                logger.info("Closing writer...")
                self.writer.close()
                await self.writer.wait_closed()
                logger.info("Writer closed successfully")
            except Exception as e:
                logger.error(f"Error during cleanup: {str(e)}")

    async def run(self):
        if not await self.connect():
            logger.error("Failed to connect, exiting...")
            await self.cleanup()
            return

        # Start receiving messages in the background
        receive_task = asyncio.create_task(self.receive_messages())
        logger.info("Started receive task")

        # Create an event to keep the client running
        keep_running = asyncio.Event()
        
        # Handle user input in a separate task
        async def handle_input():
            while self.running:
                try:
                    message = await asyncio.get_event_loop().run_in_executor(None, input)
                    if message.strip().lower() == 'quit':
                        logger.info("Quit command received")
                        self.running = False
                        keep_running.set()
                        break
                    if not await self.send_message(message):
                        logger.error("Failed to send message, exiting...")
                        self.running = False
                        keep_running.set()
                        break
                except EOFError:
                    logger.info("EOF received")
                    self.running = False
                    keep_running.set()
                    break
                except Exception as e:
                    logger.error(f"Error in input loop: {str(e)}")
                    self.running = False
                    keep_running.set()
                    break

        # Start input handling task
        input_task = asyncio.create_task(handle_input())
        
        try:
            # Wait for either task to complete or running to be False
            await keep_running.wait()
            logger.info("Main loop ending...")
            
            # Add a small delay before cleanup to ensure messages are processed
            await asyncio.sleep(1)
            
        finally:
            logger.info("Exiting main loop...")
            self.running = False
            
            # Cancel both tasks
            receive_task.cancel()
            input_task.cancel()
            
            try:
                await asyncio.gather(receive_task, input_task, return_exceptions=True)
            except asyncio.CancelledError:
                pass
                
            await self.cleanup()
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
        loop.close()
        logger.info("Event loop closed")

if __name__ == '__main__':
    main()
