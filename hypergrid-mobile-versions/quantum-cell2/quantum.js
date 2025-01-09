// Quantum Cell Visualization Core
let canvas, gl;
let points = [];
let colors = [];
let sizes = [];
let positionBuffer, colorBuffer, sizeBuffer;
let rotationMatrixLocation, positionOffsetLocation;
let positionLocation, colorLocation, sizeLocation;
let gridSize = 12;
let shaderProgram;

let navigatorState = {
    position: { x: 0, y: 0, z: 0, w: 0 },
    velocity: { x: 0, y: 0, z: 0, w: 0 },
    rotation: { wx: 0, wy: 0, wz: 0, xy: 0, xz: 0, yz: 0 }
};

// Create and compile shader
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Create shader program
function createShaderProgram(vertexSource, fragmentSource) {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}

// Create WebGL buffers
function createBuffers(points, colors, sizes) {
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
}

// WebGL initialization
function initGL() {
    canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('WebGL not supported');
        return false;
    }

    // Get shader sources
    const vertexSource = document.getElementById('vertexShader').textContent;
    const fragmentSource = document.getElementById('fragmentShader').textContent;
    
    // Create shader program
    shaderProgram = createShaderProgram(vertexSource, fragmentSource);
    if (!shaderProgram) return false;
    
    gl.useProgram(shaderProgram);
    
    // Get attribute locations
    positionLocation = gl.getAttribLocation(shaderProgram, 'position');
    colorLocation = gl.getAttribLocation(shaderProgram, 'color');
    sizeLocation = gl.getAttribLocation(shaderProgram, 'size');
    
    // Get uniform locations
    rotationMatrixLocation = gl.getUniformLocation(shaderProgram, 'rotationMatrix');
    positionOffsetLocation = gl.getUniformLocation(shaderProgram, 'positionOffset');
    
    // Enable attributes
    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(colorLocation);
    gl.enableVertexAttribArray(sizeLocation);
    
    // Set up WebGL state
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    return true;
}

// Generate 4D points with enhanced density
function generatePoints(size = 12, count = 1000) {
    const newPoints = [];
    const newColors = [];
    const newSizes = [];
    
    for (let i = 0; i < count; i++) {
        // Generate 4D coordinates using quantum probability distribution
        const radius = Math.random() * size;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const omega = Math.random() * Math.PI * 2;

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        const w = radius * Math.sin(omega);

        newPoints.push(x, y, z, w);

        // Generate colors based on quantum state
        const hue = (i * 360 / count) % 360;
        const rgb = hslToRgb(hue / 360, 0.8, 0.5);
        newColors.push(rgb[0], rgb[1], rgb[2], 1.0);

        // Particle size based on quantum probability
        const size = 2.0 + Math.random() * 3.0;
        newSizes.push(size);
    }

    return { points: newPoints, colors: newColors, sizes: newSizes };
}

// Color conversion utility
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
}

// Update quantum state
function updateQuantumState(state) {
    const colors = [];
    for (let i = 0; i < points.length / 4; i++) {
        const hue = (state * 180 + i * 360 / (points.length / 4)) % 360;
        const rgb = hslToRgb(hue / 360, 0.8, 0.5);
        colors.push(rgb[0], rgb[1], rgb[2], 1.0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

// 4D rotation matrix
function get4DRotationMatrix(wx, wy, wz, xy, xz, yz) {
    // Implementation of 4D rotation matrix
    // This is a simplified version - you can expand this for more complex rotations
    const matrix = new Float32Array(16);
    matrix[0] = Math.cos(wx);
    matrix[5] = Math.cos(wy);
    matrix[10] = Math.cos(wz);
    matrix[15] = 1.0;
    return matrix;
}

// Animation loop
function animate(timestamp) {
    if (!gl || !shaderProgram) return;
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Update rotation
    navigatorState.rotation.wx += 0.001;
    navigatorState.rotation.wy += 0.002;
    navigatorState.rotation.wz += 0.003;

    // Get rotation matrix
    const rotationMatrix = get4DRotationMatrix(
        navigatorState.rotation.wx,
        navigatorState.rotation.wy,
        navigatorState.rotation.wz,
        navigatorState.rotation.xy,
        navigatorState.rotation.xz,
        navigatorState.rotation.yz
    );

    // Use shader program
    gl.useProgram(shaderProgram);

    // Update uniforms
    gl.uniformMatrix4fv(rotationMatrixLocation, false, rotationMatrix);
    gl.uniform4f(positionOffsetLocation, 
        navigatorState.position.x,
        navigatorState.position.y,
        navigatorState.position.z,
        navigatorState.position.w
    );

    // Bind vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLocation);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(sizeLocation);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, points.length / 4);

    requestAnimationFrame(animate);
}

// Initialize controls
function initControls() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + 'Value');
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
            
            if (slider.id === 'particleCount' || slider.id === 'particleDepth') {
                const depth = parseInt(document.getElementById('particleDepth').value);
                const count = parseInt(document.getElementById('particleCount').value);
                const generated = generatePoints(depth, count);
                updateBuffers(generated.points, generated.colors, generated.sizes);
            } else if (slider.id === 'wDimension') {
                navigatorState.position.w = parseFloat(slider.value);
            } else if (slider.id === 'quantumState') {
                updateQuantumState(parseFloat(slider.value));
            }
        });
    });
}

// Update WebGL buffers
function updateBuffers(newPoints, newColors, newSizes) {
    points = newPoints;
    colors = newColors;
    sizes = newSizes;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
}

// Window resize handler
function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// Initialize everything
async function init() {
    // Initialize WebGL first
    if (!initGL()) {
        console.error('Failed to initialize WebGL');
        return;
    }
    
    // Generate initial points
    const generated = generatePoints(gridSize, 1000);
    points = generated.points;
    colors = generated.colors;
    sizes = generated.sizes;
    
    // Create buffers after points are generated
    createBuffers(points, colors, sizes);
    
    // Initialize controls last
    initControls();
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Start animation loop
    requestAnimationFrame(animate);
}

// Start the visualization
window.onload = init;
