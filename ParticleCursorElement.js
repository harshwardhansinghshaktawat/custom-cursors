class ParticleCursorElement extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });

        // Create container for shadow DOM (not used for rendering particles)
        const wrapper = document.createElement('div');
        wrapper.className = 'cursor-container';

        // Define styles for shadow DOM
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 0;
                height: 0;
                overflow: hidden;
                position: absolute;
                pointer-events: none;
            }
            .cursor-container {
                display: none;
            }
        `;
        shadow.appendChild(style);
        shadow.appendChild(wrapper);

        // Initialize settings
        this.settings = {
            gpgpuSize: 512,
            colors: ['#00ff00', '#0000ff'],
            color: '#ff0000',
            coordScale: 0.5,
            noiseIntensity: 0.001,
            noiseTimeCoef: 0.0001,
            pointSize: 5,
            pointDecay: 0.0025,
            sleepRadiusX: 250,
            sleepRadiusY: 250,
            sleepTimeCoefX: 0.001,
            sleepTimeCoefY: 0.002,
            randomizeOnClick: false,
            colorPreset: 'custom',
            enabled: true
        };

        this.pc = null;
        this.isActive = true;
    }

    connectedCallback() {
        // Load saved preference
        const savedState = localStorage.getItem('particleCursorActive');
        this.isActive = savedState === null ? true : savedState === 'true';
        this.settings.enabled = this.isActive;

        // Load threejs-toys library
        this.loadThreeJsToys(() => {
            this.renderParticleCursor();
            this.applyGlobalStyles(this.isActive);
        });

        // Add click event listener for randomization
        document.addEventListener('click', this.handleClick.bind(this));
    }

    static get observedAttributes() {
        return ['options'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'options' && newValue && newValue !== oldValue) {
            const newSettings = JSON.parse(newValue);
            this.settings = { ...this.settings, ...newSettings };
            this.isActive = this.settings.enabled;
            localStorage.setItem('particleCursorActive', this.isActive);
            this.applyGlobalStyles(this.isActive);
            this.updateParticleCursor();
        }
    }

    loadThreeJsToys(callback) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/threejs-toys@0.0.8/build/threejs-toys.module.cdn.min.js';
        script.onload = () => {
            callback();
        };
        script.onerror = () => console.error('Failed to load threejs-toys');
        document.head.appendChild(script);
    }

    renderParticleCursor() {
        if (!window.particlesCursor) {
            console.error('particlesCursor not available');
            return;
        }

        // Initialize particle cursor on the document body for page-wide effect
        this.pc = window.particlesCursor({
            el: document.body,
            gpgpuSize: this.settings.gpgpuSize,
            colors: this.settings.colors.map(color => parseInt(color.replace('#', '0x'), 16)),
            color: parseInt(this.settings.color.replace('#', '0x'), 16),
            coordScale: this.settings.coordScale,
            noiseIntensity: this.settings.noiseIntensity,
            noiseTimeCoef: this.settings.noiseTimeCoef,
            pointSize: this.settings.pointSize,
            pointDecay: this.settings.pointDecay,
            sleepRadiusX: this.settings.sleepRadiusX,
            sleepRadiusY: this.settings.sleepRadiusY,
            sleepTimeCoefX: this.settings.sleepTimeCoefX,
            sleepTimeCoefY: this.settings.sleepTimeCoefY
        });

        // Ensure canvas is styled correctly
        const canvas = document.body.querySelector('canvas');
        if (canvas) {
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '99999';
            canvas.style.pointerEvents = 'none';
        }
    }

    updateParticleCursor() {
        if (!this.pc) return;

        this.pc.uniforms.uColor.value.set(parseInt(this.settings.color.replace('#', '0x'), 16));
        this.pc.uniforms.uCoordScale.value = this.settings.coordScale;
        this.pc.uniforms.uNoiseIntensity.value = this.settings.noiseIntensity;
        this.pc.uniforms.uPointSize.value = this.settings.pointSize;
        this.pc.uniforms.uPointDecay.value = this.settings.pointDecay;
        this.pc.uniforms.uSleepRadiusX.value = this.settings.sleepRadiusX;
        this.pc.uniforms.uSleepRadiusY.value = this.settings.sleepRadiusY;
        this.pc.uniforms.uSleepTimeCoefX.value = this.settings.sleepTimeCoefX;
        this.pc.uniforms.uSleepTimeCoefY.value = this.settings.sleepTimeCoefY;

        // Update colors array
        const newColors = this.settings.colors.map(color => parseInt(color.replace('#', '0x'), 16));
        this.pc.uniforms.uColors.value = newColors;
    }

    applyGlobalStyles(enabled) {
        const styleId = 'particle-cursor-styles';
        let styleElement = document.getElementById(styleId);

        if (enabled) {
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                document.head.appendChild(styleElement);
            }

            styleElement.textContent = `
                html, body, * {
                    cursor: none !important;
                }
                canvas.particles-cursor {
                    position: fixed !important;
                    top: 0;
                    left: 0;
                    z-index: 99999;
                    pointer-events: none;
                    width: 100% !important;
                    height: 100% !important;
                }
                particle-cursor {
                    cursor: none !important;
                }
            `;
        } else {
            if (styleElement) {
                styleElement.remove();
            }
            if (this.pc && this.pc.canvas) {
                this.pc.canvas.style.display = 'none';
            }
        }
    }

    handleClick() {
        if (this.settings.randomizeOnClick && this.isActive) {
            this.settings.color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
            this.settings.coordScale = 0.001 + Math.random() * 2;
            this.settings.noiseIntensity = 0.0001 + Math.random() * 0.001;
            this.settings.pointSize = 1 + Math.random() * 10;
            this.updateParticleCursor();
        }
    }

    disconnectedCallback() {
        if (this.pc) {
            this.pc.destroy();
        }
        document.removeEventListener('click', this.handleClick.bind(this));
        const styleElement = document.getElementById('particle-cursor-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

customElements.define('particle-cursor', ParticleCursorElement);
