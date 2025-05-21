// File: customCursor.js
// Custom Element Tag: <custom-cursor>

class CustomCursor extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        // Create main container (invisible)
        const wrapper = document.createElement('div');
        wrapper.className = 'cursor-container';
        
        // Create styles for the shadow DOM
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
        
        // Bind mouse move handler
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.positions = []; // Store mouse positions for trail
        this.isActive = false;
        
        // Create cursor elements once
        this.createCursorElements();
    }
    
    connectedCallback() {
        // Load saved preference if any
        const savedState = localStorage.getItem('customCursorActive');
        this.isActive = savedState === null ? true : savedState === 'true';
        
        // Apply cursor state
        this.applyCursorStyles(this.isActive);
        
        // Add mouse move listener
        document.addEventListener('mousemove', this.handleMouseMove);
        
        // Initial cursor position off-screen
        this.updateCursorPosition(-100, -100);
    }
    
    disconnectedCallback() {
        // Remove mouse move listener when element is removed
        document.removeEventListener('mousemove', this.handleMouseMove);
        
        // Clean up cursor elements
        this.removeCursorElements();
        
        // Remove custom cursor styles
        this.removeCursorStyles();
    }
    
    static get observedAttributes() {
        return ['enabled', 'color', 'size'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'enabled') {
            this.isActive = newValue === 'true';
            this.applyCursorStyles(this.isActive);
            localStorage.setItem('customCursorActive', this.isActive);
        } else if (name === 'color' || name === 'size') {
            this.applyCursorStyles(this.isActive);
        }
    }
    
    createCursorElements() {
        // Main cursor element
        this.cursor = document.createElement('div');
        this.cursor.id = 'global-custom-cursor';
        
        // Trail container
        this.trailContainer = document.createElement('div');
        this.trailContainer.id = 'global-cursor-trail';
        
        // Add to document
        document.body.appendChild(this.cursor);
        document.body.appendChild(this.trailContainer);
    }
    
    removeCursorElements() {
        if (this.cursor) this.cursor.remove();
        if (this.trailContainer) this.trailContainer.remove();
    }
    
    handleMouseMove(e) {
        if (!this.isActive) return;
        
        const x = e.clientX;
        const y = e.clientY;
        
        // Update main cursor position immediately
        this.updateCursorPosition(x, y);
        
        // Store position for trail with timestamp
        this.positions.unshift({ x, y, time: Date.now() });
        
        // Only keep last 10 positions for trail
        if (this.positions.length > 10) {
            this.positions.pop();
        }
        
        // Update trail
        this.updateTrail();
        
        // Create hover intention effect on interactive elements
        this.checkHoverIntention(e.target);
    }
    
    updateCursorPosition(x, y) {
        if (!this.cursor) return;
        
        this.cursor.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    updateTrail() {
        if (!this.trailContainer) return;
        
        // Clear existing trail dots
        this.trailContainer.innerHTML = '';
        
        // Get color and size from attributes or use defaults
        const color = this.getAttribute('color') || '#2196F3';
        const baseSize = parseInt(this.getAttribute('size') || '20');
        
        // Create new trail dots
        this.positions.forEach((pos, index) => {
            // Skip the first position (it's the main cursor)
            if (index === 0) return;
            
            const dot = document.createElement('div');
            dot.className = 'trail-dot';
            
            // Calculate size and opacity based on position in trail
            const size = baseSize * (1 - index / 10);
            const opacity = 1 - (index / 10);
            
            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            dot.style.opacity = opacity;
            dot.style.backgroundColor = color;
            dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            
            this.trailContainer.appendChild(dot);
        });
    }
    
    checkHoverIntention(target) {
        // Check if target is an interactive element
        const isInteractive = 
            target.tagName === 'A' || 
            target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' || 
            target.tagName === 'TEXTAREA' ||
            target.role === 'button' ||
            target.hasAttribute('onclick');
        
        if (isInteractive) {
            this.cursor.classList.add('hover');
        } else {
            this.cursor.classList.remove('hover');
        }
    }
    
    applyCursorStyles(enabled) {
        const styleId = 'global-cursor-styles';
        let styleElement = document.getElementById(styleId);
        
        if (enabled) {
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                document.head.appendChild(styleElement);
            }
            
            // Get color and size from attributes or use defaults
            const color = this.getAttribute('color') || '#2196F3';
            const size = this.getAttribute('size') || '20';
            
            styleElement.textContent = `
                /* Hide default cursor on everything */
                html, body, * {
                    cursor: none !important;
                }
                
                /* Main cursor */
                #global-custom-cursor {
                    position: fixed;
                    width: ${size}px;
                    height: ${size}px;
                    background-color: ${color};
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 99999;
                    transform: translate(-100px, -100px);
                    transition: width 0.3s, height 0.3s;
                    margin-left: -${parseInt(size)/2}px;
                    margin-top: -${parseInt(size)/2}px;
                    mix-blend-mode: difference;
                    filter: drop-shadow(0 0 5px rgba(0,0,0,0.3));
                }
                
                /* Trail dots */
                .trail-dot {
                    position: fixed;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 99998;
                    margin-left: -${parseInt(size)/4}px;
                    margin-top: -${parseInt(size)/4}px;
                    mix-blend-mode: difference;
                    filter: drop-shadow(0 0 2px rgba(0,0,0,0.2));
                }
                
                /* Trail container */
                #global-cursor-trail {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    pointer-events: none;
                    z-index: 99998;
                }
                
                /* Hover effect for interactive elements */
                #global-custom-cursor.hover {
                    width: ${parseInt(size) * 1.5}px;
                    height: ${parseInt(size) * 1.5}px;
                    background-color: rgba(255, 255, 255, 0.8);
                    mix-blend-mode: difference;
                }
                
                /* Fix for custom element itself */
                custom-cursor {
                    cursor: none !important;
                }
            `;
        } else {
            if (styleElement) {
                styleElement.remove();
            }
            
            // Hide cursor elements when disabled
            if (this.cursor) this.cursor.style.display = 'none';
            if (this.trailContainer) this.trailContainer.style.display = 'none';
        }
    }
    
    removeCursorStyles() {
        const styleId = 'global-cursor-styles';
        const styleElement = document.getElementById(styleId);
        
        if (styleElement) {
            styleElement.remove();
        }
    }
    
    // Public API to toggle cursor
    toggle() {
        this.isActive = !this.isActive;
        this.applyCursorStyles(this.isActive);
        localStorage.setItem('customCursorActive', this.isActive);
        
        // Show/hide cursor elements
        if (this.cursor) this.cursor.style.display = this.isActive ? 'block' : 'none';
        if (this.trailContainer) this.trailContainer.style.display = this.isActive ? 'block' : 'none';
        
        return this.isActive;
    }
}

// Register the custom element
customElements.define('custom-cursor', CustomCursor);
