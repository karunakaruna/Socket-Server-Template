import * as THREE from 'three';

/**
 * Manages particle systems for visual effects
 */
export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = new Map();
    }

    /**
     * Create a starfield effect
     */
    createStarfield(count = 2000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            // Random position in a sphere
            const radius = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            sizes[i] = Math.random() * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            map: this.createStarTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
        this.particles.set('starfield', stars);
        
        return stars;
    }

    /**
     * Create center particle effect
     */
    createCenterEffect(radius = 1, count = 100) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            // Random position in a sphere
            const r = radius * Math.cbrt(Math.random());
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            
            sizes[i] = 0.1 + Math.random() * 0.2;
            
            // Blue-white gradient
            colors[i * 3] = 0.5 + Math.random() * 0.5;     // R
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.3; // G
            colors[i * 3 + 2] = 1.0;                       // B
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            map: this.createParticleTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        this.particles.set('center', particles);
        
        return particles;
    }

    /**
     * Create orbital trail for a user
     */
    createOrbitalTrail(userId, color = 0x7aa2f7) {
        const curve = new THREE.EllipseCurve(
            0, 0,                         // Center x, y
            10 + Math.random() * 5,       // xRadius
            10 + Math.random() * 5,       // yRadius
            0, 2 * Math.PI,              // Start angle, end angle
            false,                        // Clockwise
            Math.random() * Math.PI * 2   // Rotation
        );

        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        const ellipse = new THREE.Line(geometry, material);
        ellipse.rotation.x = Math.PI / 2; // Rotate to XZ plane
        
        this.scene.add(ellipse);
        this.particles.set(`orbit-${userId}`, ellipse);
        
        return ellipse;
    }

    /**
     * Create a circular texture for stars
     */
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Create a circular texture for particles
     */
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(200,200,255,0.8)');
        gradient.addColorStop(0.7, 'rgba(150,150,255,0.3)');
        gradient.addColorStop(1, 'rgba(100,100,255,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Update particle systems
     */
    update(deltaTime) {
        // Update center particles
        const centerParticles = this.particles.get('center');
        if (centerParticles) {
            centerParticles.rotation.y += deltaTime * 0.1;
        }

        // Update starfield
        const starfield = this.particles.get('starfield');
        if (starfield) {
            starfield.rotation.y += deltaTime * 0.01;
        }
    }

    /**
     * Remove a particle system
     */
    remove(name) {
        const system = this.particles.get(name);
        if (system) {
            this.scene.remove(system);
            this.particles.delete(name);
        }
    }

    /**
     * Clean up all particle systems
     */
    dispose() {
        this.particles.forEach((system) => {
            if (system.geometry) {
                system.geometry.dispose();
            }
            if (system.material) {
                if (system.material.map) {
                    system.material.map.dispose();
                }
                system.material.dispose();
            }
            this.scene.remove(system);
        });
        this.particles.clear();
    }
}
