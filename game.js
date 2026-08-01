// ========================================
// 鸟灵大师 - CatchBird Master
// 主游戏引擎
// ========================================

class Game {
    constructor() {
        this.state = 'loading';
        this.player = {
            name: '训练师',
            bag: getDefaultBag(),
            caughtBirds: {},     // { birdId: [{instance}, ...] }
            dex: [],             // 已图鉴化的 birdId 列表
            team: [],            // 最多6只
            winCount: 0,
            captureCount: 0,
            settings: {
                sound: true,
                vibrate: true,
                aiMode: 'simulate',
                aiEndpoint: '',
                aiKey: '',
            },
        };
        this.currentScreen = 'loading-screen';
        this.battleState = null;
        this.captureState = null;
        this.lastIdentifyResult = null;
        this.lureActive = false;

        this.init();
    }

    // ========== 初始化 ==========
    init() {
        this.loadSave();
        this.bindEvents();
        birdAI.setMode(
            this.player.settings.aiMode,
            this.player.settings.aiEndpoint,
            this.player.settings.aiKey
        );

        // 模拟加载
        setTimeout(() => {
            this.hideLoading();
        }, 1800);
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
        this.go('main-menu');
    }

    bindEvents() {
        // 图片选择
        const input = document.getElementById('image-input');
        if (input) {
            input.addEventListener('change', (e) => this.handleImageSelect(e));
        }
    }

    // ========== 存档 ==========
    save() {
        try {
            localStorage.setItem('birdmon_save', JSON.stringify(this.player));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    }

    loadSave() {
        try {
            const raw = localStorage.getItem('birdmon_save');
            if (raw) {
                const data = JSON.parse(raw);
                this.player = { ...this.player, ...data };
                // 确保背包有默认值
                if (!this.player.bag || typeof this.player.bag !== 'object') {
                    this.player.bag = getDefaultBag();
                }
            }
        } catch (e) {
            console.warn('Load save failed:', e);
        }
    }

    // ========== 屏幕切换 ==========
    go(screenName) {
        // 隐藏所有 screen
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('loading-screen').classList.add('hidden');

        // 显示目标
        const targetMap = {
            'main-menu': 'main-menu-screen',
            'capture': 'capture-screen',
            'team': 'team-screen',
            'battle-menu': 'battle-menu-screen',
            'battle-arena': 'battle-arena-screen',
            'pokedex': 'pokedex-screen',
            'bag': 'bag-screen',
            'settings': 'settings-screen',
        };

        const targetId = targetMap[screenName];
        if (targetId) {
            document.getElementById(targetId).classList.remove('hidden');
            this.currentScreen = targetId;
        }

        // 刷新对应页面数据
        if (screenName === 'main-menu') this.refreshMainMenu();
        if (screenName === 'capture') this.refreshCapture();
        if (screenName === 'team') this.refreshTeam();
        if (screenName === 'pokedex') this.refreshDex();
        if (screenName === 'bag') this.refreshBag();
        if (screenName === 'settings') this.refreshSettings();
        if (screenName === 'battle-menu') this.refreshBattleMenu();
    }

    refreshMainMenu() {
        document.getElementById('player-name').textContent = this.player.name;
        document.getElementById('win-count').textContent = this.player.winCount;
        document.getElementById('capture-count').textContent = this.player.captureCount;

        const teamSize = this.player.team.length;
        document.getElementById('team-badge').textContent = `${teamSize}/6`;

        // 捕捉率加成指示
        const indicator = document.getElementById('capture-boost-indicator');
        if (this.lureActive) {
            indicator.textContent = '✨ 诱饵生效中';
            indicator.style.color = 'var(--gold)';
        } else {
            indicator.textContent = '';
        }
    }

    refreshCapture() {
        const historyList = document.getElementById('history-list');
        const history = this.getCaptureHistory();
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-hint">还没有识别记录，快去拍第一张吧！</p>';
        } else {
            historyList.innerHTML = history.slice(0, 5).map(h => `
                <div class="history-item">
                    <span class="hi-emoji">${BIRDS[h.birdId]?.emoji || '🐦'}</span>
                    <div>
                        <div style="font-weight:600">${h.birdName}</div>
                        <div style="color:var(--text2);font-size:11px">置信度 ${(h.confidence * 100).toFixed(0)}% · ${new Date(h.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
            `).join('');
        }

        // 重置上传区
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('capture-result').classList.add('hidden');
    }

