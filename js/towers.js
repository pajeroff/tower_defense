// ================================================================
// js/towers.js – Классы и логика башен
// ================================================================

import { BALANCE } from './balance.js';
import { getUpgradeLevel } from './storage.js';

// ------------------------------------------------------------
// Базовый класс Tower (родитель для всех типов)
// ------------------------------------------------------------
export class Tower {
    /**
     * @param {string} type - 'fast' | 'normal' | 'sniper'
     * @param {number} x - координата X на поле (центр башни)
     * @param {number} y - координата Y
     * @param {object} gameRef - ссылка на игровой объект (для доступа к врагам и т.д.)
     */
    constructor(type, x, y, gameRef) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.game = gameRef;

        // Базовые параметры из balance.js
        const config = BALANCE.towers[type];
        this.cost = config.cost;
        this.damageMin = config.damage.min;
        this.damageMax = config.damage.max;
        this.attackSpeed = config.attackSpeed;
        this.range = config.range;
        this.maxLevel = config.maxLevel;

        // Текущий уровень (начинается с 1)
        this.level = 1;

        // Элемент (null или 'fire' | 'ice' | 'poison')
        this.element = null;

        // Таймер атаки (накопленное время)
        this.attackTimer = 0;

        // Вспомогательные флаги
        this.isAttacking = false;

        // Ссылка на текущую цель (враг)
        this.target = null;

        // Учёт суммарной стоимости для возврата при продаже
        this.totalCost = this.cost;

