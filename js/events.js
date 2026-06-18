// ================================================================
// js/events.js – Случайные события (руны, торговец, погода)
// ================================================================

import { BALANCE } from './balance.js';
import { sound } from './sound.js';

export class EventManager {
    constructor(gameRef) {
        this.game = gameRef;
        this.activeRunes = {
            towerSpeedBoost: false,
            enemySlow: false,
            damagePercent: false,
        };
        this.runeTimers = {
            green: 0,
            blue: 0,
            red: 0,
        };
        this.traderEffect = null;
        this.traderActive = false;
        this.currentWeather = null;
        this.wavesSinceWeatherChange = 0;
    }

    // ------------------------------------------------------------
    // 1. РУНЫ (магия поля)
    // ------------------------------------------------------------
    trySpawnRune(enemyX, enemyY) {
        const spawnChance = BALANCE.runes.spawnChancePerKill || 0.05;
        if (Math.random() > spawnChance) return null;

        const types = ['green', 'blue', 'red'];
        const type = types[Math.floor(Math.random() * types.length)];

        const rune = {
            type: type,
            x: enemyX,
            y: enemyY,
            radius: 20,
            active: true,
            lifeTimer: 10, // исчезнет через 10 секунд
        };
        this.game.runes.push(rune);
        this.game.ui.showMessage(`✨ Появилась руна! (${type})`, 'info');
        return rune;
    }

    activateRune(rune) {
        if (!rune.active) return;
        const type = rune.type;
        const duration = BALANCE.runes.duration[type] || 0;

        switch (type) {
            case 'green':
                this.activeRunes.towerSpeedBoost = true;
                this.runeTimers.green = duration;
                this.game.ui.showMessage('🌿 Зелёная руна: башни ускорены на 20% на 10 сек!', 'success');
                break;
            case 'blue':
                this.activeRunes.enemySlow = true;
                this.runeTimers.blue = duration;
                this.game.ui.showMessage('💧 Синяя руна: враги замедлены на 30% на 8 сек!', 'success');
                break;
            case 'red':
                const damagePercent = BALANCE.runes.red.damagePercent || 0.5;
                this.game.enemies.forEach(enemy => {
                    const damage = enemy.maxHealth * damagePercent;
                    enemy.takeDamage(damage);
                });
                this.game.ui.showMessage('🔥 Красная руна: все враги потеряли 50% здоровья!', 'danger');
                break;
        }
        sound.runeActivated();
        rune.active = false;
        this.game.runes = this.game.runes.filter(r => r !== rune);
    }

    updateRunes(deltaTime) {
        // Обновление таймеров активных эффектов
        if (this.activeRunes.towerSpeedBoost) {
            this.runeTimers.green -= deltaTime;
            if (this.runeTimers.green <= 0) {
                this.activeRunes.towerSpeedBoost = false;
                this.runeTimers.green = 0;
                this.game.ui.showMessage('🌿 Ускорение башен закончилось', 'info');
            }
        }
        if (this.activeRunes.enemySlow) {
            this.runeTimers.blue -= deltaTime;
            if (this.runeTimers.blue <= 0) {
                this.activeRunes.enemySlow = false;
                this.runeTimers.blue = 0;
                this.game.ui.showMessage('💧 Замедление врагов закончилось', 'info');
            }
        }

        // Обновление таймеров жизни рун на поле – удаление через 10 сек
        this.game.runes = this.game.runes.filter(rune => {
            if (!rune.active) return false;
            rune.lifeTimer -= deltaTime;
            if (rune.lifeTimer <= 0) {
                this.game.ui.showMessage(`Руна ${rune.type} исчезла`, 'info');
                return false;
            }
            return true;
        });
    }

    getEnemySpeedModifier() {
        if (this.activeRunes.enemySlow) {
            const slow = BALANCE.runes.blue.enemySlow || 0.3;
            return 1 - slow;
        }
        return 1.0;
    }

    getTowerSpeedModifier() {
        if (this.activeRunes.towerSpeedBoost) {
            const boost = BALANCE.runes.green.towerSpeedBoost || 0.2;
            return 1 + boost;
        }
        return 1.0;
    }

    // ------------------------------------------------------------
    // 2. ТОРГОВЕЦ
    // ------------------------------------------------------------
    trySpawnTrader(waveNumber) {
        if (waveNumber <= 1) return null;
        const chance = BALANCE.trader.appearChance || 0.4;
        if (Math.random() > chance) return null;

        const offers = BALANCE.trader.offers;
        if (!offers || offers.length === 0) return null;
        const offer = offers[Math.floor(Math.random() * offers.length)];

        const basePrice = offer.basePrice || 50;
        const scale = BALANCE.trader.priceScalePerWave || 1.03;
        const price = Math.floor(basePrice * Math.pow(scale, waveNumber));

        const minDur = BALANCE.trader.durationWavesMin || 1;
        const maxDur = BALANCE.trader.durationWavesMax || 3;
        const durationWaves = Math.floor(Math.random() * (maxDur - minDur + 1)) + minDur;

        return {
            offerId: offer.id,
            label: offer.label,
            effect: offer.effect,
            price: price,
            durationWaves: durationWaves,
        };
    }

