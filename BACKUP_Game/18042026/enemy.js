// Enemy creation and update logic
window.enemies = window.enemies || [];
const enemies = window.enemies;
let currentWave = 1;
let waveEnemyCount = 5;
let enemiesKilled = 0;
let waveSpawnDelay = 0;
let nextWaveCountdown = 0;
const waveDisplay = document.getElementById('waveDisplay');
console.log('enemy.js loaded');

// Score UI references
window.score = window.score || 0;
window.killCount = window.killCount || 0;
const scoreDisplay = document.getElementById('scoreDisplay');
const killCountDisplay = document.getElementById('killCountDisplay');

// Load an enemy texture (fallback will be simple color)
const textureLoader = new THREE.TextureLoader();
let enemyTexture;
try {
    enemyTexture = textureLoader.load('Assets/herobrine-controlled-zombie.png');
    enemyTexture.magFilter = THREE.LinearFilter;
} catch (e) {
    console.warn('Failed to load enemy texture');
    enemyTexture = null;
}

function playKillSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = 700 + Math.random() * 300;
        o.connect(g);
        g.connect(ctx.destination);
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        o.start(now);
        o.stop(now + 0.2);
    } catch (e) {
        console.warn('kill sound failed', e);
    }
}

function createEnemyWave() {
    console.log('createEnemyWave called - waveEnemyCount=', waveEnemyCount);
    if (typeof camera === 'undefined' || typeof scene === 'undefined') {
        console.warn('createEnemyWave: camera or scene not ready, skipping');
        return;
    }
    if (enemies.length > 0) {
        console.log('createEnemyWave skipped because enemies are already active');
        return;
    }
    for (let i = 0; i < waveEnemyCount; i++) {
        const enemyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const enemyMaterial = new THREE.MeshBasicMaterial({
            map: enemyTexture || null,
            color: enemyTexture ? 0xFFFFFF : 0x33ff66
        });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        
        // Spawn enemies around the player but out of immediate range
        const angle = (Math.random() * Math.PI * 2);
        const minDist = 8;
        const maxDist = 20;
        const distance = minDist + Math.random() * (maxDist - minDist);
        enemy.position.set(
            camera.position.x + Math.cos(angle) * distance,
            1,
            camera.position.z + Math.sin(angle) * distance
        );
        console.log(`Spawned enemy ${i} at`, enemy.position);
        
        enemy.userData = {
            health: 1,
            speed: 0.08 + Math.random() * 0.04,
            dropsAmmo: true
        };
        
        scene.add(enemy);
        enemies.push(enemy);
    }
}

function updateEnemies() {
    if (gameOver) return;
    
    // Update existing enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const direction = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
        enemy.position.add(direction.multiplyScalar(enemy.userData.speed));
        
        // Keep enemies in bounds
        enemy.position.x = Math.max(-48, Math.min(48, enemy.position.x));
        enemy.position.z = Math.max(-48, Math.min(48, enemy.position.z));
    }
    
    // Wave management
    if (enemies.length === 0 && nextWaveCountdown === 0) {
        nextWaveCountdown = 60; // 1 second delay before next wave
    }
    
    if (nextWaveCountdown > 0) {
        nextWaveCountdown--;
        if (nextWaveCountdown === 0) {
            currentWave++;
            waveEnemyCount = 5 + (currentWave - 1) * 2; // Increase enemies each wave
            enemiesKilled = 0;
            createEnemyWave();
            if (waveDisplay) {
                waveDisplay.textContent = `Wave: ${currentWave}`;
            }
        }
    }
    
    // Check if enemy was killed
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].userData.health <= 0) {
            if (enemies[i].userData.dropsAmmo) {
                // Drop ammo at enemy position
                createAmmoDropAt(enemies[i].position);
            }
            // Increment score and kills
            window.score = (window.score || 0) + 100;
            window.killCount = (window.killCount || 0) + 1;
            if (scoreDisplay) scoreDisplay.textContent = `Score: ${window.score}`;
            if (killCountDisplay) killCountDisplay.textContent = `Kills: ${window.killCount}`;
            playKillSound();

            scene.remove(enemies[i]);
            enemies.splice(i, 1);
            enemiesKilled++;
        }
    }
}

// Defer initial spawn until scene and camera are ready
function initEnemies() {
    if (typeof camera !== 'undefined' && typeof scene !== 'undefined' && scene) {
        createEnemyWave();
    } else {
        setTimeout(initEnemies, 100);
    }
}
window.initEnemies = initEnemies;
window.updateEnemies = updateEnemies;

if (document.readyState === 'complete') {
    initEnemies();
} else {
    window.addEventListener('load', initEnemies, { once: true });
    setTimeout(initEnemies, 100);
}
