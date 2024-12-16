import json

# Get references to TouchDesigner operators
data_table = op('data_table')
userlist_table = op('userlist')
userid_table = op('userid')
ping_trigger = op('ping')
websocket = op('websocket1')

# Cache for userlist table row indices
row_index_cache = {}

def initialize_data_table():
    """Clears and initializes the data_table with the correct column structure."""
    global data_table
    data_table.clear()
    data_table.appendRow(["Channel", "Value"])

def initialize_userlist_table():
    """Clears and initializes the userlist_table with the correct column structure."""
    global userlist_table
    userlist_table.clear()
    userlist_table.appendRow(["Row", "UUIDs", "username", "tx", "ty", "tz", "afk", "description", "textstream"])

def send_clearlist():
    """Sends a 'clearlist' message to the server."""
    global websocket
    message = {"type": "clearlist"}
    websocket.sendText(json.dumps(message))

def send_username_update(username):
    """Sends a username update message to the server."""
    global websocket
    message = {
        "type": "updatemetadata",
        "username": username
    }
    websocket.sendText(json.dumps(message))
    print(f"Sent username update: {username}")

def send_coordinate_update(tx, ty, tz):
    """Sends a coordinate update message to the server."""
    global websocket
    message = {
        "type": "usercoordinate",
        "coordinates": {
            "tx": float(tx),
            "ty": float(ty),
            "tz": float(tz)
        }
    }
    websocket.sendText(json.dumps(message))

def send_metadata_update(username=None, description=None, afk=None, textstream=None):
    """Sends a metadata update message to the server."""
    global websocket
    update_data = {}
    if username is not None:
        update_data["username"] = username
    if description is not None:
        update_data["description"] = description
    if afk is not None:
        update_data["afk"] = afk
    if textstream is not None:
        update_data["textstream"] = textstream
    
    if update_data:
        message = {
            "type": "updatemetadata",
            **update_data
        }
        websocket.sendText(json.dumps(message))
        print(f"Sent metadata update: {update_data}")

def rebuild_row_index_cache():
    """Rebuilds the row index cache to maintain synchronization with the table."""
    global row_index_cache, userlist_table
    row_index_cache = {
        userlist_table[row, 1].val: row
        for row in range(1, userlist_table.numRows)
    }

def update_userlist_table(users):
    """Rebuilds the userlist_table based on the received user data."""
    global row_index_cache, userlist_table
    print("Updating userlist table with users:", users)
    
    if not users:
        initialize_userlist_table()
        row_index_cache.clear()
        return

    try:
        initialize_userlist_table()

        for idx, user in enumerate(users):
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

            # Convert all values to strings for TD table
            row_data = [
                str(idx),
                str(user_id),
                str(username),
                str(tx),
                str(ty),
                str(tz),
                str(afk),
                str(description),
                str(textstream)
            ]
            userlist_table.appendRow(row_data)
            print(f"Added user to table: {row_data}")

        rebuild_row_index_cache()
        print("Updated userlist table successfully")
    except Exception as e:
        print(f"Error updating userlist table: {str(e)}")

def update_user_coordinates(from_uuid, coordinates):
    """Updates user coordinates in the userlist_table."""
    global row_index_cache, userlist_table
    try:
        if from_uuid in row_index_cache:
            row_index = row_index_cache[from_uuid]
            userlist_table[row_index, 3] = str(coordinates.get('tx', ""))
            userlist_table[row_index, 4] = str(coordinates.get('ty', ""))
            userlist_table[row_index, 5] = str(coordinates.get('tz', ""))
            print(f"Updated coordinates for user {from_uuid}")
    except Exception as e:
        print(f"Error updating coordinates: {str(e)}")

def update_data_table(payload):
    """Updates the data_table with incoming payload data."""
    global data_table
    try:
        if not data_table.numRows:
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
    except Exception as e:
        print(f"Error updating data table: {str(e)}")

