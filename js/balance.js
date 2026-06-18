// ================================================================
// js/balance.js – ВСЕ настройки баланса игры
// ================================================================

export const BALANCE = {
    // ------------------------------------------------------------
    // 1. ОБЩИЕ НАСТРОЙКИ
    // ------------------------------------------------------------
    // Базовая стоимость золота за убийство врага (умножается на сложность)
    BASE_GOLD_PER_KILL: 10,

    // Опыт за убийство врага (начисляется игроку для перманентных улучшений)
    EXP_PER_KILL: 1,

    // Опыт за завершённую волну (дополнительно)
    EXP_PER_WAVE: 5,

    // Опыт за убийство босса (бонус)
    EXP_PER_BOSS: 20,

    // ------------------------------------------------------------
    // 2. БАШНИ (Towers)
    // ------------------------------------------------------------
    towers: {
        fast: {
            name: 'Быстрая',
            cost: 50,
            damage: { min: 10, max: 15 },
            attackSpeed: 0.5,          // секунд между выстрелами
            range: 200,
            upgradeCostBase: 30,        // стоимость улучшения за уровень (доп. множитель)
            damagePerLevel: 3,          // прирост урона за уровень
            speedPerLevel: -0.03,       // уменьшение времени атаки за уровень (сек)
            rangePerLevel: 10,          // прирост радиуса за уровень
            maxLevel: 5,
            sellReturn: 0.6,            // 60% возврата от общей стоимости
        },
        normal: {
            name: 'Обычная',
            cost: 80,
            damage: { min: 25, max: 35 },
            attackSpeed: 1.0,
            range: 250,
            upgradeCostBase: 40,
            damagePerLevel: 5,
            speedPerLevel: -0.05,
            rangePerLevel: 15,
            maxLevel: 5,
            sellReturn: 0.6,
        },
        sniper: {
            name: 'Снайпер',
            cost: 150,
            damage: { min: 60, max: 80 },
            attackSpeed: 2.5,
            range: 400,
            upgradeCostBase: 60,
            damagePerLevel: 10,
            speedPerLevel: -0.1,
            rangePerLevel: 20,
            maxLevel: 5,
            sellReturn: 0.6,
            armorPenetration: 0.5,      // игнорирует 50% брони врага
        },
    },

    // Стоимость добавления элемента к башне
    ELEMENT_COST: 50,

    // ------------------------------------------------------------
    // 3. ВРАГИ (Enemies)
    // ------------------------------------------------------------
    enemies: {
        // Базовые параметры врага на 1-й волне
        baseHealth: 30,
        baseSpeed: 1.5,          // пикселей за тик (при 60 FPS)
        baseGoldReward: 10,
        // Множители роста с каждой волной (экспоненциально)
        healthMultiplierPerWave: 1.12,   // здоровье умножается на это число каждую волну
        speedMultiplierPerWave: 1.02,    // скорость растёт медленнее
        goldMultiplierPerWave: 1.05,     // награда за убийство тоже растёт

        // Количество врагов в волне: формула: baseCount + wave * countPerWave
        baseCount: 5,
        countPerWave: 3,                // дополнительных врагов за волну

        // Мини-боссы
        miniBossChance: 0.20,           // 20% шанс замены обычного врага на мини-босса
        miniBossHealthMultiplier: 2.0,
        miniBossDamageMultiplier: 2.0,
        miniBossGoldMultiplier: 1.0,    // золото как у обычного (без бонуса)
    },

    // ------------------------------------------------------------
    // 4. БОССЫ (Bosses)
    // ------------------------------------------------------------
    boss: {
        // Появляются каждые N волн
        interval: 5,
        // Множители относительно обычного врага той же волны
        healthMultiplier: 5.0,
        damageToCastleMultiplier: 2.0,
        goldRewardMultiplier: 3.0,      // бонусное золото
        // Дополнительно: босс крупнее (в рендере)
        sizeMultiplier: 1.8,
    },

    // ------------------------------------------------------------
    // 5. ЗАМОК (Castle)
    // ------------------------------------------------------------
    castle: {
        // Начальное здоровье замка
        initialHealth: 100,
        // Максимальное здоровье (может быть увеличено апгрейдом во время игры)
        maxHealth: 100,
        // Стоимость улучшения максимального здоровья (базовая, увеличивается с каждым улучшением)
        upgradeHealthBaseCost: 100,
        upgradeHealthCostIncrement: 50,   // на сколько дороже каждое следующее улучшение
        // Лечение: восстанавливает до 70% от максимума
        healThreshold: 0.70,
        // Стоимость лечения: (потерянное здоровье) * healCostCoefficient
        healCostCoefficient: 0.5,
    },

    // ------------------------------------------------------------
    // 6. ВОЛНЫ (Waves) – всего 20
    // ------------------------------------------------------------
    totalWaves: 20,
    // Задержка между волнами (сек)
    waveDelay: 3,

    // ------------------------------------------------------------
    // 7. КОРОЛИ и их СПОСОБНОСТИ
    // ------------------------------------------------------------
    kings: {
        warrior: {
            name: 'Воин',
            ability: 'Ярость',
            description: 'Все башни +50% урона на 10 сек',
            cooldown: 60,               // секунд
            duration: 10,
            effect: { damageBoost: 0.5 },
        },
        mage: {
            name: 'Маг',
            ability: 'Замедление',
            description: 'Все враги замедлены на 40% на 8 сек',
            cooldown: 45,
            duration: 8,
            effect: { slowMultiplier: 0.6 }, // скорость умножается на 0.6
        },
        archer: {
            name: 'Лучник',
            ability: 'Меткий выстрел',
            description: 'Радиус всех башен +30% на 12 сек',
            cooldown: 50,
            duration: 12,
            effect: { rangeBoost: 0.3 },
        },
        engineer: {
            name: 'Инженер',
            ability: 'Экономия',
            description: 'Следующая башня бесплатна (одноразово)',
            cooldown: 90,
            duration: 0,               // мгновенно, одноразово
            effect: { freeTower: true },
        },
    },

    // ------------------------------------------------------------
    // 8. СЛОЖНОСТЬ (Difficulty)
    // ------------------------------------------------------------
    difficulty: {
        easy: {
            label: 'Лёгкая',
            enemyHealthMultiplier: 0.8,
            enemySpeedMultiplier: 0.9,
            enemyCountMultiplier: 0.8,
            goldMultiplier: 1.2,        // больше золота
            expMultiplier: 1.0,
        },
        medium: {
            label: 'Средняя',
            enemyHealthMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemyCountMultiplier: 1.0,
            goldMultiplier: 1.0,
            expMultiplier: 1.0,
        },
        hard: {
            label: 'Сложная',
            enemyHealthMultiplier: 1.3,
            enemySpeedMultiplier: 1.1,
            enemyCountMultiplier: 1.2,
            goldMultiplier: 0.8,
            expMultiplier: 1.2,
        },
    },

    // ------------------------------------------------------------
    // 9. ЛОКАЦИИ (Location modifiers)
    // ------------------------------------------------------------
    locations: {
        forest: {
            name: 'Лес',
            cssTheme: 'forest',        // для смены CSS-переменных
            description: 'Враги быстрее',
            enemySpeedMultiplier: 1.1,
            // Погодные эффекты, доступные в этой локации
            weatherPool: ['rain', 'fog'],
        },
        desert: {
            name: 'Пустыня',
            cssTheme: 'desert',
            description: 'Башни медленнее стреляют',
            towerAttackSpeedMultiplier: 0.9,
            weatherPool: ['rain', 'sandstorm'],
        },
        snow: {
            name: 'Снег',
            cssTheme: 'snow',
            description: 'Враги медленнее',
            enemySpeedMultiplier: 0.9,
            weatherPool: ['snow', 'fog'],
        },
        hell: {
            name: 'Ад',
            cssTheme: 'hell',
            description: 'Боссы с 3-й волны',
            bossStartWave: 3,           // вместо 5
            weatherPool: ['firestorm'],
        },
    },

    // ------------------------------------------------------------
    // 10. ПОГОДНЫЕ ЭФФЕКТЫ (Weather)
    // ------------------------------------------------------------
    weather: {
        // Каждые N волн меняется погода
        changeInterval: 5,
        // Доступные эффекты с их влиянием
        rain: {
            name: 'Дождь',
            towerAttackSpeedMultiplier: 0.85,  // -15% скорости атаки
            visual: 'rain',
        },
        fog: {
            name: 'Туман',
            towerRangeMultiplier: 0.8,         // -20% радиуса
            visual: 'fog',
        },
        snow: {
            name: 'Снегопад',
            enemySpeedMultiplier: 0.8,         // -20% скорости врагов
            visual: 'snow',
        },
        sandstorm: {
            name: 'Песчаная буря',
            towerRangeMultiplier: 0.7,
            enemySpeedMultiplier: 0.9,
            visual: 'sandstorm',
        },
        firestorm: {
            name: 'Огненный шторм',
            // может наносить урон врагам? но в ТЗ не указано, оставим декоративным
            visual: 'firestorm',
        },
    },

    // ------------------------------------------------------------
    // 11. РУНЫ (Runes / Магия поля)
    // ------------------------------------------------------------
    runes: {
        // Шанс появления руны после убийства врага (0..1)
        spawnChancePerKill: 0.05,
        // Длительность эффекта руны (сек)
        duration: {
            green: 10,   // ускорение башен
            blue: 8,     // замедление врагов
            red: 0,      // мгновенный урон
        },
        // Эффекты рун
        green: { towerSpeedBoost: 0.20 },   // +20% скорости атаки
        blue: { enemySlow: 0.30 },          // замедление врагов на 30%
        red: { damagePercent: 0.50 },       // наносит 50% от макс. здоровья
    },

    // ------------------------------------------------------------
    // 12. ТОРГОВЕЦ (Trader)
    // ------------------------------------------------------------
    trader: {
        // Шанс появления после волны (кроме первой)
        appearChance: 0.40,
        // Длительность усиления в волнах (от 1 до 3)
        durationWavesMin: 1,
        durationWavesMax: 3,
        // Возможные усиления и их стоимость (золото)
        offers: [
            {
                id: 'damageUp',
                label: '+25% урона всех башен',
                effect: { towerDamageMultiplier: 1.25 },
                basePrice: 50,
            },
            {
                id: 'speedUp',
                label: '+20% скорости атаки всех башен',
                effect: { towerAttackSpeedMultiplier: 1.20 },
                basePrice: 40,
            },
            {
                id: 'healCastle',
                label: '+15% здоровья замка (восполнение)',
                effect: { castleHealPercent: 0.15 },
                basePrice: 60,
            },
        ],
        // Множитель цены в зависимости от волны (дороже к концу игры)
        priceScalePerWave: 1.03,
    },

    // ------------------------------------------------------------
    // 13. ПЕРМАНЕНТНЫЕ УЛУЧШЕНИЯ (Upgrades в магазине)
    // ------------------------------------------------------------
    upgrades: {
        // Каждое улучшение имеет 5 уровней
        capitalism: {
            name: 'Капитализм',
            description: '+10% золота с убийств за уровень',
            baseEffect: 0.10,   // 10% за уровень
            costs: [100, 150, 200, 250, 300],
            maxLevel: 5,
        },
        fortress: {
            name: 'Крепость',
            description: '+5% здоровья замка за уровень',
            baseEffect: 0.05,
            costs: [80, 120, 160, 200, 240],
            maxLevel: 5,
        },
        mastery: {
            name: 'Мастерство',
            description: '-5% стоимости башен за уровень',
            baseEffect: -0.05,
            costs: [120, 180, 240, 300, 360],
            maxLevel: 5,
        },
        farSight: {
            name: 'Дальнозоркость',
            description: '+5% радиуса всех башен за уровень',
            baseEffect: 0.05,
            costs: [90, 130, 170, 210, 250],
            maxLevel: 5,
        },
        tax: {
            name: 'Налог',
            description: '+10 золота за завершённую волну за уровень',
            baseEffect: 10,   // золото за волну
            costs: [70, 110, 150, 190, 230],
            maxLevel: 5,
        },
        regeneration: {
            name: 'Регенерация',
            description: 'замок восстанавливает 5% здоровья после волны за уровень',
            baseEffect: 0.05,
            costs: [60, 90, 120, 150, 180],
            maxLevel: 5,
        },
        fastBuild: {
            name: 'Скорость строительства',
            description: 'башни строятся мгновенно (уменьшение задержки на 20% за уровень)',
            baseEffect: 0.20,
            costs: [50, 100, 150, 200, 250],
            maxLevel: 5,
        },
    },

    // ------------------------------------------------------------
    // 14. ДОСТИЖЕНИЯ (Achievements)
    // ------------------------------------------------------------
    achievements: [
        {
            id: 'first_blood',
            name: 'Первая кровь',
            description: 'Убить первого врага',
            condition: { kills: 1 },
            expReward: 10,
        },
        {
            id: 'thousand_kills',
            name: 'Тысяча и один',
            description: 'Убить 1000 врагов суммарно',
            condition: { kills: 1000 },
            expReward: 50,
        },
        {
            id: 'architect',
            name: 'Архитектор',
            description: 'Построить 50 башен за все игры',
            condition: { towersBuilt: 50 },
            expReward: 30,
        },
        {
            id: 'impregnable',
            name: 'Неприступный',
            description: 'Пройти 10 волн подряд без потери здоровья замка',
            condition: { consecutiveWavesNoDamage: 10 },
            expReward: 40,
        },
        {
            id: 'boss_hunter',
            name: 'Боссобой',
            description: 'Убить 10 боссов',
            condition: { bossesKilled: 10 },
            expReward: 60,
        },
    ],

    // ------------------------------------------------------------
    // 15. ПРОЧИЕ НАСТРОЙКИ
    // ------------------------------------------------------------
    // Задержка между спавном врагов в волне (сек)
    enemySpawnInterval: 0.8,

    // Начальное золото игрока в начале игры
    startingGold: 100,

    // Максимальное количество башен на поле (ограничение)
    maxTowers: 30,

    // Коэффициент возврата при продаже башни (уже указан выше, но дублируем)
    sellReturnCoeff: 0.6,

    // Ускорение игры (множитель скорости) – переключение ×2
    speedMultipliers: [1, 2],
};

// Заморозка объекта, чтобы случайно не изменить параметры (опционально)
Object.freeze(BALANCE);