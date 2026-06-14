// Player controls, shooting, jump, and sprint logic
const bullets = [];
let ammo = 20; // Starting ammo
const ammoCount = document.getElementById('ammoCount');
const bulletSpeed = 1.2;
const bulletLife = 120;
const AUTO_FIRE_DELAY_MS = 200; // Change this delay in code (milliseconds)
let lastAutoFireTime = 0;
let isFiring = false;
let gameOver = false;
let killedBy = '';
const ammoPickups = [];
const autoFireDisplay = document.getElementById('autoFireDisplay');
if (autoFireDisplay) {
    autoFireDisplay.textContent = `Auto-fire delay: ${AUTO_FIRE_DELAY_MS}ms`;
}
let invincibilityTimer = 300; // 5 seconds at 60fps
const maxInvincibilityTime = 300;

// Score and kill tracking (UI elements in index.html)
window.score = window.score || 0;
window.killCount = window.killCount || 0;
const scoreDisplay = document.getElementById('scoreDisplay');
const killCountDisplay = document.getElementById('killCountDisplay');

function updateScoreUI() {
    if (scoreDisplay) scoreDisplay.textContent = `Score: ${window.score}`;
    if (killCountDisplay) killCountDisplay.textContent = `Kills: ${window.killCount}`;
}

function shootBullet() {
    if (ammo <= 0 || gameOver) return;
    ammo--;
    ammoCount.textContent = ammo;
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    const bulletDirection = new THREE.Vector3();
    camera.getWorldDirection(bulletDirection);
    bullet.position.copy(camera.position);
    bullet.position.y -= 0.1;
    bullet.userData = {
        direction: bulletDirection.clone(),
        life: bulletLife
    };
    scene.add(bullet);
    bullets.push(bullet);
}

let isLocked = false;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

let isJumping = false;
let velocityY = 0;
const gravity = -0.01;

const keys = {};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Return highest top Y of any collidable under the given X,Z (within radius), or null
function getHighestGroundUnder(x, z, radius = 0.6) {
    const coll = window.collidables || [];
    let highest = null;
    for (let obj of coll) {
        const objWidth = (obj.userData && obj.userData.width) || (obj.geometry && obj.geometry.parameters && obj.geometry.parameters.width) || 1;
        const objDepth = (obj.userData && obj.userData.depth) || (obj.geometry && obj.geometry.parameters && obj.geometry.parameters.depth) || 1;
        const objHeight = (obj.userData && obj.userData.height) || (obj.geometry && obj.geometry.parameters && obj.geometry.parameters.height) || 2;
        const minX = obj.position.x - objWidth / 2 - radius;
        const maxX = obj.position.x + objWidth / 2 + radius;
        const minZ = obj.position.z - objDepth / 2 - radius;
        const maxZ = obj.position.z + objDepth / 2 + radius;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
            const topY = obj.position.y + objHeight / 2;
            if (highest === null || topY > highest) highest = topY;
        }
    }
    return highest;
}

