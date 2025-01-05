document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const inputData = document.getElementById('inputData');
    const resultOutput = document.getElementById('resultOutput');
    const charCount = document.getElementById('charCount');
    const encoderSelect = document.getElementById('encoderSelect');
    const toast = document.getElementById('toast');
    const helpModal = document.getElementById('helpModal');
    const debugLog = document.getElementById('debugLog');
    const debugContent = debugLog.querySelector('.debug-content');
    
    // Theme handling
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.querySelector('.mdi').classList.toggle('mdi-weather-night', isDark);
        themeToggle.querySelector('.mdi').classList.toggle('mdi-weather-sunny', !isDark);
    }
    
    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme === 'dark');
    } else {
        setTheme(prefersDark.matches);
    }
    
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        setTheme(!isDark);
    });
    
    // Character count
    inputData.addEventListener('input', () => {
        const count = inputData.value.length;
        charCount.textContent = `${count.toLocaleString()} characters`;
    });
    
    // Toast notifications
    function showToast(message, type = '') {
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
    
    // Format JSON
    function formatJSON(json) {
        try {
            const obj = typeof json === 'string' ? JSON.parse(json) : json;
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            showToast('Invalid JSON format', 'error');
            return json;
        }
    }
    
    // Debug log handling
    let autoScroll = true;
    let wordWrap = true;
    
    function addDebugEntry(message, type = '') {
        const entry = document.createElement('div');
        entry.className = 'debug-entry';
        
        const timestamp = document.createElement('div');
        timestamp.className = 'debug-timestamp';
        timestamp.textContent = new Date().toISOString();
        
        const messageEl = document.createElement('div');
        messageEl.className = 'debug-message ' + type;
        messageEl.textContent = message;
        
        entry.appendChild(timestamp);
        entry.appendChild(messageEl);
        debugContent.appendChild(entry);
        
        if (autoScroll) {
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    }
    
    // Debug controls
    document.getElementById('toggleDebugBtn').addEventListener('click', () => {
        debugLog.classList.toggle('show');
        if (debugLog.classList.contains('show')) {
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    });
    
    document.getElementById('clearDebugBtn').addEventListener('click', () => {
        debugContent.innerHTML = '';
        addDebugEntry('Debug log cleared', 'success');
    });
    
    document.getElementById('toggleAutoScrollBtn').addEventListener('click', (e) => {
        autoScroll = !autoScroll;
        e.currentTarget.classList.toggle('active', autoScroll);
    });
    
    document.getElementById('toggleWordWrapBtn').addEventListener('click', (e) => {
        wordWrap = !wordWrap;
        debugContent.classList.toggle('nowrap', !wordWrap);
        e.currentTarget.classList.toggle('active', wordWrap);
    });
    
    // Button handlers
    document.getElementById('formatBtn').addEventListener('click', () => {
        inputData.value = formatJSON(inputData.value);
        showToast('JSON formatted', 'success');
    });
    
    document.getElementById('copyBtn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(resultOutput.textContent);
            showToast('Copied to clipboard', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        inputData.value = '';
        resultOutput.textContent = '';
        charCount.textContent = '0 characters';
        showToast('Editor cleared');
    });
    
    document.getElementById('helpBtn').addEventListener('click', () => {
        helpModal.classList.add('show');
    });
    
    document.querySelector('.close-button').addEventListener('click', () => {
        helpModal.classList.remove('show');
    });
    
    document.getElementById('expandBtn').addEventListener('click', () => {
        const container = document.querySelector('.result-container');
        container.classList.toggle('expanded');
        if (container.classList.contains('expanded')) {
            container.style.gridColumn = 'span 2';
        } else {
            container.style.gridColumn = '';
        }
    });
    
    // API calls
    async function createObject() {
        try {
            const data = JSON.parse(inputData.value);
            addDebugEntry('Creating object...', 'info');
            addDebugEntry('Request data: ' + JSON.stringify(data, null, 2));
            
            const response = await fetch('/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    encoder: encoderSelect.value
                })
            });
            
            const result = await response.json();
            if (response.ok) {
                resultOutput.textContent = formatJSON(result);
                showToast('Object created successfully', 'success');
                addDebugEntry('Object created successfully', 'success');
                
                // Auto-fill UUID and key fields
                document.getElementById('uuidInput').value = result.uuid;
                document.getElementById('keyInput').value = result.encryption_key;
            } else {
                showToast(result.error || 'Failed to create object', 'error');
                addDebugEntry('Error: ' + (result.error || 'Failed to create object'), 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
            addDebugEntry('Error: ' + e.message, 'error');
        }
    }
    
    async function retrieveObject() {
        const uuid = document.getElementById('uuidInput').value;
        const key = document.getElementById('keyInput').value;
        
        if (!uuid || !key) {
            showToast('UUID and encryption key are required', 'error');
            return;
        }
        
        try {
            addDebugEntry(`Retrieving object ${uuid}...`, 'info');
            
            const response = await fetch(`/retrieve/${uuid}?key=${encodeURIComponent(key)}`);
            const result = await response.json();
            
            if (response.ok) {
                resultOutput.textContent = formatJSON(result);
                showToast('Object retrieved successfully', 'success');
                addDebugEntry('Object retrieved successfully', 'success');
            } else {
                showToast(result.error || 'Failed to retrieve object', 'error');
                addDebugEntry('Error: ' + (result.error || 'Failed to retrieve object'), 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
            addDebugEntry('Error: ' + e.message, 'error');
        }
    }
    
    async function modifyObject() {
        const uuid = document.getElementById('uuidInput').value;
        const key = document.getElementById('keyInput').value;
        
        if (!uuid || !key) {
            showToast('UUID and encryption key are required', 'error');
            return;
        }
        
        try {
            const modifications = JSON.parse(inputData.value);
            addDebugEntry(`Modifying object ${uuid}...`, 'info');
            addDebugEntry('Modifications: ' + JSON.stringify(modifications, null, 2));
            
            const response = await fetch(`/modify/${uuid}?key=${encodeURIComponent(key)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(modifications)
            });
            
            const result = await response.json();
            if (response.ok) {
                resultOutput.textContent = formatJSON(result);
                showToast('Object modified successfully', 'success');
                addDebugEntry('Object modified successfully', 'success');
            } else {
                showToast(result.error || 'Failed to modify object', 'error');
                addDebugEntry('Error: ' + (result.error || 'Failed to modify object'), 'error');
            }
        } catch (e) {
            showToast(e.message, 'error');
            addDebugEntry('Error: ' + e.message, 'error');
        }
    }
    
    // Button click handlers
    document.getElementById('createBtn').addEventListener('click', createObject);
    document.getElementById('retrieveBtn').addEventListener('click', retrieveObject);
    document.getElementById('modifyBtn').addEventListener('click', modifyObject);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'enter':
                    e.preventDefault();
                    createObject();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('formatBtn').click();
                    break;
                case 'l':
                    e.preventDefault();
                    document.getElementById('clearBtn').click();
                    break;
            }
        }
    });
    
    // Example data
    const exampleData = {
        name: "Example Object",
        description: "A sample object to demonstrate Coretex",
        content: {
            message: "Hello, World!",
            timestamp: new Date().toISOString(),
            tags: ["example", "demo", "test"]
        }
    };
    
    inputData.value = formatJSON(exampleData);
    charCount.textContent = `${inputData.value.length.toLocaleString()} characters`;
});
