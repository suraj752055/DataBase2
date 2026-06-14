// Texture and Lighting Module - COLORFUL VERSION
// This module handles all textures, materials, and advanced lighting

// Canvas-based texture generation (no external files needed)
class TextureGenerator {
    // Generate colorful gradient texture
    static generateColorfulTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Create vibrant rainbow gradient
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#FF006E');
        gradient.addColorStop(0.2, '#FB5607');
        gradient.addColorStop(0.4, '#FFBE0B');
        gradient.addColorStop(0.6, '#8338EC');
        gradient.addColorStop(0.8, '#3A86FF');
        gradient.addColorStop(1, '#06FFA5');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add some colorful noise
        const imageData = ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 30;
            data[i] += noise;
            data[i + 1] += noise / 2;
            data[i + 2] -= noise / 3;
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }
    
    // Generate vibrant neon colors
    static generateNeonTexture(colorStop1, colorStop2) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Create gradient between two colors
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, colorStop1);
        gradient.addColorStop(1, colorStop2);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }
    
    // Generate vibrant enemy skin texture
    static generateEnemySkinTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient with neon colors
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 180);
        gradient.addColorStop(0, '#FF1493');
        gradient.addColorStop(0.5, '#FF006E');
        gradient.addColorStop(1, '#C1121F');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // Add vibrant texture details
        const imageData = ctx.getImageData(0, 0, 256, 256);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.15) {
                data[i] += Math.random() * 80;
                data[i + 1] -= Math.random() * 40;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }
    
    // Generate normal map
    static generateNormalMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, 512, 512);
        
        const imageData = ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 128 + Math.random() * 20;
            data[i + 1] = 128 + Math.random() * 20;
            data[i + 2] = 255;
            data[i + 3] = 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        return new THREE.CanvasTexture(canvas);
    }
}

// Material presets
class Materials {
    static ground = null;
    static enemy = null;
    static bullet = null;
    
    static initialize() {
        const colorfulTexture = TextureGenerator.generateColorfulTexture();
        const enemyTexture = TextureGenerator.generateEnemySkinTexture();
        const normalMap = TextureGenerator.generateNormalMap();
        
        // Ground material - vibrant rainbow
        this.ground = new THREE.MeshStandardMaterial({
            map: colorfulTexture,
            metalness: 0.6,
            roughness: 0.3,
            normalMap: normalMap
        });
        
        // Enemy material - glowing hot pink/red
        this.enemy = new THREE.MeshStandardMaterial({
            map: enemyTexture,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0xFF1493,
            emissiveIntensity: 0.6,
            normalMap: normalMap
        });
        
        // Bullet material - bright neon green
        this.bullet = new THREE.MeshStandardMaterial({
            color: 0x00FF00,
            emissive: 0x00FF00,
            emissiveIntensity: 1.0,
            metalness: 1.0,
            roughness: 0.0
        });
    }
}

// Advanced lighting setup
class AdvancedLighting {
    static setupLights(scene) {
        // Remove default lights
        scene.children = scene.children.filter(child => !(child instanceof THREE.Light));
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(60, 80, 60);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 4096;
        mainLight.shadow.mapSize.height = 4096;
        mainLight.shadow.camera.far = 200;
        mainLight.shadow.camera.left = -150;
        mainLight.shadow.camera.right = 150;
        mainLight.shadow.camera.top = 150;
        mainLight.shadow.camera.bottom = -150;
        mainLight.shadow.bias = -0.0001;
        mainLight.shadow.normalBias = 0.02;
        scene.add(mainLight);
        
        // Cyan light
        const cyanLight = new THREE.PointLight(0x00FFFF, 0.8, 100);
        cyanLight.position.set(50, 30, -50);
        cyanLight.castShadow = true;
        scene.add(cyanLight);
        
        // Magenta light
        const magentaLight = new THREE.PointLight(0xFF00FF, 0.8, 100);
        magentaLight.position.set(-50, 30, 50);
        scene.add(magentaLight);
        
        // Yellow light
        const yellowLight = new THREE.PointLight(0xFFFF00, 0.6, 80);
        yellowLight.position.set(60, 25, 60);
        scene.add(yellowLight);
    }
}

// Environment/Skybox setup
class Environment {
    static createSkybox(scene) {
        const skyGeometry = new THREE.BoxGeometry(500, 500, 500);
        
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create vibrant gradient sky
        const gradient = ctx.createLinearGradient(0, 0, 256, 256);
        gradient.addColorStop(0, '#1a0033');
        gradient.addColorStop(0.3, '#330066');
        gradient.addColorStop(0.6, '#1a003d');
        gradient.addColorStop(1, '#0d001a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const skyTexture = new THREE.CanvasTexture(canvas);
        const skyMaterial = new THREE.MeshBasicMaterial({
            map: skyTexture,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        scene.add(skybox);
    }
    
    static addParticleEffects(scene) {
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 300;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = Math.random() * 100;
            positions[i + 2] = (Math.random() - 0.5) * 200;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFF00FF,
            size: 0.5,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.6
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
        
        return particles;
    }
}

// Post-processing effects
class PostProcessing {
    static addVignette() {
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height)
        );
        
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const vignetteOverlay = document.createElement('div');
        vignetteOverlay.style.position = 'fixed';
        vignetteOverlay.style.top = '0';
        vignetteOverlay.style.left = '0';
        vignetteOverlay.style.width = '100%';
        vignetteOverlay.style.height = '100%';
        vignetteOverlay.style.backgroundImage = `url(${canvas.toDataURL()})`;
        vignetteOverlay.style.pointerEvents = 'none';
        vignetteOverlay.style.zIndex = '5';
        document.body.appendChild(vignetteOverlay);
    }
}

console.log('Colorful textures module loaded!');