// Create a simple textured weapon model attached to the camera
function createWeaponModel() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Stripes for a stylized texture
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(${80 + i * 20}, ${40 + i * 10}, ${20 + i * 5}, 0.5)`;
            ctx.fillRect(i * 40, 0, 20, canvas.height);
        }
        // Metal highlight
        ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
        ctx.fillRect(30, 10, 200, 20);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        const geo = new THREE.BoxGeometry(0.4, 0.12, 0.6);
        const mat = new THREE.MeshBasicMaterial({ map: texture });
        const weapon = new THREE.Mesh(geo, mat);
        // Position in front-right of camera
        weapon.position.set(0.5, -0.5, -1);
        weapon.rotation.y = -0.1;
        camera.add(weapon);
    } catch (e) {
        console.warn('Failed to create weapon model', e);
    }
}

createWeaponModel();

if (document.pointerLockElement !== undefined) {
    document.addEventListener('pointerlockchange', () => {
        isLocked = (document.pointerLockElement === renderer.domElement);
    });
}

renderer.domElement.addEventListener('mousedown', (event) => {
    if (!isLocked) {
        renderer.domElement.requestPointerLock();
        return;
    }
    if (event.button !== 0) return;
    isFiring = true;
    shootBullet();
    lastAutoFireTime = Date.now();
});

renderer.domElement.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isFiring = false;
    }
});

document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
    camera.quaternion.setFromEuler(euler);
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !isJumping) {
        isJumping = true;
        // Slightly stronger jump impulse so jumps are noticeable
        velocityY = 0.28;
    }
    keys[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

function updatePlayer() {
    if (gameOver) return;
    
    direction.set(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp']) direction.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) direction.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) direction.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;

    direction.normalize();
    direction.applyEuler(new THREE.Euler(0, euler.y, 0));
    // Increased base player speed
    velocity.copy(direction).multiplyScalar(0.2);

    velocityY += gravity;
    camera.position.y += velocityY;
    
    // Check for climbing on blocks (step up)
    const climbHeight = 1.2;
    const climbCheckPos = camera.position.clone();
    climbCheckPos.y += climbHeight;
    
    let canClimb = false;
    let hitObject = window.checkCollision ? window.checkCollision(climbCheckPos, 0.5) : false;
    if (!hitObject) {
        canClimb = true;
    }
    
    if (camera.position.y <= 1.6) {
        camera.position.y = 1.6;
        isJumping = false;
        velocityY = 0;
    }

    // Store previous position for sliding collision
    const prevX = camera.position.x;
    const prevZ = camera.position.z;
    const prevY = camera.position.y;
    
    // Test new position BEFORE moving (predictive collision)
    const testX = camera.position.x + velocity.x;
    const testZ = camera.position.z + velocity.z;
    const testPos = new THREE.Vector3(testX, camera.position.y, testZ);
    
    // Check collision with smaller radius for tighter collision
    let collision = window.checkCollision ? window.checkCollision(testPos, 0.6) : false;
    
    if (collision) {
        // Try sliding along X axis only
        const testXOnly = new THREE.Vector3(testX, camera.position.y, prevZ);
        let xCollision = window.checkCollision ? window.checkCollision(testXOnly, 0.6) : false;
        
        if (!xCollision) {
            // X movement is clear
            camera.position.x = testX;
            camera.position.z = prevZ;
        } else {
            // Try sliding along Z axis only
            const testZOnly = new THREE.Vector3(prevX, camera.position.y, testZ);
            let zCollision = window.checkCollision ? window.checkCollision(testZOnly, 0.6) : false;
            
            if (!zCollision) {
                // Z movement is clear
                camera.position.x = prevX;
                camera.position.z = testZ;
            }
            // else both axes blocked, don't move
        }
    } else {
        // No collision, move normally
        camera.position.x = testX;
        camera.position.z = testZ;
    }
    
    // Keep player inside map bounds with strict enforcement
    if (camera.position.x < -45) camera.position.x = -45;
    if (camera.position.x > 45) camera.position.x = 45;
    if (camera.position.z < -45) camera.position.z = -45;
    if (camera.position.z > 45) camera.position.z = 45;
    
    // Double-check collision at final position and push player out if needed
    let finalCollision = window.checkCollision ? window.checkCollision(camera.position, 0.6) : false;
    if (finalCollision) {
        // Push player back to previous position as failsafe
        camera.position.x = prevX;
        camera.position.z = prevZ;
    }

    // Snap the player to the top of any collidable underneath to prevent sinking into objects
    const groundTop = getHighestGroundUnder(camera.position.x, camera.position.z, 0.6);
    if (groundTop !== null) {
        const desiredY = groundTop + 1.6;
        if (camera.position.y < desiredY) {
            camera.position.y = desiredY;
            velocityY = 0;
            isJumping = false;
        }
    } else {
        // Default ground level
        if (camera.position.y < 1.6) {
            camera.position.y = 1.6;
            velocityY = 0;
            isJumping = false;
        }
    }
    
    // Decrease invincibility timer
    if (invincibilityTimer > 0) {
        invincibilityTimer--;
        // Update invincibility display
        const invincDisplay = document.getElementById('invincibilityDisplay');
        const timeLeft = Math.ceil(invincibilityTimer / 60);
        if (invincDisplay) {
            invincDisplay.textContent = `Invincibility: ${timeLeft}s`;
            invincDisplay.style.color = timeLeft <= 1 ? '#ff6600' : '#00ff00';
        }
    } else {
        // Hide invincibility display when expired
        const invincDisplay = document.getElementById('invincibilityDisplay');
        if (invincDisplay) {
            invincDisplay.style.display = 'none';
        }
    }
    
    // Check collision with ammo pickups
    for (let i = ammoPickups.length - 1; i >= 0; i--) {
        const pickup = ammoPickups[i];
        if (camera.position.distanceTo(pickup.position) < 1.0) {
            ammo += 4; // Each pickup gives 4 ammo
            ammoCount.textContent = ammo;
            scene.remove(pickup);
            ammoPickups.splice(i, 1);
        }
    }
    
    // Check collision with enemies (only if invincibility expired)
    if (window.enemies && invincibilityTimer <= 0) {
        for (let enemy of enemies) {
            if (camera.position.distanceTo(enemy.position) < 1.5) {
                triggerGameOver('Enemy');
                return;
            }
        }
    }

    // Auto-fire while left mouse is held down
    if (isFiring) {
        const now = Date.now();
        if (now - lastAutoFireTime >= AUTO_FIRE_DELAY_MS) {
            shootBullet();
            lastAutoFireTime = now;
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.userData.direction.clone().multiplyScalar(bulletSpeed));
        bullet.userData.life -= 1;

        if (bullet.userData.life <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }

        if (window.enemies) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (bullet.position.distanceTo(enemy.position) < 1.0) {
                    enemy.userData.health = 0; // Set health to 0 so enemy.js can handle the drop
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    break;
                }
            }
        }
    }
}

function triggerGameOver(killedByEntity) {
    gameOver = true;
    killedBy = killedByEntity;
    document.getElementById('killScreen').style.display = 'flex';
    document.getElementById('killReason').textContent = `You were killed by ${killedByEntity}!`;
}

function createAmmoDropAt(position) {
    const ammoGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const ammoMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const ammoDrop = new THREE.Mesh(ammoGeometry, ammoMaterial);
    ammoDrop.position.copy(position);
    scene.add(ammoDrop);
    ammoPickups.push(ammoDrop);
    return ammoDrop;
}
