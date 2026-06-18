// ================================================================
// js/sound.js – Звуковые эффекты через Web Audio API
// ================================================================

class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API не поддерживается');
            this.enabled = false;
        }
    }

    // Воспроизведение простого тона
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = frequency;
            gain.gain.value = volume;
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    buildTower() {
        this.playTone(600, 0.15, 'square', 0.2);
        setTimeout(() => this.playTone(800, 0.1, 'square', 0.15), 100);
    }

    enemyKilled() {
        this.playTone(300, 0.1, 'sawtooth', 0.15);
    }

    castleHit() {
        this.playTone(150, 0.3, 'sawtooth', 0.3);
    }

    abilityActivated() {
        this.playTone(440, 0.2, 'sine', 0.2);
        setTimeout(() => this.playTone(660, 0.2, 'sine', 0.2), 150);
        setTimeout(() => this.playTone(880, 0.3, 'sine', 0.25), 300);
    }

    runeActivated() {
        this.playTone(500, 0.15, 'sine', 0.15);
        setTimeout(() => this.playTone(700, 0.15, 'sine', 0.15), 100);
        setTimeout(() => this.playTone(900, 0.2, 'sine', 0.2), 200);
    }

    defeat() {
        this.playTone(200, 0.5, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(150, 0.5, 'sawtooth', 0.3), 300);
    }

    victory() {
        this.playTone(523, 0.2, 'sine', 0.2);
        setTimeout(() => this.playTone(659, 0.2, 'sine', 0.2), 150);
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.2), 300);
        setTimeout(() => this.playTone(1047, 0.4, 'sine', 0.3), 450);
    }

    achievement() {
        this.playTone(800, 0.1, 'sine', 0.15);
        setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.15), 100);
        setTimeout(() => this.playTone(1200, 0.2, 'sine', 0.2), 200);
    }
}

export const sound = new SoundManager();