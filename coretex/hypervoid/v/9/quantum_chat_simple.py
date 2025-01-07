import json
import time
import os
import sys
import signal
import colorama
from colorama import Fore, Style
from client_v9 import HyperVoidClient
from quantum_crypto_v9 import HyperMessage, QuantumState

# Initialize colorama for Windows color support
colorama.init()

def signal_handler(sig, frame):
    print(f"\n{Fore.YELLOW}Disconnecting from quantum network...{Style.RESET_ALL}")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class QuantumChat:
    def __init__(self):
        self.username = ""
        self.client = None
        self.running = True
        self.peers = {}  # username -> quantum state
        
    def clear_screen(self):
        """Clear the terminal screen"""
        os.system('cls' if os.name == 'nt' else 'clear')
        
    def print_banner(self):
        """Print quantum chat banner"""
        banner = f"""
{Fore.CYAN}╔════════════════════════════════════════════╗
║          Quantum HyperVoid Chat v9          ║
╚════════════════════════════════════════════╝{Style.RESET_ALL}

{Fore.GREEN}Connected as: {self.username}
Quantum State: {self.client.quantum_state.foam.get_foam()[:20]}
{Style.RESET_ALL}
Type {Fore.YELLOW}/help{Style.RESET_ALL} for commands
"""
        print(banner)
        
    def print_help(self):
        """Print help message"""
        help_text = f"""
{Fore.CYAN}Available Commands:{Style.RESET_ALL}
{Fore.YELLOW}/entangle <user> <msg>{Style.RESET_ALL} - Entangle messages with user
{Fore.YELLOW}/superpose <msg>{Style.RESET_ALL} - Send message in superposition
{Fore.YELLOW}/teleport <msg>{Style.RESET_ALL} - Instant message delivery
{Fore.YELLOW}/tunnel <msg>{Style.RESET_ALL} - Send through quantum tunnel
{Fore.YELLOW}/collapse <msg>{Style.RESET_ALL} - Force quantum state collapse
{Fore.YELLOW}/foam <msg>{Style.RESET_ALL} - Add quantum foam effects
{Fore.YELLOW}/stats{Style.RESET_ALL} - Show quantum statistics
{Fore.YELLOW}/clear{Style.RESET_ALL} - Clear screen
{Fore.YELLOW}/quit{Style.RESET_ALL} - Exit chat
"""
        print(help_text)
        
    def handle_message(self, sender: str, content: str):
        """Handle incoming messages"""
        try:
            # Try to parse as JSON first
            data = json.loads(content)
            msg_type = data.get("type", "normal")
            msg_content = data.get("content", content)
            
            if msg_type == "quantum":
                # Decrypt quantum message
                try:
                    quantum_msg = HyperMessage.from_json(msg_content, self.client.quantum_state)
                    decrypted = quantum_msg.decrypt(self.client.quantum_state)
                    if decrypted:
                        print(f"{Fore.CYAN}[QUANTUM] {sender}: {decrypted}{Style.RESET_ALL}")
                    else:
                        print(f"{Fore.RED}Failed to decrypt quantum message from {sender}{Style.RESET_ALL}")
                except:
                    print(f"{Fore.CYAN}[QUANTUM] {sender}: {msg_content}{Style.RESET_ALL}")
            elif msg_type == "foam":
                print(f"{Fore.MAGENTA}[FOAM] {sender}: {msg_content}{Style.RESET_ALL}")
            else:
                print(f"{Fore.GREEN}{sender}: {msg_content}{Style.RESET_ALL}")
                
        except json.JSONDecodeError:
            # Plain text message
            print(f"{Fore.GREEN}{sender}: {content}{Style.RESET_ALL}")
            
    def get_username(self):
        """Get username with EOF handling"""
        try:
            username = input(f"{Fore.CYAN}Enter username: {Style.RESET_ALL}")
            if not username:
                print(f"{Fore.RED}Username cannot be empty{Style.RESET_ALL}")
                return None
            return username
        except (EOFError, KeyboardInterrupt):
            print(f"\n{Fore.YELLOW}Chat session cancelled.{Style.RESET_ALL}")
            sys.exit(0)
            
    def get_input(self, prompt=f"{Fore.CYAN}>{Style.RESET_ALL} "):
        """Get input with EOF handling"""
        try:
            return input(prompt)
        except (EOFError, KeyboardInterrupt):
            self.running = False
            return '/quit'
            
    def send_quantum_message(self, content: str, target_user: str = None):
        """Send quantum encrypted message"""
        try:
            # Create quantum message
            msg = HyperMessage(content, self.client.quantum_state)
            encrypted = msg.encrypt()
            
            # Prepare message data
            msg_data = {
                "type": "quantum",
                "content": encrypted,
                "target": target_user
            }
            
            # Send via client
            self.client.send_chat_message(json.dumps(msg_data))
            print(f"{Fore.CYAN}[QUANTUM] {self.username}: {content}{Style.RESET_ALL}")
            
        except Exception as e:
            print(f"{Fore.RED}Error sending quantum message: {e}{Style.RESET_ALL}")
            
    def run(self):
        try:
            # Get username
            while not self.username:
                self.username = self.get_username()
                if not self.username:
                    continue
            
            # Create and connect client
            self.client = HyperVoidClient()
            self.client.connect(self.username)
            self.client.add_message_handler(self.handle_message)
            
            # Show UI
            self.clear_screen()
            self.print_banner()
            
            # Main loop
            while self.running:
                try:
                    msg = self.get_input()
                    
                    if not msg:
                        continue
                        
                    if msg.lower() == '/quit':
                        self.running = False
                        break
                        
                    elif msg.lower() == '/help':
                        self.print_help()
                        
                    elif msg.lower() == '/clear':
                        self.clear_screen()
                        self.print_banner()
                        
                    elif msg.lower() == '/stats':
                        stats = {
                            "peers": len(self.peers),
                            "quantum_state": self.client.quantum_state.foam.get_foam()[:20]
                        }
                        print(f"{Fore.CYAN}Quantum Stats:{Style.RESET_ALL}")
                        print(json.dumps(stats, indent=2))
                        
                    elif msg.lower().startswith('/entangle '):
                        # Format: /entangle <user> <message>
                        parts = msg[9:].split(' ', 1)
                        if len(parts) == 2:
                            target, content = parts
                            self.send_quantum_message(content, target)
                        else:
                            print(f"{Fore.RED}Usage: /entangle <user> <message>{Style.RESET_ALL}")
                            
                    elif msg.lower().startswith('/quantum '):
                        content = msg[9:].strip()
                        if content:
                            self.send_quantum_message(content)
                            
                    elif msg.lower().startswith('/foam '):
                        content = msg[6:].strip()
                        if content:
                            # Add quantum foam effects
                            foam = self.client.quantum_state.foam.get_foam()
                            msg_data = {
                                "type": "foam",
                                "content": f"{content} {foam}"
                            }
                            self.client.send_chat_message(json.dumps(msg_data))
                            print(f"{Fore.MAGENTA}[FOAM] {self.username}: {content} {foam}{Style.RESET_ALL}")
                            
                    else:
                        # Regular message
                        self.client.send_chat_message(msg)
                        print(f"{Fore.GREEN}{self.username}: {msg}{Style.RESET_ALL}")
                        
                except Exception as e:
                    print(f"{Fore.RED}Error sending message: {e}{Style.RESET_ALL}")
                    
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
            
        finally:
            if self.client:
                try:
                    self.client.disconnect()
                except:
                    pass
            print(f"{Fore.YELLOW}Disconnected from quantum network.{Style.RESET_ALL}")

def main():
    chat = QuantumChat()
    chat.run()

if __name__ == "__main__":
    main()
