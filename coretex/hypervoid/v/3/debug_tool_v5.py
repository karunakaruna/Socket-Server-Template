import tkinter as tk
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText
import threading
import logging
from client_v5 import HyperVoidClient
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidDebugTool:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("HyperVoid Debug Tool v7.0.0")
        self.root.geometry("800x600")
        self.root.configure(bg="#1e1e1e")
        
        self.clients = {}  # client -> (window, text_area)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the debug tool UI"""
        # Title
        title_frame = ttk.Frame(self.root)
        title_frame.pack(fill=tk.X, padx=10, pady=5)
        
        title = """
╔══════════════════════════════════════╗
║          H Y P E R V O I D           ║
║    Quantum Messaging System v7.0.0   ║
╚══════════════════════════════════════╝
"""
        title_label = tk.Label(
            title_frame, 
            text=title,
            font=("Consolas", 12),
            fg="#00ff00",
            bg="#1e1e1e"
        )
        title_label.pack()
        
        # Server Control
        server_frame = ttk.LabelFrame(self.root, text="Server Control")
        server_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(server_frame, text="Start Server").pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(server_frame, text="Stop Server").pack(side=tk.LEFT, padx=5, pady=5)
        
        # Client Control
        client_frame = ttk.LabelFrame(self.root, text="Client Control")
        client_frame.pack(fill=tk.X, padx=5, pady=5)
        
        spawn_btn = ttk.Button(client_frame, text="Spawn New Client", command=self.spawn_client)
        spawn_btn.pack(side=tk.LEFT, padx=5, pady=5)
        
        # Client List
        list_frame = ttk.LabelFrame(self.root, text="Client List")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.client_list = ScrolledText(
            list_frame,
            wrap=tk.WORD,
            bg="#2d2d2d",
            fg="#e0e0e0",
            height=10
        )
        self.client_list.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # System Log
        log_frame = ttk.LabelFrame(self.root, text="System Log")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.log_area = ScrolledText(
            log_frame,
            wrap=tk.WORD,
            bg="#2d2d2d",
            fg="#e0e0e0",
            height=10
        )
        self.log_area.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Configure text tags
        self.log_area.tag_configure("error", foreground="#ff0000")
        self.log_area.tag_configure("client", foreground="#00ff00")
        self.log_area.tag_configure("server", foreground="#00ffff")
        
    def spawn_client(self):
        """Spawn a new client"""
        try:
            # Create client window
            client_window = tk.Toplevel(self.root)
            client_window.title(f"HyperVoid Client")
            client_window.geometry("600x400")
            client_window.configure(bg="#1e1e1e")
            
            # Add text area for messages
            text_area = ScrolledText(
                client_window,
                wrap=tk.WORD,
                bg="#2d2d2d",
                fg="#e0e0e0",
                font=("Consolas", 10)
            )
            text_area.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
            # Add input frame
            input_frame = ttk.Frame(client_window)
            input_frame.pack(fill=tk.X, padx=5, pady=5)
            
            # Add input field
            input_field = ttk.Entry(input_frame)
            input_field.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            # Add send button
            send_button = ttk.Button(input_frame, text="Send")
            send_button.pack(side=tk.RIGHT, padx=5)
            
            # Configure text tags for colors
            text_area.tag_configure("encrypted", foreground="#00ff00")  # Neon green for quantum foam
            text_area.tag_configure("system", foreground="#00ffff")    # Cyan for system messages
            text_area.tag_configure("aligned", foreground="#ff00ff")   # Magenta for aligned messages
            text_area.tag_configure("phase", foreground="#ffff00")     # Yellow for phase indicators
            text_area.tag_configure("quantum", foreground="#ff8800")   # Orange for quantum effects
            
            # Create and start client
            client = HyperVoidClient('localhost', 8767)
            if not client.start():
                self.log("Failed to start client", error=True)
                client_window.destroy()
                return
                
            # Store client reference and text area
            self.clients[client] = (client_window, text_area)
            
            def on_send():
                message = input_field.get().strip()
                if message:
                    client.send_message(message)
                    input_field.delete(0, tk.END)
                    if message.startswith('/'):
                        text_area.insert(tk.END, f"Command: {message}\n", "system")
                    else:
                        text_area.insert(tk.END, f"You: {message}\n")
                    text_area.see(tk.END)
                    
            def on_close():
                client.stop()
                client_window.destroy()
                del self.clients[client]
                
            def update_messages():
                try:
                    while True:
                        message = client.message_queue.get_nowait()
                        if "[ALIGNED]" in message:
                            text_area.insert(tk.END, message + "\n", "aligned")
                        elif "===" in message:
                            text_area.insert(tk.END, message + "\n", "system")
                        elif "PHASE:" in message:
                            text_area.insert(tk.END, message + "\n", "phase")
                        elif any(c in message for c in "░▒▓█▀▄▌▐■□▢▣▤▥▦▧▨▩⌠⌡∫≈≠±²³"):
                            text_area.insert(tk.END, message + "\n", "quantum")
                        else:
                            text_area.insert(tk.END, message + "\n")
                        text_area.see(tk.END)
                except:
                    client_window.after(50, update_messages)  # Update faster for smoother foam
                    
            send_button.config(command=on_send)
            input_field.bind('<Return>', lambda e: on_send())
            client_window.protocol("WM_DELETE_WINDOW", on_close)
            
            # Start message updates
            update_messages()
            
            self.log(f"Spawned new client", tag="client")
            
        except Exception as e:
            self.log(f"Error spawning client: {e}", error=True)
            
    def log(self, message, error=False, tag=None):
        """Add message to log"""
        timestamp = time.strftime("%H:%M:%S")
        log_msg = f"[{timestamp}] {message}\n"
        
        if error:
            self.log_area.insert(tk.END, log_msg, "error")
        elif tag:
            self.log_area.insert(tk.END, log_msg, tag)
        else:
            self.log_area.insert(tk.END, log_msg)
            
        self.log_area.see(tk.END)
        
    def run(self):
        """Run the debug tool"""
        self.root.mainloop()
        
if __name__ == '__main__':
    tool = HyperVoidDebugTool()
    tool.run()
