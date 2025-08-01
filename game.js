const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;
const crosshair = document.getElementById('crosshair');
const reloadCanvas = document.getElementById('reloadTimer');
const reloadCtx = reloadCanvas.getContext('2d');
window.notification = window.notification || document.getElementById('notification');
const shopModal = document.getElementById('shopModal');
const shopClose = document.getElementById('shopClose');
const inventoryModal = document.getElementById('inventoryModal');
const inventoryClose = document.getElementById('inventoryClose');
const alarmText = document.getElementById('alarmText');
const threatText = document.getElementById('threatText');

let state = {
    coins: 0,
    score: 0,
    inventory: [],
    weapon: 'missile',
    reloadTime: 3000,
    isPaused: false,
    isAlarmActive: false
};
let drones = [];
let missiles = [];
let bullets = [];
let explosions = [];
let sparkEffects = [];
let lastDroneSpawn = Date.now();
let lastShotTime = 0;
let lastFrameTime = 0;
let animationFrameId = null;
let activeBulletSounds = 0;
let activeExplosionSounds = 0;
const maxSounds = 5;
let alarmTimeout = null;
let alarmStartTime = null;
let dronesDestroyed = 0; // Counter for destroyed drones

const alarmSound = new Audio('trg.mp3');
alarmSound.loop = false;
alarmSound.volume = 0.3;

function toggleAlarm() {
    state.isAlarmActive = !state.isAlarmActive;
    if (state.isAlarmActive) {
        alarmStartTime = Date.now();
        if (!state.isPaused) alarmSound.play();
        alarmText.textContent = 'ТРЕВОГА!';
        threatText.textContent = 'Угроза Shahed-136';
        alarmText.style.color = '#ff0000';
        threatText.style.color = '#ff0000';
        alarmTimeout = setTimeout(() => {
            state.isAlarmActive = false;
            alarmSound.pause();
            alarmSound.currentTime = 0;
            drones = []; // Clear drones on "Отбой"
            alarmText.textContent = 'ОТБОЙ!';
            threatText.textContent = 'Без угроз';
            alarmText.style.color = '#ffffff'; // White text on gradient background
            threatText.style.color = '#ffffff'; // White text on gradient background
            if (!state.isPaused) alarmTimeout = setTimeout(toggleAlarm, 60000);
        }, 60000); // 1-minute alarm
    } else {
        if (!state.isPaused) alarmTimeout = setTimeout(toggleAlarm, 60000); // 1-minute rest
    }
}

setTimeout(toggleAlarm, 20000);

function loadGame() {
    const saved = localStorage.getItem('dronelineGame');
    if (saved) {
        const data = JSON.parse(saved);
        state.coins = data.coins || 0;
        state.score = data.score || 0;
        state.inventory = data.inventory || [];
        updateUI();
        updateInventory();
    }
}

function saveGame() {
    localStorage.setItem('dronelineGame', JSON.stringify(state));
}

function updateUI() {
    window.coinsDisplay = window.coinsDisplay || document.getElementById('coins');
    window.scoreDisplay = window.scoreDisplay || document.getElementById('score');
    window.coinsDisplay.textContent = state.coins;
    window.scoreDisplay.textContent = state.score;
}

function showNotification(message) {
    window.notification.textContent = message;
    window.notification.classList.add('show');
    setTimeout(() => {
        window.notification.classList.remove('show');
    }, 2000);
}

function showAmmoExplosionNotification(x, y) {
    if (isNaN(x) || isNaN(y)) {
        console.warn('Invalid coordinates for ammo explosion notification:', x, y);
        return;
    }
    const notification = document.createElement('div');
    notification.className = 'ammo-explosion-notification';
    notification.textContent = 'Взрыв боевой части!';
    document.getElementById('gameContainer').appendChild(notification);
    
    // Position notification above the drone
    const canvasRect = canvas.getBoundingClientRect();
    notification.style.left = `${canvasRect.left + x}px`;
    notification.style.top = `${canvasRect.top + y - 30}px`;
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500); // Wait for fade-out transition
    }, 2000);
}

