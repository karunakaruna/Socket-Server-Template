import json

# Cache for userlist table row indices
row_index_cache = {}

# Reference tables outside the callback for efficiency
userid_table = op('userid')  # Replace with the exact name of your Table DAT for user IDs
userlist_table = op('userlist')  # Replace with the exact name of your Table DAT for user updates
data_table = op('data_table')  # Replace with the exact name of your Table DAT for incoming data

def update_userlist_table(users):
    """Efficiently updates the userlist table by adding, updating, and removing rows."""
    global row_index_cache

    # Debugging: Print incoming user data
    print("Received users:", users)

    # Build a lookup of existing UUIDs in the table
    existing_uuids = {
        userlist_table[row, 1].val: row
        for row in range(1, userlist_table.numRows)  # Skip the header row
    }

    # Extract the current user IDs from the update
    updated_user_ids = set()
    for user in users:
        try:
            user_id = user['id']  # Try to get the 'id' key
            updated_user_ids.add(user_id)
        except KeyError as e:
            print(f"Missing 'id' in user data: {user}")
            continue

    # Debugging: Log the extracted user IDs
    print("Updated User IDs:", updated_user_ids)

    # Remove rows for users no longer in the updated user list
    for uuid in list(existing_uuids.keys()):
        if uuid not in updated_user_ids:
            row_index = existing_uuids[uuid]
            print(f"Removing user with UUID: {uuid}")
            userlist_table.deleteRow(row_index)  # Delete the row
            del row_index_cache[uuid]  # Remove from cache

    # Add new users or update existing ones
    for user in users:
        try:
            user_id = user['id']
            username = user.get('username', "Unnamed")  # Default to "Unnamed"
            description = user.get('description', "")
            tx = user.get('tx', "")
            ty = user.get('ty', "")
            tz = user.get('tz', "")
            afk = user.get('afk', "False")

            # Debugging: Print user details being processed
            print(f"Processing user: {user_id}, {username}, {description}, {tx}, {ty}, {tz}, {afk}")

            # If the user ID is already in the table, update its row
            if user_id in existing_uuids:
                row_index = existing_uuids[user_id]
                print(f"Updating existing user: {user_id} at row {row_index}")
            else:
                # If the user ID is new, append it to the table
                row_index = userlist_table.numRows
                userlist_table.appendRow([str(row_index - 1), user_id, username, description])
                print(f"Adding new user: {user_id} at row {row_index}")

            # Update frequently changing fields
            userlist_table[row_index, 4] = str(tx)
            userlist_table[row_index, 5] = str(ty)
            userlist_table[row_index, 6] = str(tz)
            userlist_table[row_index, 7] = str(afk)

            # Update the cache
            row_index_cache[user_id] = row_index

    except KeyError as e:
        print(f"Error processing user: {user}, missing key: {e}")
        continue

def update_user_coordinates(from_uuid, coordinates):
    """Updates user coordinates in the userlist table."""
    global row_index_cache

    if from_uuid in row_index_cache:
        row_index = row_index_cache[from_uuid]
        userlist_table[row_index, 4] = str(coordinates.get('tx', ""))  # tx column
        userlist_table[row_index, 5] = str(coordinates.get('ty', ""))  # ty column
        userlist_table[row_index, 6] = str(coordinates.get('tz', ""))  # tz column

def update_data_table(payload):
    """Updates the data_table with incoming payload data."""
    for channel_name, value in payload.items():
        found_row = None
        for row in range(1, data_table.numRows):  # Skip the header row
            if data_table[row, 0].val == channel_name:
                found_row = row
                break
        if found_row is not None:
            data_table[found_row, 1] = str(value)
        else:
            data_table.appendRow([channel_name, str(value)])

def onReceiveText(dat, rowIndex, message):
    global row_index_cache

    try:
        data = json.loads(message)
        msg_type = data.get('type', None)

        if msg_type == 'welcome':
            uuid = data.get('id', None)
            if userid_table:
                # Update UUID table
                if userid_table.numRows != 2 or userid_table[1, 0].val != uuid:
                    userid_table.clear()
                    userid_table.appendRow(['UUID'])
                    userid_table.appendRow([uuid])

        elif msg_type == 'userupdate':
            users = data.get('users', [])
            if userlist_table:
                update_userlist_table(users)

        elif msg_type == 'usercoordinateupdate':
            from_uuid = data.get('from', None)
            coordinates = data.get('coordinates', {})
            if userlist_table:
                update_user_coordinates(from_uuid, coordinates)

        elif msg_type == 'data':
            from_uuid = data.get('from', None)
            payload = data.get('data', {})
            if data_table:
                update_data_table(payload)

        else:
            print(f"Unhandled JSON message type: {msg_type}")

    except json.JSONDecodeError:
        if message.strip() == 'ping':
            print("Received ping message")
        else:
            print("Non-JSON message received:", message)

    return