    refreshTeam() {
        const list = document.getElementById('team-list');
        if (this.player.team.length === 0) {
            list.innerHTML = '<p class="empty-hint">队伍是空的，去捕捉一些鸟灵吧！</p>';
            document.getElementById('goto-battle-btn').disabled = true;
            return;
        }

        list.innerHTML = this.player.team.map((instance, idx) => {
            const bird = BIRDS[instance.birdId];
            const hpPercent = Math.max(0, (instance.currentHp / instance.maxHp) * 100);
            const hpClass = hpPercent < 20 ? 'low' : '';
            return `
                <div class="team-card" onclick="game.showBirdDetail(${idx})">
                    <span class="tc-sprite">${bird.emoji}</span>
                    <div class="tc-info">
                        <div class="tc-name">${bird.name} <span style="color:var(--text2);font-size:11px">Lv.${instance.level}</span></div>
                        <div class="tc-meta">${bird.types.map(t => `<span class="bird-type type-${t}" style="font-size:10px;padding:1px 6px">${t}</span>`).join('')}</div>
                        <div class="tc-hp-bar"><div class="tc-hp-fill ${hpClass}" style="width:${hpPercent}%"></div></div>
                        <div style="font-size:10px;color:var(--text2);margin-top:2px">HP ${instance.currentHp}/${instance.maxHp}</div>
                    </div>
                    <div class="tc-actions">
                        <button class="btn-small" onclick="event.stopPropagation();game.removeFromTeam(${idx})">移除</button>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('goto-battle-btn').disabled = this.player.team.length === 0;

        // HP 摘要
        const totalHp = this.player.team.reduce((sum, inst) => sum + inst.currentHp, 0);
        const totalMax = this.player.team.reduce((sum, inst) => sum + inst.maxHp, 0);
        document.getElementById('team-hp-summary').textContent = `HP ${totalHp}/${totalMax}`;
    }

    refreshDex() {
        const grid = document.getElementById('dex-grid');
        const total = Object.keys(BIRDS).length;
        const caught = this.player.dex.length;

        document.getElementById('dex-captured').textContent = caught;
        document.getElementById('dex-total').textContent = total;
        document.getElementById('dex-rate').textContent = Math.round(caught / total * 100) + '%';

        grid.innerHTML = Object.values(BIRDS).map(bird => {
            const isCaught = this.player.dex.includes(bird.id);
            return `
                <div class="dex-card ${isCaught ? 'caught' : ''}" onclick="${isCaught ? `game.showDexDetail('${bird.id}')` : ''}">
                    <div class="dc-emoji">${bird.emoji}</div>
                    <div class="dc-name">${isCaught ? bird.name : '???'}</div>
                    <div class="dc-no">No.${String(bird.no).padStart(3, '0')}</div>
                </div>
            `;
        }).join('');
    }

    refreshBag() {
        const list = document.getElementById('bag_list_full');
        const items = Object.entries(this.player.bag)
            .filter(([_, qty]) => qty > 0)
            .sort((a, b) => {
                const order = ['pokeball', 'greatball', 'ultraball', 'masterball', 'potion', 'superPotion', 'revive', 'lure'];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
            });

        if (items.length === 0) {
            list.innerHTML = '<p class="empty-hint">背包空空如也，去捕捉更多鸟灵吧！</p>';
            return;
        }

        list.innerHTML = items.map(([itemId, qty]) => {
            const item = ITEMS[itemId];
            return `
                <div class="bag-item">
                    <span class="bag-emoji">${item.emoji}</span>
                    <div class="bag-info">
                        <div class="bag-name">${item.name}</div>
                        <div class="bag-desc">${item.desc}</div>
                    </div>
                    <span class="bag-qty">×${qty}</span>
                </div>
            `;
        }).join('');
    }

    refreshSettings() {
        document.getElementById('trainer-name-input').value = this.player.name;
        const soundToggle = document.getElementById('toggle-sound');
        const vibToggle = document.getElementById('toggle-vibrate');
        soundToggle.classList.toggle('on', this.player.settings.sound);
        vibToggle.classList.toggle('on', this.player.settings.vibrate);

        // AI 模式
        const segBtns = document.querySelectorAll('#ai-mode .seg-btn');
        segBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.player.settings.aiMode);
        });
    }

    refreshBattleMenu() {
        // 检查队伍是否有可战斗的鸟灵
        const hasAlive = this.player.team.some(inst => inst.currentHp > 0);
        if (!hasAlive && this.player.team.length > 0) {
            this.toast('所有鸟灵都已濒死，请使用复活草！');
        }
    }

    // ========== 图片处理 ==========
    triggerUpload() {
        document.getElementById('image-input').click();
    }

    handleImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            this.toast('图片不能超过 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const preview = document.getElementById('preview-img');
            preview.src = ev.target.result;
            document.getElementById('upload-placeholder').classList.add('hidden');
            document.getElementById('upload-preview').classList.remove('hidden');
        };
        reader.readAsDataURL(file);

        this.pendingFile = file;
    }

    retake() {
        this.pendingFile = null;
        document.getElementById('image-input').value = '';
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('capture-result').classList.add('hidden');
    }

    async identifyBird() {
        if (!this.pendingFile) {
            this.toast('请先选择图片');
            return;
        }

        this.toast('AI 正在识别中...');

        try {
            const result = await birdAI.identify(this.pendingFile);
            this.lastIdentifyResult = result;
            this.showCaptureResult(result);
            this.addToHistory(result);
            this.save();
        } catch (err) {
            console.error(err);
            this.toast('识别失败，请重试');
        }
    }

    showCaptureResult(result) {
        const bird = BIRDS[result.birdId];
        const container = document.getElementById('capture-result');
        container.classList.remove('hidden');

        const rarityLabels = {
            common: '常见', uncommon: '少见', rare: '稀有', epic: '史诗', legend: '传说'
        };
        const rarityLabel = rarityLabels[result.rarity] || result.rarity;

        const catchRate = birdAI.calculateCatchRate(
            result.rarity,
            result.confidence,
            1, // 默认球倍率
            this.lureActive
        );

        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:40px">${bird.emoji}</span>
                <div>
                    <div class="bird-name">${bird.name}
                        ${bird.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}
                        <span class="rarity-tag rarity-${result.rarity}">${rarityLabel}</span>
                    </div>
                    <div style="font-size:12px;color:var(--text2)">置信度 ${(result.confidence * 100).toFixed(0)}%</div>
                </div>
            </div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${bird.desc}</div>
            <div style="font-size:12px;margin-bottom:4px">捕捉概率：<b style="color:${catchRate > 0.5 ? 'var(--success)' : catchRate > 0.2 ? 'var(--electric)' : 'var(--danger)'}">${(catchRate * 100).toFixed(0)}%</b></div>
            <div class="catch-bar-wrap">
                <div class="catch-bar-fill" style="width:${catchRate * 100}%;background:${catchRate > 0.5 ? 'var(--success)' : catchRate > 0.2 ? 'var(--electric)' : 'var(--danger)'}"></div>
            </div>
            <div class="capture-actions">
                <button class="btn-small primary big-btn" onclick="game.attemptCatch('pokeball')">🔴 鸟灵球 ×${this.player.bag.pokeball || 0}</button>
                ${this.player.bag.greatball > 0 ? `<button class="btn-small big-btn" onclick="game.attemptCatch('greatball')" style="background:var(--bg3)">🔵 超级球 ×${this.player.bag.greatball}</button>` : ''}
                ${this.player.bag.ultraball > 0 ? `<button class="btn-small big-btn" onclick="game.attemptCatch('ultraball')" style="background:var(--bg3)">🟡 高级球 ×${this.player.bag.ultraball}</button>` : ''}
            </div>
        `;
    }

    addToHistory(result) {
        let history = this.getCaptureHistory();
        history.unshift({
            birdId: result.birdId,
            birdName: result.birdName,
            confidence: result.confidence,
            timestamp: result.timestamp,
        });
        history = history.slice(0, 20); // 最多保留20条
        localStorage.setItem('birdmon_history', JSON.stringify(history));
        this.refreshCapture();
    }

    getCaptureHistory() {
        try {
            return JSON.parse(localStorage.getItem('birdmon_history') || '[]');
        } catch {
            return [];
        }
    }

    // ========== 捕捉 ==========
    attemptCatch(ballType) {
        if (!this.lastIdentifyResult) return;

        const ballQty = this.player.bag[ballType] || 0;
        if (ballQty <= 0) {
            this.toast('没有这种球了！');
            return;
        }

        const bird = BIRDS[this.lastIdentifyResult.birdId];
        const ballMultiplier = ITEMS[ballType].multiplier;
        const catchRate = birdAI.calculateCatchRate(
            this.lastIdentifyResult.rarity,
            this.lastIdentifyResult.confidence,
            ballMultiplier,
            this.lureActive
        );

        // 消耗球
        this.player.bag[ballType]--;

        // 判定
        const roll = Math.random();
        const success = roll < catchRate;

        if (success) {
            this.catchSuccess(bird, ballType);
        } else {
            this.catchFail(bird, ballType);
        }

        this.save();
    }

    catchSuccess(bird, ballType) {
        // 创建实例
        const instance = this.createBirdInstance(bird.id, 1);
        const instanceId = Date.now() + '_' + Math.random().toString(36).substr(2, 5);

        // 存入图鉴
        if (!this.player.dex.includes(bird.id)) {
            this.player.dex.push(bird.id);
        }

        // 存入收藏
        if (!this.player.caughtBirds[bird.id]) {
            this.player.caughtBirds[bird.id] = [];
        }
        this.player.caughtBirds[bird.id].push({ ...instance, instanceId });

        // 自动加入队伍（未满6只）
        if (this.player.team.length < 6) {
            this.player.team.push({ ...instance, instanceId });
        }

        this.player.captureCount++;

        // 诱饵消耗
        if (this.lureActive) {
            this.lureActive = false;
        }

        this.toast(`🎉 捕捉成功！获得了 ${bird.name}！`);
        this.refreshMainMenu();
        this.refreshCapture();
        this.save();
    }

    catchFail(bird, ballType) {
        const messages = [
            '鸟儿挣脱了！',
            '球裂开了，鸟儿飞走了...',
            '差一点就抓住了！',
            '鸟儿似乎不太喜欢这个球。',
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        this.toast(`💨 ${msg}`);

        // 诱饵消耗
        if (this.lureActive) {
            this.lureActive = false;
        }

        this.refreshCapture();
    }

    createBirdInstance(birdId, level) {
        const bird = BIRDS[birdId];
        const stats = this.calcStats(bird.baseStats, level);
        return {
            birdId,
            level,
            exp: 0,
            expToNext: expForLevel(level + 1) - expForLevel(level),
            currentHp: stats.hp,
            maxHp: stats.hp,
            stats,
            moves: bird.moves.map(m => ({ id: m, pp: MOVES[m].pp, maxPp: MOVES[m].pp })),
            status: null,
        };
    }

    calcStats(baseStats, level) {
        const s = {};
        for (const [key, val] of Object.entries(baseStats)) {
            s[key] = Math.floor(((val * 2) * level) / 100) + 5;
        }
        return s;
    }

    // ========== 队伍管理 ==========
    removeFromTeam(idx) {
        if (idx >= 0 && idx < this.player.team.length) {
            this.player.team.splice(idx, 1);
            this.save();
            this.refreshTeam();
            this.toast('已从队伍中移除');
        }
    }

    showBirdDetail(teamIdx) {
        const instance = this.player.team[teamIdx];
        const bird = BIRDS[instance.birdId];
        const modal = document.getElementById('bird-detail-modal');
        const content = document.getElementById('bird-detail-content');

        content.innerHTML = `
            <div class="bd-emoji">${bird.emoji}</div>
            <h3>${bird.name} <span style="font-size:12px;color:var(--text2)">Lv.${instance.level}</span></h3>
            <div style="text-align:center;margin-bottom:10px">
                ${bird.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}
                <span class="rarity-tag rarity-${bird.rarity}">${bird.rarity}</span>
            </div>
            <div class="bd-row"><span>HP</span><span>${instance.currentHp}/${instance.maxHp}</span></div>
            <div class="bd-row"><span>攻击</span><span>${instance.stats.atk}</span></div>
            <div class="bd-row"><span>防御</span><span>${instance.stats.def}</span></div>
            <div class="bd-row"><span>特攻</span><span>${instance.stats.spAtk}</span></div>
            <div class="bd-row"><span>特防</span><span>${instance.stats.spDef}</span></div>
            <div class="bd-row"><span>速度</span><span>${instance.stats.speed}</span></div>
            <div class="bd-row"><span>经验</span><span>${instance.exp}/${instance.expToNext}</span></div>
            <div style="margin-top:10px;font-size:12px;color:var(--text2)">${bird.desc}</div>
        `;

        modal.classList.remove('hidden');
    }

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    }

    // ========== 对战系统 ==========
    startBattle(mode) {
        if (this.player.team.length === 0) {
            this.toast('队伍为空，先去捕捉鸟灵吧！');
            return;
        }

        const aliveCount = this.player.team.filter(i => i.currentHp > 0).length;
        if (aliveCount === 0) {
            this.toast('所有鸟灵都已濒死，请使用复活草！');
            return;
        }

        this.battleState = {
            mode,
            turn: 'player',
            log: [],
            playerActiveIdx: this.findFirstAliveIndex(),
            opponent: null,
            opponentParty: [],
            opponentIdx: 0,
            weather: null,
            canRun: mode === 'wild',
        };

        // 生成对手
        this.generateOpponent(mode);

        // 进入对战
        this.go('battle-arena');
        this.renderBattle();
        this.addLog(`对战开始！${this.getOpponentName()} 出现了！`);
    }

    findFirstAliveIndex() {
        for (let i = 0; i < this.player.team.length; i++) {
            if (this.player.team[i].currentHp > 0) return i;
        }
        return 0;
    }

    generateOpponent(mode) {
        const state = this.battleState;

        if (mode === 'wild') {
            // 随机野生鸟灵
            const allBirds = Object.values(BIRDS);
            const weights = allBirds.map(b => {
                const rw = { common: 10, uncommon: 5, rare: 2, epic: 0.5, legend: 0.1 };
                return rw[b.rarity] || 1;
            });
            const bird = this.weightedRandom(allBirds, weights);
            const level = Math.max(1, Math.floor(Math.random() * 5) + 1);
            state.opponentParty = [{ birdId: bird.id, level }];
            state.opponent = this.createEnemyInstance(bird.id, level);
            state.opponentName = `野生 ${bird.name}`;

        } else if (mode === 'trainer') {
            const trainer = TRAINERS[Math.floor(Math.random() * TRAINERS.length)];
            state.opponentParty = trainer.team.map(t => ({ ...t }));
            state.trainer = trainer;
            state.opponentIdx = 0;
            const first = state.opponentParty[0];
            state.opponent = this.createEnemyInstance(first.birdId, first.level);
            state.opponentName = `${trainer.emoji} ${trainer.name}`;

        } else if (mode === 'gym') {
            const gym = GYMS[Math.floor(Math.random() * GYMS.length)];
            state.opponentParty = gym.team.map(t => ({ ...t }));
            state.gym = gym;
            state.opponentIdx = 0;
            const first = state.opponentParty[0];
            state.opponent = this.createEnemyInstance(first.birdId, first.level);
            state.opponentName = `${gym.leaderEmoji} ${gym.leader}`;
        }
    }

    createEnemyInstance(birdId, level) {
        const bird = BIRDS[birdId];
        const stats = this.calcStats(bird.baseStats, level);
        return {
            birdId,
            level,
            currentHp: stats.hp,
            maxHp: stats.hp,
            stats,
            moves: bird.moves.map(m => ({ id: m, pp: MOVES[m].pp, maxPp: MOVES[m].pp })),
            status: null,
        };
    }

    weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            rand -= weights[i];
            if (rand <= 0) return items[i];
        }
        return items[0];
    }

