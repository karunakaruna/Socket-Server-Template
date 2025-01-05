# Coretex System

Coretex is a dynamic encryption and data management system that transforms JSON objects into secure, glyph-based representations. It provides a unique approach to data storage and transmission by encoding information into Unicode glyph sequences.

## Overview

The system consists of three main components:

1. **Core Encryption Engine**
   - Transforms JSON data into encrypted glyph sequences
   - Uses dynamic mapping (no fixed patterns)
   - Provides secure data storage and retrieval
   - Handles object modifications while maintaining encryption

2. **Web API**
   - RESTful endpoints for object management
   - Create, retrieve, and modify objects
   - Handles different object types (standard objects, ephemera, whispers)
   - Built with Flask for lightweight operation

3. **Web Interface**
   - Clean, modern UI for interacting with the system
   - Real-time object creation and modification
   - Visual representation of encrypted data
   - Built-in testing tools

## How It Works

1. **Object Creation**
   - Client sends JSON data to the server
   - System generates a unique UUID
   - Data is encrypted into glyph sequences
   - Object is stored with metadata

2. **Retrieval**
   - Client requests object by UUID
   - System decrypts glyph sequence
   - Returns original JSON data with metadata

3. **Modification**
   - Updates are applied to decrypted data
   - System re-encrypts the modified data
   - Maintains modification history

## Object Types

The system supports various object types (see [types.md](types.md) for detailed specifications):

1. **Standard Objects**
   - Permanent storage
   - Full metadata tracking
   - Ownership history

2. **Ephemera**
   - Temporary objects
   - Auto-deletion after expiry
   - No permanent storage

3. **Whispers**
   - One-time readable messages
   - Self-destruct after reading
   - Enhanced encryption

## Getting Started

1. Install dependencies:
   ```bash
   pip install flask flask-cors
   ```

2. Run the server:
   ```bash
   python coretex.py
   ```

3. Access the web interface:
   ```
   http://localhost:5000
   ```

## Security Features

- Dynamic encryption (no fixed mappings)
- Unicode glyph-based obfuscation
- Master key protection
- Modification tracking
- Secure object deletion

## API Endpoints

- `POST /create` - Create new objects
- `GET /retrieve/<uuid>` - Retrieve objects
- `POST /modify/<uuid>` - Modify existing objects

## Use Cases

- Secure data storage
- Temporary information sharing
- One-time messages
- Tracked data modifications
- Secure object ownership transfer

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to the project.