// New function for destroyed notification
function showDestroyedNotification(x, y) {
    if (isNaN(x) || isNaN(y)) {
        console.warn('Invalid coordinates for destroyed notification:', x, y);
        return;
    }
    const notification = document.createElement('div');
    notification.className = 'destroyed-notification';
    notification.textContent = 'СБИТО!';
    document.getElementById('gameContainer').appendChild(notification);
    
    // Position notification above the drone
    const canvasRect = canvas.getBoundingClientRect();
    notification.style.left = `${canvasRect.left + x}px`;
    notification.style.top = `${canvasRect.top + y - 30}px`;
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500); // Wait for fade-out transition
    }, 2000);
}

const shahedImage = new Image();
shahedImage.src = 'shahed.png';
const pzrkImage = new Image();
pzrkImage.src = 'pzrk.png';
const pkmImage = new Image();
pkmImage.src = 'PKM.jpg';
const rpkImage = new Image();
rpkImage.src = 'RPK.jpg';
const m249Image = new Image();
m249Image.src = 'M249.jpg';

class Drone {
    constructor(x, y) {
        this.x = x || Math.random() * (canvas.width - 60);
        this.y = y || -60;
        this.width = 60;
        this.height = 60;
        this.speed = 0.8 + Math.random() * 0.8;
        this.angle = Math.random() * Math.PI / 4 - Math.PI / 8;
        this.hits = 0;
    }
    update() {
        if (state.isAlarmActive) {
            this.y += this.speed;
            this.x += Math.sin(this.angle) * 2;
        } else {
            this.y += 2;
            if (this.y > canvas.height + this.height) {
                drones = drones.filter(d => d !== this);
            }
        }
        console.debug('Drone position:', { x: this.x, y: this.y });
    }
    draw() {
        ctx.save();
        ctx.filter = 'grayscale(100%) brightness(200%) contrast(150%)';
        ctx.drawImage(shahedImage, this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = canvas.height;
        this.targetX = x;
        this.targetY = y;
        this.speed = 5;
        this.width = 40;
        this.height = 80;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -this.height) {
            missiles = missiles.filter(m => m !== this);
        }
    }
    draw() {
        ctx.save();
        ctx.filter = 'grayscale(100%) brightness(200%) contrast(150%)';
        ctx.drawImage(pzrkImage, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, weaponType) {
        this.x = x;
        this.y = canvas.height;
        this.targetX = x;
        this.targetY = y;
        this.speed = 15;
        this.weaponType = weaponType;
        this.animationTime = Date.now();
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
        if (weaponType === 'PKM') {
            this.width = 5;
            this.height = 10;
            this.color = '#ff0000';
        } else if (weaponType === 'RPK') {
            this.width = 6;
            this.height = 12;
            this.color = '#00b7eb';
        } else if (weaponType === 'M249') {
            this.width = 4;
            this.height = 8;
            this.color = '#00ff00';
        }
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -this.height) {
            bullets = bullets.filter(b => b !== this);
        }
    }
    draw() {
        const elapsed = Date.now() - this.animationTime;
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.weaponType === 'PKM') {
            const scale = 1 + Math.sin(elapsed / 50) * 0.2;
            ctx.scale(scale, scale);
        } else if (this.weaponType === 'RPK') {
            ctx.rotate(Math.sin(elapsed / 100) * 0.1);
        } else if (this.weaponType === 'M249') {
            const scale = 1 + Math.sin(elapsed / 30) * 0.3;
            ctx.scale(scale, scale);
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Explosion {
    constructor(x, y, weaponType) {
        this.x = x;
        this.y = y;
        this.weaponType = weaponType;
        if (weaponType === 'missile' || weaponType === 'PKM') {
            this.radius = 10;
            this.maxRadius = 50;
            this.growthRate = 2;
            this.color = 'rgba(255, 165, 0, ';
        } else if (weaponType === 'RPK') {
            this.radius = 15;
            this.maxRadius = 60;
            this.growthRate = 2.5;
            this.color = 'rgba(0, 183, 235, ';
        } else if (weaponType === 'M249') {
            this.radius = 8;
            this.maxRadius = 40;
            this.growthRate = 1.5;
            this.color = 'rgba(0, 255, 0, ';
        }
        this.alpha = 1;
    }
    update() {
        this.radius += this.growthRate;
        this.alpha -= 0.02;
        if (this.alpha <= 0) {
            explosions = explosions.filter(e => e !== this);
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${this.color}${this.alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${this.color === 'rgba(255, 165, 0, ' ? '255, 0, 0' : this.color === 'rgba(0, 183, 235, ' ? '0, 0, 255' : '0, 128, 0'}, ${this.alpha})`;
        ctx.stroke();
        ctx.restore();
    }
}

class SparkEffect {
    constructor(x, y, weaponType) {
        this.x = x;
        this.y = y;
        this.weaponType = weaponType;
        this.particles = [];
        let particleCount, radiusRange, duration;
        if (weaponType === 'PKM') {
            particleCount = Math.floor(Math.random() * 3) + 2;
            radiusRange = [2, 4];
            duration = 300;
            this.color = 'rgba(255, 165, 0, ';
        } else if (weaponType === 'RPK') {
            particleCount = Math.floor(Math.random() * 3) + 3;
            radiusRange = [3, 5];
            duration = 400;
            this.color = 'rgba(0, 183, 235, ';
        } else if (weaponType === 'M249') {
            particleCount = Math.floor(Math.random() * 3) + 4;
            radiusRange = [1, 3];
            duration = 200;
            this.color = 'rgba(0, 255, 0, ';
        }
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x,
                y: y,
                radius: radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]),
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                alpha: 1,
                duration: duration,
                startTime: Date.now()
            });
        }
    }
    update() {
        this.particles.forEach(particle => {
            const elapsed = Date.now() - particle.startTime;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha = 1 - elapsed / particle.duration;
        });
        this.particles = this.particles.filter(p => p.alpha > 0);
        if (this.particles.length === 0) {
            sparkEffects = sparkEffects.filter(e => e !== this);
        }
    }
    draw() {
        ctx.save();
        this.particles.forEach(particle => {
            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `${this.color}${particle.alpha})`;
            ctx.fill();
        });
        ctx.restore();
    }
}

function spawnDrone() {
    if (state.isAlarmActive && !state.isPaused && Date.now() - lastDroneSpawn > 4000 && drones.length < 7) {
        const elapsed = Date.now() - alarmStartTime;
        let groupSize;
        if (elapsed < 20000) { // First 20s: 1 drone
            groupSize = 1;
        } else if (elapsed < 40000) { // 20–40s: 2–3 drones
            groupSize = Math.floor(Math.random() * 2) + 2;
        } else { // 40–60s: 3–4 drones
            groupSize = Math.floor(Math.random() * 2) + 3;
        }
        groupSize = Math.min(groupSize, 7 - drones.length); // Cap at max 7 drones
        const baseX = Math.random() * (canvas.width - 60 * groupSize);
        const baseY = -60;
        for (let i = 0; i < groupSize; i++) {
            const offsetX = baseX + i * (60 + Math.random() * 40);
            drones.push(new Drone(offsetX, baseY));
        }
        lastDroneSpawn = Date.now();
        console.debug('Spawned drones:', drones.length);
    }
}

function renderShop(state, updateUI, updateInventory, showNotification, saveGame) {
    const shopContent = document.getElementById('shopContent');
    shopContent.innerHTML = '';
    const items = [
        { id: 'PKM', name: 'ПКМ', price: 50, image: 'PKM.jpg' },
        { id: 'RPK', name: 'РПК', price: 200, image: 'RPK.jpg' },
        { id: 'M249', name: 'M249', price: 500, image: 'M249.jpg' }
    ];
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        const isPurchased = state.inventory.some(i => i.id === item.id);
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <span>${item.name}</span>
            <span class="shop-item-price">${item.price} монет</span>
            <button ${isPurchased ? 'disabled' : ''}>${isPurchased ? 'Куплено!' : 'Купить'}</button>
        `;
        if (!isPurchased) {
            itemDiv.querySelector('button').addEventListener('click', () => {
                if (state.coins >= item.price) {
                    state.coins -= item.price;
                    state.inventory.push({ id: item.id, name: item.name });
                    updateUI();
                    updateInventory();
                    showNotification(`${item.name} куплен!`);
                    saveGame();
                    itemDiv.querySelector('button').textContent = 'Куплено!';
                    itemDiv.querySelector('button').disabled = true;
                } else {
                    showNotification('Недостаточно монет!');
                }
            });
        }
        shopContent.appendChild(itemDiv);
    });
}

function getGridCell(x, y, gridSize) {
    return {
        col: Math.floor(x / gridSize),
        row: Math.floor(y / gridSize)
    };
}

function checkCollisions() {
    const gridSize = 100;
    const grid = {};

    drones.forEach((drone, dIndex) => {
        const cell = getGridCell(drone.x + drone.width / 2, drone.y + drone.height / 2, gridSize);
        const key = `${cell.col},${cell.row}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push({ type: 'drone', index: dIndex, obj: drone });
    });

    const missileRemovals = [];
    const bulletRemovals = [];
    const droneRemovals = [];

    missiles.forEach((missile, mIndex) => {
        const cell = getGridCell(missile.x, missile.y, gridSize);
        for (let col = cell.col - 1; col <= cell.col + 1; col++) {
            for (let row = cell.row - 1; row <= cell.row + 1; row++) {
                const key = `${col},${row}`;
                if (grid[key]) {
                    grid[key].forEach(item => {
                        if (item.type === 'drone') {
                            const drone = item.obj;
                            if (
                                missile.x - missile.width / 2 < drone.x + drone.width &&
                                missile.x + missile.width / 2 > drone.x &&
                                missile.y - missile.height / 2 < drone.y + drone.height &&
                                missile.y + missile.height / 2 > drone.y
                            ) {
                                explosions.push(new Explosion(missile.x, missile.y, 'missile'));
                                if (activeExplosionSounds < maxSounds) {
                                    const sound = new Audio('vzr.mp3');
                                    sound.volume = 0.7;
                                    sound.play().catch(err => console.error('Error playing explosion sound:', err));
                                    activeExplosionSounds++;
                                    sound.onended = () => activeExplosionSounds--;
                                }
                                droneRemovals.push(item.index);
                                missileRemovals.push(mIndex);
                                state.coins += 10;
                                state.score += 1;
                                dronesDestroyed++; // Increment counter
                                showDestroyedNotification(drone.x + drone.width / 2, drone.y);
                            }
                        }
                    });
                }
            }
        }
    });

    bullets.forEach((bullet, bIndex) => {
        const cell = getGridCell(bullet.x, bullet.y, gridSize);
        for (let col = cell.col - 1; col <= cell.col + 1; col++) {
            for (let row = cell.row - 1; row <= cell.row + 1; row++) {
                const key = `${col},${row}`;
                if (grid[key]) {
                    grid[key].forEach(item => {
                        if (item.type === 'drone') {
                            const drone = item.obj;
                            if (
                                bullet.x - bullet.width / 2 < drone.x + drone.width &&
                                bullet.x + bullet.width / 2 > drone.x &&
                                bullet.y - bullet.height / 2 < drone.y + drone.height &&
                                bullet.y + bullet.height / 2 > drone.y
                            ) {
                                console.debug('Bullet hit drone:', { bulletX: bullet.x, bulletY: bullet.y, droneX: drone.x, droneY: drone.y });
                                sparkEffects.push(new SparkEffect(bullet.x, bullet.y, bullet.weaponType));
                                // Check for ammo explosion (10% chance, limited to every 10th drone)
                                const ammoExplosionChance = Math.random();
                                if (ammoExplosionChance < 0.1 && dronesDestroyed % 10 === 0) {
                                    explosions.push(new Explosion(drone.x + drone.width / 2, drone.y + drone.height / 2, bullet.weaponType));
                                    if (activeExplosionSounds < maxSounds) {
                                        const sound = new Audio('vzr.mp3');
                                        sound.volume = 0.7;
                                        sound.play().catch(err => console.error('Error playing explosion sound:', err));
                                        activeExplosionSounds++;
                                        sound.onended = () => activeExplosionSounds--;
                                    }
                                    showAmmoExplosionNotification(drone.x + drone.width / 2, drone.y);
                                    droneRemovals.push(item.index);
                                    bulletRemovals.push(bIndex);
                                    state.coins += 10;
                                    state.score += 1;
                                    dronesDestroyed++; // Increment counter
                                } else {
                                    drone.hits += 1;
                                    bulletRemovals.push(bIndex);
                                    const maxHits = bullet.weaponType === 'PKM' ? 10 : bullet.weaponType === 'RPK' ? 9 : 8;
                                    if (drone.hits >= maxHits) {
                                        explosions.push(new Explosion(drone.x + drone.width / 2, drone.y + drone.height / 2, bullet.weaponType));
                                        if (activeExplosionSounds < maxSounds) {
                                            const sound = new Audio('vzr.mp3');
                                            sound.volume = 0.7;
                                            sound.play().catch(err => console.error('Error playing explosion sound:', err));
                                            activeExplosionSounds++;
                                            sound.onended = () => activeExplosionSounds--;
                                        }
                                        showDestroyedNotification(drone.x + drone.width / 2, drone.y);
                                        droneRemovals.push(item.index);
                                        state.coins += 10;
                                        state.score += 1;
                                        dronesDestroyed++; // Increment counter
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }
    });

    missileRemovals.sort((a, b) => b - a).forEach(index => missiles.splice(index, 1));
    bulletRemovals.sort((a, b) => b - a).forEach(index => bullets.splice(index, 1));
    droneRemovals.sort((a, b) => b - a).forEach(index => drones.splice(index, 1));

    updateUI();
    saveGame();
}

function drawReloadTimer() {
    reloadCtx.clearRect(0, 0, reloadCanvas.width, reloadCanvas.height);
    const elapsed = Date.now() - lastShotTime;
    const currentReloadTime = state.reloadTime;
    const progress = Math.min(elapsed / currentReloadTime, 1);
    reloadCtx.beginPath();
    reloadCtx.arc(15, 15, 13, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
    reloadCtx.strokeStyle = state.weapon === 'missile' ? '#4a704a' : state.weapon === 'RPK' ? '#00b7eb' : state.weapon === 'M249' ? '#00ff00' : '#ff0000';
    reloadCtx.lineWidth = 4;
    reloadCtx.stroke();
}

const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        shopModal.classList.remove('active');
        inventoryModal.classList.remove('active');
        canvas.style.cursor = 'default';
        crosshair.style.display = 'none';
        reloadCanvas.style.display = 'none';
        document.body.style.cursor = 'default';
        if (tab.dataset.tab === 'shop') {
            shopModal.classList.add('active');
            renderShop(state, updateUI, updateInventory, showNotification, saveGame);
        } else if (tab.dataset.tab === 'inventory') {
            inventoryModal.classList.add('active');
            updateInventory();
        } else {
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        }
    });
});
shopClose.addEventListener('click', () => {
    shopModal.classList.remove('active');
    tabs.forEach(t => t.classList.remove('active'));
    canvas.style.cursor = 'none';
    crosshair.style.display = 'block';
    reloadCanvas.style.display = 'block';
    document.body.style.cursor = 'none';
});
inventoryClose.addEventListener('click', () => {
    inventoryModal.classList.remove('active');
    tabs.forEach(t => t.classList.remove('active'));
    canvas.style.cursor = 'none';
    crosshair.style.display = 'block';
    reloadCanvas.style.display = 'block';
    document.body.style.cursor = 'none';
});

function updateInventory() {
    const inventoryContent = document.getElementById('inventoryContent');
    inventoryContent.innerHTML = '';
    if (state.inventory.length === 0) {
        inventoryContent.innerHTML = '<div class="inventory-content">Пусто</div>';
    } else {
        state.inventory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <button onclick="equipWeapon('${item.id}')">Применить</button>
            `;
            inventoryContent.appendChild(itemDiv);
        });
    }
}

