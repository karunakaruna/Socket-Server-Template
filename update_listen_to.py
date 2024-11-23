import json

ws = op('websocket1')  # WebSocket DAT operator

# A cache to avoid unnecessary duplicate updates
last_selected_user_id = None


# Get the selected user ID
selected_user_id = str(op('select_id')[0, 1])

# Ensure the selected user ID is valid
if selected_user_id and selected_user_id != last_selected_user_id:
    # Create a message to update the 'listeningTo' list
    message = {
        "type": "updatelisteningto",
        "newListeningTo": [selected_user_id]
    }
    # Send the message as JSON to the server
    ws.sendText(json.dumps(message))
    print(f"Sent listeningTo update: {message}")
    
    # Update the cache
    last_selected_user_id = selected_user_id
elif not selected_user_id:
    print("No user ID selected")
else:
    print(f"Selected user ID has not changed: {selected_user_id}")
