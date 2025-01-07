import tkinter as tk
from tkinter import ttk
import subprocess
import sys
import os
import threading
import logging
import queue
from datetime import datetime
import time
import signal
import json
import numpy as np
from quantum_crypto import QuantumState
from client_v4 import HyperVoidClient

VERSION = "7.0.0"

ASCII_LOGO = """
╔╗ ╔═╗ ╔══╗ ╔═╗ ╔══╗ ╔╗  ╔╗ ╔══╗ ╔══╗ ╔══╗
║║ ╚╗╔╝ ║╔╗║ ║╔╝ ║╔╗║ ║║  ║║ ║╔╗║ ╚╗╔╝ ║╔═╝
║╚╗ ║║  ║╔╗║ ║╚╗ ║╔╗║ ║╚╗╔╝║ ║║║║  ║║  ║╚╗ 
║╔╝ ║║  ║╚╝║ ║╔╝ ║╚╝║ ║╔╗╔╗║ ║║║║  ║║  ║╔╝ 
║║ ╔╝╚╗ ║╔╗║ ║║  ║╔╗║ ║║╚╝║║ ║╚╝║ ╔╝╚╗ ║╚═╗
╚╝ ╚══╝ ╚╝╚╝ ╚╝  ╚╝╚╝ ╚╝  ╚╝ ╚══╝ ╚══╝ ╚══╝
⚡ Quantum Messaging System v${VERSION} ⚡
"""

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScrolledText(tk.Text):
    def __init__(self, master=None, **kw):
        self.frame = ttk.Frame(master)
        self.vbar = ttk.Scrollbar(self.frame)
        self.vbar.pack(side=tk.RIGHT, fill=tk.Y)

        kw.update({'yscrollcommand': self.vbar.set})
        tk.Text.__init__(self, self.frame, **kw)
        self.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.vbar['command'] = self.yview

        # Copy geometry methods
        methods = tk.Pack.__dict__.keys() | tk.Grid.__dict__.keys() | tk.Place.__dict__.keys()
        for m in methods:
            if m[0] != '_' and m != 'config' and m != 'configure':
                setattr(self, m, getattr(self.frame, m))

    def __str__(self):
        return str(self.frame)