    getOpponentName() {
        return this.battleState?.opponentName || '对手';
    }

    renderBattle() {
        if (!this.battleState) return;
        const s = this.battleState;

        // 模式标签
        const modeLabels = { wild: '🌲 野外遭遇', trainer: '🎓 训练师对战', gym: '👑 道馆挑战' };
        document.getElementById('battle-mode-label').textContent = modeLabels[s.mode] || '';

        // 对手
        const oppBird = BIRDS[s.opponent.birdId];
        document.getElementById('opp-sprite').textContent = oppBird.emoji;
        document.getElementById('opp-name').textContent = s.opponentName;
        document.getElementById('opp-level').textContent = s.opponent.level;

        const oppHpPercent = Math.max(0, (s.opponent.currentHp / s.opponent.maxHp) * 100);
        const oppFill = document.getElementById('opp-hp-fill');
        oppFill.style.width = oppHpPercent + '%';
        oppFill.className = 'hp-bar-fill ' + (oppHpPercent < 20 ? 'low' : oppHpPercent < 50 ? 'mid' : '');
        document.getElementById('opp-hp-text').textContent = `${Math.ceil(s.opponent.currentHp)}/${s.opponent.maxHp}`;

        // 玩家
        const playerInst = this.player.team[s.playerActiveIdx];
        const playerBird = BIRDS[playerInst.birdId];
        document.getElementById('player-sprite').textContent = playerBird.emoji;
        document.getElementById('player-bird-name').textContent = playerBird.name;
        document.getElementById('player-bird-level').textContent = playerInst.level;

        const pHpPercent = Math.max(0, (playerInst.currentHp / playerInst.maxHp) * 100);
        const pFill = document.getElementById('player-hp-fill');
        pFill.style.width = pHpPercent + '%';
        pFill.className = 'hp-bar-fill player-hp-fill ' + (pHpPercent < 20 ? 'low' : pHpPercent < 50 ? 'mid' : '');
        document.getElementById('player-hp-text').textContent = `${Math.ceil(playerInst.currentHp)}/${playerInst.maxHp}`;

        // EXP
        const expPercent = (playerInst.exp / playerInst.expToNext) * 100;
        document.getElementById('player-exp-fill').style.width = expPercent + '%';

        // 日志
        this.renderLog();
    }

