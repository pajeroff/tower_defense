// ================================================================
// js/app.js – Точка входа, инициализация приложения
// ================================================================

import { UI } from './ui.js';
import { Game } from './game.js';
import { loadData, saveLastSelection } from './storage.js';
import { BALANCE } from './balance.js';

// ------------------------------------------------------------
// Класс App – управляет жизненным циклом приложения
// ------------------------------------------------------------
class App {
    constructor() {
        // Создаём экземпляры UI и Game
        this.ui = new UI();
        this.game = null;

        // Инициализация UI (кэширование элементов, события)
        this.ui.init();

        // Подписка на событие старта игры
        document.addEventListener('startGame', (e) => this.startGame(e.detail));
        
        window.addEventListener('resize', () => {
            if (this.ui) this.ui.updateNotificationPosition();
        });

        // Показываем главное меню (по умолчанию)
        this.ui.showMainMenu();

        // Обновляем информацию в главном меню (опыт)
        this.ui.updateMainMenuInfo();

        // Проверка и применение темы локации (если есть сохранённая)
        this.applySavedTheme();

        console.log('🏰 Tower Defense – приложение запущено');
    }

    // ------------------------------------------------------------
    // Запуск новой игры
    // ------------------------------------------------------------
    startGame(params) {
        const { king, difficulty, location } = params;

        // Сохраняем выбор (уже делается в UI, но на всякий случай)
        saveLastSelection(king, difficulty, location);

        // Если уже была игра – уничтожаем старую
        if (this.game) {
            // Останавливаем игровой цикл
            if (this.game.animationId) {
                cancelAnimationFrame(this.game.animationId);
                this.game.animationId = null;
            }
            this.game.isRunning = false;
            this.game = null;
        }

        // Создаём новую игру
        this.game = new Game(this.ui);
        // Запускаем
        this.game.start(king, difficulty, location);

        // Применяем тему локации
        this.applyTheme(location);
    }

    // ------------------------------------------------------------
    // Применение цветовой темы локации (CSS переменные)
    // ------------------------------------------------------------
    applyTheme(location) {
        const root = document.documentElement;
        // Сброс
        root.style.setProperty('--bg-color', '#1a1a2e');
        root.style.setProperty('--text-color', '#ffffff');
        root.style.setProperty('--accent-color', '#ffc107');

        // В зависимости от локации меняем переменные
        const themes = {
            forest: { bg: '#1a3a1a', text: '#e8f5e9', accent: '#66bb6a' },
            desert: { bg: '#6d4c2a', text: '#fff3e0', accent: '#ffb74d' },
            snow: { bg: '#8bb8c9', text: '#263238', accent: '#4dd0e1' },
            hell: { bg: '#3d0c0c', text: '#ffcdd2', accent: '#ef5350' },
        };
        const theme = themes[location] || themes.forest;
        root.style.setProperty('--bg-color', theme.bg);
        root.style.setProperty('--text-color', theme.text);
        root.style.setProperty('--accent-color', theme.accent);

        // Можно также менять background у body
        document.body.style.backgroundColor = theme.bg;
        document.body.style.color = theme.text;
    }

    applySavedTheme() {
        const data = loadData();
        const location = data.lastSelection?.location || 'forest';
        this.applyTheme(location);
    }

    // ------------------------------------------------------------
    // Обработчик сброса прогресса (вызывается из UI)
    // ------------------------------------------------------------
    // Уже реализовано в UI, но можно добавить глобальную очистку
}

// ------------------------------------------------------------
// Инициализация приложения после загрузки DOM
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Создаём экземпляр приложения (глобально для доступа в консоли)
    window.app = new App();

    // Дополнительно: обрабатываем изменение размера окна для Canvas
    window.addEventListener('resize', () => {
        if (window.app && window.app.game) {
            window.app.game.resizeCanvas();
        }
    });
});