class DebugTool:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title(f"HyperVoid Debug Tool v{VERSION}")
        
        # Set dark theme colors
        self.style = ttk.Style()
        self.style.configure(".", 
            background="#1e1e1e",
            foreground="#e0e0e0",
            fieldbackground="#1e1e1e",
            troughcolor="#2d2d2d",
            borderwidth=0
        )
        self.style.configure("TFrame", background="#1e1e1e")
        self.style.configure("TLabel", background="#1e1e1e", foreground="#e0e0e0")
        self.style.configure("TLabelframe", background="#1e1e1e", foreground="#e0e0e0")
        self.style.configure("TLabelframe.Label", background="#1e1e1e", foreground="#e0e0e0")
        self.style.configure("TButton", 
            background="#2d2d2d",
            foreground="#e0e0e0",
            borderwidth=0,
            focuscolor="none"
        )
        self.style.map("TButton",
            background=[("active", "#3d3d3d")],
            foreground=[("active", "#ffffff")]
        )
        self.style.configure("Quantum.TButton",
            background="#264f78",
            foreground="#ffffff"
        )
        self.style.map("Quantum.TButton",
            background=[("active", "#365f88")],
            foreground=[("active", "#ffffff")]
        )
        
        # Configure root window
        self.root.configure(bg="#1e1e1e")
        self.root.option_add("*Text*Background", "#2d2d2d")
        self.root.option_add("*Text*Foreground", "#e0e0e0")
        self.root.option_add("*Text*selectBackground", "#264f78")
        self.root.option_add("*Text*selectForeground", "#ffffff")
        
        # Add ASCII Logo
        logo_frame = ttk.Frame(self.root)
        logo_frame.pack(fill=tk.X, padx=5, pady=5)
        logo_label = ttk.Label(logo_frame, 
            text=ASCII_LOGO.replace("${VERSION}", VERSION),
            font=("Courier", 10),
            foreground="#00ff00"
        )
        logo_label.pack()
        
        # Server Control Frame with neon accent
        self.server_frame = ttk.LabelFrame(self.root, text=" Server Control")
        self.server_frame.pack(fill=tk.X, padx=5, pady=5)
        
        server_btn_frame = ttk.Frame(self.server_frame)
        server_btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.start_server_btn = ttk.Button(server_btn_frame, 
            text="Start Server", 
            command=self.start_server,
            style="Quantum.TButton"
        )
        self.start_server_btn.pack(side=tk.LEFT, padx=5)
        
        self.stop_server_btn = ttk.Button(server_btn_frame,
            text="Stop Server",
            command=self.stop_server,
            style="Quantum.TButton"
        )
        self.stop_server_btn.pack(side=tk.LEFT, padx=5)
        
        # Client Control Frame with neon accent
        self.client_frame = ttk.LabelFrame(self.root, text=" Client Control")
        self.client_frame.pack(fill=tk.X, padx=5, pady=5)
        
        client_btn_frame = ttk.Frame(self.client_frame)
        client_btn_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.spawn_client_btn = ttk.Button(client_btn_frame,
            text="Spawn New Client",
            command=self.spawn_client,
            style="Quantum.TButton"
        )
        self.spawn_client_btn.pack(side=tk.LEFT, padx=5)
        
        # Client List Frame
        list_frame = ttk.LabelFrame(self.root, text="Client List")
        list_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.client_list = ttk.Treeview(list_frame, columns=("ID", "Status"), show="headings")
        self.client_list.heading("ID", text="Client ID")
        self.client_list.heading("Status", text="Status")
        self.client_list.pack(fill=tk.X, padx=5, pady=5)
        
        # Quantum Controls Frame with neon accent
        self.quantum_frame = ttk.LabelFrame(self.root, text=" Quantum Controls")
        self.quantum_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Style for quantum sliders
        self.style.configure("Quantum.Horizontal.TScale",
            background="#1e1e1e",
            troughcolor="#264f78",
            borderwidth=0
        )
        
        # Create sliders for 6D rotation with neon labels
        self.rotation_sliders = {}
        for axis in ['wx', 'wy', 'wz', 'xy', 'xz', 'yz']:
            frame = ttk.Frame(self.quantum_frame)
            frame.pack(fill=tk.X, padx=5, pady=2)
            
            label = ttk.Label(frame, 
                text=f" {axis} rotation:",
                foreground="#00ff00"
            )
            label.pack(side=tk.LEFT)
            
            slider = ttk.Scale(frame,
                from_=0, to=360,
                orient=tk.HORIZONTAL,
                style="Quantum.Horizontal.TScale"
            )
            slider.pack(side=tk.RIGHT, fill=tk.X, expand=True)
            self.rotation_sliders[axis] = slider
            
            slider.bind("<ButtonRelease-1>", lambda e, axis=axis: self.update_quantum_state(axis))
        
        # Alignment display with neon accent
        self.alignment_frame = ttk.LabelFrame(self.root, text=" Quantum Alignments")
        self.alignment_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.alignment_labels = {}
        
        # Log frame with custom colors
        self.log_frame = ttk.LabelFrame(self.root, text=" System Log")
        self.log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.log_text = tk.Text(self.log_frame, height=10, wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.log_text.tag_configure("error", foreground="#ff0000")
        self.log_text.tag_configure("success", foreground="#00ff00")
        self.log_text.tag_configure("server", foreground="#00ffff")
        self.log_text.tag_configure("client", foreground="#ff00ff")
        
        self.server_process = None
        self.client_processes = []
        self.selected_client = None
        self.clients = {}
        
    def log(self, message, error=False, tag=None):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n", tag if tag else ("error" if error else None))
        self.log_text.see(tk.END)
        logger.info(message)
        
    def start_server(self):
        """Start the server"""
        if self.server_process:
            self.log("Server already running", error=True)
            return
            
        try:
            # First try to kill any existing python processes using port 8767
            if os.name == 'nt':  # Windows
                os.system('for /f "tokens=5" %a in (\'netstat -aon ^| find ":8767" ^| find "LISTENING"\') do taskkill /f /pid %a >nul 2>&1')
            else:  # Unix
                os.system('lsof -ti:8767 | xargs kill -9 >/dev/null 2>&1')
                
            time.sleep(1)  # Wait for ports to clear
            
            server_path = os.path.join(os.path.dirname(__file__), sys.argv[1] if len(sys.argv) > 1 else "server_v3.py")
            
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                
            self.server_process = subprocess.Popen(
                [sys.executable, server_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=1,
                universal_newlines=True,
                startupinfo=startupinfo
            )
            
            self.log("Server started", tag="server")
            
            # Start output monitoring thread
            def monitor_output():
                while True:
                    output = self.server_process.stdout.readline()
                    if output:
                        self.log(f"Server: {output.strip()}", tag="server")
                    
                    error = self.server_process.stderr.readline()
                    if error:
                        self.log(f"Server Error: {error.strip()}", error=True)
                        
                    if self.server_process.poll() is not None:
                        break
                        
            threading.Thread(target=monitor_output, daemon=True).start()
            
        except Exception as e:
            self.log(f"Error starting server: {e}", error=True)
            
    def stop_server(self):
        if not self.server_process:
            self.log("Server not running")
            return
            
        try:
            if os.name == 'nt':
                self.server_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.server_process.terminate()
            self.server_process = None
            self.log("Server stopped", tag="server")
            
            # Automatically restart server if there are active clients
            if any(self.client_processes):
                self.log("Restarting server to preserve client connections...", tag="server")
                self.start_server()
                
        except Exception as e:
            self.log(f"Error stopping server: {e}", error=True)
            
    def spawn_client(self):
        """Spawn a new client"""
        try:
            # Create client window
            client_window = tk.Toplevel(self.root)
            client_window.title(f"HyperVoid Client")
            client_window.geometry("600x400")
            client_window.configure(bg="#1e1e1e")
            
            # Add text area for messages
            text_area = ScrolledText(client_window, wrap=tk.WORD, bg="#2d2d2d", fg="#e0e0e0")
            text_area.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
            # Add input frame
            input_frame = ttk.Frame(client_window)
            input_frame.pack(fill=tk.X, padx=5, pady=5)
            
            # Add input field
            input_field = ttk.Entry(input_frame)
            input_field.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            # Add send button
            send_button = ttk.Button(input_frame, text="Send", style="Quantum.TButton")
            send_button.pack(side=tk.RIGHT, padx=5)
            
            # Create and start client
            client = HyperVoidClient('localhost', 8767)
            if not client.start():
                self.log("Failed to start client", error=True)
                client_window.destroy()
                return
                
            # Store client reference
            self.clients[client] = client_window
            
            def on_send():
                message = input_field.get()
                if message:
                    client.send_message(message)
                    input_field.delete(0, tk.END)
                    text_area.insert(tk.END, f"You: {message}\n")
                    text_area.see(tk.END)
                    
            def on_close():
                client.stop()
                client_window.destroy()
                del self.clients[client]
                
            # Start message receiver
            def receive_messages():
                while client.running:
                    try:
                        message = client.message_queue.get()
                        if message:
                            text_area.insert(tk.END, f"{message}\n")
                            text_area.see(tk.END)
                    except:
                        pass
                        
            threading.Thread(target=receive_messages, daemon=True).start()
            
            send_button.config(command=on_send)
            input_field.bind('<Return>', lambda e: on_send())
            client_window.protocol("WM_DELETE_WINDOW", on_close)
            
            self.log(f"Spawned new client", tag="client")
            
        except Exception as e:
            self.log(f"Error spawning client: {e}", error=True)
            
    def send_message(self, process, input_entry, output_text):
        """Send a message from the input entry to the client process"""
        message = input_entry.get().strip()
        if message:
            try:
                process.stdin.write(f"{message}\n")
                process.stdin.flush()
                input_entry.delete(0, tk.END)
            except Exception as e:
                output_text.insert(tk.END, f"Error sending message: {e}\n", "error")
                output_text.see(tk.END)
                
    def reconnect_client(self, process, output_text):
        """Reconnect a client to the server"""
        try:
            # Send reconnect command to client
            process.stdin.write("/reconnect\n")
            process.stdin.flush()
            output_text.insert(tk.END, "Attempting to reconnect...\n", "system")
            output_text.see(tk.END)
        except Exception as e:
            output_text.insert(tk.END, f"Error reconnecting: {e}\n", "error")
            output_text.see(tk.END)
            
    def update_quantum_state(self, axis):
        """Update quantum state when slider changes"""
        if self.selected_client:
            rotations = []
            for ax in ['wx', 'wy', 'wz', 'xy', 'xz', 'yz']:
                value = self.rotation_sliders[ax].get()
                rotations.append(value * np.pi / 180)  # Convert to radians
                
            self.selected_client.update_quantum_state(rotations)
            
    def update_alignment_display(self, username, alignment):
        """Update quantum alignment display"""
        if username not in self.alignment_labels:
            frame = ttk.Frame(self.alignment_frame)
            frame.pack(fill=tk.X, padx=5, pady=2)
            
            ttk.Label(frame, text=f"{username}:").pack(side=tk.LEFT)
            label = ttk.Label(frame, text="0%")
            label.pack(side=tk.RIGHT)
            self.alignment_labels[username] = label
            
        # Update alignment percentage
        label = self.alignment_labels[username]
        status = "" if alignment > 0.95 else "" if alignment > 0.7 else ""
        label.config(text=f"{status} {alignment:.1%}")
        
    def run(self):
        self.root.mainloop()

def main():
    tool = DebugTool()
    tool.run()

if __name__ == '__main__':
    main()