        // Флаг, что башня только что построена (для мгновенного строительства)
        this.buildDelay = 0; // можно добавить задержку, но в ТЗ сказано "мгновенно" после улучшения
        // будем использовать для анимации появления.
    }

    // ------------------------------------------------------------
    // Обновление состояния башни (вызывается каждый игровой тик)
    // ------------------------------------------------------------
    update(deltaTime) {
        // Если есть задержка строительства – пропускаем атаку
        if (this.buildDelay > 0) {
            this.buildDelay -= deltaTime;
            return;
        }

        // Выбор цели
        this.target = this.findTarget();

        // Если цель есть – атакуем
        if (this.target) {
            this.attackTimer += deltaTime;
            // Время между выстрелами = attackSpeed (с учётом ускорений)
            const currentAttackSpeed = this.getCurrentAttackSpeed();
            if (this.attackTimer >= currentAttackSpeed) {
                this.attackTimer = 0;
                this.performAttack(this.target);
            }
        } else {
            // Сбрасываем таймер, если нет цели (чтобы не накапливался)
            this.attackTimer = 0;
        }
    }

    // ------------------------------------------------------------
    // Поиск цели (в зависимости от режима: ближайший / умный)
    // ------------------------------------------------------------
    findTarget() {
        const enemies = this.game.enemies;
        if (!enemies || enemies.length === 0) return null;

        // Режим атаки: 'closest' или 'smart' (глобально для всех башен)
        const mode = this.game.attackMode || 'closest';

        let bestTarget = null;
        let bestScore = Infinity; // для closest – дистанция, для smart – приоритет

        for (const enemy of enemies) {
            // Проверяем, жив ли враг и находится ли в радиусе
            if (enemy.health <= 0) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this.getCurrentRange()) continue;

            if (mode === 'closest') {
                // Ближайший
                if (dist < bestScore) {
                    bestScore = dist;
                    bestTarget = enemy;
                }
            } else if (mode === 'smart') {
                // "Умный" выбор: атаковать врага с наибольшим текущим здоровьем
                // (можно также ближайшего к концу пути, но возьмём наибольшее здоровье)
                const health = enemy.health;
                if (health > bestScore) {
                    bestScore = health;
                    bestTarget = enemy;
                }
            }
        }

        return bestTarget;
    }

    // ------------------------------------------------------------
    // Совершить атаку по цели
    // ------------------------------------------------------------
    performAttack(enemy) {
        // Рассчитываем урон (с учётом улучшений, элементов, способностей)
        let damage = this.getCurrentDamage();

        // Если башня Снайпер – игнорируем часть брони
        if (this.type === 'sniper') {
            const penetration = BALANCE.towers.sniper.armorPenetration || 0.5;
            // Уменьшаем эффективную броню врага (если есть такая механика)
            // Предположим, у врага есть свойство armor (по умолчанию 0)
            if (enemy.armor) {
                damage = damage * (1 - enemy.armor * (1 - penetration));
            }
        }

        // Применяем элемент (дополнительные эффекты)
        this.applyElementEffect(enemy, damage);

        // Наносим урон врагу
        enemy.takeDamage(damage);

        // Если враг убит – награда (обрабатывается в game.js, но здесь можно вызвать событие)
        // Можно генерировать событие, но проще в game.js проверять после обновления.
    }

    // ------------------------------------------------------------
    // Применение элемента к врагу
    // ------------------------------------------------------------
    applyElementEffect(enemy, damage) {
        if (!this.element) return;

        switch (this.element) {
            case 'fire':
                // Добавляем горение (DoT) – наносит 5% от урона каждую секунду в течение 3 сек
                // Эффект вешается на врага (можно хранить в enemy.debuffs)
                enemy.applyDebuff('fire', {
                    damagePerTick: damage * 0.05,
                    duration: 3,
                    tickInterval: 1,
                });
                break;
            case 'ice':
                // Замораживаем врага на 1 секунду (остановка движения)
                enemy.applyDebuff('ice', {
                    duration: 1,
                    speedMultiplier: 0, // полная остановка
                });
                break;
            case 'poison':
                // Снижаем броню врага на 30% на 4 секунды
                enemy.applyDebuff('poison', {
                    duration: 4,
                    armorReduction: 0.3,
                });
                break;
        }
    }

    // ------------------------------------------------------------
    // Геттеры для текущих параметров с учётом уровня и улучшений
    // ------------------------------------------------------------
    getCurrentDamage() {
        const config = BALANCE.towers[this.type];
        let baseMin = config.damage.min;
        let baseMax = config.damage.max;
        // Прирост за уровень
        const dmgPerLevel = config.damagePerLevel || 0;
        const levelBonus = (this.level - 1) * dmgPerLevel;
        const min = baseMin + levelBonus;
        const max = baseMax + levelBonus;
        // Случайное значение в диапазоне
        let damage = Math.random() * (max - min) + min;

        // Применяем глобальные модификаторы (способности короля, перманентные улучшения)
        // Например, улучшение "Мастерство" не влияет на урон, а "Капитализм" на золото.
        // Но способность короля "Ярость" даёт +50% урона
        if (this.game && this.game.activeAbilities && this.game.activeAbilities.damageBoost) {
            damage *= (1 + this.game.activeAbilities.damageBoost);
        }

        return damage;
    }

    getCurrentAttackSpeed() {
        let speed = BALANCE.towers[this.type].attackSpeed;
        // Уменьшаем с уровнем (чем выше уровень – тем быстрее)
        const speedPerLevel = BALANCE.towers[this.type].speedPerLevel || 0;
        speed = speed + (this.level - 1) * speedPerLevel;
        // Не может быть меньше 0.1 сек
        if (speed < 0.1) speed = 0.1;

        // Модификаторы: погода (дождь снижает скорость), способности, руны
        if (this.game && this.game.weatherEffects) {
            const weather = this.game.weatherEffects;
            if (weather.towerAttackSpeedMultiplier) {
                speed /= weather.towerAttackSpeedMultiplier; // если множитель 0.85, то скорость атаки уменьшается
            }
        }
        // Ускорение от руны зелёной
        if (this.game && this.game.activeRunes && this.game.activeRunes.towerSpeedBoost) {
            speed /= (1 + this.game.activeRunes.towerSpeedBoost);
        }

        return speed;
    }

    getCurrentRange() {
        let range = BALANCE.towers[this.type].range;
        const rangePerLevel = BALANCE.towers[this.type].rangePerLevel || 0;
        range += (this.level - 1) * rangePerLevel;

        // Перманентное улучшение "Дальнозоркость"
        const farSightLevel = getUpgradeLevel('farSight');
        if (farSightLevel > 0) {
            const bonus = BALANCE.upgrades.farSight.baseEffect * farSightLevel; // 5% за уровень
            range *= (1 + bonus);
        }

        // Погода: туман уменьшает радиус
        if (this.game && this.game.weatherEffects) {
            const weather = this.game.weatherEffects;
            if (weather.towerRangeMultiplier) {
                range *= weather.towerRangeMultiplier;
            }
        }

        return range;
    }

    // ------------------------------------------------------------
    // Улучшение башни (повышение уровня)
    // ------------------------------------------------------------
    upgrade() {
        if (this.level >= this.maxLevel) return false;
        const config = BALANCE.towers[this.type];
        const cost = this.getUpgradeCost();
        // Проверяем достаточно ли золота (передаём из game)
        if (this.game.gold < cost) return false;

        this.game.gold -= cost;
        this.level++;
        this.totalCost += cost;
        return true;
    }

    getUpgradeCost() {
        const config = BALANCE.towers[this.type];
        const baseCost = config.upgradeCostBase || 30;
        // Стоимость растёт с уровнем: baseCost * level (можно формулу сложнее)
        return Math.floor(baseCost * this.level);
    }

    // ------------------------------------------------------------
    // Продажа башни (возврат части стоимости)
    // ------------------------------------------------------------
    sell() {
        const returnCoeff = BALANCE.towers[this.type].sellReturn || 0.6;
        const refund = Math.floor(this.totalCost * returnCoeff);
        // Возвращаем золото игроку
        this.game.gold += refund;
        // Удаляем башню из списка (делается в game.js)
        // Здесь просто возвращаем сумму
        return refund;
    }

    // ------------------------------------------------------------
    // Добавление элемента
    // ------------------------------------------------------------
    addElement(elementType) {
        if (this.element) return false; // уже есть элемент
        const cost = BALANCE.ELEMENT_COST;
        if (this.game.gold < cost) return false;
        this.game.gold -= cost;
        this.element = elementType;
        return true;
    }

    // ------------------------------------------------------------
    // Получение информации для UI
    // ------------------------------------------------------------
    getInfo() {
        return {
            type: this.type,
            level: this.level,
            damage: this.getCurrentDamage(),
            attackSpeed: this.getCurrentAttackSpeed(),
            range: this.getCurrentRange(),
            element: this.element,
            totalCost: this.totalCost,
        };
    }
}

// ------------------------------------------------------------
// Фабрика для создания башен (удобно)
// ------------------------------------------------------------
export function createTower(type, x, y, gameRef) {
    // Проверяем, существует ли такой тип
    if (!BALANCE.towers[type]) {
        throw new Error(`Unknown tower type: ${type}`);
    }
    return new Tower(type, x, y, gameRef);
}

// ------------------------------------------------------------
// Вспомогательные функции для работы с башнями (необязательно)
// ------------------------------------------------------------
export function getTowerCost(type) {
    return BALANCE.towers[type] ? BALANCE.towers[type].cost : 0;
}