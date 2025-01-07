import os
import sys
import time
import signal
import psutil
import subprocess
import webbrowser
from pathlib import Path

def kill_process_and_children(proc_pid):
    try:
        process = psutil.Process(proc_pid)
        for proc in process.children(recursive=True):
            proc.kill()
        process.kill()
    except psutil.NoSuchProcess:
        pass

def cleanup():
    print("Cleaning up processes...")
    # Kill by port
    for proc in psutil.process_iter(['pid', 'name', 'connections']):
        try:
            connections = proc.connections()
            for conn in connections:
                if conn.status == 'LISTEN' and conn.laddr.port in [8769, 8770]:
                    kill_process_and_children(proc.pid)
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            pass

    # Kill Python processes with specific window titles
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            if proc.name() == 'python.exe':
                cmdline = ' '.join(proc.cmdline()).lower()
                if any(x in cmdline for x in ['server_v6.py', 'quantum_vis_server.py', 'client_v6.py']):
                    kill_process_and_children(proc.pid)
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            pass

    time.sleep(1)

def start_server():
    cleanup()
    
    # Start main server
    server_proc = subprocess.Popen([sys.executable, 'server_v6.py'],
                                 creationflags=subprocess.CREATE_NEW_CONSOLE)
    time.sleep(1)
    
    # Start visualizer
    vis_proc = subprocess.Popen([sys.executable, 'quantum_vis_server.py'],
                               creationflags=subprocess.CREATE_NEW_CONSOLE)
    time.sleep(1)
    
    # Open browser
    webbrowser.open('http://localhost:8770')

def spawn_client(name=None, duration=None):
    cmd = [sys.executable, 'client_v6.py']
    if name:
        cmd.extend(['--name', name])
    if duration:
        cmd.extend(['--duration', str(duration)])
    subprocess.Popen(cmd, creationflags=subprocess.CREATE_NEW_CONSOLE)

def spawn_test_clients(count, duration):
    delay = max(1, 20 // count)
    print(f"Spawning {count} clients with {delay}ms delay between each...")
    for i in range(count):
        spawn_client(f"TestUser_{i+1}", duration)
        time.sleep(delay / 1000)

def main():
    while True:
        print("\nH Y P E R V O I D")
        print("Quantum Messaging System v8.0.0")
        print("\n[1] Start Server")
        print("[2] Open Visualizer")
        print("[3] Spawn Client")
        print("[4] Spawn Test Clients")
        print("[5] Exit")
        
        choice = input("\nSelect option: ").strip()
        
        if choice == '1':
            start_server()
        elif choice == '2':
            webbrowser.open('http://localhost:8770')
        elif choice == '3':
            name = input("Enter client name (or press Enter for random): ").strip()
            duration = input("Enter duration in seconds (or press Enter for infinite): ").strip()
            spawn_client(name or None, duration or None)
        elif choice == '4':
            try:
                count = int(input("How many test clients to spawn? "))
                duration = int(input("Duration for each client (in seconds): "))
                spawn_test_clients(count, duration)
            except ValueError:
                print("Please enter valid numbers")
        elif choice == '5':
            cleanup()
            break

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        cleanup()
        sys.exit(0)
