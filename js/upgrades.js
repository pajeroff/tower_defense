// ================================================================
// js/upgrades.js – Перманентные улучшения (магазин)
// ================================================================

import { BALANCE } from './balance.js';
import { getUpgradeLevel, setUpgradeLevel, getExp, addExp, saveData, loadData } from './storage.js';

// ------------------------------------------------------------
// Получить список всех улучшений с их текущими уровнями
// ------------------------------------------------------------
export function getAllUpgrades() {
    const upgrades = BALANCE.upgrades;
    const result = [];
    for (const [id, config] of Object.entries(upgrades)) {
        const currentLevel = getUpgradeLevel(id);
        result.push({
            id: id,
            name: config.name,
            description: config.description,
            maxLevel: config.maxLevel,
            currentLevel: currentLevel,
            costs: config.costs,
            // Эффект за текущий уровень (можно вычислить)
            effect: getUpgradeEffect(id, currentLevel),
        });
    }
    return result;
}

// ------------------------------------------------------------
// Получить эффект улучшения для заданного уровня
// ------------------------------------------------------------
export function getUpgradeEffect(upgradeId, level) {
    const config = BALANCE.upgrades[upgradeId];
    if (!config) return 0;
    // Базовый эффект за уровень (может быть числом или процентом)
    const base = config.baseEffect;
    // Если эффект – процент (0.05 = 5%), то умножаем на уровень
    // Если эффект – абсолютное значение (например, +10 золота), тоже умножаем
    return base * level;
}

// ------------------------------------------------------------
// Попытка купить улучшение (увеличить уровень)
// ------------------------------------------------------------
export function purchaseUpgrade(upgradeId) {
    const config = BALANCE.upgrades[upgradeId];
    if (!config) return { success: false, message: 'Неизвестное улучшение' };

    const currentLevel = getUpgradeLevel(upgradeId);
    if (currentLevel >= config.maxLevel) {
        return { success: false, message: 'Улучшение уже максимального уровня' };
    }

    // Стоимость следующего уровня (индекс currentLevel, т.к. массивы 0-индексированные)
    const nextLevel = currentLevel + 1;
    const cost = config.costs[currentLevel]; // например, costs[0] для 1-го уровня

    const exp = getExp();
    if (exp < cost) {
        return { success: false, message: `Недостаточно опыта. Нужно ${cost}, у вас ${exp}` };
    }

    // Списываем опыт
    addExp(-cost);
    // Увеличиваем уровень
    setUpgradeLevel(upgradeId, nextLevel);

    return {
        success: true,
        message: `Улучшение "${config.name}" повышено до ${nextLevel} уровня!`,
        newLevel: nextLevel,
        newEffect: getUpgradeEffect(upgradeId, nextLevel),
    };
}

// ------------------------------------------------------------
// Получить суммарный бонус от всех улучшений (для применения в игре)
// ------------------------------------------------------------
export function getAllUpgradeBonuses() {
    const bonuses = {
        goldMultiplier: 1,       // Капитализм
        castleHealthBonus: 1,    // Крепость
        towerCostReduction: 1,   // Мастерство
        towerRangeBonus: 1,      // Дальнозоркость
        waveGoldBonus: 0,        // Налог (абсолютное значение)
        regenPercent: 0,         // Регенерация (процент восстановления после волны)
        buildSpeedMultiplier: 1, // Скорость строительства (множитель задержки)
    };

    // Капитализм
    const capLevel = getUpgradeLevel('capitalism');
    if (capLevel > 0) {
        bonuses.goldMultiplier += getUpgradeEffect('capitalism', capLevel);
    }

    // Крепость
    const fortLevel = getUpgradeLevel('fortress');
    if (fortLevel > 0) {
        bonuses.castleHealthBonus += getUpgradeEffect('fortress', fortLevel);
    }

    // Мастерство
    const mastLevel = getUpgradeLevel('mastery');
    if (mastLevel > 0) {
        // Эффект отрицательный (скидка), поэтому вычитаем из 1
        bonuses.towerCostReduction -= getUpgradeEffect('mastery', mastLevel);
        if (bonuses.towerCostReduction < 0.5) bonuses.towerCostReduction = 0.5; // ограничим скидку 50%
    }

    // Дальнозоркость
    const farLevel = getUpgradeLevel('farSight');
    if (farLevel > 0) {
        bonuses.towerRangeBonus += getUpgradeEffect('farSight', farLevel);
    }

    // Налог
    const taxLevel = getUpgradeLevel('tax');
    if (taxLevel > 0) {
        bonuses.waveGoldBonus = getUpgradeEffect('tax', taxLevel);
    }

    // Регенерация
    const regenLevel = getUpgradeLevel('regeneration');
    if (regenLevel > 0) {
        bonuses.regenPercent = getUpgradeEffect('regeneration', regenLevel);
    }

    // Скорость строительства
    const buildLevel = getUpgradeLevel('fastBuild');
    if (buildLevel > 0) {
        // Уменьшаем задержку на 20% за уровень (т.е. множитель 0.8 за уровень)
        const reduction = getUpgradeEffect('fastBuild', buildLevel); // 0.2, 0.4, 0.6, 0.8, 1.0
        bonuses.buildSpeedMultiplier = 1 - reduction;
        if (bonuses.buildSpeedMultiplier < 0.1) bonuses.buildSpeedMultiplier = 0.1; // минимум 10% от задержки
    }

    return bonuses;
}

// ------------------------------------------------------------
// Применить бонусы улучшений к игровому объекту (вызывается при старте игры)
// ------------------------------------------------------------
export function applyUpgradeBonusesToGame(game) {
    const bonuses = getAllUpgradeBonuses();

    // Увеличиваем здоровье замка
    if (game.castle) {
        const baseMaxHealth = BALANCE.castle.initialHealth;
        game.castle.maxHealth = Math.floor(baseMaxHealth * bonuses.castleHealthBonus);
        game.castle.health = Math.min(game.castle.health, game.castle.maxHealth);
    }

    // Сохраняем бонусы в объекте игры для использования в других модулях
    game.upgradeBonuses = bonuses;

    return bonuses;
}

// ------------------------------------------------------------
// Вспомогательная функция для UI: получить стоимость следующего уровня
// ------------------------------------------------------------
export function getNextLevelCost(upgradeId) {
    const config = BALANCE.upgrades[upgradeId];
    if (!config) return null;
    const currentLevel = getUpgradeLevel(upgradeId);
    if (currentLevel >= config.maxLevel) return null;
    return config.costs[currentLevel];
}

// ------------------------------------------------------------
// Проверить, можно ли купить улучшение (без списания)
// ------------------------------------------------------------
export function canPurchaseUpgrade(upgradeId) {
    const config = BALANCE.upgrades[upgradeId];
    if (!config) return false;
    const currentLevel = getUpgradeLevel(upgradeId);
    if (currentLevel >= config.maxLevel) return false;
    const cost = config.costs[currentLevel];
    return getExp() >= cost;
}