    renderLog() {
        const logEl = document.getElementById('battle-log');
        const logs = this.battleState?.log || [];
        const lastLog = logs[logs.length - 1] || '战斗开始！';
        logEl.innerHTML = `<div class="log-bubble">${lastLog}</div>`;
    }

    addLog(msg) {
        if (!this.battleState) return;
        this.battleState.log.push(msg);
        if (this.battleState.log.length > 10) {
            this.battleState.log.shift();
        }
        this.renderLog();
    }

    // ========== 对战操作 ==========
    openMoves() {
        const panel = document.getElementById('move-panel');
        const list = document.getElementById('move-list');
        const instance = this.player.team[this.battleState.playerActiveIdx];

        list.innerHTML = instance.moves.map((m, idx) => {
            const move = MOVES[m.id];
            const typeClass = `type-${move.type}`;
            const disabled = m.pp <= 0 || instance.currentHp <= 0;
            return `
                <div class="move-item ${disabled ? 'disabled' : ''}" onclick="${disabled ? '' : `game.useMove(${idx})`}">
                    <div class="move-type-dot" style="background:var(--${move.type === 'normal' ? 'text2' : move.type})"></div>
                    <span class="move-name">${move.name}</span>
                    <span class="move-pp">PP ${m.pp}/${m.maxPp}</span>
                    <span class="move-power">威力 ${move.power || '-'}</span>
                </div>
            `;
        }).join('');

        panel.classList.remove('hidden');
    }

