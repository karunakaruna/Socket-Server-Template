import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import threading
import queue
import webbrowser
import os
import socket
import time
import sys

def is_port_in_use(port):
    """Check if a port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except socket.error:
            return True

class HyperVoidDebug:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("HyperVoid Debug Tool v8.0.0")
        
        # Configure style
        style = ttk.Style()
        style.configure("TButton", padding=5)
        
        # Store processes
        self.server_process = None
        self.client_processes = []
        
        # Setup UI
        self.setup_gui()
        
        # Output queue and thread
        self.output_queue = queue.Queue()
        threading.Thread(target=self.process_output, daemon=True).start()
        
    def setup_gui(self):
        # Title
        title = tk.Label(
            self.root,
            text="H Y P E R V O I D\nQuantum Messaging System v8.0.0",
            fg="#00ff00",
            bg="black",
            font=("Courier", 14),
            justify=tk.CENTER
        )
        title.pack(pady=10)
        
        # Buttons frame
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(pady=5)
        
        ttk.Button(
            btn_frame,
            text="Start Server",
            command=self.start_server
        ).pack(side=tk.LEFT, padx=5)
        
        ttk.Button(
            btn_frame,
            text="Open Visualizer",
            command=self.open_visualizer
        ).pack(side=tk.LEFT, padx=5)
        
        ttk.Button(
            btn_frame,
            text="Spawn Client",
            command=self.spawn_client
        ).pack(side=tk.LEFT, padx=5)
        
        # Clients list
        clients_frame = ttk.LabelFrame(self.root, text="Clients")
        clients_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.clients_text = tk.Text(
            clients_frame,
            height=5,
            bg='black',
            fg='green'
        )
        self.clients_text.pack(fill=tk.X, padx=5, pady=5)
        
        # System log
        log_frame = ttk.LabelFrame(self.root, text="System Log")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            height=10,
            bg='black',
            fg='green'
        )
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
    def log(self, message):
        """Add message to log"""
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        
    def process_output(self):
        """Process output from queue"""
        while True:
            try:
                message = self.output_queue.get()
                if message:
                    self.log(message)
            except queue.Empty:
                continue
            
    def read_output(self, process, prefix):
        """Read output from process"""
        while True:
            try:
                line = process.stdout.readline()
                if not line:
                    break
                self.output_queue.put(f"[{prefix}] {line.decode().strip()}")
            except:
                break
                
    def check_ports(self):
        """Check if required ports are available"""
        ports = [8767, 8768, 8769]  # Main, WebSocket, HTTP
        
        for port in ports:
            if is_port_in_use(port):
                self.log(f"Port {port} is in use")
                return False
        return True
                
    def start_server(self):
        """Start the HyperVoid server"""
        if self.server_process:
            self.log("Server already running")
            return
            
        # Check ports
        if not self.check_ports():
            self.log("Please close any running HyperVoid instances and try again")
            return
            
        try:
            # Start server
            server_script = os.path.join(os.path.dirname(__file__), "server_v5.py")
            startupinfo = None
            if hasattr(subprocess, 'STARTUPINFO'):
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE
                
            self.server_process = subprocess.Popen(
                [sys.executable, server_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                startupinfo=startupinfo
            )
            
            # Read output
            threading.Thread(
                target=self.read_output,
                args=(self.server_process, "Server"),
                daemon=True
            ).start()
            
            self.log("Server started")
            
            # Start visualization server
            vis_script = os.path.join(os.path.dirname(__file__), "quantum_vis_server.py")
            self.vis_process = subprocess.Popen(
                [sys.executable, vis_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                startupinfo=startupinfo
            )
            
            # Read output
            threading.Thread(
                target=self.read_output,
                args=(self.vis_process, "Visualizer"),
                daemon=True
            ).start()
            
            self.log("Visualization server started")
            
        except Exception as e:
            self.log(f"Failed to start server: {e}")
            
    def open_visualizer(self):
        """Open quantum visualizer"""
        try:
            # Wait a bit for server to start
            time.sleep(2)
            webbrowser.open('http://localhost:8769')
            self.log("Opened visualizer")
        except Exception as e:
            self.log(f"Failed to open visualizer: {e}")
            
    def spawn_client(self):
        """Spawn a new client"""
        try:
            # Start client
            client_script = os.path.join(os.path.dirname(__file__), "client_v5.py")
            
            startupinfo = None
            if hasattr(subprocess, 'STARTUPINFO'):
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE
                
            client_process = subprocess.Popen(
                [sys.executable, client_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                startupinfo=startupinfo
            )
            
            # Store process
            self.client_processes.append(client_process)
            
            # Read output
            client_num = len(self.client_processes)
            threading.Thread(
                target=self.read_output,
                args=(client_process, f"Client_{client_num}"),
                daemon=True
            ).start()
            
            self.log(f"Started client_{client_num}")
            
        except Exception as e:
            self.log(f"Failed to start client: {e}")
            
    def cleanup(self):
        """Clean up processes"""
        # Kill server
        if self.server_process:
            self.server_process.terminate()
            
        # Kill visualization server
        if hasattr(self, 'vis_process'):
            self.vis_process.terminate()
            
        # Kill clients
        for client in self.client_processes:
            client.terminate()
            
        # Close window
        self.root.destroy()
        
    def run(self):
        """Run the debug tool"""
        try:
            self.root.protocol("WM_DELETE_WINDOW", self.cleanup)
            self.root.mainloop()
        except KeyboardInterrupt:
            pass
        finally:
            self.cleanup()
            
if __name__ == "__main__":
    debug = HyperVoidDebug()
    debug.run()
