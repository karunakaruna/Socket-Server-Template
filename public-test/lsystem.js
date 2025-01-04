import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let lSystemGeometries = [];

// L-System state
const MAX_STACK_DEPTH = 30;
let currentLength = 1;
let currentAngle = 25.7;
let currentThickness = 1;

// Define colors for each axiom
const AXIOM_COLORS = {
    'A': 0xFF1493,  // Deep Pink
    'B': 0x32CD32,  // Lime Green
    'C': 0x00BFFF,  // Deep Sky Blue
};

class TurtleState {
    constructor(position, direction, up, axiom) {
        this.position = position.clone();
        this.direction = direction.clone();
        this.up = up.clone();
        this.axiom = axiom;
    }
}

class LSystem {
    constructor() {
        this.axiom = '';
        this.rules = new Map();
        this.result = '';
        this.iterations = 0;
    }

    addRule(predecessor, successor) {
        // Extract variable name and parameters if any
        const match = predecessor.match(/([A-Z])(?:\((.*?)\))?/);
        if (match) {
            const [_, variable, params] = match;
            this.rules.set(variable, {
                params: params ? params.split(',') : [],
                successor: successor
            });
        }
    }

    evaluateRule(variable, params) {
        const rule = this.rules.get(variable);
        if (!rule) return variable;

        let result = rule.successor;
        if (rule.params.length > 0 && params) {
            // Create a function to evaluate mathematical expressions in parameters
            const evaluateExpression = (expr) => {
                try {
                    // Replace mathematical operations
                    return Function(`return ${expr}`)();
                } catch (e) {
                    return expr;
                }
            };

            // Replace parameter variables in the successor
            rule.params.forEach((param, i) => {
                const regex = new RegExp(`${param}(?![a-zA-Z0-9_])`, 'g');
                const value = evaluateExpression(params[i]);
                result = result.replace(regex, value);
            });

            // Evaluate any remaining mathematical expressions in parentheses
            result = result.replace(/\(([^()]+)\)/g, (match, expr) => {
                if (expr.includes('*') || expr.includes('/') || expr.includes('+') || expr.includes('-')) {
                    return `(${evaluateExpression(expr)})`;
                }
                return match;
            });
        }
        return result;
    }

    generate(axiom, iterations) {
        this.axiom = axiom;
        this.iterations = iterations;
        this.result = this.axiom;

        for (let i = 0; i < iterations; i++) {
            let newResult = '';
            let j = 0;
            while (j < this.result.length) {
                const char = this.result[j];
                if (/[A-Z]/.test(char)) {
                    // Check for parameters
                    let params = [];
                    if (j + 1 < this.result.length && this.result[j + 1] === '(') {
                        let parenCount = 1;
                        let k = j + 2;
                        let paramStr = '';
                        while (k < this.result.length && parenCount > 0) {
                            if (this.result[k] === '(') parenCount++;
                            if (this.result[k] === ')') parenCount--;
                            if (parenCount > 0) paramStr += this.result[k];
                            k++;
                        }
                        if (paramStr) {
                            params = paramStr.split(',');
                            j = k - 1;
                        }
                    }
                    newResult += this.evaluateRule(char, params);
                } else {
                    newResult += char;
                }
                j++;
            }
            this.result = newResult;
        }
        return this.result;
    }
}