    openSwitch() {
        const panel = document.getElementById('switch-panel');
        const list = document.getElementById('switch-list');

        list.innerHTML = this.player.team.map((inst, idx) => {
            const bird = BIRDS[inst.birdId];
            const isActive = idx === this.battleState.playerActiveIdx;
            const isDead = inst.currentHp <= 0;
            const hpPercent = Math.max(0, (inst.currentHp / inst.maxHp) * 100);
            return `
                <div class="switch-item ${isActive ? 'active' : ''} ${isDead ? 'disabled' : ''}" onclick="${isDead || isActive ? '' : `game.switchBird(${idx})`}">
                    <span class="sw-sprite">${bird.emoji}</span>
                    <div class="sw-info">
                        <div class="sw-name">${bird.name} Lv.${inst.level}</div>
                        <div class="sw-hp">HP ${Math.ceil(inst.currentHp)}/${inst.maxHp}</div>
                    </div>
                    ${isActive ? '<span style="font-size:11px;color:var(--accent)">战斗中</span>' : ''}
                    ${isDead ? '<span style="font-size:11px;color:var(--danger)">濒死</span>' : ''}
                </div>
            `;
        }).join('');

        panel.classList.remove('hidden');
    }

    openBagInBattle() {
        const panel = document.getElementById('bag-panel');
        const list = document.getElementById('bag-list');

        const usableItems = Object.entries(this.player.bag)
            .filter(([id, qty]) => qty > 0 && ['potion', 'superPotion', 'revive'].includes(id));

        if (usableItems.length === 0) {
            list.innerHTML = '<p class="empty-hint">没有可用道具</p>';
        } else {
            list.innerHTML = usableItems.map(([id, qty]) => {
                const item = ITEMS[id];
                return `
                    <div class="bag-item" onclick="game.useItemInBattle('${id}')">
                        <span class="bag-emoji">${item.emoji}</span>
                        <div class="bag-info">
                            <div class="bag-name">${item.name}</div>
                            <div class="bag-desc">${item.desc}</div>
                        </div>
                        <span class="bag-qty">×${qty}</span>
                    </div>
                `;
            }).join('');
        }

        panel.classList.remove('hidden');
    }

