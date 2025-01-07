import json
import logging
import time
import threading
from client_v9 import HyperVoidClient
from quantum_chat import QuantumChat, QuantumEffect
import os
import sys
import colorama
from colorama import Fore, Back, Style
from queue import Queue

# Initialize colorama for Windows color support
colorama.init()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("quantum_client.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QuantumClientSimple:
    def __init__(self, username: str):
        self.username = username
        self.client = HyperVoidClient()
        self.quantum_chat = QuantumChat()
        self.running = True
        self.message_queue = Queue()
        
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
{Fore.CYAN}Available Quantum Commands:{Style.RESET_ALL}
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
        
    def format_message(self, msg_type: str, username: str, content: str) -> str:
        """Format chat message with colors"""
        timestamp = time.strftime("%H:%M:%S")
        
        if msg_type == "system":
            return f"{Fore.YELLOW}[{timestamp}] {content}{Style.RESET_ALL}"
        elif msg_type == "quantum":
            return f"{Fore.CYAN}[{timestamp}] {username}: {content}{Style.RESET_ALL}"
        else:
            return f"{Fore.GREEN}[{timestamp}] {username}: {content}{Style.RESET_ALL}"
            
    def handle_message(self, sender: str, content: str):
        """Handle incoming messages"""
        try:
            msg_data = json.loads(content)
            msg_type = msg_data.get("type", "chat")
            msg_content = msg_data.get("content", content)
            
            formatted_msg = self.format_message(msg_type, sender, msg_content)
            print(formatted_msg)
            
        except json.JSONDecodeError:
            # Handle plain text messages
            formatted_msg = self.format_message("chat", sender, content)
            print(formatted_msg)
            
    def message_receiver(self):
        """Background thread for receiving messages"""
        while self.running:
            try:
                if not self.message_queue.empty():
                    msg = self.message_queue.get()
                    print(msg)
            except:
                time.sleep(0.1)
                continue
                
    def run(self):
        """Main client loop"""
        try:
            # Connect to server
            self.client.connect(self.username)
            self.client.add_message_handler(self.handle_message)
            
            # Clear screen and show banner
            self.clear_screen()
            self.print_banner()
            
            # Start message receiver thread
            receiver_thread = threading.Thread(target=self.message_receiver)
            receiver_thread.daemon = True
            receiver_thread.start()
            
            # Main input loop
            while self.running:
                try:
                    user_input = input(f"{Fore.CYAN}{self.username}>{Style.RESET_ALL} ")
                    
                    if not user_input:
                        continue
                        
                    if user_input.lower() == '/quit':
                        self.running = False
                        print(f"{Fore.YELLOW}Disconnecting from quantum network...{Style.RESET_ALL}")
                        break
                        
                    elif user_input.lower() == '/help':
                        self.print_help()
                        
                    elif user_input.lower() == '/clear':
                        self.clear_screen()
                        self.print_banner()
                        
                    elif user_input.lower() == '/stats':
                        stats = self.quantum_chat.cmd_stats(self.username, [])
                        print(f"{Fore.CYAN}Quantum Stats:{Style.RESET_ALL}\n{stats}")
                        
                    else:
                        # Process message through quantum chat
                        response = self.quantum_chat.process_message(self.username, user_input)
                        
                        # Send via client
                        self.client.send_chat_message(json.dumps({
                            "type": "quantum" if user_input.startswith("/") else "chat",
                            "content": response
                        }))
                        
                        # Print locally
                        self.handle_message(self.username, response)
                        
                except KeyboardInterrupt:
                    self.running = False
                    break
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
                    
        except Exception as e:
            logger.error(f"Client error: {e}")
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
            
        finally:
            # Cleanup
            self.client.disconnect()
            print(f"{Fore.YELLOW}Disconnected from quantum network.{Style.RESET_ALL}")

def main():
    """Initialize and run the client"""
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = input(f"{Fore.CYAN}Enter username:{Style.RESET_ALL} ")
        
    client = QuantumClientSimple(username)
    client.run()

if __name__ == "__main__":
    main()
