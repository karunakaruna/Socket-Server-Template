import asyncio
import websockets
import json
import tkinter as tk
from tkinter import ttk, scrolledtext
import random
import numpy as np
from quantum_crypto import QuantumState
import time

class HyperVoidClient:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("HyperVoid Client v8.0.0")
        
        # Configure style
        style = ttk.Style()
        style.configure("TButton", padding=5)
        
        # Client state
        self.websocket = None
        self.username = None
        self.quantum_state = QuantumState()
        self.connected_users = set()
        self.loop = None
        
        # Setup UI
        self.setup_gui()
        
        # Commands
        self.commands = {
            '/help': (self.cmd_help, 'Show this help message'),
            '/w': (self.cmd_whisper, 'Send private message: /w <username> <message>'),
            '/users': (self.cmd_users, 'List connected users'),
            '/tune': (self.cmd_tune, 'Tune quantum state: /tune <x> <y> <z>'),
            '/align': (self.cmd_align, 'Align with user: /align <username>'),
            '/state': (self.cmd_state, 'Show current quantum state'),
            '/clear': (self.cmd_clear, 'Clear chat window')
        }
        
    def setup_gui(self):
        # Main container
        main_frame = ttk.Frame(self.root, padding="5")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Chat area
        chat_frame = ttk.LabelFrame(main_frame, text="Chat", padding="5")
        chat_frame.pack(fill=tk.BOTH, expand=True)
        
        self.chat_text = scrolledtext.ScrolledText(
            chat_frame,
            wrap=tk.WORD,
            height=20,
            bg='black',
            fg='green'
        )
        self.chat_text.pack(fill=tk.BOTH, expand=True)
        
        # Input area
        input_frame = ttk.Frame(main_frame)
        input_frame.pack(fill=tk.X, pady=5)
        
        self.input_entry = ttk.Entry(input_frame)
        self.input_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.input_entry.bind('<Return>', self.send_message)
        
        ttk.Button(
            input_frame,
            text="Send",
            command=lambda: self.send_message(None)
        ).pack(side=tk.RIGHT, padx=5)
        
        # Status bar
        self.status_var = tk.StringVar()
        self.status_var.set("Disconnected")
        status_label = ttk.Label(
            main_frame,
            textvariable=self.status_var,
            font=("Courier", 10)
        )
        status_label.pack(pady=5)
        
        # Initial help message
        self.system_message(
            "Welcome to HyperVoid v8.0.0!\n"
            "Type /help for available commands.\n"
        )
        
    def system_message(self, message, color='yellow'):
        """Display system message"""
        self.chat_text.insert(tk.END, f"[SYSTEM] {message}\n", color)
        self.chat_text.see(tk.END)
        
    def chat_message(self, username, message, color='white'):
        """Display chat message"""
        self.chat_text.insert(tk.END, f"[{username}] {message}\n", color)
        self.chat_text.see(tk.END)
        
    def whisper_message(self, from_user, message):
        """Display whisper message"""
        self.chat_text.insert(tk.END, f"[{from_user} → you] {message}\n", 'purple')
        self.chat_text.see(tk.END)
        
    def error_message(self, message):
        """Display error message"""
        self.chat_text.insert(tk.END, f"[ERROR] {message}\n", 'red')
        self.chat_text.see(tk.END)
        
    def update_status(self):
        """Update status bar"""
        state = self.quantum_state.get_state()
        status = f"Connected as: {self.username} | "
        status += f"State: ({state[0]:.2f}, {state[1]:.2f}, {state[2]:.2f})"
        self.status_var.set(status)
        
    def schedule_async(self, coro):
        """Schedule an async coroutine to run"""
        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, self.loop)
            
    # Command handlers
    def cmd_help(self, args):
        """Show help message"""
        help_text = "Available commands:\n"
        for cmd, (_, desc) in self.commands.items():
            help_text += f"{cmd}: {desc}\n"
        self.system_message(help_text)
        
    def cmd_whisper(self, args):
        """Send private message"""
        if len(args) < 2:
            self.error_message("Usage: /w <username> <message>")
            return
            
        target = args[0]
        message = ' '.join(args[1:])
        
        if target not in self.connected_users:
            self.error_message(f"User {target} not found")
            return
            
        self.schedule_async(self.send_whisper(target, message))
        self.chat_text.insert(tk.END, f"[you → {target}] {message}\n", 'purple')
        
    def cmd_users(self, args):
        """List connected users"""
        users = ', '.join(sorted(self.connected_users))
        self.system_message(f"Connected users: {users}")
        
    def cmd_tune(self, args):
        """Tune quantum state"""
        if len(args) != 3:
            self.error_message("Usage: /tune <x> <y> <z>")
            return
            
        try:
            x, y, z = map(float, args)
            self.quantum_state.set_state([x, y, z])
            self.schedule_async(self.send_state())
            self.system_message(f"Quantum state tuned to ({x:.2f}, {y:.2f}, {z:.2f})")
        except ValueError:
            self.error_message("Invalid coordinates")
            
    def cmd_align(self, args):
        """Align with user"""
        if len(args) != 1:
            self.error_message("Usage: /align <username>")
            return
            
        target = args[0]
        if target not in self.connected_users:
            self.error_message(f"User {target} not found")
            return
            
        # Request alignment (to be implemented)
        self.system_message(f"Requesting alignment with {target}...")
        
    def cmd_state(self, args):
        """Show current quantum state"""
        state = self.quantum_state.get_state()
        self.system_message(f"Current state: ({state[0]:.2f}, {state[1]:.2f}, {state[2]:.2f})")
        
    def cmd_clear(self, args):
        """Clear chat window"""
        self.chat_text.delete(1.0, tk.END)
        self.system_message("Chat cleared")
        
    def send_message(self, event):
        """Handle message sending"""
        message = self.input_entry.get().strip()
        if not message:
            return
            
        self.input_entry.delete(0, tk.END)
        
        # Check if command
        if message.startswith('/'):
            parts = message.split()
            cmd = parts[0].lower()
            args = parts[1:]
            
            if cmd in self.commands:
                self.commands[cmd][0](args)
            else:
                self.error_message(f"Unknown command: {cmd}")
        else:
            # Regular chat message
            self.schedule_async(self.send_chat(message))
            
    async def send_chat(self, message):
        """Send chat message"""
        if self.websocket:
            try:
                await self.websocket.send(json.dumps({
                    'type': 'message',
                    'username': self.username,
                    'message': message
                }))
            except Exception as e:
                self.error_message(f"Failed to send message: {e}")
                
    async def send_whisper(self, target, message):
        """Send whisper message"""
        if self.websocket:
            try:
                await self.websocket.send(json.dumps({
                    'type': 'whisper',
                    'username': self.username,
                    'target': target,
                    'message': message
                }))
            except Exception as e:
                self.error_message(f"Failed to send whisper: {e}")
                
    async def send_state(self):
        """Send quantum state update"""
        if self.websocket:
            try:
                await self.websocket.send(json.dumps({
                    'type': 'state_update',
                    'username': self.username,
                    'state': self.quantum_state.get_state()
                }))
            except Exception as e:
                self.error_message(f"Failed to send state: {e}")
                
    async def connect(self):
        """Connect to server"""
        try:
            self.websocket = await websockets.connect('ws://localhost:8767')
            
            # Generate random username
            self.username = f"User_{random.randint(1000, 9999)}"
            
            # Send initial state
            await self.send_state()
            
            # Update status
            self.status_var.set(f"Connected as {self.username}")
            self.system_message(f"Connected as {self.username}")
            
            # Start message handler
            await self.handle_messages()
            
        except Exception as e:
            self.error_message(f"Failed to connect: {e}")
            
    async def handle_messages(self):
        """Handle incoming messages"""
        while True:
            try:
                message = await self.websocket.recv()
                try:
                    data = json.loads(message)
                    msg_type = data.get('type', '')
                    
                    if msg_type == 'message':
                        self.chat_message(data['username'], data['message'])
                    elif msg_type == 'whisper':
                        self.whisper_message(data['from'], data['message'])
                    elif msg_type == 'system':
                        self.system_message(data['message'])
                    elif msg_type == 'error':
                        self.error_message(data['message'])
                    elif msg_type == 'user_list':
                        self.connected_users = set(data['users'])
                        
                except json.JSONDecodeError:
                    self.error_message("Received invalid message")
                    
            except websockets.exceptions.ConnectionClosed:
                self.system_message("Disconnected from server")
                self.status_var.set("Disconnected")
                break
            except Exception as e:
                self.error_message(f"Error handling message: {e}")
                await asyncio.sleep(1)  # Prevent tight loop on errors
                
    async def run(self):
        """Run the client"""
        # Configure text colors
        self.chat_text.tag_configure('red', foreground='red')
        self.chat_text.tag_configure('green', foreground='green')
        self.chat_text.tag_configure('yellow', foreground='yellow')
        self.chat_text.tag_configure('purple', foreground='purple')
        self.chat_text.tag_configure('white', foreground='white')
        
        # Connect to server
        await self.connect()
        
def main():
    """Main entry point"""
    client = HyperVoidClient()
    
    # Set up asyncio loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Create tasks
    async def run_client():
        try:
            while True:
                client.root.update()
                await asyncio.sleep(0.1)
        except tk.TclError:
            pass
            
    async def main_tasks():
        await asyncio.gather(
            client.run(),
            run_client()
        )
    
    try:
        loop.run_until_complete(main_tasks())
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        if client.websocket:
            loop.run_until_complete(client.websocket.close())
        loop.close()
        
if __name__ == "__main__":
    main()