    closePanel(id) {
        document.getElementById(id).classList.add('hidden');
    }

    switchBird(idx) {
        if (idx === this.battleState.playerActiveIdx) return;
        if (this.player.team[idx].currentHp <= 0) return;

        this.battleState.playerActiveIdx = idx;
        this.closePanel('switch-panel');
        this.renderBattle();
        this.addLog(`换上了 ${BIRDS[this.player.team[idx].birdId].name}！`);

        // 换人后对手回合
        setTimeout(() => this.opponentTurn(), 1000);
    }

    async useMove(moveIdx) {
        const s = this.battleState;
        const playerInst = this.player.team[s.playerActiveIdx];
        const moveData = playerInst.moves[moveIdx];

        if (moveData.pp <= 0) {
            this.toast('PP不足！');
            return;
        }

        this.closePanel('move-panel');

        const move = MOVES[moveData.id];
        moveData.pp--;

        // 执行攻击
        const result = this.executeAttack(playerInst, s.opponent, move, true);

        this.addLog(result.message);
        this.renderBattle();

        // 检查对手是否倒下
        if (s.opponent.currentHp <= 0) {
            await this.onOpponentFaint();
            return;
        }

        // 对手回合
        setTimeout(() => this.opponentTurn(), 1200);
    }

    opponentTurn() {
        const s = this.battleState;
        if (!s || s.opponent.currentHp <= 0) return;

        const oppMoveIdx = Math.floor(Math.random() * s.opponent.moves.length);
        const oppMoveData = s.opponent.moves[oppMoveIdx];
        const move = MOVES[oppMoveData.id];

        if (oppMoveData.pp <= 0) {
            // PP耗尽，用挣扎
            this.executeStruggle(s.opponent, this.player.team[s.playerActiveIdx], false);
        } else {
            oppMoveData.pp--;
            const result = this.executeAttack(s.opponent, this.player.team[s.playerActiveIdx], move, false);
            this.addLog(result.message);
        }

        this.renderBattle();

        // 检查玩家鸟灵是否倒下
        const playerInst = this.player.team[s.playerActiveIdx];
        if (playerInst.currentHp <= 0) {
            this.addLog(`${BIRDS[playerInst.birdId].name} 倒下了！`);
            setTimeout(() => this.onPlayerBirdFaint(), 1200);
        }
    }

