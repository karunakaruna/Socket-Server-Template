# HyperVoid v8.0.0

## Setup
1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the system:
- Double-click `Launch HyperVoid v6.bat`
- Or run components manually:
  ```bash
  python server_v6.py      # Start server
  python quantum_vis_server.py  # Start visualizer
  ```

## Client Commands
- `/help` - Show available commands
- `/w username message` - Send private message
- `/users` - List connected users
- `/tune x y` - Tune quantum state (x and y between -1 and 1)
- `/state` - Show current quantum state
- `/clear` - Clear chat window
