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
        self.root.title("HyperVoid Debug Tool")
        self.root.geometry("800x600")
        
        self.server_process = None
        self.client_processes = []
        
        self.setup_ui()
        
    def setup_ui(self):
        # Server Control Frame
        server_frame = ttk.LabelFrame(self.root, text="Server Control")
        server_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(server_frame, text="Start Server", command=self.start_server).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(server_frame, text="Stop Server", command=self.stop_server).pack(side=tk.LEFT, padx=5, pady=5)
        
        # Client Control Frame
        client_frame = ttk.LabelFrame(self.root, text="Client Control")
        client_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(client_frame, text="Spawn New Client", command=self.spawn_client).pack(side=tk.RIGHT, padx=5, pady=5)
        
        # Client List Frame
        list_frame = ttk.LabelFrame(self.root, text="Client List")
        list_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.client_list = ttk.Treeview(list_frame, columns=("ID", "Status"), show="headings")
        self.client_list.heading("ID", text="Client ID")
        self.client_list.heading("Status", text="Status")
        self.client_list.pack(fill=tk.X, padx=5, pady=5)
        
        # Log Frame
        log_frame = ttk.LabelFrame(self.root, text="Log")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.log_text = ScrolledText(log_frame, wrap=tk.WORD)
        self.log_text.frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Configure text tags
        self.log_text.tag_configure("error", foreground="red")
        
    def log(self, message, error=False):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n", "error" if error else None)
        self.log_text.see(tk.END)
        logger.info(message)
        
    def start_server(self):
        if self.server_process:
            self.log("Server already running")
            return
            
        try:
            server_path = os.path.join(os.path.dirname(__file__), "server.py")
            
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
            
            self.log("Server started")
            
            # Start output monitoring thread
            def monitor_output():
                while True:
                    output = self.server_process.stdout.readline()
                    if output:
                        self.log(f"Server: {output.strip()}")
                    
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
            self.log("Server stopped")
        except Exception as e:
            self.log(f"Error stopping server: {e}", error=True)
            
    def spawn_client(self):
        try:
            client_path = os.path.join(os.path.dirname(__file__), "client_v3.py")
            
            # Create a new window for client input
            client_window = tk.Toplevel(self.root)
            client_id = f"Client_{len(self.client_processes)}"
            client_window.title(f"HyperVoid {client_id}")
            client_window.geometry("600x400")
            
            # Create output text area
            output_text = ScrolledText(client_window, wrap=tk.WORD, height=20)
            output_text.frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
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
                        self.log(f"Error sending message from {client_id}: {e}", error=True)
            
            input_entry.bind('<Return>', send_message)
            send_button = ttk.Button(input_frame, text="Send", command=send_message)
            send_button.pack(side=tk.RIGHT, padx=(5, 0))
            
            self.client_processes.append((client_id, process))
            self.client_list.insert("", tk.END, values=(client_id, "Running"))
            self.log(f"Spawned {client_id}")
            
            # Start output monitoring thread
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
                            self.log(f"{client_id} Error: {error_msg}", error=True)
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
                        self.log(f"Error monitoring {client_id}: {e}", error=True)
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
            self.log(f"Error spawning client: {e}", error=True)
            
    def run(self):
        self.root.mainloop()

def main():
    tool = DebugTool()
    tool.run()

if __name__ == '__main__':
    main()