    executeAttack(attacker, defender, move, isPlayer) {
        const attackerBird = BIRDS[attacker.birdId];
        const defenderBird = BIRDS[defender.birdId];

        // 变化技能
        if (move.category === 'status') {
            return { message: `${attackerBird.name} 使用了 ${move.name}！`, damage: 0 };
        }

        // 计算伤害
        const atkStat = move.category === 'physical' ? attacker.stats.atk : attacker.stats.spAtk;
        const defStat = move.category === 'physical' ? defender.stats.def : defender.stats.spDef;

        let damage = Math.floor((((attacker.level * 2 / 5 + 2) * move.power * atkStat / defStat) / 50) + 2);

        // 属性克制
        const multiplier = getTypeMultiplier(move.type, defenderBird.types[0]);
        const secondaryMultiplier = defenderBird.types[1] ? getTypeMultiplier(move.type, defenderBird.types[1]) : 1;
        const totalMultiplier = multiplier * secondaryMultiplier;

        damage = Math.floor(damage * totalMultiplier);
        damage = Math.max(1, damage);

        // 命中判定
        const hitRoll = Math.random() * 100;
        if (hitRoll > move.accuracy) {
            return { message: `${attackerBird.name} 的 ${move.name} 没有命中！`, damage: 0, missed: true };
        }

        // 造成伤害
        defender.currentHp = Math.max(0, defender.currentHp - damage);

        let msg = `${attackerBird.name} 使用了 ${move.name}！`;
        if (totalMultiplier > 1) msg += ' 效果拔群！';
        if (totalMultiplier < 1 && totalMultiplier > 0) msg += ' 效果不理想...';
        if (totalMultiplier === 0) msg += ' 完全没有效果！';

        return { message: msg, damage, multiplier: totalMultiplier };
    }

    executeStruggle(attacker, defender, isPlayer) {
        const attackerBird = BIRDS[attacker.birdId];
        const damage = Math.max(1, Math.floor(attacker.stats.atk / 4));
        defender.currentHp = Math.max(0, defender.currentHp - damage);
        this.addLog(`${attackerBird.name} 挣扎着攻击了！`);
        this.renderBattle();
    }

    async onOpponentFaint() {
        const s = this.battleState;
        const oppBird = BIRDS[s.opponent.birdId];

        this.addLog(`${oppBird.name} 倒下了！`);

        // 给经验
        const playerInst = this.player.team[s.playerActiveIdx];
        const expGain = Math.floor(oppBird.baseStats.hp * s.opponent.level / 7);
        this.gainExp(playerInst, expGain);

        // 检查是否还有下一只
        if (s.mode !== 'wild' && s.opponentIdx < s.opponentParty.length - 1) {
            s.opponentIdx++;
            const next = s.opponentParty[s.opponentIdx];
            s.opponent = this.createEnemyInstance(next.birdId, next.level);
            const namePrefix = s.mode === 'trainer' ? s.trainer.name : s.gym.leader;
            s.opponentName = `${namePrefix} 的 ${BIRDS[next.birdId].name}`;
            this.addLog(`对手派出了 ${BIRDS[next.birdId].name}！`);
            this.renderBattle();
            return;
        }

        // 战斗结束
        setTimeout(() => this.showBattleResult(true), 1500);
    }

    onPlayerBirdFaint() {
        const s = this.battleState;

        // 找下一只活着的
        const nextIdx = this.player.team.findIndex((inst, idx) =>
            idx !== s.playerActiveIdx && inst.currentHp > 0
        );

        if (nextIdx === -1) {
            // 全部倒下
            setTimeout(() => this.showBattleResult(false), 1200);
            return;
        }

        s.playerActiveIdx = nextIdx;
        this.addLog(`派出了 ${BIRDS[this.player.team[nextIdx].birdId].name}！`);
        this.renderBattle();
    }

    gainExp(instance, amount) {
        instance.exp += amount;
        while (instance.exp >= instance.expToNext) {
            instance.exp -= instance.expToNext;
            instance.level++;
            // 重新计算属性
            const bird = BIRDS[instance.birdId];
            const newStats = this.calcStats(bird.baseStats, instance.level);
            const hpDiff = newStats.hp - instance.maxHp;
            instance.maxHp = newStats.hp;
            instance.currentHp = Math.min(instance.maxHp, instance.currentHp + hpDiff);
            instance.stats = newStats;
            instance.expToNext = expForLevel(instance.level + 1) - expForLevel(instance.level);
            this.addLog(`${BIRDS[instance.birdId].name} 升到了 Lv.${instance.level}！`);
        }
        this.renderBattle();
    }

    showBattleResult(won) {
        const modal = document.getElementById('battle-result-modal');
        const emoji = document.getElementById('result-emoji');
        const title = document.getElementById('result-title');
        const detail = document.getElementById('result-detail');

        if (won) {
            emoji.textContent = '🎉';
            title.textContent = '胜利！';
            title.style.color = 'var(--success)';

            let rewardText = '';
            if (this.battleState.mode === 'gym') {
                rewardText = `<br>获得奖励：${this.battleState.gym.reward}`;
                this.player.winCount++;
            } else if (this.battleState.mode === 'trainer') {
                this.player.winCount++;
            }

            detail.innerHTML = `经过激烈的对战，你获得了胜利！${rewardText}`;
        } else {
            emoji.textContent = '💀';
            title.textContent = '败北';
            title.style.color = 'var(--danger)';
            detail.textContent = '所有鸟灵都倒下了，休息后再来挑战吧！';
        }

        modal.classList.remove('hidden');
        this.save();
    }

