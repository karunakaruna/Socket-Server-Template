import asyncio
import websockets
import json
import sys
import numpy as np
import tkinter as tk
from tkinter import ttk, scrolledtext
import webbrowser

class HyperVoidClient:
    def __init__(self):
        self.setup_gui()
        self.username = None
        self.websocket = None
        
    def setup_gui(self):
        """Setup the GUI window"""
        self.root = tk.Tk()
        self.root.title("HyperVoid Client v8.0.0")
        self.root.configure(bg='black')
        
        # Chat display
        self.chat_display = scrolledtext.ScrolledText(
            self.root,
            wrap=tk.WORD,
            width=60,
            height=20,
            bg='black',
            fg='#00ff00',
            font=('Courier', 10)
        )
        self.chat_display.pack(padx=10, pady=5)
        
        # Input frame
        input_frame = ttk.Frame(self.root)
        input_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.input_entry = ttk.Entry(input_frame)
        self.input_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        send_button = ttk.Button(
            input_frame,
            text="Send",
            command=self.send_message
        )
        send_button.pack(side=tk.RIGHT, padx=5)
        
        # Bind enter key
        self.input_entry.bind('<Return>', lambda e: self.send_message())
        
        # System message style
        self.chat_display.tag_configure(
            'system',
            foreground='yellow'
        )
        
    def system_message(self, message):
        """Display a system message"""
        self.chat_display.insert(tk.END, f"[SYSTEM] {message}\n", 'system')
        self.chat_display.see(tk.END)
        
    def chat_message(self, sender, message):
        """Display a chat message"""
        self.chat_display.insert(tk.END, f"{sender}: {message}\n")
        self.chat_display.see(tk.END)
        
    def send_message(self):
        """Send a message from the input field"""
        message = self.input_entry.get().strip()
        if not message:
            return
            
        self.input_entry.delete(0, tk.END)
        
        if message.startswith('/'):
            self.handle_command(message[1:])
        else:
            asyncio.create_task(self.send_chat(message))
            
    def handle_command(self, command):
        """Handle client commands"""
        parts = command.split()
        if not parts:
            return
            
        cmd = parts[0].lower()
        
        if cmd == 'help':
            self.system_message("Available commands:")
            self.system_message("/w <username> <message>: Send private message")
            self.system_message("/users: List connected users")
            self.system_message("/tune <x> <y>: Tune quantum state")
            self.system_message("/state: Show current quantum state")
            self.system_message("/clear: Clear chat window")
            
        elif cmd == 'w' and len(parts) >= 3:
            target = parts[1]
            message = ' '.join(parts[2:])
            asyncio.create_task(self.send_whisper(target, message))
            
        elif cmd == 'users':
            asyncio.create_task(self.request_users())
            
        elif cmd == 'tune' and len(parts) >= 3:
            try:
                x = float(parts[1])
                y = float(parts[2])
                asyncio.create_task(self.update_state([x, y]))
            except ValueError:
                self.system_message("Invalid coordinates. Use numbers between -1 and 1")
                
        elif cmd == 'state':
            asyncio.create_task(self.request_state())
            
        elif cmd == 'clear':
            self.chat_display.delete(1.0, tk.END)
            
        else:
            self.system_message("Unknown command. Type /help for available commands")
            
    async def connect(self):
        """Connect to the server"""
        try:
            self.websocket = await websockets.connect('ws://localhost:8767')
            asyncio.create_task(self.receive_messages())
            return True
        except Exception as e:
            self.system_message(f"Connection failed: {e}")
            return False
            
    async def receive_messages(self):
        """Receive and handle messages from the server"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                
                if data['type'] == 'welcome':
                    self.username = data['username']
                    self.root.title(f"HyperVoid Client v8.0.0 - {self.username}")
                    self.system_message(f"Connected as {self.username}")
                    
                elif data['type'] == 'chat':
                    self.chat_message(data['sender'], data['message'])
                    
                elif data['type'] == 'whisper':
                    self.chat_message(
                        f"[PM from {data['sender']}]",
                        data['message']
                    )
                    
                elif data['type'] == 'users':
                    users = ', '.join(data['users'])
                    self.system_message(f"Connected users: {users}")
                    
        except websockets.exceptions.ConnectionClosed:
            self.system_message("Disconnected from server")
            
    async def send_chat(self, message):
        """Send a chat message"""
        if self.websocket:
            await self.websocket.send(json.dumps({
                "type": "chat",
                "message": message
            }))
            
    async def send_whisper(self, target, message):
        """Send a private message"""
        if self.websocket:
            await self.websocket.send(json.dumps({
                "type": "whisper",
                "target": target,
                "message": message
            }))
            
    async def update_state(self, state):
        """Update quantum state"""
        if self.websocket:
            await self.websocket.send(json.dumps({
                "type": "state_update",
                "state": state
            }))
            
    async def request_users(self):
        """Request user list"""
        if self.websocket:
            await self.websocket.send(json.dumps({
                "type": "users_request"
            }))
            
    async def request_state(self):
        """Request current state"""
        if self.websocket:
            await self.websocket.send(json.dumps({
                "type": "state_request"
            }))
            
    def run(self):
        """Start the client"""
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.async_run())
        
    async def async_run(self):
        """Async entry point"""
        if await self.connect():
            # Open visualizer in browser
            webbrowser.open('http://localhost:8769')
            
            # Run GUI
            while True:
                self.root.update()
                await asyncio.sleep(0.1)
                
if __name__ == "__main__":
    client = HyperVoidClient()
    client.run()
