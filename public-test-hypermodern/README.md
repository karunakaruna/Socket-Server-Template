# DashMerged 2.0 - Modular Implementation

This is a modular reimplementation of the DashMerged dashboard using a component-based architecture.

## Directory Structure
```
public2/
├── components/
│   ├── windows/      # UI window components
│   ├── core/         # Core system components
│   └── systems/      # Subsystems (particles, L-systems, etc.)
├── utils/            # Utility functions and classes
└── styles/           # CSS modules
```

## Architecture Overview
- Component-based design with ES6 modules
- Event-driven communication between components
- Centralized window management
- Modular styling with CSS modules
- Clean separation of concerns

## Components
Each component follows a lifecycle:
1. Construction (setup initial state)
2. Initialization (DOM setup, event binding)
3. Destruction (cleanup)

## Development
1. Run the development server
2. Components are hot-reloadable
3. Use the EventBus for inter-component communication