window.equipWeapon = function(weaponType) {
    state.weapon = weaponType;
    state.reloadTime = weaponType === 'missile' ? 3000 : weaponType === 'RPK' ? 70 : weaponType === 'M249' ? 60 : 80;
    crosshair.className = '';
    crosshair.innerHTML = '';
    const weaponName = weaponType === 'missile' ? 'Ракеты' : (state.inventory.find(i => i && i.id === weaponType)?.name || 'Unknown Weapon');
    showNotification(`Оружие "${weaponName}" экипировано!`);
};

canvas.addEventListener('mousemove', (e) => {
    if (!state.isPaused && !shopModal.classList.contains('active') && !inventoryModal.classList.contains('active')) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        crosshair.style.left = `${x}px`;
        crosshair.style.top = `${y}px`;
        reloadCanvas.style.left = `${x}px`;
        reloadCanvas.style.top = `${y}px`;
        crosshair.style.display = 'block';
        reloadCanvas.style.display = 'block';
        canvas.style.cursor = 'none';
        document.body.style.cursor = 'none';
    }
});
canvas.addEventListener('mouseleave', () => {
    crosshair.style.display = 'none';
    reloadCanvas.style.display = 'none';
    canvas.style.cursor = 'default';
    document.body.style.cursor = 'default';
});