    acceptTraderOffer(offer, currentGold) {
        if (currentGold < offer.price) {
            this.game.ui.showMessage('❌ Недостаточно золота!', 'danger');
            return false;
        }
        this.game.gold -= offer.price;

        this.traderEffect = {
            id: offer.offerId,
            effect: offer.effect,
            remainingWaves: offer.durationWaves,
            durationWaves: offer.durationWaves,
        };
        this.traderActive = true;
        this.applyTraderEffect(offer.effect, true);
        this.game.ui.showMessage(`🧙 Торговец: ${offer.label} на ${offer.durationWaves} волн!`, 'success');
        return true;
    }

    declineTraderOffer() {
        this.game.ui.showMessage('🧙 Торговец ушёл...', 'info');
    }

    applyTraderEffect(effect, apply) {
        if (effect.towerDamageMultiplier) {
            if (apply) {
                this.game.traderModifiers.damageMultiplier = effect.towerDamageMultiplier;
            } else {
                this.game.traderModifiers.damageMultiplier = 1.0;
            }
        }
        if (effect.towerAttackSpeedMultiplier) {
            if (apply) {
                this.game.traderModifiers.attackSpeedMultiplier = effect.towerAttackSpeedMultiplier;
            } else {
                this.game.traderModifiers.attackSpeedMultiplier = 1.0;
            }
        }
        if (effect.castleHealPercent) {
            if (apply) {
                const healAmount = this.game.castle.maxHealth * effect.castleHealPercent;
                this.game.castle.health = Math.min(this.game.castle.health + healAmount, this.game.castle.maxHealth);
                this.game.ui.updateHUD();
                this.game.ui.showMessage(`🏰 Замок восстановлен на ${Math.round(healAmount)} HP`, 'success');
            }
        }
    }

    updateTraderAfterWave() {
        if (!this.traderActive) return;
        this.traderEffect.remainingWaves--;
        if (this.traderEffect.remainingWaves <= 0) {
            this.applyTraderEffect(this.traderEffect.effect, false);
            this.traderActive = false;
            this.traderEffect = null;
            this.game.ui.showMessage('🧙 Усиление от торговца закончилось', 'info');
        }
    }

    // ------------------------------------------------------------
    // 3. ПОГОДНЫЕ ЭФФЕКТЫ
    // ------------------------------------------------------------
    updateWeather(waveNumber, location) {
        const interval = BALANCE.weather.changeInterval || 5;
        if (waveNumber % interval !== 0) return;

        const locationConfig = BALANCE.locations[location];
        if (!locationConfig) return;
        const pool = locationConfig.weatherPool || ['rain', 'fog', 'snow'];
        let weatherType = null;
        if (pool.length > 0) {
            weatherType = pool[Math.floor(Math.random() * pool.length)];
        }
        this.setWeather(weatherType);
    }

    setWeather(weatherType) {
        if (this.currentWeather) {
            this.clearWeatherEffects(this.currentWeather);
        }
        this.currentWeather = weatherType;

        if (weatherType) {
            const weatherData = BALANCE.weather[weatherType];
            if (!weatherData) return;
            const effects = {
                towerAttackSpeedMultiplier: weatherData.towerAttackSpeedMultiplier || 1.0,
                towerRangeMultiplier: weatherData.towerRangeMultiplier || 1.0,
                enemySpeedMultiplier: weatherData.enemySpeedMultiplier || 1.0,
                visual: weatherData.visual || null,
            };
            this.game.weatherEffects = effects;
            this.game.ui.showMessage(`🌦️ Погода: ${weatherData.name}`, 'warning');
        } else {
            this.game.weatherEffects = {
                towerAttackSpeedMultiplier: 1.0,
                towerRangeMultiplier: 1.0,
                enemySpeedMultiplier: 1.0,
                visual: null,
            };
            this.game.ui.showMessage('☀️ Погода прояснилась', 'info');
        }
    }

    clearWeatherEffects(weatherType) {
        // ничего не делаем, т.к. модификаторы будут перезаписаны
    }

    getWeatherVisual() {
        if (!this.currentWeather) return null;
        const weatherData = BALANCE.weather[this.currentWeather];
        return weatherData ? weatherData.visual : null;
    }

    // ------------------------------------------------------------
    // Сброс состояния
    // ------------------------------------------------------------
    reset() {
        this.activeRunes = {
            towerSpeedBoost: false,
            enemySlow: false,
            damagePercent: false,
        };
        this.runeTimers = { green: 0, blue: 0, red: 0 };
        this.traderEffect = null;
        this.traderActive = false;
        this.currentWeather = null;
        this.wavesSinceWeatherChange = 0;
        this.game.weatherEffects = {
            towerAttackSpeedMultiplier: 1.0,
            towerRangeMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            visual: null,
        };
        this.game.traderModifiers = {
            damageMultiplier: 1.0,
            attackSpeedMultiplier: 1.0,
        };
        this.game.runes = [];
    }
}