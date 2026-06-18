// ================================================================
// js/game.js – Игровой цикл, управление волнами, врагами, башнями
// ================================================================

import { BALANCE } from './balance.js';
import { Enemy, createEnemy, createMiniBoss, createBoss } from './enemies.js';
import { Tower, createTower } from './towers.js';
import { EventManager } from './events.js';
import { getPath } from './path.js';
import { loadData, updateStats, addExp, unlockAchievement } from './storage.js';
import { sound } from './sound.js';

export class Game {
    constructor(ui) {
        this.ui = ui;
        this.ui.game = this;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.speedIndex = 0;
        this.speedMultiplier = 1;
        this.enemies = [];
        this.towers = [];
        this.runes = [];
        this.projectiles = [];
        this.gold = BALANCE.startingGold || 100;
        this.castle = {
            health: BALANCE.castle.initialHealth,
            maxHealth: BALANCE.castle.initialHealth,
        };
        this.currentWave = 0;
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesPerWave = 0;
        this.waveTimer = 0;
        this.enemySpawnTimer = 0;
        this.selectedTowerType = null;
        this.attackMode = 'closest';
        this.activeAbilities = {
            damageBoost: 0,
            rangeBoost: 0,
            slowMultiplier: 1,
        };
        this.abilityCooldown = 0;
        this.abilityActive = false;
        this.king = 'warrior';
        this.kingData = null;
        this.freeTowerAvailable = false;
        this.traderModifiers = {
            damageMultiplier: 1,
            attackSpeedMultiplier: 1,
        };
        this.weatherEffects = {
            towerAttackSpeedMultiplier: 1,
            towerRangeMultiplier: 1,
            enemySpeedMultiplier: 1,
            visual: null,
        };
        this.eventManager = new EventManager(this);
        this.pathPoints = getPath();
        this.castleUpgradeCount = 0;
        this.isBossWave = false;

        this.bindCanvasEvents();
        this.resizeCanvas();
        this.ui.setSpeedButtonLabel(this.speedIndex);
    }

    // ------------------------------------------------------------
    // Запуск игры
    // ------------------------------------------------------------
    start(king, difficulty, location) {
        // 1. Устанавливаем параметры
        this.king = king || 'warrior';
        this.difficulty = difficulty || 'medium';
        this.location = location || 'forest';

        // 2. Получаем данные короля с проверкой
        this.kingData = BALANCE.kings[this.king];
        if (!this.kingData) {
            console.warn(`Король "${this.king}" не найден, используем "warrior"`);
            this.king = 'warrior';
            this.kingData = BALANCE.kings.warrior;
        }

        // 3. Применяем модификаторы локации
        const loc = BALANCE.locations[this.location];
        if (loc) {
            if (loc.enemySpeedMultiplier) this.weatherEffects.enemySpeedMultiplier = loc.enemySpeedMultiplier;
            if (loc.towerAttackSpeedMultiplier) this.weatherEffects.towerAttackSpeedMultiplier = loc.towerAttackSpeedMultiplier;
        }

        // 4. Сброс состояния
        this.enemies = [];
        this.towers = [];
        this.runes = [];
        this.projectiles = [];
        this.gold = BALANCE.startingGold || 100;
        this.castle.health = BALANCE.castle.initialHealth;
        this.castle.maxHealth = BALANCE.castle.initialHealth;
        this.currentWave = 0;
        this.waveInProgress = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.freeTowerAvailable = false;
        this.castleUpgradeCount = 0;
        this.abilityCooldown = 0;
        this.eventManager.reset();

        // 5. Показываем игровой экран и обновляем Canvas
        this.ui.showGameScreen();
        this.resizeCanvas();
        this.render();

        // 6. Активируем кнопку способности (перезарядка = 0)
        if (this.kingData) {
            this.ui.updateAbilityCooldown(0, this.kingData.cooldown);
        } else {
            console.error('kingData не установлен!');
        }

        // 7. Запускаем игровой цикл
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);

        // 8. Запускаем первую волну
        this.startNextWave();

