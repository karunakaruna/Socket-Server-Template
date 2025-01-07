import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import sys
import os
import threading
import json
import logging
import queue
from datetime import datetime
import time
import signal

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HyperVoidDebugTool:
    def __init__(self, root):
        self.root = root
        self.root.title("HyperVoid Debug Tool")
        self.root.geometry("1200x800")
        
        self.server_process = None
        self.client_processes = []
        self.quantum_states = {}
        self.output_queue = queue.Queue()
        
        self.setup_gui()
        
    def setup_gui(self):
        # Create main container
        main_container = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Left panel for controls
        left_panel = ttk.Frame(main_container)
        main_container.add(left_panel)
        
        # Server controls
        server_frame = ttk.LabelFrame(left_panel, text="Server Control")
        server_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.server_status = ttk.Label(server_frame, text="Server: Stopped")
        self.server_status.pack(pady=5)
        
        server_btn_frame = ttk.Frame(server_frame)
        server_btn_frame.pack(fill=tk.X)
        
        self.start_server_btn = ttk.Button(server_btn_frame, text="Start Server", command=self.start_server)
        self.start_server_btn.pack(side=tk.LEFT, padx=5, pady=5)
        
        self.stop_server_btn = ttk.Button(server_btn_frame, text="Stop Server", command=self.stop_server, state=tk.DISABLED)
        self.stop_server_btn.pack(side=tk.LEFT, padx=5, pady=5)
        
        # Client controls
        client_frame = ttk.LabelFrame(left_panel, text="Client Control")
        client_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.spawn_client_btn = ttk.Button(client_frame, text="Spawn New Client", command=self.spawn_client)
        self.spawn_client_btn.pack(pady=5)
        
        # Client list
        self.client_list = ttk.Treeview(client_frame, columns=("ID", "Status"), show="headings", height=5)
        self.client_list.heading("ID", text="Client ID")
        self.client_list.heading("Status", text="Status")
        self.client_list.pack(fill=tk.X, pady=5)
        
        # Log frame
        log_frame = ttk.LabelFrame(left_panel, text="Log")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # Right panel for client outputs
        right_panel = ttk.Frame(main_container)
        main_container.add(right_panel)
        
        # Client outputs
        outputs_frame = ttk.LabelFrame(right_panel, text="Client Outputs")
        outputs_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.outputs_text = scrolledtext.ScrolledText(outputs_frame)
        self.outputs_text.pack(fill=tk.BOTH, expand=True)
        
    def log(self, message):
        logger.debug(message)
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        
    def add_output(self, client_id, message):
        self.output_queue.put((client_id, message))
        
    def process_output(self):
        while True:
            try:
                client_id, message = self.output_queue.get_nowait()
                self.outputs_text.insert(tk.END, f"[{client_id}] {message}\n")
                self.outputs_text.see(tk.END)
            except queue.Empty:
                break
        self.root.after(100, self.process_output)
        
    def start_server(self):
        if not self.server_process:
            try:
                server_path = os.path.join(os.path.dirname(__file__), "server.py")
                self.server_process = subprocess.Popen([sys.executable, server_path],
                                                     stdout=subprocess.PIPE,
                                                     stderr=subprocess.PIPE)
                self.log("Server started")
                self.server_status.config(text="Server: Running")
                self.start_server_btn.config(state=tk.DISABLED)
                self.stop_server_btn.config(state=tk.NORMAL)
                
                # Start server output monitoring thread
                threading.Thread(target=self.monitor_server_output, daemon=True).start()
            except Exception as e:
                self.log(f"Error starting server: {e}")
                
    def stop_server(self):
        if self.server_process:
            self.server_process.terminate()
            self.server_process = None
            self.log("Server stopped")
            self.server_status.config(text="Server: Stopped")
            self.start_server_btn.config(state=tk.NORMAL)
            self.stop_server_btn.config(state=tk.DISABLED)
            
    def spawn_client(self):
        try:
            client_path = os.path.join(os.path.dirname(__file__), "client.py")
            
            # Create a new window for client input
            client_window = tk.Toplevel(self.root)
            client_id = f"Client_{len(self.client_processes)}"
            client_window.title(f"HyperVoid {client_id}")
            client_window.geometry("600x400")
            
            # Create output text area
            output_text = scrolledtext.ScrolledText(client_window, height=20)
            output_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
            # Create input frame
            input_frame = ttk.Frame(client_window)
            input_frame.pack(fill=tk.X, side=tk.BOTTOM, padx=5, pady=5)
            
            input_entry = ttk.Entry(input_frame)
            input_entry.pack(fill=tk.X, side=tk.LEFT, expand=True)
            
            # Create process with shell=True to handle console better
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                
            process = subprocess.Popen(
                [sys.executable, client_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                bufsize=1,
                universal_newlines=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0,
                startupinfo=startupinfo
            )
            
            def send_message(event=None):
                message = input_entry.get().strip()
                if message:
                    try:
                        process.stdin.write(f"{message}\n")
                        process.stdin.flush()
                        output_text.insert(tk.END, f"You: {message}\n")
                        output_text.see(tk.END)
                        input_entry.delete(0, tk.END)
                    except Exception as e:
                        self.log(f"Error sending message from {client_id}: {e}")
            
            input_entry.bind('<Return>', send_message)
            send_button = ttk.Button(input_frame, text="Send", command=send_message)
            send_button.pack(side=tk.RIGHT, padx=(5, 0))
            
            self.client_processes.append((client_id, process))
            self.client_list.insert("", tk.END, values=(client_id, "Running"))
            self.log(f"Spawned {client_id}")
            
            # Start client output monitoring thread
            def monitor_output():
                while True:
                    try:
                        output = process.stdout.readline()
                        if output:
                            message = output.strip()
                            if message:
                                self.log(f"{client_id} Output: {message}")
                                def update_ui():
                                    output_text.insert(tk.END, f"{message}\n")
                                    output_text.see(tk.END)
                                self.root.after(0, update_ui)
                        
                        error = process.stderr.readline()
                        if error:
                            error_msg = error.strip()
                            self.log(f"{client_id} Error: {error_msg}")
                            def update_error():
                                output_text.insert(tk.END, f"Error: {error_msg}\n", "error")
                                output_text.see(tk.END)
                            self.root.after(0, update_error)
                            
                        if process.poll() is not None:
                            self.log(f"{client_id} process ended with code {process.returncode}")
                            break
                            
                        # Small sleep to prevent high CPU usage
                        time.sleep(0.1)
                            
                    except Exception as e:
                        self.log(f"Error monitoring {client_id}: {e}")
                        break
                
                # Remove from client list when process ends
                def cleanup():
                    self.log(f"{client_id} disconnected")
                    self.client_list.delete(
                        *[item for item in self.client_list.get_children() 
                          if self.client_list.item(item)["values"][0] == client_id]
                    )
                    client_window.destroy()
                
                self.root.after(0, cleanup)
            
            threading.Thread(target=monitor_output, daemon=True).start()
            
            # Configure text tags
            output_text.tag_configure("error", foreground="red")
            
            # Focus the input entry
            input_entry.focus_set()
            
            # Handle window close
            def on_closing():
                self.log(f"Closing {client_id} window")
                try:
                    if os.name == 'nt':
                        process.send_signal(signal.CTRL_BREAK_EVENT)
                    else:
                        process.terminate()
                except:
                    pass
                client_window.destroy()
            
            client_window.protocol("WM_DELETE_WINDOW", on_closing)
            
        except Exception as e:
            self.log(f"Error spawning client: {e}")
            
    def monitor_server_output(self):
        while self.server_process:
            output = self.server_process.stdout.readline()
            if output:
                message = output.decode().strip()
                self.log(f"Server: {message}")
                self.add_output("Server", message)
                
    def monitor_client_output(self, client_id, process):
        while True:
            output = process.stdout.readline()
            if not output:
                break
            message = output.decode().strip()
            self.log(f"{client_id}: {message}")
            self.add_output(client_id, message)
            
            # Update quantum states if state information is received
            try:
                data = json.loads(output.decode())
                if "type" in data and data["type"] == "":  # Quantum state
                    self.quantum_states[client_id] = data["state"]
            except:
                pass
        
        # Remove from client list when process ends
        self.log(f"{client_id} disconnected")
        self.client_list.delete(
            *[item for item in self.client_list.get_children() 
              if self.client_list.item(item)["values"][0] == client_id]
        )

def main():
    root = tk.Tk()
    app = HyperVoidDebugTool(root)
    app.process_output()
    root.mainloop()

if __name__ == "__main__":
    main()
