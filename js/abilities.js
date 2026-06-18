// ================================================================
// js/abilities.js – Активные способности королей
// ================================================================

import { BALANCE } from './balance.js';

/**
 * Класс управляет активной способностью выбранного короля.
 * Хранит состояние: готова ли, перезарядка, длительность.
 * Применяет эффекты к игре.
 */
export class KingAbility {
    /**
     * @param {string} kingType - 'warrior' | 'mage' | 'archer' | 'engineer'
     * @param {object} gameRef - ссылка на объект игры (для доступа к башням, врагам, золоту)
     */
    constructor(kingType, gameRef) {
        this.kingType = kingType;
        this.game = gameRef;

        // Получаем конфигурацию способности из BALANCE
        const config = BALANCE.kings[kingType];
        if (!config) {
            throw new Error(`Unknown king type: ${kingType}`);
        }
        this.config = config;
        this.cooldownDuration = config.cooldown; // полная перезарядка (сек)
        this.effectDuration = config.duration;   // длительность эффекта (сек)
        this.effect = config.effect || {};

        // Состояние
        this.isReady = true;          // можно ли активировать
        this.isActive = false;        // действует ли эффект в данный момент
        this.currentCooldown = 0;     // оставшееся время перезарядки (сек)
        this.currentDuration = 0;     // оставшееся время действия (сек)

        // Для способности инженера (одноразовая бесплатная башня)
        this.freeTowerAvailable = false; // флаг, что следующая башня бесплатна
        // Для остальных эффектов – храним активные модификаторы
        this.activeModifiers = {};
    }

    // ------------------------------------------------------------
    // Активация способности (вызывается при нажатии кнопки)
    // ------------------------------------------------------------
    activate() {
        if (!this.isReady) return false;
        if (this.isActive) return false; // уже действует

        // Применяем эффект в зависимости от типа короля
        this.applyEffect();

        // Устанавливаем состояние
        this.isReady = false;
        this.isActive = true;
        this.currentCooldown = this.cooldownDuration;
        this.currentDuration = this.effectDuration;

        return true;
    }

    // ------------------------------------------------------------
    // Применение эффекта (вызывается при активации)
    // ------------------------------------------------------------
    applyEffect() {
        const king = this.kingType;
        const game = this.game;

        switch (king) {
            case 'warrior':
                // Ярость: +50% урона всем башням на 10 сек
                if (!game.activeAbilities) game.activeAbilities = {};
                game.activeAbilities.damageBoost = this.effect.damageBoost || 0.5;
                break;

            case 'mage':
                // Замедление: все враги замедлены на 40% на 8 сек
                // Вешаем глобальный дебафф на всех врагов (можно хранить в game.activeAbilities)
                if (!game.activeAbilities) game.activeAbilities = {};
                game.activeAbilities.enemySlow = this.effect.slowMultiplier || 0.6;
                // Также можно применить ко всем текущим врагам
                if (game.enemies) {
                    for (const enemy of game.enemies) {
                        enemy.applyDebuff('ability_slow', {
                            duration: this.effectDuration,
                            speedMultiplier: this.effect.slowMultiplier,
                        });
                    }
                }
                break;

            case 'archer':
                // Меткий выстрел: +30% радиуса всех башен на 12 сек
                if (!game.activeAbilities) game.activeAbilities = {};
                game.activeAbilities.rangeBoost = this.effect.rangeBoost || 0.3;
                break;

            case 'engineer':
                // Экономия: следующая башня бесплатна (одноразово)
                this.freeTowerAvailable = true;
                // Способность срабатывает мгновенно, без длительности
                this.isActive = false; // не держим активным
                this.isReady = false;  // перезарядка начинается сразу
                this.currentCooldown = this.cooldownDuration;
                // Устанавливаем флаг в игре
                if (game) game.freeTowerNext = true;
                break;

            default:
                console.warn('Unknown king ability:', king);
        }
    }