        console.log(`Игра начата. Король: ${this.kingData ? this.kingData.name : 'неизвестен'}, Сложность: ${this.difficulty}, Локация: ${this.location}`);
    }

    // ------------------------------------------------------------
    // Игровой цикл
    // ------------------------------------------------------------
    gameLoop(timestamp) {
        if (!this.isRunning) return;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = deltaTime * this.speedMultiplier;

        if (!this.isPaused && !this.isGameOver) {
            this.update(dt);
            this.render();
        }

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    // ------------------------------------------------------------
    // Обновление состояния игры
    // ------------------------------------------------------------
    update(dt) {
        this.eventManager.updateRunes(dt);

        // Обновляем врагов
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt);
            if (enemy.isAtEnd()) {
                this.castle.health -= 10;
                sound.castleHit();
                this.enemies.splice(i, 1);
                if (this.castle.health <= 0) {
                    this.castle.health = 0;
                    this.endGame('defeat', 'Замок разрушен!');
                }
                continue;
            }
            if (!enemy.isAlive()) {
                this.gold += enemy.goldReward;
                addExp(BALANCE.EXP_PER_KILL);
                updateStats({ totalKills: 1 });
                if (enemy.type === 'boss') updateStats({ totalBossesKilled: 1 });
                sound.enemyKilled();
                this.eventManager.trySpawnRune(enemy.x, enemy.y);
                this.checkAchievements();
                this.enemies.splice(i, 1);
            }
        }

        // Обновляем башни
        for (const tower of this.towers) {
            tower.update(dt);
        }

        // Спавн врагов в волне
        if (this.waveInProgress) {
            this.enemySpawnTimer -= dt;
            if (this.enemySpawnTimer <= 0 && this.enemiesSpawned < this.enemiesPerWave) {
                this.spawnEnemy();
                this.enemySpawnTimer = BALANCE.enemySpawnInterval || 0.8;
            }
        }

        // Проверка окончания волны
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesPerWave) {
            this.waveInProgress = false;
            this.onWaveComplete();
        }

        // Обновление способности короля
        if (this.abilityCooldown > 0) {
            this.abilityCooldown -= dt;
            if (this.abilityCooldown < 0) this.abilityCooldown = 0;
        }
        // Всегда обновляем интерфейс, даже если способность не на перезарядке
        if (this.kingData) {
            this.ui.updateAbilityCooldown(this.abilityCooldown, this.kingData.cooldown);
        }

        this.ui.updateHUD();
    }

    // ------------------------------------------------------------
    // Отрисовка
    // ------------------------------------------------------------
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Путь
        this.drawPath(ctx);

        // Руны
        for (const rune of this.runes) {
            ctx.beginPath();
            ctx.arc(rune.x, rune.y, rune.radius, 0, Math.PI * 2);
            ctx.fillStyle = rune.type === 'green' ? '#00ff00' :
                            rune.type === 'blue' ? '#0088ff' : '#ff0000';
            ctx.fill();
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Башни
        for (const tower of this.towers) {
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = tower.type === 'fast' ? '#66bb6a' :
                            tower.type === 'normal' ? '#42a5f5' : '#ff7043';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.getCurrentRange(), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(tower.level, tower.x, tower.y + 3);

            if (tower.element) {
                ctx.font = '14px Arial';
                ctx.fillText(tower.element === 'fire' ? '🔥' :
                             tower.element === 'ice' ? '❄️' : '☠️',
                             tower.x + 15, tower.y - 15);
            }
        }

        // Враги
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }

        // Замок в конце пути
        const endPoint = this.pathPoints[this.pathPoints.length - 1];
        const castleX = endPoint.x * this.canvas.width;
        const castleY = endPoint.y * this.canvas.height;
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(castleX - 25, castleY - 30, 50, 40);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(castleX - 20, castleY - 40, 10, 10);
        ctx.fillRect(castleX + 10, castleY - 40, 10, 10);
        const hpPercent = this.castle.health / this.castle.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(castleX - 30, castleY + 20, 60, 10);
        ctx.fillStyle = hpPercent > 0.5 ? '#4caf50' : '#f44336';
        ctx.fillRect(castleX - 30, castleY + 20, 60 * hpPercent, 10);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(this.castle.health)}/${this.castle.maxHealth}`, castleX, castleY + 30);

        // Погодный эффект
        if (this.weatherEffects.visual) {
            ctx.fillStyle = 'rgba(200,200,255,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    drawPath(ctx) {
        const points = this.pathPoints.map(p => ({
            x: p.x * this.canvas.width,
            y: p.y * this.canvas.height
        }));
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();
        for (const p of points) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fill();
        }
    }

    // ------------------------------------------------------------
    // Управление волнами
    // ------------------------------------------------------------
    startNextWave() {
        if (this.currentWave >= BALANCE.totalWaves) {
            this.endGame('victory', 'Поздравляем! Вы прошли все волны!');
            return;
        }
        this.currentWave++;
        this.waveInProgress = true;
        this.enemiesSpawned = 0;

        let count = Math.floor(BALANCE.enemies.baseCount + (this.currentWave - 1) * BALANCE.enemies.countPerWave);
        const diff = BALANCE.difficulty[this.difficulty] || BALANCE.difficulty.medium;
        count = Math.floor(count * (diff.enemyCountMultiplier || 1));
        this.enemiesPerWave = count;
        this.enemySpawnTimer = 0;

        this.isBossWave = (this.currentWave % BALANCE.boss.interval === 0);
        if (this.location === 'hell' && this.currentWave >= 3) {
            this.isBossWave = true;
        }

        this.ui.showMessage(`Волна ${this.currentWave} началась! Врагов: ${this.enemiesPerWave}`, 'warning');
    }

    spawnEnemy() {
        const startPoint = this.pathPoints[0];
        const x = startPoint.x * this.canvas.width;
        const y = startPoint.y * this.canvas.height;

        let enemy;
        const miniBossChance = BALANCE.enemies.miniBossChance || 0.2;
        const isMiniBoss = Math.random() < miniBossChance;

        if (this.isBossWave && this.enemiesSpawned === 0) {
            enemy = createBoss(this.currentWave, x, y, this);
            this.isBossWave = false;
        } else if (isMiniBoss) {
            enemy = createMiniBoss(this.currentWave, x, y, this);
        } else {
            enemy = createEnemy(this.currentWave, x, y, this);
        }
        this.enemies.push(enemy);
        this.enemiesSpawned++;
    }

    onWaveComplete() {
        const goldBonus = 20 + this.currentWave * 2;
        this.gold += goldBonus;
        const data = loadData();
        const taxLevel = data.upgradeLevels.tax || 0;
        if (taxLevel > 0) {
            this.gold += BALANCE.upgrades.tax.baseEffect * taxLevel;
        }
        const regenLevel = data.upgradeLevels.regeneration || 0;
        if (regenLevel > 0) {
            const healPercent = BALANCE.upgrades.regeneration.baseEffect * regenLevel;
            this.castle.health = Math.min(this.castle.health + this.castle.maxHealth * healPercent, this.castle.maxHealth);
        }
        addExp(BALANCE.EXP_PER_WAVE);
        updateStats({ totalWavesCompleted: 1 });
        this.checkWaveAchievements();
        this.ui.updateHUD();

        const offer = this.eventManager.trySpawnTrader(this.currentWave);
        if (offer) {
            this.ui.showTraderOffer(offer);
        }
        this.eventManager.updateWeather(this.currentWave, this.location);
        this.eventManager.updateTraderAfterWave();

        setTimeout(() => {
            if (!this.isGameOver) {
                this.startNextWave();
            }
        }, BALANCE.waveDelay * 1000);
    }

    // ------------------------------------------------------------
    // Взаимодействие с Canvas
    // ------------------------------------------------------------
    bindCanvasEvents() {
        this.canvas.addEventListener('click', (e) => {
            if (this.isPaused || this.isGameOver) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Проверка клика по руне
            for (const rune of this.runes) {
                const dx = mouseX - rune.x;
                const dy = mouseY - rune.y;
                if (dx * dx + dy * dy < (rune.radius + 10) ** 2) {
                    this.eventManager.activateRune(rune);
                    return;
                }
            }

            // Проверка клика по башне (контекстное меню)
            for (const tower of this.towers) {
                const dx = mouseX - tower.x;
                const dy = mouseY - tower.y;
                if (dx * dx + dy * dy < 20 * 20) {
                    this.ui.showTowerContext(tower);
                    return;
                }
            }
            this.ui.hideTowerContext();

            // Постройка башни
            if (this.selectedTowerType) {
                this.buildTower(mouseX, mouseY);
            }
        });
    }

    buildTower(x, y) {
        const type = this.selectedTowerType;
        const config = BALANCE.towers[type];
        if (!config) return;

        let cost = config.cost;
        const data = loadData();
        const masteryLevel = data.upgradeLevels.mastery || 0;
        if (masteryLevel > 0) {
            cost *= (1 + BALANCE.upgrades.mastery.baseEffect * masteryLevel);
        }
        if (this.freeTowerAvailable) {
            cost = 0;
            this.freeTowerAvailable = false;
            this.ui.showMessage('Бесплатная башня!', 'success');
        }
        cost = Math.floor(cost);

        if (this.gold < cost) {
            this.ui.showMessage('Недостаточно золота!', 'danger');
            return;
        }

        for (const tower of this.towers) {
            const dx = tower.x - x;
            const dy = tower.y - y;
            if (dx * dx + dy * dy < 40 * 40) {
                this.ui.showMessage('Место занято!', 'warning');
                return;
            }
        }

        const tower = createTower(type, x, y, this);
        this.gold -= cost;
        this.towers.push(tower);
        sound.buildTower();
        this.ui.updateHUD();
        updateStats({ totalTowersBuilt: 1 });
        this.checkAchievements();

        // Сброс выбора башни
        this.selectedTowerType = null;
        this.ui.elements.towerButtons.forEach(btn => btn.classList.remove('btn-primary', 'active'));
    }

    removeTower(tower) {
        const index = this.towers.indexOf(tower);
        if (index !== -1) this.towers.splice(index, 1);
    }

    // ------------------------------------------------------------
    // Способность короля
    // ------------------------------------------------------------
    activateAbility() {
        if (this.abilityCooldown > 0) return;
        if (!this.kingData) return;
        const ability = this.kingData;
        const effect = ability.effect;

        if (effect.damageBoost) {
            this.activeAbilities.damageBoost = effect.damageBoost;
            setTimeout(() => { this.activeAbilities.damageBoost = 0; }, ability.duration * 1000);
        } else if (effect.rangeBoost) {
            this.activeAbilities.rangeBoost = effect.rangeBoost;
            setTimeout(() => { this.activeAbilities.rangeBoost = 0; }, ability.duration * 1000);
        } else if (effect.slowMultiplier) {
            this.activeAbilities.slowMultiplier = effect.slowMultiplier;
            setTimeout(() => { this.activeAbilities.slowMultiplier = 1; }, ability.duration * 1000);
        } else if (effect.freeTower) {
            this.freeTowerAvailable = true;
            this.ui.showMessage('Следующая башня бесплатна!', 'success');
        }

        this.abilityCooldown = ability.cooldown;
        sound.abilityActivated();
        this.ui.showMessage(`Активирована способность: ${ability.name}`, 'success');
        this.ui.updateAbilityCooldown(this.abilityCooldown, ability.cooldown);
    }

    // ------------------------------------------------------------
    // Достижения
    // ------------------------------------------------------------
    checkAchievements() {
        const data = loadData();
        const stats = data.stats;

        const achievements = [
            { id: 'first_blood', check: stats.totalKills >= 1 },
            { id: 'thousand_kills', check: stats.totalKills >= 1000 },
            { id: 'architect', check: stats.totalTowersBuilt >= 50 },
            { id: 'boss_hunter', check: stats.totalBossesKilled >= 10 },
        ];

        for (const ach of achievements) {
            if (ach.check) {
                const unlocked = unlockAchievement(ach.id);
                if (unlocked) {
                    const fullAch = BALANCE.achievements.find(a => a.id === ach.id);
                    if (fullAch) {
                        this.ui.showAchievementNotification(fullAch);
                        addExp(fullAch.expReward);
                        sound.achievement();
                    }
                }
            }
        }
    }

    checkWaveAchievements() {
        // "Неприступный" – пока не реализовано, можно добавить позже
    }

    // ------------------------------------------------------------
    // Завершение игры
    // ------------------------------------------------------------
    endGame(result, message) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (result === 'victory') sound.victory();
        else sound.defeat();

        const stats = {
            'Волна': this.currentWave,
            'Убийства': this.enemies.length,
            'Золото': Math.floor(this.gold),
            'Опыт': loadData().exp,
        };
        this.ui.showResult(result === 'victory' ? 'Победа!' : 'Поражение', message, stats);
    }

    // ------------------------------------------------------------
    // Изменение размера Canvas
    // ------------------------------------------------------------
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
}