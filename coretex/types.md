# Coretex Object Types

This document defines the standard object types used in the Coretex system. Each type has a specific structure and behavior.

## Standard Object

A permanent object with full tracking and metadata.

```json
{
    "type": "object",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "data": {
        "name": "Example Object",
        "description": "A standard Coretex object",
        "created": "2025-01-04T20:02:11-08:00",
        "modified": "2025-01-04T20:02:11-08:00",
        "secret_key": "sk_example_123",
        "age": 0,
        "previous_owners": [],
        "current_owner": "creator_id",
        "tags": [],
        "attributes": {},
        "content": {}
    },
    "meta": {
        "modifications": [],
        "access_count": 0,
        "encryption_version": "1.0",
        "checksum": "sha256_hash"
    }
}
```

## Ephemera

A temporary object that auto-deletes after its expiration time.

```json
{
    "type": "ephemera",
    "data": {
        "name": "Temporary Note",
        "content": "This will self-destruct",
        "created": "2025-01-04T20:02:11-08:00",
        "deletion_time": "2025-01-05T20:02:11-08:00",
        "ttl_seconds": 86400,
        "creator": "creator_id",
        "access_limit": 5,
        "current_access_count": 0,
        "tags": [],
        "attributes": {}
    },
    "meta": {
        "modifications": [],
        "encryption_version": "1.0",
        "checksum": "sha256_hash"
    }
}
```

## Whisper

A one-time readable encrypted message that self-destructs after being read.

```json
{
    "type": "whisper",
    "data": {
        "message": "encrypted_content",
        "created": "2025-01-04T20:02:11-08:00",
        "sender": "sender_id",
        "recipient": "recipient_id",
        "read_time": null,
        "encryption_keys": {
            "public_key": "recipient_public_key",
            "nonce": "unique_nonce"
        },
        "deletion_trigger": "on_read"
    },
    "meta": {
        "status": "unread",
        "encryption_version": "1.0",
        "checksum": "sha256_hash"
    }
}
```

## Common Fields

### Standard Object Fields
- `uuid`: Unique identifier
- `name`: Human-readable name
- `description`: Detailed description
- `created`: Creation timestamp
- `modified`: Last modification timestamp
- `secret_key`: Object-specific encryption key
- `age`: Time since creation in seconds
- `previous_owners`: List of previous owner IDs
- `current_owner`: Current owner ID
- `tags`: List of searchable tags
- `attributes`: Custom key-value pairs
- `content`: Main object data

### Ephemera Fields
- `deletion_time`: When the object will be deleted
- `ttl_seconds`: Time to live in seconds
- `access_limit`: Maximum number of accesses
- `current_access_count`: Times accessed

### Whisper Fields
- `message`: Encrypted content
- `sender`: Creator ID
- `recipient`: Intended recipient ID
- `read_time`: When the message was read
- `encryption_keys`: Keys for decryption
- `deletion_trigger`: What causes deletion

### Metadata Fields
- `modifications`: List of changes
- `access_count`: Times accessed
- `encryption_version`: Version of encryption used
- `checksum`: Data integrity hash
- `status`: Current object state

## Object Behaviors

### Standard Object
- Permanent storage
- Full modification history
- Ownership tracking
- Unlimited access

### Ephemera
- Deletes after:
  - Reaching deletion_time
  - Exceeding access_limit
  - TTL expiration
- No permanent storage
- Limited modification tracking

### Whisper
- One-time read only
- Self-destructs after reading
- Cannot be modified
- End-to-end encrypted
- No storage after reading
