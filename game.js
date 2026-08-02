const BUTTONS = document.querySelectorAll('button, .btn, [role="button"]'); BUTTONS.forEach(btn => { btn.addEventListener('touchstart', e => { const t = e.currentTarget; t.style.transform = 'scale(0.95)'; setTimeout(() => { t.style.transform = ''; }, 100); }, { passive: true }); });

class Player {
  constructor() {
    this.name = '观鸟大师';
    this.team = [];
    this.bag = getDefaultBag();
    this.caughtBirds = {};
    this.settings = { sound: true, aiMode: 'simulate' };
    this.badges = [];
    this.credits = 0;
  }
  save() {
    try {
      localStorage.setItem('birdmon_save', JSON.stringify({
        name: this.name,
        team: this.team,
        bag: this.bag,
        caughtBirds: this.caughtBirds,
        settings: this.settings,
        badges: this.badges,
        credits: this.credits
      }));
    } catch (e) {}
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('birdmon_save'));
      if (!d) return false;
      this.name = d.name || '观鸟大师';
      this.team = d.team || [];
      this.bag = { ...getDefaultBag(), ...(d.bag || {}) };
      this.caughtBirds = d.caughtBirds || {};
      this.settings = { ...this.settings, ...(d.settings || {}) };
      this.badges = d.badges || [];
      this.credits = d.credits || 0;
      return true;
    } catch (e) { return false; }
  }
  addBird(birdId, level) {
    const b = BIRDS[birdId];
    if (!b) return;
    const existing = this.team.findIndex(x => x.birdId === birdId && x.currentHp > 0);
    if (existing !== -1) {
      const oh = this.team[existing].currentHp;
      this.team[existing].currentHp = Math.min(this.team[existing].maxHp, this.team[existing].currentHp + Math.floor(b.baseStats.hp * 0.2));
      return { idx: existing, isNew: false, healed: this.team[existing].currentHp - oh };
    }
    if (this.team.length >= 6) {
      this.addLog(`${b.name} 加入了鸟灵背包（队伍已满）`);
      if (!this.caughtBirds[birdId]) this.caughtBirds[birdId] = [];
      this.caughtBirds[birdId].push({ level, currentHp: b.baseStats.hp, maxHp: b.baseStats.hp, exp: 0, owner: this.name });
      this.save();
      return { idx: -1, isNew: false };
    }
    const inst = {
      id: Date.now() + Math.random(), birdId, name: b.name, emoji: b.emoji,
      types: b.types, rarity: b.rarity, level, exp: 0, owner: this.name,
      maxHp: b.baseStats.hp, currentHp: b.baseStats.hp,
      atk: b.baseStats.atk, def: b.baseStats.def, spAtk: b.baseStats.spAtk, spDef: b.baseStats.spDef, speed: b.baseStats.speed,
      moves: [...b.moves]
    };
    this.team.push(inst);
    if (!this.caughtBirds[birdId]) this.caughtBirds[birdId] = [];
    this.caughtBirds[birdId].push({ level, currentHp: inst.maxHp, maxHp: inst.maxHp, exp: 0, owner: this.name });
    this.addLog(`恭喜！野生 ${b.name} 加入了你的队伍！`);
    this.save();
    return { idx: this.team.length - 1, isNew: true };
  }
  addLog(t) { if (!this.battleLog) this.battleLog = []; this.battleLog.unshift(`[${new Date().toLocaleTimeString()}] ${t}`); if (this.battleLog.length > 20) this.battleLog.pop(); }
}

