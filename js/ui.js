// ================================================================
// js/ui.js – Управление интерфейсом (HUD, меню, модалки, уведомления)
// ================================================================

import { BALANCE } from './balance.js';
import { loadData, saveData, getExp, getStats, getUnlockedAchievements, saveLastSelection } from './storage.js';

export class UI {
    constructor() {
        this.elements = {};
        this.game = null;
        this.initialized = false;
        this.selectedTower = null;
        this.currentTraderOffer = null;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.elements = {
            mainMenu: document.getElementById('mainMenu'),
            preGameScreen: document.getElementById('preGameScreen'),
            gameScreen: document.getElementById('gameScreen'),
            goldDisplay: document.getElementById('goldDisplay'),
            castleHealthDisplay: document.getElementById('castleHealthDisplay'),
            castleMaxHealthDisplay: document.getElementById('castleMaxHealthDisplay'),
            waveDisplay: document.getElementById('waveDisplay'),
            enemiesLeft: document.getElementById('enemiesLeft'),
            btnPause: document.getElementById('btnPause'),
            btnSpeed: document.getElementById('btnSpeed'),
            btnAbility: document.getElementById('btnAbility'),
            abilityCooldown: document.getElementById('abilityCooldown'),
            towerButtons: document.querySelectorAll('.tower-btn'),
            towerContext: document.getElementById('towerContext'),
            towerLevel: document.getElementById('towerLevel'),
            towerDamage: document.getElementById('towerDamage'),
            towerRange: document.getElementById('towerRange'),
            towerElement: document.getElementById('towerElement'),
            towerUpgradeCost: document.getElementById('towerUpgradeCost'),
            towerSellPrice: document.getElementById('towerSellPrice'),
            ctxUpgrade: document.getElementById('ctxUpgrade'),
            ctxSell: document.getElementById('ctxSell'),
            pauseModal: document.getElementById('pauseModal'),
            resultModal: document.getElementById('resultModal'),
            shopModal: document.getElementById('shopModal'),
            statsModal: document.getElementById('statsModal'),
            traderModal: document.getElementById('traderModal'),
            elementModal: document.getElementById('elementModal'),
            faqModal: document.getElementById('faqModal'),
            mainExp: document.getElementById('mainExp'),
            btnPlay: document.getElementById('btnPlay'),
            btnShop: document.getElementById('btnShop'),
            btnStats: document.getElementById('btnStats'),
            btnFaq: document.getElementById('btnFaq'),
            btnReset: document.getElementById('btnReset'),
            kingCards: document.querySelectorAll('.king-card'),
            difficultyCards: document.querySelectorAll('.difficulty-card'),
            locationCards: document.querySelectorAll('.location-card'),
            btnStartGame: document.getElementById('btnStartGame'),
            btnBackMain: document.getElementById('btnBackMain'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            resultStats: document.getElementById('resultStats'),
            resultToMenu: document.getElementById('resultToMenu'),
            shopItems: document.getElementById('shopItems'),
            shopExp: document.getElementById('shopExp'),
            statsContent: document.getElementById('statsContent'),
            achievementsList: document.getElementById('achievementsList'),
            traderOffer: document.getElementById('traderOffer'),
            traderPrice: document.getElementById('traderPrice'),
            traderAccept: document.getElementById('traderAccept'),
            traderDecline: document.getElementById('traderDecline'),
            resumeBtn: document.getElementById('resumeBtn'),
            endGameBtn: document.getElementById('endGameBtn'),
            quitToMenuBtn: document.getElementById('quitToMenuBtn'),
            faqContent: document.getElementById('faqContent'),
        };

        this.bindEvents();
    }

    bindEvents() {
        const el = this.elements;

        el.btnPlay.addEventListener('click', () => this.showPreGameScreen());
        el.btnShop.addEventListener('click', () => this.showShopModal());
        el.btnStats.addEventListener('click', () => this.showStatsModal());
        el.btnFaq.addEventListener('click', () => this.showFaqModal());
        el.btnReset.addEventListener('click', () => this.handleResetProgress());

        el.kingCards.forEach(card => card.addEventListener('click', () => this.selectKing(card)));
        el.difficultyCards.forEach(card => card.addEventListener('click', () => this.selectDifficulty(card)));
        el.locationCards.forEach(card => card.addEventListener('click', () => this.selectLocation(card)));
        el.btnStartGame.addEventListener('click', () => this.startGame());
        el.btnBackMain.addEventListener('click', () => this.showMainMenu());

        el.resumeBtn.addEventListener('click', () => this.resumeGame());
        el.endGameBtn.addEventListener('click', () => this.endGame());
        el.quitToMenuBtn.addEventListener('click', () => this.quitToMenu());

        el.btnPause.addEventListener('click', () => this.togglePause());
        el.btnSpeed.addEventListener('click', () => this.toggleSpeed());

        el.towerButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectTower(btn.dataset.tower));
        });

        // Контекстное меню: улучшить и продать
        el.ctxUpgrade.addEventListener('click', () => this.upgradeSelectedTower());
        el.ctxSell.addEventListener('click', () => this.sellSelectedTower());

        el.resultToMenu.addEventListener('click', () => this.goToMainMenuFromResult());

        el.traderAccept.addEventListener('click', () => this.acceptTrader());
        el.traderDecline.addEventListener('click', () => this.declineTrader());

        // Способность короля
        el.btnAbility.addEventListener('click', () => {
            if (this.game) this.game.activateAbility();
        });
    }

    // ------------------------------------------------------------
    // Экраны
    // ------------------------------------------------------------
    showMainMenu() {
        this.hideAllScreens();
        this.elements.mainMenu.classList.remove('d-none');
        this.elements.mainMenu.classList.add('d-flex');
        this.updateMainMenuInfo();
        this.resetUI();
    }

    showPreGameScreen() {
        this.hideAllScreens();
        this.elements.preGameScreen.classList.remove('d-none');
        this.elements.preGameScreen.classList.add('d-flex');
        this.loadLastSelections();
    }

    showGameScreen() {
        this.hideAllScreens();
        this.elements.gameScreen.classList.remove('d-none');
        this.elements.gameScreen.style.display = 'block';
        // Обновляем позицию уведомлений под HUD
        this.updateNotificationPosition();
    }

    hideAllScreens() {
        const screens = [this.elements.mainMenu, this.elements.preGameScreen, this.elements.gameScreen];
        screens.forEach(screen => {
            screen.classList.add('d-none');
            screen.classList.remove('d-flex');
            screen.style.display = 'none';
        });
    }

    // ------------------------------------------------------------
    // Главное меню
    // ------------------------------------------------------------
    updateMainMenuInfo() {
        this.elements.mainExp.textContent = getExp();
    }

    handleResetProgress() {
        if (confirm('Вы уверены, что хотите сбросить весь прогресс?')) {
            localStorage.removeItem('towerDefenseData');
            location.reload();
        }
    }

    // ------------------------------------------------------------
    // Выбор параметров
    // ------------------------------------------------------------
    loadLastSelections() {
        const data = loadData();
        const last = data.lastSelection || { king: 'warrior', difficulty: 'medium', location: 'forest' };
        this.selectCardByData('king', last.king);
        this.selectCardByData('difficulty', last.difficulty);
        this.selectCardByData('location', last.location);
    }

    selectCardByData(group, value) {
        let cards;
        if (group === 'king') cards = this.elements.kingCards;
        else if (group === 'difficulty') cards = this.elements.difficultyCards;
        else if (group === 'location') cards = this.elements.locationCards;
        else return;
        cards.forEach(card => {
            const dataAttr = card.dataset.king || card.dataset.diff || card.dataset.location;
            if (dataAttr === value) {
                card.classList.add('selected', 'border', 'border-warning');
            } else {
                card.classList.remove('selected', 'border', 'border-warning');
            }
        });
    }

    selectKing(card) {
        this.elements.kingCards.forEach(c => c.classList.remove('selected', 'border', 'border-warning'));
        card.classList.add('selected', 'border', 'border-warning');
    }
    selectDifficulty(card) {
        this.elements.difficultyCards.forEach(c => c.classList.remove('selected', 'border', 'border-warning'));
        card.classList.add('selected', 'border', 'border-warning');
    }
    selectLocation(card) {
        this.elements.locationCards.forEach(c => c.classList.remove('selected', 'border', 'border-warning'));
        card.classList.add('selected', 'border', 'border-warning');
    }

    getSelectedKing() {
        const card = document.querySelector('.king-card.selected');
        return card ? card.dataset.king : 'warrior';
    }
    getSelectedDifficulty() {
        const card = document.querySelector('.difficulty-card.selected');
        return card ? card.dataset.diff : 'medium';
    }
    getSelectedLocation() {
        const card = document.querySelector('.location-card.selected');
        return card ? card.dataset.location : 'forest';
    }

    startGame() {
        const king = this.getSelectedKing();
        const difficulty = this.getSelectedDifficulty();
        const location = this.getSelectedLocation();
        saveLastSelection(king, difficulty, location);
        const event = new CustomEvent('startGame', { detail: { king, difficulty, location } });
        document.dispatchEvent(event);
    }

    // ------------------------------------------------------------
    // FAQ
    // ------------------------------------------------------------
    showFaqModal() {
        const content = this.elements.faqContent;
        content.innerHTML = `
            <h5>🏰 Основы игры</h5>
            <p>Вы защищаете замок от врагов, строя башни вдоль пути. Враги идут по маршруту, нанося урон замку при достижении конца.</p>
            <hr>
            <h5>🗼 Башни</h5>
            <ul>
                <li><strong>Быстрая</strong> (50💰) – высокая скорострельность, малый урон. <span style="color:#66bb6a;">⚡</span></li>
                <li><strong>Обычная</strong> (80💰) – сбалансированная. <span style="color:#42a5f5;">⚖️</span></li>
                <li><strong>Снайпер</strong> (150💰) – высокий урон, большой радиус, игнорирует 50% брони. <span style="color:#ff7043;">🎯</span></li>
            </ul>
            <p>Улучшайте башни до 5 уровня, добавляйте элементы: <span style="color:#ff6b6b;">Огонь</span> (горение), <span style="color:#74b9ff;">Лёд</span> (заморозка), <span style="color:#55efc4;">Яд</span> (снижение брони).</p>
            <hr>
            <h5>👾 Враги</h5>
            <ul>
                <li><span style="color:#00ccff;">Обычный</span> – базовый враг.</li>
                <li><span style="color:#ff8800;">Мини-босс</span> – вдвое больше здоровья и урона, шанс 20% вместо обычного.</li>
                <li><span style="color:#ff0000;">Босс</span> – появляется каждые 5 волн, здоровье ×5, урон ×2.</li>
            </ul>
            <hr>
            <h5>👑 Короли и способности</h5>
            <ul>
                <li><strong>Воин</strong> – Ярость: +50% урона башням на 10 сек (перезарядка 60 сек).</li>
                <li><strong>Маг</strong> – Замедление: враги замедлены на 40% на 8 сек (45 сек).</li>
                <li><strong>Лучник</strong> – Меткий выстрел: радиус башен +30% на 12 сек (50 сек).</li>
                <li><strong>Инженер</strong> – Экономия: следующая башня бесплатна (90 сек).</li>
            </ul>
            <hr>
            <h5>🌦️ Погода</h5>
            <ul>
                <li><strong>Дождь</strong> – скорость атаки башен -15%.</li>
                <li><strong>Туман</strong> – радиус башен -20%.</li>
                <li><strong>Снегопад</strong> – скорость врагов -20%.</li>
                <li>(меняется каждые 5 волн в зависимости от локации)</li>
            </ul>
            <hr>
            <h5>✨ Руны (магия поля)</h5>
            <ul>
                <li><span style="color:#00ff00;">Зелёная</span> – ускоряет башни на 20% на 10 сек.</li>
                <li><span style="color:#0088ff;">Синяя</span> – замедляет врагов на 30% на 8 сек.</li>
                <li><span style="color:#ff0000;">Красная</span> – наносит 50% здоровья всем врагам мгновенно.</li>
            </ul>
            <hr>
            <h5>🧙 Торговец</h5>
            <p>После каждой волны (кроме первой) с шансом 40% появляется торговец, предлагающий временное усиление за золото (действует 1-3 волны).</p>
            <hr>
            <h5>🏅 Достижения</h5>
            <ul>
                <li>«Первая кровь» – убить первого врага.</li>
                <li>«Тысяча и один» – убить 1000 врагов.</li>
                <li>«Архитектор» – построить 50 башен.</li>
                <li>«Неприступный» – пройти 10 волн без потери здоровья.</li>
                <li>«Боссобой» – убить 10 боссов.</li>
            </ul>
            <p>За каждое достижение даётся бонусный опыт.</p>
        `;
        const modal = new bootstrap.Modal(this.elements.faqModal);
        modal.show();
    }

    // ------------------------------------------------------------
    // Уведомления
    // ------------------------------------------------------------
    showMessage(text, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const div = document.createElement('div');
        div.className = `alert alert-${type} alert-dismissible fade show`;
        div.role = 'alert';
        div.style.marginBottom = '0';
        div.innerHTML = `
            ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        container.prepend(div);
        setTimeout(() => {
            div.classList.remove('show');
            setTimeout(() => div.remove(), 300);
        }, 5000);
    }

    showAchievementNotification(achievement) {
        const container = document.getElementById('achievementContainer');
        const div = document.createElement('div');
        div.className = 'alert alert-success';
        div.innerHTML = `
            <h5>🏅 Достижение!</h5>
            <strong>${achievement.name}</strong><br>
            ${achievement.description}<br>
            <span class="badge bg-warning">+${achievement.expReward} опыта</span>
        `;
        container.prepend(div);
        setTimeout(() => {
            div.classList.remove('show');
            setTimeout(() => div.remove(), 300);
        }, 6000);
    }

    // ------------------------------------------------------------
    // Динамическое позиционирование уведомлений (под HUD)
    // ------------------------------------------------------------
    updateNotificationPosition() {
        const hud = document.getElementById('hud');
        if (!hud) return;
        const hudHeight = hud.offsetHeight;
        const containers = [
            document.getElementById('notificationContainer'),
            document.getElementById('achievementContainer')
        ];
        containers.forEach(container => {
            if (container) {
                container.style.top = (hudHeight + 8) + 'px';
            }
        });
    }

    // ------------------------------------------------------------
    // HUD
    // ------------------------------------------------------------
    updateHUD() {
        if (!this.game) return;
        const g = this.game;
        this.elements.goldDisplay.textContent = Math.floor(g.gold);
        this.elements.castleHealthDisplay.textContent = Math.floor(g.castle.health);
        this.elements.castleMaxHealthDisplay.textContent = Math.floor(g.castle.maxHealth);
        this.elements.waveDisplay.textContent = g.currentWave;
        this.elements.enemiesLeft.textContent = g.enemies.length;
    }

    updateAbilityCooldown(remaining, maxCooldown) {
        const btn = this.elements.btnAbility;
        const label = this.elements.abilityCooldown;
        if (remaining > 0) {
            btn.disabled = true;
            btn.textContent = `⏳ ${Math.ceil(remaining)}с`;
            label.textContent = 'перезарядка';
        } else {
            btn.disabled = false;
            btn.textContent = '⚡ Способность';
            label.textContent = 'готово';
        }
    }

    setSpeedButtonLabel(speedIndex) {
        const speeds = BALANCE.speedMultipliers || [1, 2];
        const label = speeds[speedIndex] || 1;
        this.elements.btnSpeed.textContent = `⏩ ×${label}`;
    }

    // ------------------------------------------------------------
    // Пауза
    // ------------------------------------------------------------
    togglePause() {
        if (!this.game) return;
        if (this.game.isPaused) this.resumeGame();
        else this.pauseGame();
    }

    pauseGame() {
        if (this.game) this.game.isPaused = true;
        const modal = new bootstrap.Modal(this.elements.pauseModal);
        modal.show();
        this.elements.btnPause.textContent = '▶️ Играть';
    }

    resumeGame() {
        if (this.game) this.game.isPaused = false;
        const modal = bootstrap.Modal.getInstance(this.elements.pauseModal);
        if (modal) modal.hide();
        this.elements.btnPause.textContent = '⏸️ Пауза';
    }

    toggleSpeed() {
        if (!this.game) return;
        const speeds = BALANCE.speedMultipliers || [1, 2];
        this.game.speedIndex = (this.game.speedIndex + 1) % speeds.length;
        this.setSpeedButtonLabel(this.game.speedIndex);
        this.game.speedMultiplier = speeds[this.game.speedIndex];
    }

    endGame() {
        if (this.game) this.game.endGame('defeat', 'Игра завершена досрочно');
        const modal = bootstrap.Modal.getInstance(this.elements.pauseModal);
        if (modal) modal.hide();
    }

    quitToMenu() {
        if (this.game) {
            this.game.isPaused = true;
            this.game.endGame('quit', 'Выход в главное меню');
        }
        const modal = bootstrap.Modal.getInstance(this.elements.pauseModal);
        if (modal) modal.hide();
        this.showMainMenu();
    }

    // ------------------------------------------------------------
    // Башни
    // ------------------------------------------------------------
    selectTower(type) {
        if (this.game) {
            this.game.selectedTowerType = type;
            this.elements.towerButtons.forEach(btn => {
                btn.classList.remove('btn-primary', 'active');
                if (btn.dataset.tower === type) {
                    btn.classList.add('btn-primary', 'active');
                }
            });
            // Уведомление о выборе убрано
        }
    }

    showTowerContext(tower) {
        const ctx = this.elements.towerContext;
        const info = tower.getInfo();
        this.elements.towerLevel.textContent = info.level;
        this.elements.towerDamage.textContent = Math.floor(info.damage);
        this.elements.towerRange.textContent = Math.floor(info.range);
        this.elements.towerElement.textContent = info.element || 'нет';

        const nextLevel = tower.level + 1;
        const upgradeCost = nextLevel <= tower.maxLevel ? tower.getUpgradeCost() : 'MAX';
        this.elements.towerUpgradeCost.textContent = upgradeCost;

        const sellPrice = Math.floor(tower.totalCost * BALANCE.towers[tower.type].sellReturn);
        this.elements.towerSellPrice.textContent = sellPrice;

        // Позиционирование
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        const x = tower.x / scaleX + rect.left;
        const y = tower.y / scaleY + rect.top;
        ctx.style.left = x + 'px';
        ctx.style.top = (y - 50) + 'px';
        ctx.classList.remove('d-none');

        // Привязка обработчиков для кнопок элемента внутри контекстного меню
        const elementBtns = ctx.querySelectorAll('.element-btn');
        elementBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const element = btn.dataset.element;
                this.addElementToTower(element);
            };
        });

        this.selectedTower = tower;
    }

    hideTowerContext() {
        this.elements.towerContext.classList.add('d-none');
        this.selectedTower = null;
    }

    upgradeSelectedTower() {
        if (!this.selectedTower) {
            this.showMessage('Сначала выберите башню', 'warning');
            return;
        }
        if (!this.game) return;
        const success = this.selectedTower.upgrade();
        if (success) {
            // Уведомление об улучшении убрано
            this.updateHUD();
            this.hideTowerContext();
        } else {
            this.showMessage('Недостаточно золота или достигнут макс. уровень', 'danger');
        }
    }

    sellSelectedTower() {
        if (!this.selectedTower) {
            this.showMessage('Сначала выберите башню', 'warning');
            return;
        }
        if (!this.game) return;
        const refund = this.selectedTower.sell();
        this.game.removeTower(this.selectedTower);
        // Уведомление о продаже убрано
        this.updateHUD();
        this.hideTowerContext();
    }

    // ------------------------------------------------------------
    // Элементы
    // ------------------------------------------------------------
    addElementToTower(elementType) {
        if (!this.selectedTower) return;
        const success = this.selectedTower.addElement(elementType);
        if (success) {
            // Уведомление об успешном добавлении убрано
            this.updateHUD();
            this.hideTowerContext();
        } else {
            this.showMessage('Недостаточно золота', 'danger');
        }
    }

    // ------------------------------------------------------------
    // Результаты
    // ------------------------------------------------------------
    showResult(title, message, stats) {
        this.elements.resultTitle.textContent = title;
        this.elements.resultMessage.textContent = message;
        const list = this.elements.resultStats;
        list.innerHTML = '';
        for (const [key, value] of Object.entries(stats)) {
            const li = document.createElement('li');
            li.textContent = `${key}: ${value}`;
            list.appendChild(li);
        }
        const modal = new bootstrap.Modal(this.elements.resultModal);
        modal.show();
    }

    goToMainMenuFromResult() {
        const modal = bootstrap.Modal.getInstance(this.elements.resultModal);
        if (modal) modal.hide();
        this.showMainMenu();
    }

    // ------------------------------------------------------------
    // Магазин
    // ------------------------------------------------------------
    showShopModal() {
        this.renderShopItems();
        this.elements.shopExp.textContent = getExp();
        const modal = new bootstrap.Modal(this.elements.shopModal);
        modal.show();
    }

    renderShopItems() {
        const container = this.elements.shopItems;
        container.innerHTML = '';
        const upgrades = BALANCE.upgrades;
        const data = loadData();

        for (const [id, upgrade] of Object.entries(upgrades)) {
            const level = data.upgradeLevels[id] || 0;
            const maxLevel = upgrade.maxLevel || 5;
            const cost = level < maxLevel ? upgrade.costs[level] : 'MAX';
            const effect = upgrade.baseEffect * level;

            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-3';
            col.innerHTML = `
                <div class="card bg-secondary text-light h-100">
                    <div class="card-body">
                        <h5 class="card-title">${upgrade.name}</h5>
                        <p class="card-text">${upgrade.description}</p>
                        <p class="card-text">Уровень: ${level}/${maxLevel}</p>
                        <p class="card-text">Эффект: ${effect}</p>
                        <button class="btn btn-primary buy-upgrade" data-id="${id}" ${level >= maxLevel ? 'disabled' : ''}>
                            ${level >= maxLevel ? 'MAX' : `Купить (${cost} опыта)`}
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(col);
        }

        container.querySelectorAll('.buy-upgrade').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.buyUpgrade(id);
            });
        });
    }

    buyUpgrade(upgradeId) {
        const data = loadData();
        const upgrade = BALANCE.upgrades[upgradeId];
        if (!upgrade) return;
        const currentLevel = data.upgradeLevels[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) {
            this.showMessage('Улучшение уже на максимуме', 'warning');
            return;
        }
        const cost = upgrade.costs[currentLevel];
        if (data.exp < cost) {
            this.showMessage('Недостаточно очков опыта', 'danger');
            return;
        }
        data.exp -= cost;
        data.upgradeLevels[upgradeId] = currentLevel + 1;
        saveData(data);
        this.showMessage(`Улучшение "${upgrade.name}" куплено!`, 'success');
        this.renderShopItems();
        this.elements.shopExp.textContent = data.exp;
        this.updateMainMenuInfo();
    }

    // ------------------------------------------------------------
    // Статистика
    // ------------------------------------------------------------
    showStatsModal() {
        this.renderStats();
        const modal = new bootstrap.Modal(this.elements.statsModal);
        modal.show();
    }

    renderStats() {
        const stats = getStats();
        const content = this.elements.statsContent;
        content.innerHTML = `
            <ul class="list-unstyled">
                <li>👾 Всего убито врагов: ${stats.totalKills || 0}</li>
                <li>🏗️ Построено башен: ${stats.totalTowersBuilt || 0}</li>
                <li>🌊 Пройдено волн: ${stats.totalWavesCompleted || 0}</li>
                <li>👹 Убито боссов: ${stats.totalBossesKilled || 0}</li>
                <li>🛡️ Макс. серия без урона: ${stats.maxConsecutiveWavesNoDamage || 0}</li>
            </ul>
        `;

        const unlocked = getUnlockedAchievements();
        const allAchievements = BALANCE.achievements || [];
        const list = this.elements.achievementsList;
        list.innerHTML = '';
        allAchievements.forEach(ach => {
            const unlockedFlag = unlocked.includes(ach.id);
            const li = document.createElement('li');
            li.className = 'list-group-item bg-dark text-light';
            li.innerHTML = `
                ${unlockedFlag ? '✅' : '🔒'} <strong>${ach.name}</strong> – ${ach.description}
                ${unlockedFlag ? `<span class="badge bg-success float-end">+${ach.expReward} опыта</span>` : ''}
            `;
            list.appendChild(li);
        });
    }

    // ------------------------------------------------------------
    // Торговец
    // ------------------------------------------------------------
    showTraderOffer(offer) {
        this.elements.traderOffer.textContent = `🧙 Торговец предлагает: ${offer.label} на ${offer.durationWaves} волн`;
        this.elements.traderPrice.textContent = `Цена: ${offer.price} золота`;
        this.currentTraderOffer = offer;
        const modal = new bootstrap.Modal(this.elements.traderModal);
        modal.show();
    }

    acceptTrader() {
        if (!this.currentTraderOffer || !this.game) return;
        const success = this.game.eventManager.acceptTraderOffer(this.currentTraderOffer, this.game.gold);
        if (success) {
            const modal = bootstrap.Modal.getInstance(this.elements.traderModal);
            if (modal) modal.hide();
            this.updateHUD();
        }
        this.currentTraderOffer = null;
    }

    declineTrader() {
        if (this.game) {
            this.game.eventManager.declineTraderOffer();
        }
        const modal = bootstrap.Modal.getInstance(this.elements.traderModal);
        if (modal) modal.hide();
        this.currentTraderOffer = null;
    }

    // ------------------------------------------------------------
    // Сброс UI
    // ------------------------------------------------------------
    resetUI() {
        this.hideTowerContext();
        this.selectedTower = null;
        this.currentTraderOffer = null;
        this.elements.towerButtons.forEach(btn => {
            btn.classList.remove('btn-primary', 'active');
        });
        this.game = null;
    }
}