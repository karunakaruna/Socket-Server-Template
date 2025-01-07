import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import threading
import queue
import sys
import os

class HyperVoidDebugTool:
    def __init__(self, root):
        self.root = root
        self.root.title("HyperVoid Debug Tool v7.0.0")
        self.root.geometry("800x600")
        
        # Get base directory
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Message queue for thread-safe GUI updates
        self.msg_queue = queue.Queue()
        
        # Process tracking
        self.processes = {}
        self.client_count = 0
        
        self.setup_gui()
        self.start_queue_handler()
        
    def setup_gui(self):
        """Setup the GUI elements"""
        # Title Frame
        title_frame = ttk.Frame(self.root, padding="10")
        title_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title with green text on black background
        title_label = tk.Label(
            title_frame,
            text="H Y P E R V O I D\nQuantum Messaging System v7.0.0",
            fg="#00ff00",
            bg="black",
            font=("Courier", 14),
            pady=10
        )
        title_label.pack(fill=tk.X)
        
        # Visualization Frame
        vis_frame = ttk.LabelFrame(self.root, text="Visualization", padding="5")
        vis_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), padx=5)
        
        vis_button = ttk.Button(
            vis_frame,
            text="Open Quantum Visualizer",
            command=self.start_visualizer
        )
        vis_button.pack(fill=tk.X)
        
        # Client Control Frame
        control_frame = ttk.LabelFrame(self.root, text="Client Control", padding="5")
        control_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), padx=5)
        
        spawn_button = ttk.Button(
            control_frame,
            text="Spawn New Client",
            command=self.spawn_client
        )
        spawn_button.pack(fill=tk.X)
        
        # Client List Frame
        list_frame = ttk.LabelFrame(self.root, text="Client List", padding="5")
        list_frame.grid(row=3, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5)
        
        self.client_list = scrolledtext.ScrolledText(
            list_frame,
            wrap=tk.WORD,
            width=40,
            height=10,
            bg="#333333",
            fg="#ffffff"
        )
        self.client_list.pack(fill=tk.BOTH, expand=True)
        
        # System Log Frame
        log_frame = ttk.LabelFrame(self.root, text="System Log", padding="5")
        log_frame.grid(row=4, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=5, pady=(0, 5))
        
        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            wrap=tk.WORD,
            width=40,
            height=10,
            bg="#333333",
            fg="#ffffff"
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # Configure grid weights
        self.root.grid_rowconfigure(3, weight=1)
        self.root.grid_rowconfigure(4, weight=1)
        self.root.grid_columnconfigure(0, weight=1)
        
    def log(self, message, error=False):
        """Add message to queue for thread-safe logging"""
        self.msg_queue.put(("log", message, error))
        
    def start_queue_handler(self):
        """Start processing GUI update queue"""
        try:
            while True:
                msg = self.msg_queue.get_nowait()
                if msg[0] == "log":
                    _, message, error = msg
                    if error:
                        self.log_text.insert(tk.END, f"ERROR: {message}\n", "error")
                        self.log_text.tag_config("error", foreground="red")
                    else:
                        self.log_text.insert(tk.END, f"{message}\n")
                    self.log_text.see(tk.END)
                    
        except queue.Empty:
            pass
        finally:
            # Schedule next queue check
            self.root.after(100, self.start_queue_handler)
            
    def start_process(self, script, name):
        """Start a Python process"""
        try:
            # Get absolute path to script
            script_path = os.path.join(self.base_dir, script)
            if not os.path.exists(script_path):
                raise FileNotFoundError(f"Script not found: {script_path}")
                
            # Start process
            process = subprocess.Popen(
                [sys.executable, script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=1,
                universal_newlines=True,
                cwd=self.base_dir  # Set working directory
            )
            
            self.processes[name] = process
            
            # Start output handlers
            def handle_output(pipe, is_error):
                for line in iter(pipe.readline, ''):
                    if line.strip():
                        self.log(f"[{name}] {line.strip()}", is_error)
                        
            threading.Thread(target=handle_output, args=(process.stdout, False), daemon=True).start()
            threading.Thread(target=handle_output, args=(process.stderr, True), daemon=True).start()
            
            return True
            
        except Exception as e:
            self.log(f"Error starting {name}: {e}", error=True)
            return False
            
    def start_visualizer(self):
        """Start the quantum visualizer"""
        if not self.start_process("quantum_vis_server.py", "Visualizer"):
            return
            
        self.log("Started Quantum Visualizer")
        
    def spawn_client(self):
        """Spawn a new client"""
        self.client_count += 1
        client_name = f"Client_{self.client_count}"
        
        if not self.start_process("client_v5.py", client_name):
            self.client_count -= 1
            return
            
        self.log(f"Spawned {client_name}")
        
    def cleanup(self):
        """Clean up processes on exit"""
        for process in self.processes.values():
            try:
                process.terminate()
            except:
                pass
                
if __name__ == "__main__":
    root = tk.Tk()
    app = HyperVoidDebugTool(root)
    
    # Handle window close
    def on_closing():
        app.cleanup()
        root.destroy()
        
    root.protocol("WM_DELETE_WINDOW", on_closing)
    
    # Start the GUI event loop
    try:
        root.mainloop()
    except KeyboardInterrupt:
        pass
    finally:
        app.cleanup()
