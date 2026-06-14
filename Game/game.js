// Game Variables
const gameState = {
    score: 0,
    health: 100,
    maxHealth: 100,
    wave: 1,
    gameOver: false,
    isJumping: false,
    velocityY: 0
};

const gameConfig = {
    enemiesPerWave: 5,
    enemySpeed: 0.02,
    enemyHealth: 1,
    playerSpeed: 0.3,
    bulletSpeed: 1,
    bulletDamage: 1,
    waveDelay: 3000,
    gravityStrength: 0.008,
    jumpForce: 0.15
};

// Three.js Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.Fog(0x0a0a0a, 100, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Initialize textures and materials FIRST
Materials.initialize();

// Setup advanced lighting
AdvancedLighting.setupLights(scene);

// Create skybox
Environment.createSkybox(scene);

// Add particle effects
const particles = Environment.addParticleEffects(scene);

// Add vignette effect
PostProcessing.addVignette();

// ===== PERFECT SQUARE ARENA (no inner boxes!) =====
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const ground = new THREE.Mesh(groundGeometry, Materials.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// CREATE ARENA WALLS (only perimeter walls, no inner boxes)
const wallHeight = 20;
const wallThickness = 2;
const arenaSize = 100; // Half the arena size (200x200 total)

const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00CCFF,
    metalness: 0.7,
    roughness: 0.2,
    emissive: 0x0066FF,
    emissiveIntensity: 0.3
});

// Front wall (positive Z)
const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(200, wallHeight, wallThickness),
    wallMaterial
);
frontWall.position.set(0, wallHeight / 2, arenaSize);
frontWall.castShadow = true;
frontWall.receiveShadow = true;
scene.add(frontWall);

// Back wall (negative Z)
const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(200, wallHeight, wallThickness),
    wallMaterial
);
backWall.position.set(0, wallHeight / 2, -arenaSize);
backWall.castShadow = true;
backWall.receiveShadow = true;
scene.add(backWall);

// Left wall (negative X)
const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, 200),
    wallMaterial
);
leftWall.position.set(-arenaSize, wallHeight / 2, 0);
leftWall.castShadow = true;
leftWall.receiveShadow = true;
scene.add(leftWall);

// Right wall (positive X)
const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, 200),
    wallMaterial
);
rightWall.position.set(arenaSize, wallHeight / 2, 0);
rightWall.castShadow = true;
rightWall.receiveShadow = true;
scene.add(rightWall);

// Player Controller
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse control
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Mouse controls for camera rotation
let pitch = 0;
let yaw = 0;
const sensitivity = 0.003;

document.addEventListener('mousemove', (event) => {
    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;
    
    // Clamp pitch to prevent flipping
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
});

// Lock pointer on click
document.addEventListener('click', () => {
    if (!gameState.gameOver) {
        document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
        document.body.requestPointerLock();
    }
});

// Arrays for game objects
const enemies = [];
const bullets = [];

// Enemy class
class Enemy {
    constructor(x, z) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = Materials.enemy.clone();
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 1, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        this.health = gameConfig.enemyHealth;
        this.speed = gameConfig.enemySpeed;
    }
    
    update() {
        const direction = new THREE.Vector3()
            .subVectors(camera.position, this.mesh.position)
            .normalize();
        
        this.mesh.position.addScaledVector(direction, this.speed);
    }
    
    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
    
    remove() {
        scene.remove(this.mesh);
    }
}

// Bullet class
class Bullet {
    constructor(origin, direction) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = Materials.bullet.clone();
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(origin);
        scene.add(this.mesh);
        
        this.direction = direction.normalize();
        this.speed = gameConfig.bulletSpeed;
        this.maxDistance = 200;
        this.traveledDistance = 0;
    }
    
    update() {
        const movement = this.direction.clone().multiplyScalar(this.speed);
        this.mesh.position.addScaledVector(this.direction, this.speed);
        this.traveledDistance += this.speed;
    }
    
    remove() {
        scene.remove(this.mesh);
    }
    
    isOutOfRange() {
        return this.traveledDistance >= this.maxDistance;
    }
}

// Shooting
function shoot() {
    if (gameState.gameOver) return;
    
    // Create ray from camera center
    const origin = camera.position.clone();
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    
    const bullet = new Bullet(origin, direction);
    bullets.push(bullet);
}