canvas.addEventListener('click', (e) => {
    if (state.isPaused || shopModal.classList.contains('active') || inventoryModal.classList.contains('active')) return;
    const currentTime = Date.now();
    const currentReloadTime = state.reloadTime;
    if (currentTime - lastShotTime >= currentReloadTime) {
        if (state.weapon !== 'missile' && bullets.length >= 30) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (state.weapon === 'missile') {
            missiles.push(new Missile(x, y));
        } else {
            bullets.push(new Bullet(x, y, state.weapon));
            if (activeBulletSounds < maxSounds) {
                const bulletSound = new Audio('avt.mp3');
                bulletSound.volume = 0.7;
                bulletSound.play().catch(err => console.error('Error playing bullet sound:', err));
                activeBulletSounds++;
                setTimeout(() => {
                    bulletSound.pause();
                    bulletSound.currentTime = 0;
                    activeBulletSounds--;
                }, 100);
            }
        }
        lastShotTime = currentTime;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
        e.preventDefault();
        state.isPaused = !state.isPaused;
        canvas.style.cursor = state.isPaused ? 'default' : 'none';
        crosshair.style.display = state.isPaused ? 'none' : 'block';
        reloadCanvas.style.display = state.isPaused ? 'none' : 'block';
        document.body.style.cursor = state.isPaused ? 'default' : (!shopModal.classList.contains('active') && !inventoryModal.classList.contains('active') ? 'none' : 'default');
        if (state.isPaused) {
            cancelAnimationFrame(animationFrameId);
            alarmSound.pause();
            if (alarmTimeout) clearTimeout(alarmTimeout);
        } else {
            lastDroneSpawn = Date.now();
            lastShotTime = Date.now();
            if (state.isAlarmActive) alarmSound.play();
            if (alarmTimeout) {
                alarmTimeout = setTimeout(toggleAlarm, state.isAlarmActive ? 60000 - (Date.now() - alarmStartTime) : 60000);
            }
            gameLoop();
        }
    }
});