def onReceiveText(dat, rowIndex, message):
    """Handles incoming WebSocket messages."""
    global row_index_cache, userid_table, userlist_table, data_table, ping_trigger
    
    try:
        data = json.loads(message)
        msg_type = data.get('type', None)
        print(f"Received message type: {msg_type}")

        if msg_type == 'welcome':
            uuid = data.get('id', None)
            if uuid and userid_table:
                try:
                    userid_table.clear()
                    userid_table.appendRow(['UUID'])
                    userid_table.appendRow([uuid])
                    print(f"User UUID received and updated: {uuid}")
                except Exception as e:
                    print(f"Error updating UUID table: {str(e)}")

        elif msg_type == 'userupdate':
            users = data.get('users', [])
            if userlist_table:
                update_userlist_table(users)

        elif msg_type == 'usercoordinateupdate':
            from_uuid = data.get('from', None)
            coordinates = data.get('coordinates', {})
            if from_uuid and userlist_table:
                update_user_coordinates(from_uuid, coordinates)

        elif msg_type == 'data':
            from_uuid = data.get('from', None)
            payload = data.get('data', {})
            if data_table:
                update_data_table(payload)

        elif msg_type == 'ping':
            if ping_trigger:
                ping_trigger.par.triggerpulse.pulse()

    except json.JSONDecodeError:
        print("Non-JSON message received:", message)
    except Exception as e:
        print(f"Error in onReceiveText: {str(e)}")

    return

def onCellChange(dat, cells, prevCellVals=None):
    """Triggered when data in the editable table changes."""
    if not cells:  # Ensure cells is not empty
        print("No cells to process.")
        return

    # Get the current user's UUID
    try:
        current_user_uuid = userid_table[1, 0].val if userid_table.numRows > 1 else None
    except Exception as e:
        print(f"Error accessing UUID: {e}")
        return

    if not current_user_uuid:
        print("Error: Current user's UUID not found.")
        return

    print(f"Current user UUID: {current_user_uuid}")

    column_mapping = {
        1: 'username',  # userdata column 1 corresponds to 'username' in userlist_table
        2: 'description',
        3: 'afk',
        4: 'textstream'
    }

    for cell in cells:
        if cell is None or not cell.valid:  # Skip invalid or empty cells
            continue

        row_index = cell.row
        col_index = cell.col

        # Log which cell is being processed
        print(f"Processing cell at row {row_index}, column {col_index}...")

        # Only update editable rows (skip header row)
        if row_index > 0:
            # Get the updated value from the table
            try:
                updated_value = dat[row_index, col_index].val if dat[row_index, col_index] else None
            except Exception as e:
                print(f"Error accessing updated value: {e}")
                continue

            if updated_value is None:
                print(f"Skipped update for empty value at row {row_index}, col {col_index}.")
                continue

            print(f"Updated value for row {row_index}, column {col_index}: {updated_value}")

            # Get the target column name from the mapping
            target_column_name = column_mapping.get(col_index)
            if not target_column_name:
                print(f"No matching column in userlist_table for userdata column {col_index}.")
                continue

            # Update the corresponding row in the userlist_table
            for user_row in range(1, userlist_table.numRows):  # Skip the header row
                try:
                    user_uuid_in_table = userlist_table[user_row, 1].val
                    print(f"Checking userlist_table row {user_row} for UUID: {user_uuid_in_table}")

                    if user_uuid_in_table == current_user_uuid:  # Match by UUID column (column 1)
                        # Find the correct column index in userlist_table
                        for col in range(userlist_table.numCols):
                            if userlist_table[0, col].val == target_column_name:
                                # Update the corresponding cell
                                userlist_table[user_row, col] = updated_value
                                print(f"Updated {target_column_name} for user {current_user_uuid} to {updated_value} in row {user_row}.")

                                # Send the update to the server with the correct format
                                message = {
                                    "type": "updatemetadata",
                                    target_column_name: updated_value
                                }
                                websocket.sendText(json.dumps(message))
                                print(f"Sent update for user {current_user_uuid}: {message}")
                                break
                except Exception as e:
                    print(f"Error updating row {user_row}: {e}")
    return