document.addEventListener('click', shoot);

// Spawn wave
function spawnWave() {
    const enemyCount = gameConfig.enemiesPerWave + Math.floor(gameState.wave / 2);
    
    for (let i = 0; i < enemyCount; i++) {
        let x, z;
        const distance = 30 + Math.random() * 20;
        const angle = Math.random() * Math.PI * 2;
        
        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;
        
        enemies.push(new Enemy(x, z));
    }
    
    showWaveNotification();
}

function showWaveNotification() {
    const notification = document.getElementById('waveNotification');
    notification.textContent = `WAVE ${gameState.wave}`;
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 2000);
}

// Next wave
function nextWave() {
    gameState.wave++;
    gameConfig.enemySpeed *= 1.1;
    gameConfig.enemiesPerWave = Math.min(gameConfig.enemiesPerWave + 2, 20);
    spawnWave();
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
    document.getElementById('health').textContent = `Health: ${gameState.health}/${gameState.maxHealth}`;
    document.getElementById('wave').textContent = `Wave: ${gameState.wave}`;
}

// Player movement
function updatePlayerMovement() {
    const direction = new THREE.Vector3();
    
    if (keys['w']) direction.add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
    if (keys['s']) direction.add(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion));
    if (keys['a']) direction.add(new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion));
    if (keys['d']) direction.add(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion));
    
    direction.y = 0;
    direction.normalize();
    direction.multiplyScalar(gameConfig.playerSpeed);
    
    camera.position.add(direction);
    
    // Gravity
    gameState.velocityY -= gameConfig.gravityStrength;
    camera.position.y += gameState.velocityY;
    
    // Ground collision
    if (camera.position.y <= 1.6) {
        camera.position.y = 1.6;
        gameState.velocityY = 0;
        gameState.isJumping = false;
    }
    
    // Jump
    if (keys[' '] && !gameState.isJumping) {
        gameState.velocityY = gameConfig.jumpForce;
        gameState.isJumping = true;
    }
    
    // Boundary check
    const boundaryDistance = 95;
    camera.position.x = Math.max(-boundaryDistance, Math.min(boundaryDistance, camera.position.x));
    camera.position.z = Math.max(-boundaryDistance, Math.min(boundaryDistance, camera.position.z));
}

// Game over
function endGame() {
    gameState.gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = `Final Score: ${gameState.score}`;
    document.getElementById('wavesReached').textContent = `Waves Reached: ${gameState.wave}`;
}

// Update camera rotation
function updateCamera() {
    const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
}

// Collision detection for bullets and enemies
function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        let bulletHit = false;
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
            
            if (distance < 1.5) {
                if (enemy.takeDamage(gameConfig.bulletDamage)) {
                    enemy.remove();
                    enemies.splice(j, 1);
                    gameState.score += 10 * gameState.wave;
                }
                bulletHit = true;
                break;
            }
        }
        
        if (bulletHit || bullet.isOutOfRange()) {
            bullet.remove();
            bullets.splice(i, 1);
        }
    }
}

// Enemy collision with player
function checkEnemyCollisions() {
    for (let enemy of enemies) {
        const distance = camera.position.distanceTo(enemy.mesh.position);
        
        if (distance < 2) {
            gameState.health -= 1;
            
            if (gameState.health <= 0) {
                endGame();
            }
        }
    }
}

// Main game loop
let waveStartTime = Date.now();
let lastWaveCheck = 0;

function animate() {
    requestAnimationFrame(animate);
    
    if (gameState.gameOver) {
        renderer.render(scene, camera);
        return;
    }
    
    updatePlayerMovement();
    updateCamera();
    
    // Update bullets
    for (let bullet of bullets) {
        bullet.update();
    }
    
    // Update enemies
    for (let enemy of enemies) {
        enemy.update();
    }
    
    checkCollisions();
    checkEnemyCollisions();
    
    // Spawn next wave
    const currentTime = Date.now();
    if (enemies.length === 0 && (currentTime - lastWaveCheck) > gameConfig.waveDelay) {
        nextWave();
        lastWaveCheck = currentTime;
    }
    
    updateHUD();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start game
spawnWave();
animate();