class Battle {
  constructor(playerTeam, enemyTeam, onEnd) {
    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.onEnd = onEnd;
    this.turn = 0;
    this.log = [];
    this.statusText = '选择你的出战鸟灵';
    this.playerActiveIdx = playerTeam.findIndex(x => x.currentHp > 0);
    this.enemyActiveIdx = 0;
    this.weather = null;
  }
  get playerActive() { return this.playerTeam[this.playerActiveIdx]; }
  get enemyActive() { return this.enemyTeam[this.enemyActiveIdx]; }
  executeMove(attacker, defender, moveName) {
    const move = MOVES[moveName];
    if (!move) return;
    let eff = 1;
    let typeEff = 1;
    if (move.type) {
      if (defender.types.includes(move.type)) eff *= 1.5;
      const notVery = TYPE_CHART[move.type]?.find(t => defender.types.includes(t));
      if (notVery) eff *= 0.5;
      const immune = TYPE_CHART[move.type]?.includes('ghost') && defender.types.includes('normal');
      if (immune) eff = 0;
      typeEff = eff;
    }
    const dmg = Math.max(1, Math.floor((attacker.level * 0.4 + 2) * (attacker.atk || attacker.spAtk) * move.power / ((defender.def || defender.spDef) * 50) + 2) * eff);
    defender.currentHp = Math.max(0, defender.currentHp - dmg);
    this.addLog(`${attacker.emoji}${attacker.name} 使用了 ${move.emoji}${move.name}！${typeEff > 1 ? '效果拔群！' : typeEff < 1 ? '效果不佳...' : ''}`);
    if (dmg > 0) this.addLog(`造成了 ${dmg} 点伤害！`);
    if (move.effect && Math.random() < (move.effectChance || 0.1)) {
      if (move.effect === 'leech') {
        const heal = Math.floor(dmg / 2);
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + heal);
        this.addLog(`${attacker.name} 吸取了体力，恢复了 ${heal} HP！`);
      }
    }
    if (defender.currentHp <= 0) this.handleFaint(defender);
  }
  handleFaint(p) {
    const isPlayer = this.playerTeam.includes(p);
    this.addLog(`${p.emoji}${p.name} 倒下了！`);
    if (isPlayer) {
      const next = this.playerTeam.findIndex(x => x.currentHp > 0);
      if (next === -1) return this.end(false);
      this.playerActiveIdx = next;
      this.addLog(`请选择下一只出战鸟灵！`);
      this.statusText = `选择出战鸟灵 (${this.playerTeam.filter(x => x.currentHp > 0).length} 只可用)`;
      return;
    }
    this.enemyActiveIdx++;
    if (this.enemyActiveIdx >= this.enemyTeam.length) return this.end(true);
  }
  cpuTurn() {
    if (!this.enemyActive || this.enemyActive.currentHp <= 0) return;
    const alivePlayer = this.playerTeam.filter(x => x.currentHp > 0);
    const target = alivePlayer[Math.floor(Math.random() * alivePlayer.length)];
    const move = this.enemyActive.moves[Math.floor(Math.random() * this.enemyActive.moves.length)];
    this.executeMove(this.enemyActive, target, move);
    if (this.checkEnd()) return;
    setTimeout(() => this.render(), 1000);
  }
  checkEnd() {
    const pAlive = this.playerTeam.some(x => x.currentHp > 0);
    const eAlive = this.enemyTeam.some(x => x.currentHp > 0);
    if (!pAlive) { this.end(false); return true; }
    if (!eAlive) { this.end(true); return true; }
    return false;
  }
  end(win) {
    if (win) {
      const reward = 100 + this.enemyTeam.reduce((s, b) => s + b.level * 10, 0);
      player.credits += reward;
      this.addLog(`胜利！获得 ${reward} 积分！`);
      if (typeof this.onEnd === 'function') this.onEnd(true, reward);
    } else {
      this.addLog(`战败...`);
      if (typeof this.onEnd === 'function') this.onEnd(false);
    }
  }
  render() {
    const pb = document.getElementById('player-bird'), eb = document.getElementById('enemy-bird'), pl = document.getElementById('player-log'), el = document.getElementById('enemy-log'), st = document.getElementById('battle-status'), ml = document.getElementById('battle-main-log');
    if (!pb || !eb || !pl || !el || !st || !ml) return;
    const pa = this.playerActive, ea = this.enemyActive;
    pb.innerHTML = `<div class="bird-emoji">${pa.emoji}</div><div class="bird-name">${pa.name} Lv.${pa.level}</div><div class="hp-bar"><div class="hp-fill" style="width:${(pa.currentHp / pa.maxHp) * 100}%"></div></div><div class="hp-text">${pa.currentHp} / ${pa.maxHp}</div>`;
    eb.innerHTML = `<div class="bird-emoji">${ea.emoji}</div><div class="bird-name">${ea.name} Lv.${ea.level}</div><div class="hp-bar"><div class="hp-fill" style="width:${(ea.currentHp / ea.maxHp) * 100}%"></div></div><div class="hp-text">${ea.currentHp} / ${ea.maxHp}</div>`;
    pl.innerHTML = pa.moves.map(m => `<button onclick="game.battleAction('useMove','${m}')" class="move-btn">${MOVES[m].emoji}${MOVES[m].name}</button>`).join('');
    el.innerHTML = `<button onclick="game.battleAction('switch',${this.playerTeam.findIndex(x => x.currentHp > 0 && x !== pa)})" class="move-btn">🌀 换下 (${this.playerTeam.filter(x => x.currentHp > 0).length - 1} 只可用)</button><button onclick="game.battleAction('useItem','potion')" class="move-btn">🧪 伤药</button><button onclick="game.battleAction('useItem','revive')" class="move-btn">🌿 复活草</button>`;
    st.innerText = this.statusText;
    ml.innerHTML = this.log.slice(0, 5).map(l => `<div style="margin-bottom:4px">${l}</div>`).join('');
  }
}