    endBattle() {
        document.getElementById('battle-result-modal').classList.add('hidden');
        this.battleState = null;
        this.go('main-menu');
    }

    runAway() {
        if (!this.battleState.canRun) {
            this.toast('道馆战不能逃跑！');
            return;
        }

        const escapeChance = 0.7;
        if (Math.random() < escapeChance) {
            this.addLog('成功逃跑了！');
            setTimeout(() => {
                this.battleState = null;
                this.go('main-menu');
            }, 800);
        } else {
            this.addLog('逃跑失败！');
            setTimeout(() => this.opponentTurn(), 1000);
        }
    }

    confirmQuitBattle() {
        if (this.battleState?.mode === 'wild') {
            this.battleState = null;
            this.go('main-menu');
        } else {
            this.toast('正式对战不能中途退出！');
        }
    }

    // ========== 道具使用 ==========
    useItemInBattle(itemId) {
        const item = ITEMS[itemId];
        if (!item || (this.player.bag[itemId] || 0) <= 0) {
            this.toast('没有这个道具！');
            return;
        }

        if (item.type === 'heal') {
            // 选择鸟灵治疗
            this.closePanel('bag-panel');
            this.showHealTarget(itemId, item.heal);
        } else if (item.type === 'revive') {
            this.closePanel('bag-panel');
            this.showReviveTarget(itemId);
        }
    }

    showHealTarget(itemId, healAmount) {
        // 简化：治疗当前出场的鸟灵
        const s = this.battleState;
        const inst = this.player.team[s.playerActiveIdx];
        if (inst.currentHp >= inst.maxHp) {
            this.toast('HP 已经是满的！');
            return;
        }

        this.player.bag[itemId]--;
        const oldHp = inst.currentHp;
        inst.currentHp = Math.min(inst.maxHp, inst.currentHp + healAmount);
        const healed = inst.currentHp - oldHp;
        this.addLog(`使用了伤药，${BIRDS[inst.birdId].name} 恢复了 ${healed} HP！`);
        this.renderBattle();
        this.closePanel('bag-panel');
    }

    showReviveTarget(itemId) {
        const s = this.battleState;
        const deadIdx = this.player.team.findIndex(inst => inst.currentHp <= 0);
        if (deadIdx === -1) {
            this.toast('没有需要复活的鸟灵！');
            return;
        }

        this.player.bag[itemId]--;
        const inst = this.player.team[deadIdx];
        inst.currentHp = Math.floor(inst.maxHp / 2);
        this.addLog(`使用了复活草，${BIRDS[inst.birdId].name} 复活了！`);
        this.renderBattle();
        this.closePanel('bag-panel');
    }

    // ========== 设置 ==========
    toggleSetting(key) {
        this.player.settings[key] = !this.player.settings[key];
        this.save();
        this.refreshSettings();
    }

    setAIMode(mode, btn) {
        this.player.settings.aiMode = mode;
        birdAI.setMode(mode);
        this.save();
        this.refreshSettings();
    }

    _saveName() {
        const input = document.getElementById('trainer-name-input');
        const name = input.value.trim();
        if (name) {
            this.player.name = name;
            this.save();
            this.toast('名称已保存');
            this.refreshMainMenu();
        }
    }

    clearSave() {
        if (confirm('确定要清除所有存档吗？此操作不可恢复！')) {
            localStorage.removeItem('birdmon_save');
            localStorage.removeItem('birdmon_history');
            location.reload();
        }
    }

    // ========== 通用 ==========
    toast(msg) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 300);
        }, 1500);
    }

    showDexDetail(birdId) {
        const bird = BIRDS[birdId];
        const modal = document.getElementById('bird-detail-modal');
        const content = document.getElementById('bird-detail-content');

        const caughtList = this.player.caughtBirds[birdId] || [];
        const instancesHtml = caughtList.slice(0, 3).map(inst => `
            <div class="bd-row"><span>Lv.${inst.level}</span><span>HP ${inst.currentHp}/${inst.maxHp}</span></div>
        `).join('');

        content.innerHTML = `
            <div class="bd-emoji">${bird.emoji}</div>
            <h3>${bird.name} <span style="font-size:12px;color:var(--text2)">No.${String(bird.no).padStart(3, '0')}</span></h3>
            <div style="text-align:center;margin-bottom:10px">
                ${bird.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}
                <span class="rarity-tag rarity-${bird.rarity}">${bird.rarity}</span>
            </div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:10px">${bird.desc}</div>
            <div class="bd-row"><span>捕获数量</span><span>${caughtList.length}</span></div>
            ${instancesHtml}
        `;

        modal.classList.remove('hidden');
    }
}

// ========== 启动 ==========
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});
