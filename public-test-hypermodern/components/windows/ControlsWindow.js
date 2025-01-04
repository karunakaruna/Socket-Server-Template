import { BaseWindow } from './BaseWindow.js';

/**
 * Scene controls window component
 */
export class ControlsWindow extends BaseWindow {
    constructor(eventBus) {
        super('controls-window', 'Scene Controls', eventBus);
        this.autoRotate = false;
        this.showGrid = true;
        this.muteAudio = false;
        this.particleEnergy = 0.5;
        this.particleDensity = 0.5;
        
        // Set default position
        this.defaultPosition = { x: 20, y: 68 }; // Position below nav-bar
    }

    /**
     * Render window content
     */
    renderContent() {
        return `
            <div class="control-section">
                <h4>L-System</h4>
                <div class="control-group">
                    <button id="load-lsystem" class="primary-button compact">Load L-System</button>
                    <input type="file" id="lsystem-file" accept=".json" style="display: none;">
                </div>
            </div>
            <div class="control-section">
                <h4>Scene</h4>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="autoRotate" ${this.autoRotate ? 'checked' : ''}> 
                        Auto Rotate
                    </label>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="showGrid" ${this.showGrid ? 'checked' : ''}> 
                        Show Grid
                    </label>
                </div>
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="muteAudio" ${this.muteAudio ? 'checked' : ''}> 
                        Mute Audio
                    </label>
                </div>
                <div class="control-group">
                    <button id="save-layout" class="secondary-button compact">Save Window Layout</button>
                    <button id="load-layout" class="secondary-button compact">Load Window Layout</button>
                    <input type="file" id="layout-file" accept=".json" style="display: none;">
                </div>
                <div class="control-group">
                    <label for="particle-energy">Particle Energy</label>
                    <div class="slider-container">
                        <input type="range" id="particle-energy" 
                               min="0" max="1" step="0.01" 
                               value="${this.particleEnergy}">
                        <span id="energy-value">${this.particleEnergy}</span>
                    </div>
                </div>
                <div class="control-group">
                    <label for="static-particle-density">Static Field Density</label>
                    <div class="slider-container">
                        <input type="range" id="static-particle-density" 
                               min="0" max="1" step="0.01" 
                               value="${this.particleDensity}">
                        <span id="density-value">${this.particleDensity}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize window content
     */
    initContent() {
        // Set initial position
        this.setPosition(this.defaultPosition.x, this.defaultPosition.y);
        
        // L-System controls
        const loadLSystemBtn = this.element.querySelector('#load-lsystem');
        const lsystemFile = this.element.querySelector('#lsystem-file');
        
        loadLSystemBtn.addEventListener('click', () => {
            lsystemFile.click();
        });

        lsystemFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.eventBus.emit('loadLSystem', { file: e.target.files[0] });
            }
        });

        // Scene controls
        this.element.querySelector('#autoRotate').addEventListener('change', (e) => {
            this.autoRotate = e.target.checked;
            this.eventBus.emit('setAutoRotate', { enabled: this.autoRotate });
        });

        this.element.querySelector('#showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.eventBus.emit('setShowGrid', { enabled: this.showGrid });
        });

        this.element.querySelector('#muteAudio').addEventListener('change', (e) => {
            this.muteAudio = e.target.checked;
            this.eventBus.emit('setMuteAudio', { enabled: this.muteAudio });
        });

        // Layout controls
        const saveLayoutBtn = this.element.querySelector('#save-layout');
        const loadLayoutBtn = this.element.querySelector('#load-layout');
        const layoutFile = this.element.querySelector('#layout-file');

        saveLayoutBtn.addEventListener('click', () => {
            this.eventBus.emit('saveLayout');
        });

        loadLayoutBtn.addEventListener('click', () => {
            layoutFile.click();
        });

        layoutFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.eventBus.emit('loadLayout', { file: e.target.files[0] });
            }
        });

        // Particle controls
        const energySlider = this.element.querySelector('#particle-energy');
        const energyValue = this.element.querySelector('#energy-value');
        const densitySlider = this.element.querySelector('#static-particle-density');
        const densityValue = this.element.querySelector('#density-value');

        energySlider.addEventListener('input', (e) => {
            this.particleEnergy = parseFloat(e.target.value);
            energyValue.textContent = this.particleEnergy.toFixed(2);
            this.eventBus.emit('setParticleEnergy', { value: this.particleEnergy });
        });

        densitySlider.addEventListener('input', (e) => {
            this.particleDensity = parseFloat(e.target.value);
            densityValue.textContent = this.particleDensity.toFixed(2);
            this.eventBus.emit('setParticleDensity', { value: this.particleDensity });
        });
    }
}