function gameLoop(timestamp) {
    if (state.isPaused) return;
    if (timestamp - lastFrameTime < 16.67) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    spawnDrone();
    drones.forEach(drone => {
        drone.update();
        drone.draw();
    });
    missiles.forEach(missile => {
        missile.update();
        missile.draw();
    });
    bullets.forEach(bullet => {
        bullet.update();
        bullet.draw();
    });
    explosions.forEach(explosion => {
        explosion.update();
        explosion.draw();
    });
    sparkEffects.forEach(effect => {
        effect.update();
        effect.draw();
    });

    missiles = missiles.filter(m => m.y > -100);
    bullets = bullets.filter(b => b.y > -10);

    checkCollisions();
    drawReloadTimer();
    animationFrameId = requestAnimationFrame(gameLoop);
}

let imagesLoaded = 0;
const totalImages = 5;
function checkImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        loadGame();
        gameLoop(performance.now());
    }
}
shahedImage.onload = checkImagesLoaded;
pzrkImage.onload = checkImagesLoaded;
pkmImage.onload = checkImagesLoaded;
rpkImage.onload = checkImagesLoaded;
m249Image.onload = checkImagesLoaded;
shahedImage.onerror = () => {
    console.error('Failed to load shahed.png');
    imagesLoaded++;
    checkImagesLoaded();
};
pzrkImage.onerror = () => {
    console.error('Failed to load pzrk.png');
    imagesLoaded++;
    checkImagesLoaded();
};
pkmImage.onerror = () => {
    console.error('Failed to load PKM.jpg');
    imagesLoaded++;
    checkImagesLoaded();
};
rpkImage.onerror = () => {
    console.error('Failed to load RPK.jpg');
    imagesLoaded++;
    checkImagesLoaded();
};
m249Image.onerror = () => {
    console.error('Failed to load M249.jpg');
    imagesLoaded++;
    checkImagesLoaded();
};