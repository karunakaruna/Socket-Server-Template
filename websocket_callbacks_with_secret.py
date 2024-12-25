import json
from websocket_reconnection import send_reconnect, store_welcome_data

# Cache for userlist table row indices
row_index_cache = {}

# Reference tables outside the callback for efficiency
userid_table = op('userid')  # Replace with the exact name of your Table DAT for user IDs
userlist_table = op('userlist')  # Replace with the exact name of your Table DAT for user updates
data_table = op('data_table')  # Replace with the exact name of your Table DAT for incoming data
ping_trigger = op('ping')  # Replace with the exact name of your Trigger CHOP
secret_table = op('secret_table')  # You'll need to create this to store the secret

def onConnect(dat):
    """Handles WebSocket connection event."""
    # Get any stored secret from a table/storage
    secret_table = op('secret_table')  # You'll need to create this to store the secret
    secret = None
    if secret_table and secret_table.numRows > 1:  # Assuming row 0 is header
        secret = secret_table[1, 0].val
    
    # Send reconnect message
    reconnect_msg = {
        "type": "reconnect",
        "secret": secret
    }
    dat.sendText(json.dumps(reconnect_msg))
    print("Sent reconnect message to server")

def initialize_data_table():
    """Clears and initializes the data_table with the correct column structure."""
    data_table.clear()
    data_table.appendRow(["Channel", "Value"])
    #print("Initialized data_table with the following headers:")
    #print([data_table[0, col].val for col in range(data_table.numCols)])

def initialize_userlist_table():
    """Clears and initializes the userlist_table with the correct column structure."""
    userlist_table.clear()
    userlist_table.appendRow(["Row", "UUIDs", "username", "tx", "ty", "tz", "afk", "description", "textstream"])
    #print("Initialized userlist_table with the following headers:")
    #print([userlist_table[0, col].val for col in range(userlist_table.numCols)])

def send_clearlist():
    """Sends a 'clearlist' message to the server."""
    ws = op('websocket1')  # Replace with your WebSocket DAT
    message = {"type": "clearlist"}
    ws.sendText(json.dumps(message))
    print("Sent clearlist message to the server.")

def rebuild_row_index_cache():
    """Rebuilds the row index cache to maintain synchronization with the table."""
    global row_index_cache
    row_index_cache = {
        userlist_table[row, 1].val: row
        for row in range(1, userlist_table.numRows)  # Skip the header row
    }
    print("Rebuilt row_index_cache:", row_index_cache)

def update_userlist_table(users):
    """Rebuilds the userlist_table based on the received user data, with rows starting at 0."""
    global row_index_cache
    print("Received users:", users)

    if not users:
        initialize_userlist_table()
        row_index_cache.clear()
        print("Cleared userlist_table (no users).")
        return

    # Clear and rebuild the table to avoid inconsistencies
    initialize_userlist_table()

    # Add rows in order from server
    for idx, user in enumerate(users):  # Start index at 0 by default
        user_id = user.get("id", "")
        if not user_id:
            continue

        username = user.get("username", "Unnamed")
        tx = user.get("tx", 0)
        ty = user.get("ty", 0)
        tz = user.get("tz", 0)
        afk = user.get("afk", False)
        description = user.get("description", "")
        textstream = user.get("textstream", "")

        # Add row with the correct index
        userlist_table.appendRow([str(idx), user_id, username, tx, ty, tz, afk, description, textstream])

    # Rebuild the row index cache
    rebuild_row_index_cache()
    print("Updated userlist_table.")

def update_user_coordinates(from_uuid, coordinates):
    """Updates user coordinates in the userlist_table."""
    global row_index_cache
    if from_uuid in row_index_cache:
        row_index = row_index_cache[from_uuid]
        userlist_table[row_index, 3] = str(coordinates.get('tx', ""))
        userlist_table[row_index, 4] = str(coordinates.get('ty', ""))
        userlist_table[row_index, 5] = str(coordinates.get('tz', ""))

def update_data_table(payload):
    """Updates the data_table with incoming payload data."""
    if not data_table.numRows:  # Ensure data_table is initialized
        initialize_data_table()
    
    for channel_name, value in payload.items():
        found_row = None
        for row in range(1, data_table.numRows):
            if data_table[row, 0].val == channel_name:
                found_row = row
                break
        if found_row is not None:
            data_table[found_row, 1] = str(value)
        else:
            data_table.appendRow([channel_name, str(value)])

def onReceiveText(dat, rowIndex, message):
    """Handles incoming WebSocket messages."""
    global row_index_cache

    try:
        # Parse the incoming message
        data = json.loads(message)
        msg_type = data.get('type', None)

        # Welcome message handler
        if msg_type == 'welcome':
            uuid = data.get('id', None)
            secret = data.get('secret', None)
            if uuid and userid_table:
                if userid_table.numRows != 2 or userid_table[1, 0].val != uuid:
                    userid_table.clear()
                    userid_table.appendRow(['UUID'])
                    userid_table.appendRow([uuid])
                print(f"User UUID received and updated: {uuid}")
                
                # Store the secret for future reconnections
                secret_table = op('secret_table')
                if secret_table:
                    secret_table.clear()
                    secret_table.appendRow(['Secret'])
                    secret_table.appendRow([secret])

        # User update message handler
        elif msg_type == 'userupdate':
            users = data.get('users', [])
            if userlist_table:
                update_userlist_table(users)

        # User coordinate update handler
        elif msg_type == 'usercoordinateupdate':
            from_uuid = data.get('from', None)
            coordinates = data.get('coordinates', {})
            if from_uuid and userlist_table:
                update_user_coordinates(from_uuid, coordinates)

        # Data message handler
        elif msg_type == 'data':
            from_uuid = data.get('from', None)
            payload = data.get('data', {})
            if data_table:
                initialize_data_table()  # Ensure the table is always clean and ready
                update_data_table(payload)

        # Ping message handler
        elif msg_type == 'ping':
            print(f"Ping received: {data}")
            if ping_trigger:
                ping_trigger.par.triggerpulse.pulse()

        # ListeningTo update handler
        elif msg_type == 'updatelisteningto':
            from_uuid = data.get('from', None)
            new_listening_to = data.get('newListeningTo', [])
            if from_uuid and isinstance(new_listening_to, list):
                # Update only the sender's listeningTo list
                if from_uuid in row_index_cache:
                    row_index = row_index_cache[from_uuid]
                    userlist_table[row_index, 8] = ','.join(new_listening_to)  # Update textstream or listening column
                    initialize_data_table()  # Clear any old data tied to previous listening
                    print(f"Updated listeningTo for {from_uuid}: {new_listening_to}")
                else:
                    print(f"UUID {from_uuid} not found in userlist_table for listeningTo update.")

        else:
            print(f"Unhandled message type: {msg_type}")

    except json.JSONDecodeError:
        print("Non-JSON message received:", message)

    return