import json

# Reference the WebSocket DAT and tables
ws = op('websocket1')
secret_table = op('secret_table')
userid_table = op('userid')

# me - this DAT
# 
# channel - the Channel object which has changed
# sampleIndex - the index of the changed sample
# val - the numeric value of the changed sample
# prev - the previous sample value
# 
# Make sure the corresponding toggle is enabled in the CHOP Execute DAT.

def onOffToOn(channel, sampleIndex, val, prev):
    if channel.name == 'done':
        print('connection lost')
        op('ping_vis/circle2').par.borderg = 0
        op('ping_vis/circle2').par.borderb = 0
        op('disconnect_error').copy(op('websocket1'))
        op('websocket1').par.reset.pulse()
    return

def whileOn(channel, sampleIndex, val, prev):
    return

def onOnToOff(channel, sampleIndex, val, prev):
    if channel.name == 'done':
        op('ping_vis/circle2').par.borderg = 1
        op('ping_vis/circle2').par.borderb = 1
        op('disconnect_error').clear()
    return

def whileOff(channel, sampleIndex, val, prev):
    return

def onValueChange(channel, sampleIndex, val, prev):
    return