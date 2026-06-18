// ================================================================
// js/enemies.js – Классы врагов, мини-боссов и боссов
// ================================================================

import { BALANCE } from './balance.js';
import { getPath } from './path.js';

// ------------------------------------------------------------
// Базовый класс Enemy (все враги)
// ------------------------------------------------------------
export class Enemy {
    /**
     * @param {string} type - 'normal' | 'miniBoss' | 'boss'
     * @param {number} wave - номер волны
     * @param {number} x - начальная X (в пикселях)
     * @param {number} y - начальная Y
     * @param {object} gameRef - ссылка на игру (для доступа к пути и т.д.)
     */
    constructor(type, wave, x, y, gameRef) {
        this.type = type;
        this.wave = wave;
        this.x = x;
        this.y = y;
        this.game = gameRef;

        // Базовая конфигурация врага (из balance.js)
        const baseHealth = BALANCE.enemies.baseHealth;
        const baseSpeed = BALANCE.enemies.baseSpeed;
        const baseGold = BALANCE.enemies.baseGoldReward;

        // Множители сложности
        const diffMultiplier = this.getDifficultyMultiplier();

        // Расчёт параметров в зависимости от волны
        const healthMult = Math.pow(BALANCE.enemies.healthMultiplierPerWave, wave - 1);
        const speedMult = Math.pow(BALANCE.enemies.speedMultiplierPerWave, wave - 1);
        const goldMult = Math.pow(BALANCE.enemies.goldMultiplierPerWave, wave - 1);

        this.maxHealth = baseHealth * healthMult * diffMultiplier.health;
        this.health = this.maxHealth;
        this.speed = baseSpeed * speedMult * diffMultiplier.speed;
        this.goldReward = baseGold * goldMult * diffMultiplier.gold;

        // Дополнительные параметры
        this.armor = 0; // можно добавить механику брони
        this.debuffs = []; // массив активных дебаффов

        // Для движения по пути
        this.pathIndex = 1; // индекс следующей точки пути (0 - старт)
        this.pathPoints = getPath(); // массив точек в долях (0..1)
        // Преобразуем в пиксели при первом обновлении (или в конструкторе)
        this.pathPointsPx = this.pathPoints.map(p => ({
            x: p.x * this.game.canvas.width,
            y: p.y * this.game.canvas.height
        }));

        // Флаг, достиг ли конца пути
        this.reachedEnd = false;

        // Для боссов – увеличенный размер
        this.size = 12; // радиус отрисовки
        if (type === 'miniBoss') {
            this.size = 18;
            this.maxHealth *= BALANCE.enemies.miniBossHealthMultiplier;
            this.health = this.maxHealth;
            this.goldReward *= BALANCE.enemies.miniBossGoldMultiplier;
        } else if (type === 'boss') {
            this.size = 28;
            this.maxHealth *= BALANCE.boss.healthMultiplier;
            this.health = this.maxHealth;
            this.goldReward *= BALANCE.boss.goldRewardMultiplier;
        }
    }

    // Получение множителей сложности
    getDifficultyMultiplier() {
        const diff = this.game.difficulty || 'medium';
        const config = BALANCE.difficulty[diff] || BALANCE.difficulty.medium;
        return {
            health: config.enemyHealthMultiplier || 1.0,
            speed: config.enemySpeedMultiplier || 1.0,
            gold: config.goldMultiplier || 1.0,
            count: config.enemyCountMultiplier || 1.0,
        };
    }