function initThreeJS() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1b26);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);

    // Renderer setup
    const container = document.getElementById('scene-container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const container = document.getElementById('scene-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function generateLSystem() {
    const axiom = document.getElementById('axiom').value;
    const rulesText = document.getElementById('rules').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    currentAngle = parseFloat(document.getElementById('angle').value);
    currentLength = parseFloat(document.getElementById('length').value);

    // Parse rules
    const rules = {};
    rulesText.split('\n').forEach(rule => {
        if (rule.includes('=')) {
            const [left, right] = rule.split('=');
            rules[left.trim()] = right.trim();
        }
    });

    // Apply rules with axiom tracking
    let result = axiom;
    console.log("Starting with:", result);
    
    for (let i = 0; i < iterations; i++) {
        let next = '';
        let j = 0;
        
        while (j < result.length) {
            const char = result[j];
            
            // Check if this is an axiom character
            if (char === 'A' || char === 'B' || char === 'C') {
                if (rules[char]) {
                    // Add axiom marker to each F in the rule, preserving all other characters
                    let rule = rules[char];
                    let ruleWithMarkers = '';
                    let k = 0;
                    while (k < rule.length) {
                        if (rule[k] === 'F') {
                            ruleWithMarkers += `F(${char})`;
                            k++;
                        } else {
                            // Copy any other character as-is
                            ruleWithMarkers += rule[k];
                            k++;
                        }
                    }
                    next += ruleWithMarkers;
                } else {
                    next += char;
                }
            } else {
                // Copy any non-axiom character as-is (including brackets)
                next += char;
            }
            j++;
        }
        
        result = next;
        console.log(`After iteration ${i + 1}:`, result.substring(0, 100) + "...");
    }

    console.log("Final L-System length:", result.length);
    interpretLSystem(result);
}

function interpretLSystem(lSystemString) {
    console.log("Starting interpretation");
    
    // Clear existing geometries
    lSystemGeometries.forEach(geo => scene.remove(geo));
    lSystemGeometries = [];

    // Separate points for each axiom type
    const pointsByAxiom = {
        'A': [],
        'B': [],
        'C': []
    };

    const stack = [];
    let currentAxiom = 'A';  // Start with A as default
    let currentPosition = new THREE.Vector3(0, 0, 0);
    let direction = new THREE.Vector3(0, 1, 0);
    let up = new THREE.Vector3(0, 0, 1);

    function addLineToAxiom(start, end, axiom) {
        // Ensure we have a valid axiom
        if (axiom !== 'A' && axiom !== 'B' && axiom !== 'C') {
            console.warn(`Invalid axiom: ${axiom}, using current axiom ${currentAxiom}`);
            axiom = currentAxiom;
        }
        
        pointsByAxiom[axiom].push(start.clone());
        pointsByAxiom[axiom].push(end.clone());
    }

    let i = 0;
    while (i < lSystemString.length) {
        const char = lSystemString[i];
        
        // Update current axiom
        if (char === 'A' || char === 'B' || char === 'C') {
            currentAxiom = char;
            i++;
            continue;
        }

        // Handle drawing commands
        if (char === 'F') {
            let drawingAxiom = currentAxiom;
            
            // Check for axiom marker F(X)
            if (lSystemString[i + 1] === '(') {
                const closeParen = lSystemString.indexOf(')', i);
                if (closeParen > -1) {
                    const markedAxiom = lSystemString[i + 2];
                    if (markedAxiom === 'A' || markedAxiom === 'B' || markedAxiom === 'C') {
                        drawingAxiom = markedAxiom;
                    }
                    i = closeParen;
                }
            }
            
            const start = currentPosition.clone();
            direction.normalize();
            const moveDir = direction.clone().multiplyScalar(currentLength);
            currentPosition.add(moveDir);
            addLineToAxiom(start, currentPosition.clone(), drawingAxiom);
            
        } else if (char === '[') {
            stack.push({
                position: currentPosition.clone(),
                direction: direction.clone(),
                up: up.clone(),
                axiom: currentAxiom
            });
        } else if (char === ']') {
            if (stack.length > 0) {
                const state = stack.pop();
                currentPosition = state.position;
                direction = state.direction;
                up = state.up;
                currentAxiom = state.axiom;
            }
        } else if (char === '+') {
            // Turn left around up vector
            direction.applyAxisAngle(up, -currentAngle * Math.PI / 180);
        } else if (char === '-') {
            // Turn right around up vector
            direction.applyAxisAngle(up, currentAngle * Math.PI / 180);
        } else if (char === '\\') {
            // Roll clockwise around direction vector
            up.applyAxisAngle(direction, currentAngle * Math.PI / 180);
        } else if (char === '/') {
            // Roll counter-clockwise around direction vector
            up.applyAxisAngle(direction, -currentAngle * Math.PI / 180);
        }
        
        i++;
    }

    // Create geometries for each axiom type
    Object.entries(pointsByAxiom).forEach(([axiom, points]) => {
        console.log(`Creating geometry for axiom ${axiom} with ${points.length} points`);
        if (points.length > 0) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color: AXIOM_COLORS[axiom],
                linewidth: 2
            });
            const lines = new THREE.LineSegments(geometry, material);
            lSystemGeometries.push(lines);
            scene.add(lines);
        }
    });

    if (isFirstRender && lSystemGeometries.length > 0) {
        const box = new THREE.Box3();
        lSystemGeometries.forEach(geo => box.expandByObject(geo));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        camera.position.copy(center);
        camera.position.z += maxDim * 2;
        controls.target.copy(center);
        isFirstRender = false;
    }
}

