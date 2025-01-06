# Hypergrid Parameter Standards

## Parameter Save/Load Status

### ✅ Parameters That Save and Load Correctly
1. `gridDensity` - Grid density value is properly saved and restored
2. `volumeScale` - Volume scale is preserved between sessions
3. `pointSize` - Point size settings are maintained
4. `cameraDistance` - Camera distance is correctly restored
5. `pointBrightness` - Brightness values are preserved
6. `traceDepth` - Trace depth settings are maintained

### ❌ Parameters That Don't Save/Load Properly
1. `rotationSpeed` - Not being picked up in updateRotations() function
2. `rotationScale` - Scale changes not being applied to rotation calculations
3. All rotation angles (wx, wy, wz, xy, xz, yz):
   - Values are saved but not properly restored in rotationState
   - Initial rotation state not being set from preset values
   - Rotation controls not updating to reflect loaded values

## Root Causes

### Rotation State Management Issues
1. The rotationState object is initialized before preset loading:
```javascript
let rotationState = {
    wx: 0, wy: 0, wz: 0,
    xy: 0, xz: 0, yz: 0,
    lastTime: 0
};
```
Should be updated after preset loading.

2. Missing synchronization between UI controls and internal state:
```javascript
function loadPreset(name) {
    const settings = defaultPresets[name];
    // Updates UI controls but not internal rotation state
}
```

### Speed/Scale Application Issues
1. Rotation speed not being applied in updateRotations:
```javascript
function updateRotations(currentTime) {
    // Speed and scale values not being properly retrieved from settings
}
```

## Required Fixes

1. Update rotation state initialization:
```javascript
function loadPreset(name) {
    const settings = defaultPresets[name];
    // Update both UI controls AND rotation state
    rotationState = {
        wx: settings.wxRotation,
        wy: settings.wyRotation,
        // ... etc
    };
}
```

2. Fix speed and scale application:
```javascript
function updateRotations(currentTime) {
    const settings = getCurrentSettings();
    const speed = parseFloat(rotationSpeedControl.value);
    const scale = parseFloat(rotationScaleControl.value);
    // Apply these values in calculations
}
```

3. Synchronize UI with internal state:
```javascript
// Add event listeners that update both UI and internal state
rotationControls.forEach(control => {
    control.addEventListener('input', () => {
        // Update both UI and rotationState
    });
});
```

## Best Practices
1. Always update both UI controls and internal state when loading presets
2. Validate all numeric values during save/load
3. Use consistent naming between UI controls and internal state
4. Maintain a single source of truth for each parameter
5. Add error handling for missing or invalid parameters

## Future Improvements
1. Add parameter validation on save/load
2. Implement preset versioning for backwards compatibility
3. Add parameter groups for better organization
4. Create parameter dependencies system
5. Add parameter interpolation for smooth transitions
