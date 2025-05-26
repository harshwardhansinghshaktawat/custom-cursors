// File: ParticleCursorElement.js
// Custom Element Tag: <particle-cursor>

class ParticleCursorElement extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        // Create invisible container
        const wrapper = document.createElement('div');
        wrapper.className = 'particle-container';
        
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
            
            .particle-container {
                display: none;
            }
        `;
        
        shadow.appendChild(style);
        shadow.appendChild(wrapper);
        
        // Particle system properties
        this.particles = [];
        this.mouse = { x: -100, y: -100 };
        this.animationId = null;
        this.canvas = null;
        this.ctx = null;
        this.time = 0;
        this.isActive = true;
        this.lastParticleTime = 0;
        
        // Color palette
        this.colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        
        // Bind methods
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    connectedCallback() {
        // Get initial state from attributes
        this.isActive = this.getAttribute('enabled') !== 'false';
        
        if (this.isActive) {
            this.initializeParticleSystem();
            this.startGlobalTracking();
        }
    }
    
    disconnectedCallback() {
        this.cleanup();
    }
    
    static get observedAttributes() {
        return ['enabled', 'intensity', 'colors', 'size'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'enabled') {
            this.isActive = newValue !== 'false';
            if (this.isActive) {
                this.initializeParticleSystem();
                this.startGlobalTracking();
            } else {
                this.cleanup();
            }
        } else if (name === 'colors' && newValue) {
            try {
                this.colors = JSON.parse(newValue);
            } catch (e) {
                console.warn('Invalid colors format, using defaults');
            }
        }
    }
    
    initializeParticleSystem() {
        if (this.canvas) return; // Already initialized
        
        // Create global canvas overlay
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'global-particle-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Style the canvas
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '99999',
            mixBlendMode: 'screen'
        });
        
        // Add to body
        document.body.appendChild(this.canvas);
        
        // Set canvas size
        this.resizeCanvas();
        
        // Handle window resize
        this.resizeHandler = () => this.resizeCanvas();
        window.addEventListener('resize', this.resizeHandler);
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    startGlobalTracking() {
        if (this.trackingActive) return; // Already tracking
        
        this.trackingActive = true;
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('click', this.handleClick);
        
        // Start animation loop
        if (!this.animationId) {
            this.animate();
        }
    }
    
    stopGlobalTracking() {
        this.trackingActive = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('click', this.handleClick);
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isActive) return;
        
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        // Throttle particle creation for performance
        const now = Date.now();
        if (now - this.lastParticleTime > 16) { // ~60fps
            this.createParticles();
            this.lastParticleTime = now;
        }
    }
    
    handleClick(e) {
        if (!this.isActive) return;
        
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.createBurst();
    }
    
    createParticles() {
        const intensity = parseInt(this.getAttribute('intensity') || '2');
        const baseSize = parseInt(this.getAttribute('size') || '4');
        
        for (let i = 0; i < intensity; i++) {
            const particle = {
                x: this.mouse.x + (Math.random() - 0.5) * 20,
                y: this.mouse.y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 1,
                decay: 0.008 + Math.random() * 0.012,
                size: baseSize + Math.random() * baseSize,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                trail: [],
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.15,
                type: 'normal'
            };
            
            this.particles.push(particle);
        }
        
        // Limit particles for performance
        if (this.particles.length > 150) {
            this.particles = this.particles.slice(-120);
        }
    }
    
    createBurst() {
        const burstSize = 12;
        const baseSize = parseInt(this.getAttribute('size') || '4');
        
        for (let i = 0; i < burstSize; i++) {
            const angle = (Math.PI * 2 * i) / burstSize;
            const speed = 2 + Math.random() * 5;
            
            const particle = {
                x: this.mouse.x,
                y: this.mouse.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.004 + Math.random() * 0.008,
                size: baseSize * 1.5 + Math.random() * baseSize,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                trail: [],
                angle: angle,
                spin: (Math.random() - 0.5) * 0.2,
                type: 'burst',
                gravity: 0.03
            };
            
            this.particles.push(particle);
        }
    }
    
    updateParticles() {
        this.time += 0.016;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Apply effects based on type
            if (particle.type === 'burst' && particle.gravity) {
                particle.vy += particle.gravity;
            } else {
                // Subtle wave motion for normal particles
                particle.vx += Math.sin(this.time + particle.angle) * 0.01;
                particle.vy += Math.cos(this.time + particle.angle) * 0.01;
            }
            
            // Apply drag
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Update trail
            particle.trail.push({ x: particle.x, y: particle.y, life: particle.life });
            if (particle.trail.length > 6) {
                particle.trail.shift();
            }
            
            // Update life and rotation
            particle.life -= particle.decay;
            particle.angle += particle.spin;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    drawParticles() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            const alpha = Math.max(0, particle.life);
            
            // Draw trail
            particle.trail.forEach((point, index) => {
                const trailAlpha = alpha * (index / particle.trail.length) * 0.4;
                const trailSize = particle.size * (index / particle.trail.length) * 0.6;
                
                if (trailAlpha > 0.01) {
                    this.ctx.save();
                    this.ctx.globalAlpha = trailAlpha;
                    this.ctx.fillStyle = particle.color;
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                }
            });
            
            // Draw main particle with glow
            this.ctx.save();
            
            // Outer glow
            this.ctx.globalAlpha = alpha * 0.2;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner glow
            this.ctx.globalAlpha = alpha * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 1.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Core particle
            this.ctx.globalAlpha = alpha * 0.9;
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.angle);
            
            // Draw star shape
            this.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const outerRadius = particle.size;
                const innerRadius = particle.size * 0.4;
                
                // Outer point
                const outerX = Math.cos(angle) * outerRadius;
                const outerY = Math.sin(angle) * outerRadius;
                
                // Inner point
                const innerAngle = angle + Math.PI / 5;
                const innerX = Math.cos(innerAngle) * innerRadius;
                const innerY = Math.sin(innerAngle) * innerRadius;
                
                if (i === 0) {
                    this.ctx.moveTo(outerX, outerY);
                } else {
                    this.ctx.lineTo(outerX, outerY);
                }
                this.ctx.lineTo(innerX, innerY);
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.updateParticles();
        this.drawParticles();
        
        this.animationId = requestAnimationFrame(this.animate);
    }
    
    cleanup() {
        // Stop tracking
        this.stopGlobalTracking();
        
        // Remove canvas
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
            this.ctx = null;
        }
        
        // Remove resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        // Clear particles
        this.particles = [];
    }
    
    // Public API
    toggle() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.initializeParticleSystem();
            this.startGlobalTracking();
        } else {
            this.cleanup();
        }
        
        return this.isActive;
    }
    
    enable() {
        if (!this.isActive) {
            this.toggle();
        }
    }
    
    disable() {
        if (this.isActive) {
            this.toggle();
        }
    }
    
    setColors(colorArray) {
        this.colors = colorArray;
    }
    
    setBurstMode(enabled) {
        // Future enhancement: different particle behaviors
        this.burstMode = enabled;
    }
}

// Register the custom element
customElements.define('particle-cursor', ParticleCursorElement);
