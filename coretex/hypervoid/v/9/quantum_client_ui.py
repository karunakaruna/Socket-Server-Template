import curses
import time
import asyncio
import logging
import json
from client_v9 import HyperVoidClient
from quantum_chat import QuantumChat, QuantumEffect
from typing import List, Dict, Optional
import threading
from queue import Queue

logging.basicConfig(filename='quantum_client.log', level=logging.INFO)
logger = logging.getLogger(__name__)

class QuantumClientUI:
    def __init__(self, stdscr, username: str):
        self.stdscr = stdscr
        self.username = username
        self.client = HyperVoidClient()
        self.quantum_chat = QuantumChat()
        self.message_queue = Queue()
        self.running = True
        
        # UI Colors
        curses.start_color()
        curses.use_default_colors()
        curses.init_pair(1, curses.COLOR_CYAN, -1)    # Chat messages
        curses.init_pair(2, curses.COLOR_GREEN, -1)   # Quantum effects
        curses.init_pair(3, curses.COLOR_MAGENTA, -1) # System messages
        curses.init_pair(4, curses.COLOR_YELLOW, -1)  # Quantum foam
        curses.init_pair(5, curses.COLOR_RED, -1)     # Errors
        
        # Create windows
        self.setup_windows()
        self.messages: List[str] = []
        self.input_buffer = ""
        self.quantum_stats: Dict = {}
        
    def setup_windows(self):
        """Create UI windows"""
        height, width = self.stdscr.getmaxyx()
        
        # Chat window (70% width, full height - 5)
        chat_width = int(width * 0.7)
        self.chat_win = curses.newwin(height-5, chat_width, 0, 0)
        self.chat_win.scrollok(True)
        
        # Quantum effects window (30% width, 70% height)
        effects_width = width - chat_width
        effects_height = int(height * 0.7)
        self.effects_win = curses.newwin(effects_height, effects_width, 0, chat_width)
        
        # Status window (30% width, remaining height)
        status_height = height - effects_height - 5
        self.status_win = curses.newwin(status_height, effects_width, effects_height, chat_width)
        
        # Input window (full width, 3 lines at bottom)
        self.input_win = curses.newwin(3, width, height-4, 0)
        
        # Help window (full width, 1 line at bottom)
        self.help_win = curses.newwin(1, width, height-1, 0)
        
    def draw_borders(self):
        """Draw window borders"""
        self.chat_win.box()
        self.effects_win.box()
        self.status_win.box()
        self.input_win.box()
        
        # Add titles
        self.chat_win.addstr(0, 2, "『 Quantum Chat 』", curses.color_pair(1))
        self.effects_win.addstr(0, 2, "『 Quantum Effects 』", curses.color_pair(2))
        self.status_win.addstr(0, 2, "『 Status 』", curses.color_pair(3))
        
    def update_chat(self):
        """Update chat window"""
        self.chat_win.clear()
        self.draw_borders()
        
        height, width = self.chat_win.getmaxyx()
        display_messages = self.messages[-(height-2):]
        
        for i, msg in enumerate(display_messages, 1):
            try:
                self.chat_win.addstr(i, 2, msg[:width-4])
            except curses.error:
                pass
                
        self.chat_win.refresh()
        
    def update_effects(self):
        """Update quantum effects window"""
        self.effects_win.clear()
        self.draw_borders()
        
        effects = [
            ("⚡ Entangle", "Connect messages"),
            ("⚛ Superpose", "Multiple states"),
            ("↯ Teleport", "Instant delivery"),
            ("⟁ Tunnel", "Bypass noise"),
            ("⎊ Collapse", "Force state"),
            ("≋ Foam", "Special patterns")
        ]
        
        for i, (effect, desc) in enumerate(effects, 1):
            try:
                self.effects_win.addstr(i, 2, effect, curses.color_pair(2))
                self.effects_win.addstr(i, 15, desc, curses.color_pair(1))
            except curses.error:
                pass
                
        # Show quantum foam pattern
        try:
            foam = self.client.quantum_state.foam.get_foam()
            self.effects_win.addstr(8, 2, "Quantum Foam:", curses.color_pair(4))
            self.effects_win.addstr(9, 2, foam[:40], curses.color_pair(4))
        except:
            pass
            
        self.effects_win.refresh()
        
    def update_status(self):
        """Update status window"""
        self.status_win.clear()
        self.draw_borders()
        
        try:
            status_lines = [
                f"User: {self.username}",
                f"Phase: {self.client.quantum_state.phase:.2f}",
                f"Radius: {self.client.quantum_state.hyperradius:.2f}",
                f"Messages: {len(self.messages)}",
                f"Effects: {self.quantum_stats.get('quantum_effects', 0)}"
            ]
            
            for i, line in enumerate(status_lines, 1):
                self.status_win.addstr(i, 2, line, curses.color_pair(3))
                
        except curses.error:
            pass
            
        self.status_win.refresh()
        
    def update_input(self):
        """Update input window"""
        self.input_win.clear()
        self.draw_borders()
        
        try:
            prompt = f"{self.username}> "
            self.input_win.addstr(1, 1, prompt, curses.color_pair(1))
            self.input_win.addstr(1, len(prompt), self.input_buffer)
        except curses.error:
            pass
            
        self.input_win.refresh()
        
    def update_help(self):
        """Update help window"""
        try:
            help_text = "[ /help: Commands | /stats: Stats | /quit: Exit | Tab: Effects ]"
            self.help_win.addstr(0, 0, help_text, curses.color_pair(3))
        except curses.error:
            pass
            
        self.help_win.refresh()
        
    def handle_input(self, ch: int):
        """Handle user input"""
        if ch == ord('\n'):  # Enter
            if self.input_buffer:
                # Process message
                response = self.quantum_chat.process_message(self.username, self.input_buffer)
                self.messages.append(response)
                self.client.send_chat_message(json.dumps({
                    "type": "chat",
                    "content": response
                }))
                self.input_buffer = ""
                
        elif ch == ord('\t'):  # Tab
            # Show effects menu
            effects = list(QuantumEffect)
            idx = 0  # TODO: Cycle through effects
            
        elif ch == curses.KEY_BACKSPACE or ch == 127:  # Backspace
            self.input_buffer = self.input_buffer[:-1]
            
        elif ch == ord('/'):  # Command
            self.input_buffer += '/'
            
        elif 32 <= ch <= 126:  # Printable characters
            self.input_buffer += chr(ch)
            
    def message_receiver(self):
        """Background thread for receiving messages"""
        while self.running:
            try:
                msg = self.message_queue.get(timeout=0.1)
                if isinstance(msg, dict):
                    content = msg.get('content', '')
                    if content:
                        self.messages.append(content)
            except:
                continue
                
    async def run(self):
        """Main UI loop"""
        # Connect to server
        self.client.connect(self.username)
        
        # Start message receiver thread
        receiver_thread = threading.Thread(target=self.message_receiver)
        receiver_thread.daemon = True
        receiver_thread.start()
        
        # Main loop
        while self.running:
            try:
                # Update UI
                self.update_chat()
                self.update_effects()
                self.update_status()
                self.update_input()
                self.update_help()
                
                # Handle input
                ch = self.stdscr.getch()
                if ch == ord('q'):
                    self.running = False
                else:
                    self.handle_input(ch)
                    
                # Short sleep to prevent high CPU usage
                await asyncio.sleep(0.05)
                
            except KeyboardInterrupt:
                self.running = False
            except Exception as e:
                logger.error(f"UI Error: {e}")
                continue
                
        # Cleanup
        self.client.disconnect()

def main(stdscr):
    """Initialize and run the UI"""
    # Setup terminal
    curses.curs_set(1)  # Show cursor
    stdscr.timeout(100)  # Non-blocking input
    
    # Create and run UI
    username = "QuantumUser"  # TODO: Add login screen
    ui = QuantumClientUI(stdscr, username)
    
    # Run with asyncio
    asyncio.run(ui.run())

if __name__ == "__main__":
    curses.wrapper(main)