    // ------------------------------------------------------------
    // Обновление состояния (вызывается каждый игровой тик)
    // ------------------------------------------------------------
    update(deltaTime) {
        // Если способность инженера – обрабатываем отдельно (нет длительности)
        if (this.kingType === 'engineer') {
            // Если не готова – уменьшаем перезарядку
            if (!this.isReady) {
                this.currentCooldown -= deltaTime;
                if (this.currentCooldown <= 0) {
                    this.currentCooldown = 0;
                    this.isReady = true;
                }
            }
            return; // выходим, так как нет активного состояния
        }

        // Для остальных королей
        if (this.isActive) {
            // Уменьшаем оставшуюся длительность
            this.currentDuration -= deltaTime;
            if (this.currentDuration <= 0) {
                // Эффект закончился
                this.isActive = false;
                this.removeEffect();
                this.currentDuration = 0;
                // Начинаем перезарядку
                this.isReady = false;
                this.currentCooldown = this.cooldownDuration;
            }
        } else if (!this.isReady) {
            // Перезарядка
            this.currentCooldown -= deltaTime;
            if (this.currentCooldown <= 0) {
                this.currentCooldown = 0;
                this.isReady = true;
            }
        }
    }

    // ------------------------------------------------------------
    // Снятие эффекта (когда заканчивается длительность)
    // ------------------------------------------------------------
    removeEffect() {
        const king = this.kingType;
        const game = this.game;

        switch (king) {
            case 'warrior':
                if (game.activeAbilities) {
                    delete game.activeAbilities.damageBoost;
                }
                break;
            case 'mage':
                if (game.activeAbilities) {
                    delete game.activeAbilities.enemySlow;
                }
                // Удаляем дебафф способности у всех врагов (можно по ключу)
                if (game.enemies) {
                    for (const enemy of game.enemies) {
                        enemy.removeDebuff('ability_slow');
                    }
                }
                break;
            case 'archer':
                if (game.activeAbilities) {
                    delete game.activeAbilities.rangeBoost;
                }
                break;
            // Инженер не имеет длительности, обрабатывается отдельно
        }
    }

    // ------------------------------------------------------------
    // Использование бесплатной башни (для инженера)
    // ------------------------------------------------------------
    consumeFreeTower() {
        if (this.kingType === 'engineer' && this.freeTowerAvailable) {
            this.freeTowerAvailable = false;
            if (this.game) this.game.freeTowerNext = false;
            // Перезарядка уже началась при активации, просто возвращаем true
            return true;
        }
        return false;
    }

    // ------------------------------------------------------------
    // Получение информации для UI (прогресс, готовность)
    // ------------------------------------------------------------
    getStatus() {
        return {
            isReady: this.isReady,
            isActive: this.isActive,
            cooldownRemaining: Math.max(0, this.currentCooldown),
            durationRemaining: Math.max(0, this.currentDuration),
            cooldownMax: this.cooldownDuration,
            durationMax: this.effectDuration,
            // для инженера
            freeTowerAvailable: this.freeTowerAvailable,
        };
    }

    // ------------------------------------------------------------
    // Сброс состояния (при перезапуске игры)
    // ------------------------------------------------------------
    reset() {
        this.isReady = true;
        this.isActive = false;
        this.currentCooldown = 0;
        this.currentDuration = 0;
        this.freeTowerAvailable = false;
        if (this.game) {
            this.game.freeTowerNext = false;
            if (this.game.activeAbilities) {
                // удаляем все активные модификаторы
                this.game.activeAbilities = {};
            }
        }
        // Если остались дебаффы на врагах – можно очистить, но лучше в game.js при сбросе
    }
}

// ------------------------------------------------------------
// Фабричная функция для удобства
// ------------------------------------------------------------
export function createAbility(kingType, gameRef) {
    return new KingAbility(kingType, gameRef);
}

// ------------------------------------------------------------
// Вспомогательная функция для получения описания способности
// ------------------------------------------------------------
export function getAbilityDescription(kingType) {
    const config = BALANCE.kings[kingType];
    if (!config) return '';
    return `${config.ability}: ${config.description}`;
}