class Game {
  constructor() {
    this.player = new Player();
    this.battleState = null;
    this.activePanel = 'main-menu';
    this.init();
  }
  init() {
    if (!this.player.load()) this.showStarterModal();
    else this.refreshMainMenu();
    this.refreshSettings();
  }
  showStarterModal() {
    const list = ['sparrow', 'bulbul', 'myna'], names = { sparrow: '麻小雀', bulbul: '灰鸽', myna: '白头鹎' }, html = list.map(id => {
      const b = BIRDS[id];
      return `<div class="starter-bird" onclick="game.chooseStarter('${id}')"><div class="bird-emoji">${b.emoji}</div><div class="bird-name">${names[id]}</div><div class="bird-types">${b.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join(' ')}</div></div>`;
    }).join('');
    const modal = document.getElementById('starter-modal'), content = document.getElementById('starter-content');
    if (!modal || !content) return;
    content.innerHTML = html;
    modal.classList.remove('hidden');
  }
  chooseStarter(id) {
    document.getElementById('starter-modal').classList.add('hidden');
    this.player.addBird(id, 5);
    this.refreshMainMenu();
  }
  refreshMainMenu() {
    const n = document.getElementById('trainer-name'), r = document.getElementById('credits-count'), ba = document.getElementById('badges-area'), tl = document.getElementById('team-list'), ml = document.getElementById('menu-log-list'), ci = document.getElementById('collection-count');
    if (n) n.innerText = this.player.name;
    if (r) r.innerText = this.player.credits;
    if (ba) ba.innerHTML = this.player.badges.map(b => `<span class="badge">${b}</span>`).join('');
    if (tl) tl.innerHTML = this.player.team.length === 0 ? '<div class="empty-tip">队伍为空快去捕捉鸟灵吧！</div>' : this.player.team.filter(x => x.currentHp > 0).map(b => `<div class="menu-team-bird"><div class="bird-emoji">${b.emoji}</div><div class="bird-info"><div>${b.name} Lv.${b.level}</div><div class="hp-bar small"><div class="hp-fill" style="width:${(b.currentHp / b.maxHp) * 100}%"></div></div></div></div>`).join('');
    if (ml) ml.innerHTML = this.player.battleLog ? this.player.battleLog.slice(0, 3).map(l => `<div>${l}</div>`).join('') : '<div>暂无对战记录</div>';
    if (ci) {
      const cnt = Object.values(this.player.caughtBirds).reduce((s, a) => s + a.length, 0);
      ci.innerText = `${cnt} / ${Object.keys(BIRDS).length}`;
    }
  }
  switchPanel(id) {
    ['main-menu', 'dex-panel', 'bag-panel', 'battle-panel', 'settings-panel', 'credits-panel'].forEach(p => {
      const el = document.getElementById(`${p}`);
      if (el) el.classList.add('hidden');
      const btn = document.getElementById(`btn-${p.split('-')[0]}`);
      if (btn) btn.classList.remove('active');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-${id.split('-')[0]}`);
    if (activeBtn) activeBtn.classList.add('active');
    if (id === 'dex-panel') this.renderDex();
    if (id === 'bag-panel') this.renderBag();
    this.activePanel = id;
  }
  renderDex() {
    const list = document.getElementById('dex-list');
    if (!list) return;
    list.innerHTML = Object.keys(BIRDS).map(id => {
      const b = BIRDS[id], c = this.player.caughtBirds[id] || [];
      return `<div class="dex-entry" onclick="game.showDexDetail('${id}')"><div class="bird-emoji">${b.emoji}</div><div class="dex-info"><div class="dex-name">${b.name} <span style="font-size:10px;opacity:0.7">No.${String(b.no).padStart(3,'0')}</span></div><div class="dex-types">${b.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}</div><div class="dex-caught">已捕获: ${c.length}</div></div></div>`;
    }).join('');
  }
  showDexDetail(id) {
    const b = BIRDS[id];
    if (!b) return;
    const cl = this.player.caughtBirds[id] || [];
    const c = document.getElementById('bird-detail-content');
    if (!c) return;
    c.innerHTML = `<div class="bd-emoji">${b.emoji}</div><h3>${b.name} <span style="font-size:12px;color:var(--text2)">No.${String(b.no).padStart(3,'0')}</span></h3><div style="text-align:center;margin-bottom:10px">${b.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}<span class="rarity-tag rarity-${b.rarity}">${b.rarity}</span></div><div style="font-size:12px;color:var(--text2);margin-bottom:10px;text-align:center">${b.desc}</div><div class="bd-row"><span>捕获数量</span><span>${cl.length}</span></div>${cl.slice(0, 3).map(x => `<div class="bd-row"><span>Lv.${x.level}</span><span>HP ${x.currentHp}/${x.maxHp}</span></div>`).join('')}`;
    const m = document.getElementById('bird-detail-modal');
    if (m) m.classList.remove('hidden');
  }
  closeDetail() { const m = document.getElementById('bird-detail-modal'); if (m) m.classList.add('hidden'); }
  renderBag() {
    const grid = document.getElementById('bag-grid'), log = document.getElementById('bag-log');
    if (!grid || !log) return;
    grid.innerHTML = Object.keys(ITEMS).map(id => {
      const it = ITEMS[id];
      return `<div class="bag-item" onclick="game.useItemInBattle('${id}')"><div class="bag-emoji">${it.emoji}</div><div class="bag-name">${it.name}</div><div class="bag-count">${this.player.bag[id] || 0}</div></div>`;
    }).join('');
    log.innerHTML = this.player.battleLog ? this.player.battleLog.slice(0, 3).map(l => `<div>${l}</div>`).join('') : '<div>暂无对战记录</div>';
  }
  startWildBattle(birdId) {
    const b = BIRDS[birdId], lvl = Math.floor(Math.random() * 5) + 5;
    const wildInst = {
      id: Date.now(), birdId, name: b.name, emoji: b.emoji, types: b.types, rarity: b.rarity, level: lvl,
      maxHp: b.baseStats.hp, currentHp: b.baseStats.hp, atk: b.baseStats.atk, def: b.baseStats.def, spAtk: b.baseStats.spAtk, spDef: b.baseStats.spDef, speed: b.baseStats.speed, moves: [...b.moves]
    };
    this.battleState = new Battle([...this.player.team], [wildInst], (win, reward) => {
      this.battleState = null;
      this.switchPanel('main-menu');
      if (win) {
        this.player.addBird(birdId, lvl);
        this.refreshMainMenu();
      }
    });
    this.switchPanel('battle-panel');
    this.battleState.render();
  }
  battleAction(type, data) {
    if (!this.battleState) return;
    if (type === 'useMove') {
      this.battleState.executeMove(this.battleState.playerActive, this.battleState.enemyActive, data);
      if (this.battleState.checkEnd()) return;
      setTimeout(() => this.battleState.cpuTurn(), 1000);
    } else if (type === 'switch') {
      if (data < 0 || data >= this.battleState.playerTeam.length) return;
      this.battleState.playerActiveIdx = data;
      this.battleState.addLog(`${this.battleState.playerActive.name} 登场了！`);
      setTimeout(() => this.battleState.render(), 500);
    }
  }
  useItemInBattle(id) {
    if (!this.battleState) return;
    const it = ITEMS[id];
    if (!it || (this.player.bag[id] || 0) <= 0) { this.toast('没有这个道具！'); return; }
    if (it.type === 'heal') {
      const s = this.battleState, inst = s.playerActiveIdx !== undefined ? this.player.team[s.playerActiveIdx] : null;
      if (!inst) return;
      if (inst.currentHp >= inst.maxHp) { this.toast('HP 已满！'); return; }
      this.player.bag[id]--;
      const oh = inst.currentHp;
      inst.currentHp = Math.min(inst.maxHp, inst.currentHp + it.heal);
      const b = BIRDS[inst.birdId];
      if (b) this.player.addLog(`${it.emoji}${it.name}，${b.name} 恢复了 ${inst.currentHp - oh} HP！`);
      this.battleState.render();
      this.closePanel('bag-panel');
    } else if (it.type === 'revive') {
      const di = this.player.team.findIndex(x => (x.currentHp || 0) <= 0);
      if (di === -1) { this.toast('没有需要复活的鸟灵！'); return; }
      this.player.bag[id]--;
      const rv = this.player.team[di];
      rv.currentHp = Math.floor(rv.maxHp / 2);
      const b = BIRDS[rv.birdId];
      if (b) this.player.addLog(`${it.emoji}${it.name}，${b.name} 复活了！`);
      this.battleState.render();
      this.closePanel('bag-panel');
    }
  }
  toggleSetting(k) { if (!this.player.settings) this.player.settings = {}; this.player.settings[k] = !this.player.settings[k]; this.save(); this.refreshSettings(); }
  setAIMode(mode, btn) { if (!this.player.settings) this.player.settings = {}; this.player.settings.aiMode = mode; birdAI.setMode(mode); this.save(); this.refreshSettings(); }
  saveName() { const input = document.getElementById('trainer-name-input'); if (!input) return; const n = input.value.trim(); if (n) { this.player.name = n; this.save(); this.toast('名称已保存'); this.refreshMainMenu(); } }
  clearSave() { if (confirm('确定清除所有存档？不可恢复！')) { localStorage.removeItem('birdmon_save'); localStorage.removeItem('birdmon_history'); localStorage.removeItem('birdmon_starter_chosen'); location.reload(); } }
  toast(msg) { 
    const c = document.getElementById('toast-container'); 
    if (!c) return; 
    const el = document.createElement('div'); 
    el.className = 'toast'; 
    el.textContent = msg; 
    c.appendChild(el); 
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 1500); 
  }
}

// ===== 底部初始化代码（千万不要再加 // 注释了！） =====
let game;
function initGame(){ 
  try { 
    game = new Game(); 
  } catch (e) { 
    console.error('Game init failed:', e); 
    alert('游戏启动失败，请查看控制台报错');
  } 
}
if (document.readyState === 'loading') { 
  document.addEventListener('DOMContentLoaded', initGame); 
} else { 
  initGame(); 
}