    // Обновление врага (движение, дебаффы)
    update(deltaTime) {
        // Применяем дебаффы (обновляем таймеры)
        this.updateDebuffs(deltaTime);

        // Движение по пути
        const speed = this.getCurrentSpeed() * deltaTime * 60; // скорость в пикселях за секунду (при 60 FPS)

        // Текущая точка (где мы сейчас) и следующая
        const current = this.pathPointsPx[this.pathIndex - 1];
        const next = this.pathPointsPx[this.pathIndex];
        if (!next) {
            // Достигли конца пути
            this.reachedEnd = true;
            return;
        }

        const dx = next.x - this.x;
        const dy = next.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed) {
            // Переходим к следующей точке
            this.x = next.x;
            this.y = next.y;
            this.pathIndex++;
            // Если это последняя точка, то враг достиг конца
            if (this.pathIndex >= this.pathPointsPx.length) {
                this.reachedEnd = true;
            }
        } else {
            // Двигаемся к следующей точке
            const ratio = speed / dist;
            this.x += dx * ratio;
            this.y += dy * ratio;
        }
    }

    // Текущая скорость с учётом дебаффов и глобальных модификаторов
    getCurrentSpeed() {
        let speed = this.speed;

        // Дебаффы, замедляющие или останавливающие
        for (const debuff of this.debuffs) {
            if (debuff.type === 'ice') {
                speed *= debuff.speedMultiplier || 0; // полная остановка
            }
            if (debuff.type === 'slow') {
                speed *= debuff.speedMultiplier || 0.7;
            }
        }

        // Погодный эффект (снегопад замедляет врагов)
        if (this.game.weatherEffects && this.game.weatherEffects.enemySpeedMultiplier) {
            speed *= this.game.weatherEffects.enemySpeedMultiplier;
        }

        // Руна синяя – замедление всех врагов
        if (this.game.eventManager && this.game.eventManager.activeRunes.enemySlow) {
            const slow = BALANCE.runes.blue.enemySlow || 0.3;
            speed *= (1 - slow);
        }

        return speed;
    }

    // Получение урона
    takeDamage(damage) {
        // Учитываем броню (если есть)
        let actualDamage = damage;
        if (this.armor > 0) {
            actualDamage = damage * (1 - this.armor);
        }
        this.health -= actualDamage;
        if (this.health < 0) this.health = 0;
    }

    // Применение дебаффа
    applyDebuff(type, params) {
        // Проверяем, есть ли уже такой дебафф (обновляем)
        const existing = this.debuffs.find(d => d.type === type);
        if (existing) {
            // Обновляем длительность
            existing.duration = params.duration || 0;
            if (params.damagePerTick) existing.damagePerTick = params.damagePerTick;
            if (params.speedMultiplier !== undefined) existing.speedMultiplier = params.speedMultiplier;
            if (params.armorReduction !== undefined) {
                existing.armorReduction = params.armorReduction;
                // Применяем снижение брони сразу (или в update)
                this.armor = Math.max(0, this.armor - params.armorReduction);
            }
            return;
        }
        // Новый дебафф
        const debuff = {
            type: type,
            duration: params.duration || 0,
            timer: params.duration || 0,
            damagePerTick: params.damagePerTick || 0,
            tickTimer: 0,
            speedMultiplier: params.speedMultiplier !== undefined ? params.speedMultiplier : 1.0,
            armorReduction: params.armorReduction || 0,
        };
        if (debuff.armorReduction > 0) {
            this.armor = Math.max(0, this.armor - debuff.armorReduction);
        }
        this.debuffs.push(debuff);
    }

    // Обновление дебаффов (таймеры, эффекты)
    updateDebuffs(deltaTime) {
        for (let i = this.debuffs.length - 1; i >= 0; i--) {
            const debuff = this.debuffs[i];
            debuff.timer -= deltaTime;
            if (debuff.timer <= 0) {
                // Снимаем дебафф (восстанавливаем броню, если была)
                if (debuff.armorReduction > 0) {
                    this.armor += debuff.armorReduction;
                }
                this.debuffs.splice(i, 1);
                continue;
            }
            // Для огня (DoT)
            if (debuff.type === 'fire' && debuff.damagePerTick > 0) {
                debuff.tickTimer += deltaTime;
                if (debuff.tickTimer >= 1.0) { // каждую секунду
                    debuff.tickTimer = 0;
                    const dotDamage = debuff.damagePerTick;
                    this.takeDamage(dotDamage);
                }
            }
            // Для яда (снижение брони) – уже применено при наложении, здесь ничего не делаем
        }
    }

    // Проверка, жив ли враг
    isAlive() {
        return this.health > 0 && !this.reachedEnd;
    }

    // Проверка, достиг ли конца
    isAtEnd() {
        return this.reachedEnd;
    }

    // Визуализация (можно переопределить в дочерних)
    draw(ctx) {
        const color = this.type === 'boss' ? '#ff0000' :
                      this.type === 'miniBoss' ? '#ff8800' :
                      '#00ccff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Полоска здоровья
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(this.x - this.size, this.y - this.size - 8, this.size * 2, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff0000';
        ctx.fillRect(this.x - this.size, this.y - this.size - 8, this.size * 2 * healthPercent, 4);
    }
}

// ------------------------------------------------------------
// Фабричные функции для создания врагов
// ------------------------------------------------------------

export function createEnemy(wave, x, y, gameRef) {
    return new Enemy('normal', wave, x, y, gameRef);
}

export function createMiniBoss(wave, x, y, gameRef) {
    return new Enemy('miniBoss', wave, x, y, gameRef);
}

export function createBoss(wave, x, y, gameRef) {
    return new Enemy('boss', wave, x, y, gameRef);
}

// Альтернативная фабрика, которая создаёт врага в зависимости от типа
export function createEnemyByType(type, wave, x, y, gameRef) {
    return new Enemy(type, wave, x, y, gameRef);
}