import threading
import time
import random
import json
import logging
import colorama
from colorama import Fore, Style
from client_v9 import HyperVoidClient
from quantum_crypto_v9 import HyperMessage

# Initialize colorama
colorama.init()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("quantum_network_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QuantumEntity:
    """Represents an autonomous quantum network entity"""
    def __init__(self, name: str):
        self.name = name
        self.client = None
        self.running = True
        self.peers = set()  # Known peers
        self.messages_sent = 0
        self.messages_received = 0
        self.connected = False
        self.max_retries = 3
        self.retry_delay = 2
        
        # Message types with weights
        self.message_types = [
            ("quantum", 0.4),   # 40% quantum messages
            ("foam", 0.3),      # 30% foam messages
            ("normal", 0.3)     # 30% normal messages
        ]
        
        # Fun message templates
        self.templates = [
            "Greetings from the quantum realm!",
            "Did you feel that quantum fluctuation?",
            "Entangling my thoughts with yours...",
            "Through the quantum foam I travel...",
            "Superposition is my favorite position!",
            "Quantum tunneling in progress...",
            "Wave function, don't fail me now!",
            "Spooky action at a distance detected!",
            "Quantum coherence achieved!",
            "Riding the quantum wave..."
        ]
        
    def connect(self):
        """Connect to quantum network with retry logic"""
        retries = 0
        while retries < self.max_retries and not self.connected and self.running:
            try:
                self.client = HyperVoidClient()
                self.client.connect(self.name)
                self.client.add_message_handler(self.handle_message)
                self.connected = True
                # Announce presence
                self.client.send_chat_message(json.dumps({
                    "type": "announce",
                    "content": f"Entity {self.name} has joined the quantum network"
                }))
                logger.info(f"{Fore.CYAN}[{self.name}] Connected to quantum network{Style.RESET_ALL}")
                return True
            except Exception as e:
                retries += 1
                logger.warning(f"{Fore.YELLOW}[{self.name}] Connection attempt {retries} failed: {e}{Style.RESET_ALL}")
                if retries < self.max_retries:
                    time.sleep(self.retry_delay)
                self.client = None
        return False
        
    def handle_message(self, sender: str, content: str):
        """Handle incoming messages"""
        if sender == self.name:  # Ignore own messages
            return
            
        try:
            # Add sender to known peers regardless of message type
            self.peers.add(sender)
            
            data = json.loads(content)
            msg_type = data.get("type", "normal")
            msg_content = data.get("content", content)
            
            # Handle announce messages
            if msg_type == "announce":
                # Send a welcome message back
                if self.client and self.connected:
                    welcome = json.dumps({
                        "type": "welcome",
                        "content": f"Welcome {sender}! Entity {self.name} acknowledges you"
                    })
                    self.client.send_chat_message(welcome)
            
            # Log received message
            if msg_type == "quantum":
                logger.info(f"{Fore.CYAN}[{self.name}] Received QUANTUM from {sender}: {msg_content}{Style.RESET_ALL}")
            elif msg_type == "foam":
                logger.info(f"{Fore.MAGENTA}[{self.name}] Received FOAM from {sender}: {msg_content}{Style.RESET_ALL}")
            else:
                logger.info(f"{Fore.GREEN}[{self.name}] Received from {sender}: {msg_content}{Style.RESET_ALL}")
                
            self.messages_received += 1
            
        except json.JSONDecodeError:
            # Handle plain text messages
            self.peers.add(sender)  # Still add sender as peer
            logger.info(f"{Fore.GREEN}[{self.name}] Received from {sender}: {content}{Style.RESET_ALL}")
            self.messages_received += 1
            
    def generate_message(self):
        """Generate a random message"""
        template = random.choice(self.templates)
        msg_type = random.choices(
            population=[t[0] for t in self.message_types],
            weights=[t[1] for t in self.message_types],
            k=1
        )[0]
        
        if msg_type == "quantum" and self.client:
            # Create quantum encrypted message
            msg = HyperMessage(template, self.client.quantum_state)
            encrypted = msg.encrypt()
            return json.dumps({
                "type": "quantum",
                "content": encrypted
            })
        elif msg_type == "foam" and self.client:
            # Add quantum foam effects
            foam = self.client.quantum_state.foam.get_foam()
            return json.dumps({
                "type": "foam",
                "content": f"{template} {foam}"
            })
        else:
            # Normal message
            return template
            
    def send_message(self):
        """Send a message with error handling"""
        try:
            if self.connected and self.client and self.peers:
                message = self.generate_message()
                self.client.send_chat_message(message)
                self.messages_sent += 1
                return True
        except Exception as e:
            logger.error(f"{Fore.RED}[{self.name}] Send error: {e}{Style.RESET_ALL}")
            self.connected = False
            return False
            
    def run(self):
        """Main entity loop"""
        try:
            # Initial connection
            if not self.connect():
                logger.error(f"{Fore.RED}[{self.name}] Failed to connect after {self.max_retries} attempts{Style.RESET_ALL}")
                return
                
            # Entity behavior loop
            while self.running:
                if not self.connected:
                    if not self.connect():  # Try to reconnect
                        break
                
                # Periodically announce presence to help peer discovery
                if random.random() < 0.1:  # 10% chance to announce
                    if self.client and self.connected:
                        announce = json.dumps({
                            "type": "announce",
                            "content": f"Entity {self.name} is active in the quantum network"
                        })
                        self.client.send_chat_message(announce)
                
                # Send messages more frequently if we have peers
                if self.peers and random.random() < 0.3:  # 30% chance to send message if we have peers
                    if not self.send_message():
                        continue
                        
                time.sleep(random.uniform(1, 3))  # Shorter delay between actions
                
        except Exception as e:
            logger.error(f"{Fore.RED}[{self.name}] Error: {e}{Style.RESET_ALL}")
            
        finally:
            if self.client:
                try:
                    self.client.disconnect()
                    logger.info(f"{Fore.YELLOW}[{self.name}] Disconnected from quantum network{Style.RESET_ALL}")
                except:
                    pass

class QuantumNetworkDebugger:
    """Manages multiple quantum entities for testing"""
    def __init__(self, num_entities: int = 5):  # Reduced number of entities
        self.num_entities = num_entities
        self.entities = []
        self.entity_threads = []
        
    def start(self):
        """Start all quantum entities"""
        logger.info(f"{Fore.CYAN}Starting quantum network with {self.num_entities} entities{Style.RESET_ALL}")
        
        # Create and start entities
        for i in range(self.num_entities):
            entity = QuantumEntity(f"Entity_{i}")
            thread = threading.Thread(target=entity.run)
            thread.daemon = True
            
            self.entities.append(entity)
            self.entity_threads.append(thread)
            thread.start()
            
            time.sleep(1.0)  # Longer delay between entity starts
            
    def monitor(self, duration: int = 60):
        """Monitor network activity for specified duration"""
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration:
                # Calculate statistics
                active_entities = sum(1 for e in self.entities if e.connected)
                total_sent = sum(e.messages_sent for e in self.entities)
                total_received = sum(e.messages_received for e in self.entities)
                avg_peers = sum(len(e.peers) for e in self.entities) / max(1, active_entities)
                
                # Print status
                logger.info(f"""
{Fore.CYAN}=== Quantum Network Status ==={Style.RESET_ALL}
Time Elapsed: {int(time.time() - start_time)}s
Active Entities: {active_entities}/{self.num_entities}
Total Messages Sent: {total_sent}
Total Messages Received: {total_received}
Average Peers per Entity: {avg_peers:.1f}
""")
                
                time.sleep(5)  # Update every 5 seconds
                
        except KeyboardInterrupt:
            logger.info(f"{Fore.YELLOW}Monitoring interrupted{Style.RESET_ALL}")
            
    def stop(self):
        """Stop all quantum entities"""
        logger.info(f"{Fore.YELLOW}Stopping quantum network...{Style.RESET_ALL}")
        
        for entity in self.entities:
            entity.running = False
            
        # Wait for threads to finish
        for thread in self.entity_threads:
            thread.join(timeout=1)
            
        logger.info(f"{Fore.GREEN}Quantum network stopped{Style.RESET_ALL}")

def main():
    # Create and start debugger with fewer entities
    debugger = QuantumNetworkDebugger(num_entities=5)
    
    try:
        # Start entities
        debugger.start()
        
        # Monitor for 60 seconds
        debugger.monitor(duration=60)
        
    except KeyboardInterrupt:
        logger.info(f"{Fore.YELLOW}Debug session interrupted{Style.RESET_ALL}")
        
    finally:
        # Stop all entities
        debugger.stop()
        
if __name__ == "__main__":
    main()