// HUD functionality
function colorizeText(text) {
    let coloredText = '';
    for (let char of text) {
        if (AXIOM_COLORS[char]) {
            const color = '#' + AXIOM_COLORS[char].toString(16).padStart(6, '0');
            coloredText += `<span style="color: ${color}">${char}</span>`;
        } else {
            coloredText += char;
        }
    }
    return coloredText;
}

function updateHUD() {
    const axiomInput = document.getElementById('axiom');
    const rulesInput = document.getElementById('rules');
    const hudAxiom = document.getElementById('hud-axiom');
    const hudRules = document.getElementById('hud-rules');

    if (axiomInput && rulesInput && hudAxiom && hudRules) {
        hudAxiom.innerHTML = colorizeText(axiomInput.value);
        hudRules.innerHTML = colorizeText(rulesInput.value);
    }
}

// L-System save/load functionality
function saveLSystem() {
    const lsystem = {
        plantname: document.getElementById('plantname').value || 'Untitled L-System',
        author: document.getElementById('author').value || 'Anonymous',
        created: new Date().toISOString(),
        axiom: document.getElementById('axiom').value,
        rules: document.getElementById('rules').value,
        iterations: parseInt(document.getElementById('iterations').value),
        angle: parseFloat(document.getElementById('angle').value),
        stepLength: parseFloat(document.getElementById('length').value),
        description: document.getElementById('description').value || ''
    };

    // Create a JSON file
    const blob = new Blob([JSON.stringify(lsystem, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `${lsystem.plantname.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show save status
    const saveStatus = document.getElementById('save-status');
    saveStatus.textContent = 'L-System saved!';
    setTimeout(() => {
        saveStatus.textContent = '';
    }, 2000);
}

function loadLSystem(json) {
    try {
        const lsystem = JSON.parse(json);
        document.getElementById('plantname').value = lsystem.plantname || '';
        document.getElementById('author').value = lsystem.author || '';
        document.getElementById('description').value = lsystem.description || '';
        document.getElementById('axiom').value = lsystem.axiom || '';
        document.getElementById('rules').value = lsystem.rules || '';
        document.getElementById('iterations').value = lsystem.iterations || 3;
        document.getElementById('angle').value = lsystem.angle || 25.7;
        document.getElementById('length').value = lsystem.stepLength || 1;
        
        updateHUD();
        generateLSystem();
        return true;
    } catch (e) {
        console.error('Error loading L-System:', e);
        return false;
    }
}

// Preset management
let userPresets = [];

function loadUserPresets() {
    const savedPresets = localStorage.getItem('lsystem-user-presets');
    if (savedPresets) {
        userPresets = JSON.parse(savedPresets);
        updatePresetList();
    }
}

function saveUserPresets() {
    localStorage.setItem('lsystem-user-presets', JSON.stringify(userPresets));
    updatePresetList();
}

function updatePresetList() {
    const presetList = document.getElementById('user-presets');
    presetList.innerHTML = '';
    
    userPresets.forEach((preset, index) => {
        const presetButton = document.createElement('button');
        presetButton.innerHTML = `
            ${preset.plantname}
            <span class="delete-preset" data-index="${index}">×</span>
        `;
        presetButton.onclick = (e) => {
            if (e.target.classList.contains('delete-preset')) {
                userPresets.splice(parseInt(e.target.dataset.index), 1);
                saveUserPresets();
            } else {
                loadLSystem(JSON.stringify(preset));
            }
        };
        presetList.appendChild(presetButton);
    });
}

function savePreset() {
    const preset = {
        plantname: document.getElementById('plantname').value || 'Untitled L-System',
        author: document.getElementById('author').value || 'Anonymous',
        created: new Date().toISOString(),
        axiom: document.getElementById('axiom').value,
        rules: document.getElementById('rules').value,
        iterations: parseInt(document.getElementById('iterations').value),
        angle: parseFloat(document.getElementById('angle').value),
        stepLength: parseFloat(document.getElementById('length').value),
        description: document.getElementById('description').value || ''
    };

    userPresets.push(preset);
    saveUserPresets();

    // Show save status
    const saveStatus = document.getElementById('save-status');
    saveStatus.textContent = 'Preset saved!';
    setTimeout(() => {
        saveStatus.textContent = '';
    }, 2000);
}

function setupEventListeners() {
    // Make all inputs reactive
    ['axiom', 'rules', 'iterations', 'length'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            if (id === 'axiom' || id === 'rules') {
                updateHUD();
            }
            if (!isFirstRender) {
                generateLSystem();
            }
        });
    });

    // Add angle slider event listener
    const angleSlider = document.getElementById('angle');
    const angleValue = document.getElementById('angleValue');
    angleSlider.addEventListener('input', (e) => {
        currentAngle = parseFloat(e.target.value);
        angleValue.textContent = currentAngle + '°';
        if (!isFirstRender) {
            generateLSystem();
        }
    });

    // Add camera reset functionality
    document.getElementById('resetCamera').addEventListener('click', () => {
        camera.position.set(0, 0, 10);
        controls.target.set(0, 0, 0);
        controls.update();
    });

    document.getElementById('preset-plant').addEventListener('click', () => {
        document.getElementById('axiom').value = 'ABC';
        document.getElementById('rules').value = 'A=F(A)[+F(A)][-F(A)]\nB=F(B)[++F(B)][--F(B)]\nC=F(C)[+++F(C)][---F(C)]';
        document.getElementById('angle').value = '25';
        document.getElementById('iterations').value = '4';
        document.getElementById('length').value = '0.5';
        updateHUD();
        generateLSystem();
    });

    document.getElementById('preset-dragon').addEventListener('click', () => {
        document.getElementById('axiom').value = 'A';
        document.getElementById('rules').value = 'A=A+B\nB=F-A';
        document.getElementById('angle').value = '90';
        document.getElementById('iterations').value = '10';
        document.getElementById('length').value = '0.5';
        updateHUD();
        generateLSystem();
    });

    document.getElementById('preset-koch').addEventListener('click', () => {
        document.getElementById('axiom').value = 'A';
        document.getElementById('rules').value = 'A=F+A-A-A+A';
        document.getElementById('angle').value = '60';
        document.getElementById('iterations').value = '4';
        document.getElementById('length').value = '0.5';
        updateHUD();
        generateLSystem();
    });

    document.getElementById('preset-param').addEventListener('click', () => {
        document.getElementById('axiom').value = 'ABC';  // No brackets in axiom
        document.getElementById('rules').value = 'A=F[+FA][-FA]FA\nB=F[+FB][-FB]FB\nC=F[+FC][-FC]FC';
        document.getElementById('angle').value = '35';
        document.getElementById('iterations').value = '4';
        document.getElementById('length').value = '0.5';
        updateHUD();
        generateLSystem();
    });

    // Preset management
    document.getElementById('save-preset').addEventListener('click', savePreset);
    
    document.getElementById('load-preset').addEventListener('click', () => {
        document.getElementById('preset-file').click();
    });

    document.getElementById('preset-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const preset = JSON.parse(e.target.result);
                    userPresets.push(preset);
                    saveUserPresets();
                    loadLSystem(e.target.result);
                } catch (error) {
                    console.error('Error loading preset:', error);
                }
            };
            reader.readAsText(file);
        }
    });

    // Save button
    document.getElementById('save-lsystem').addEventListener('click', saveLSystem);

    // Initial HUD update
    updateHUD();

    // Load saved presets
    loadUserPresets();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize everything
let isFirstRender = true;
initThreeJS();
setupEventListeners();
animate();
