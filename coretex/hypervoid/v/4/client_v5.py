import asyncio
import websockets
import json
import time
from quantum_crypto import QuantumState

class HyperVoidClient:
    def __init__(self, server_uri="ws://localhost:8767", vis_uri="ws://localhost:8768"):
        self.server_uri = server_uri
        self.vis_uri = vis_uri
        self.websocket = None
        self.vis_websocket = None
        self.username = None
        self.quantum_state = QuantumState()
        self.running = True
        
    async def connect(self):
        """Connect to both main server and visualization server"""
        try:
            # Connect to main server
            self.websocket = await websockets.connect(self.server_uri)
            print(f"Connected to server at {self.server_uri}")
            
            # Connect to visualization server
            self.vis_websocket = await websockets.connect(self.vis_uri)
            print(f"Connected to visualization server at {self.vis_uri}")
            
            # Send initial registration
            if self.username:
                await self.websocket.send(json.dumps({
                    "type": "register",
                    "username": self.username
                }))
            
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            return False
            
    async def send_state_update(self):
        """Send quantum state update to visualization server"""
        if self.vis_websocket and self.username:
            try:
                state_data = {
                    "type": "state_update",
                    "username": self.username,
                    "state": self.quantum_state.to_json()
                }
                await self.vis_websocket.send(json.dumps(state_data))
            except Exception as e:
                print(f"Error sending state update: {e}")
                
    async def handle_command(self, command):
        """Handle special commands"""
        if command.startswith('/'):
            cmd_parts = command.strip().split()
            cmd = cmd_parts[0].lower()
            
            if cmd == '/state':
                # Show current quantum state
                print("\n=== Quantum Network Status ===")
                print(self.quantum_state.foam.get_foam())  # Show quantum foam
                print(f"PHASE: {self.quantum_state.position}")
                print(f"RADIUS: {self.quantum_state.hyperradius:.1f}")
                print("=" * 40)
                await self.send_state_update()
                return True
                
            elif cmd == '/tune':
                # Tune quantum state
                if len(cmd_parts) > 1:
                    try:
                        value = float(cmd_parts[1])
                        self.quantum_state.tune(value)
                        print("\n" + "=" * 40)
                        print(f"Tuned quantum state by {value}")
                        print(self.quantum_state.foam.get_foam())  # Show updated foam
                        print("=" * 40)
                        await self.send_state_update()
                    except ValueError:
                        print("\nInvalid tune value")
                return True
                
            elif cmd == '/align':
                # Align quantum state
                if len(cmd_parts) > 1:
                    try:
                        value = float(cmd_parts[1])
                        self.quantum_state.align(value)
                        print("\n" + "=" * 40)
                        print(f"Aligned quantum state by {value}")
                        print(self.quantum_state.foam.get_foam())  # Show updated foam
                        print("=" * 40)
                        await self.send_state_update()
                    except ValueError:
                        print("\nInvalid alignment value")
                return True
                
            elif cmd == '/help':
                print("\nAvailable commands:")
                print("/help - Show this help")
                print("/state - Show quantum state")
                print("/tune <value> - Tune quantum state")
                print("/align <value> - Align quantum state")
                print("/whisper <user> <message> - Send private message")
                return True
                
            elif cmd == '/whisper':
                if len(cmd_parts) >= 3:
                    target = cmd_parts[1]
                    message = ' '.join(cmd_parts[2:])
                    try:
                        msg_data = {
                            "type": "whisper",
                            "target": target,
                            "message": message
                        }
                        await self.websocket.send(json.dumps(msg_data))
                    except Exception as e:
                        print(f"\nError sending whisper: {e}")
                else:
                    print("\nUsage: /whisper <username> <message>")
                return True
                
        return False
        
    async def receive_messages(self):
        """Receive and handle messages from server"""
        while self.running:
            try:
                message = await self.websocket.recv()
                try:
                    data = json.loads(message)
                    if isinstance(data, dict):
                        if data.get('type') == 'whisper':
                            print(f"\n[Whisper from {data['from']}] {data['message']}")
                        else:
                            print(f"\n{data.get('username', 'Anonymous')}: {data.get('message', message)}")
                    else:
                        print(f"\n{message}")
                except json.JSONDecodeError:
                    print(f"\n{message}")
            except websockets.exceptions.ConnectionClosed:
                print("\nDisconnected from server")
                break
            except Exception as e:
                print(f"\nError receiving messages: {e}")
                
    async def send_message(self, message):
        """Send a message to the server"""
        try:
            if not message:
                return
                
            # Handle commands
            if await self.handle_command(message):
                return
                
            # Regular message - evolve quantum state and send
            self.quantum_state.evolve(message)
            await self.send_state_update()
            
            # Send message with username
            msg_data = {
                "type": "message",
                "username": self.username,
                "message": message
            }
            await self.websocket.send(json.dumps(msg_data))
            
        except Exception as e:
            print(f"\nError sending message: {e}")
            
    def stop(self):
        """Stop the client"""
        self.running = False
        
    def start(self):
        """Start the client"""
        # Get username first
        self.username = input("Enter username: ")
        print(f"\nWelcome to HyperVoid, {self.username}!")
        print("Type messages to send, or commands:")
        print("  /help - Show available commands")
        print("  /state - Show quantum state")
        print("  /tune <value> - Tune quantum state")
        print("  /align <value> - Align quantum state")
        print("  /whisper <user> <message> - Send private message")
        
        async def main():
            # Connect to servers
            if not await self.connect():
                return
                
            # Create event loop
            loop = asyncio.get_event_loop()
            
            # Start message receiver
            loop.create_task(self.receive_messages())
            
            # Main message loop
            try:
                while self.running:
                    # Get input asynchronously
                    message = await loop.run_in_executor(None, input)
                    if message.lower() == 'quit':
                        break
                        
                    await self.send_message(message)
                    
            except KeyboardInterrupt:
                pass
            finally:
                self.stop()
                
        # Run the client
        asyncio.get_event_loop().run_until_complete(main())
        
if __name__ == "__main__":
    client = HyperVoidClient()
    client.start()
