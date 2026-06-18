// ================================================================
// js/storage.js – Работа с localStorage
// ================================================================

const STORAGE_KEY = 'towerDefenseData';

const DEFAULT_DATA = {
    exp: 0,
    upgradeLevels: {
        capitalism: 0,
        fortress: 0,
        mastery: 0,
        farSight: 0,
        tax: 0,
        regeneration: 0,
        fastBuild: 0,
    },
    stats: {
        totalKills: 0,
        totalTowersBuilt: 0,
        totalWavesCompleted: 0,
        totalBossesKilled: 0,
        maxConsecutiveWavesNoDamage: 0,
    },
    unlockedAchievements: [],
    lastSelection: {
        king: 'warrior',
        difficulty: 'medium',
        location: 'forest',
    },
};

// ------------------------------------------------------------
// Загрузка данных
// ------------------------------------------------------------
export function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            saveData(DEFAULT_DATA);
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
        const data = JSON.parse(raw);
        return mergeWithDefaults(data);
    } catch (e) {
        console.warn('Ошибка загрузки данных, используем значения по умолчанию', e);
        saveData(DEFAULT_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
}

// ------------------------------------------------------------
// Сохранение данных
// ------------------------------------------------------------
export function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения данных', e);
    }
}

// ------------------------------------------------------------
// Сброс прогресса
// ------------------------------------------------------------
export function resetProgress() {
    if (confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие необратимо.')) {
        localStorage.removeItem(STORAGE_KEY);
        saveData(DEFAULT_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    return null;
}

// ------------------------------------------------------------
// Слияние с дефолтами (для новых полей)
// ------------------------------------------------------------
function mergeWithDefaults(data) {
    const result = JSON.parse(JSON.stringify(DEFAULT_DATA));

    function merge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    merge(target[key], source[key]);
                } else {
                    if (source[key] !== undefined) {
                        target[key] = source[key];
                    }
                }
            }
        }
    }

    merge(result, data);
    return result;
}

// ------------------------------------------------------------
// Управление улучшениями
// ------------------------------------------------------------
export function getUpgradeLevel(upgradeId) {
    const data = loadData();
    return data.upgradeLevels[upgradeId] || 0;
}

export function setUpgradeLevel(upgradeId, level) {
    const data = loadData();
    data.upgradeLevels[upgradeId] = level;
    saveData(data);
}

// ------------------------------------------------------------
// Управление опытом
// ------------------------------------------------------------
export function addExp(amount) {
    const data = loadData();
    data.exp += amount;
    saveData(data);
    return data.exp;
}

export function getExp() {
    return loadData().exp;
}

// ------------------------------------------------------------
// Статистика
// ------------------------------------------------------------
export function updateStats(delta) {
    const data = loadData();
    for (const key in delta) {
        if (delta.hasOwnProperty(key) && data.stats.hasOwnProperty(key)) {
            data.stats[key] += delta[key];
        }
    }
    saveData(data);
}

export function getStats() {
    return loadData().stats;
}

// ------------------------------------------------------------
// Достижения
// ------------------------------------------------------------
export function unlockAchievement(achievementId) {
    const data = loadData();
    if (!data.unlockedAchievements.includes(achievementId)) {
        data.unlockedAchievements.push(achievementId);
        saveData(data);
        return true; // только что разблокировано
    }
    return false; // уже было
}

export function isAchievementUnlocked(achievementId) {
    return loadData().unlockedAchievements.includes(achievementId);
}

export function getUnlockedAchievements() {
    return loadData().unlockedAchievements;
}

// ------------------------------------------------------------
// Последние выборы
// ------------------------------------------------------------
export function saveLastSelection(king, difficulty, location) {
    const data = loadData();
    data.lastSelection.king = king;
    data.lastSelection.difficulty = difficulty;
    data.lastSelection.location = location;
    saveData(data);
}

export function getLastSelection() {
    return loadData().lastSelection;
}