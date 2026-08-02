// ===== 鸟灵大师 v1.2 - 主游戏引擎 =====

class Game {
  constructor() {
    this.state = 'loading';
    this.player = {
      name: '训练师',
      bag: getDefaultBag(),
      caughtBirds: {},
      dex: [],
      team: [],
      winCount: 0,
      captureCount: 0,
      settings: { sound: true, vibrate: true, aiMode: 'simulate', aiEndpoint: '', aiKey: '' },
    };
    this.currentScreen = 'loading-screen';
    this.battleState = null;
    this.lastIdentifyResult = null;
    this.lureActive = false;
    this.init();
  }

  init() {
    this.loadSave();
    birdAI.setMode(this.player.settings.aiMode, this.player.settings.aiEndpoint, this.player.settings.aiKey);
    setTimeout(() => {
      this.bindEvents();
      this.hideLoading();
    }, 1800);
  }

  hideLoading() {
    const chosen = localStorage.getItem('birdmon_starter_chosen');
    if (this.player.team.length === 0 && !chosen) {
      this.showStarterSelection();
    } else {
      const loadingEl = document.getElementById('loading-screen');
      if (loadingEl) loadingEl.classList.add('hidden');
      this.go('main-menu');
    }
  }

  showStarterSelection() {
    const modal = document.getElementById('starter-modal');
    const list = document.getElementById('starter-list');
    if (!modal || !list) return;
    modal.classList.remove('hidden');
    const starters = [
      { id: 'sparrow', desc: '胆大活泼，速度最快', emoji: '⚡' },
      { id: 'pigeon',  desc: '均衡稳定，血量最厚', emoji: '🛡️' },
      { id: 'bulbul',  desc: '鸣声优美，会草系技能', emoji: '🌿' },
    ];
    list.innerHTML = starters.map(s => {
      const bird = BIRDS[s.id];
      if (!bird) return '';
      return `<div class="starter-item" onclick="game.chooseStarter('${s.id}')">
        <div class="starter-emoji">${bird.emoji}</div>
        <div class="starter-info">
          <div class="starter-name">${bird.name}</div>
          <div class="starter-types">${bird.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}</div>
          <div class="starter-desc">${s.desc}</div>
        </div>
        <div class="starter-arrow">›</div>
      </div>`;
    }).join('');
  }

  chooseStarter(birdId) {
    const bird = BIRDS[birdId];
    if (!bird) return;
    const instance = this.createBirdInstance(birdId, 5);
    const instanceId = 'starter_' + Date.now();
    this.player.team.push({ ...instance, instanceId });
    if (!this.player.dex.includes(birdId)) this.player.dex.push(birdId);
    if (!this.player.caughtBirds[birdId]) this.player.caughtBirds[birdId] = [];
    this.player.caughtBirds[birdId].push({ ...instance, instanceId });
    this.player.captureCount++;
    localStorage.setItem('birdmon_starter_chosen', 'true');
    this.save();
    const modal = document.getElementById('starter-modal');
    if (modal) modal.classList.add('hidden');
    const loadingEl = document.getElementById('loading-screen');
    if (loadingEl) loadingEl.classList.add('hidden');
    this.toast(`欢迎！你选择了 ${bird.name} 作为初始伙伴！`);
    this.go('main-menu');
  }

  bindEvents() {
    const input = document.getElementById('image-input');
    if (input) input.addEventListener('change', (e) => this.handleImageSelect(e));
  }

  save() {
    try { localStorage.setItem('birdmon_save', JSON.stringify(this.player)); } catch(e) {}
  }

  loadSave() {
    try {
      const raw = localStorage.getItem('birdmon_save');
      if (raw) {
        const data = JSON.parse(raw);
        this.player = { ...this.player, ...data };
        if (!this.player.bag || typeof this.player.bag !== 'object') this.player.bag = getDefaultBag();
      }
    } catch(e) {}
  }

  go(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const loadingEl = document.getElementById('loading-screen');
    if (loadingEl) loadingEl.classList.add('hidden');
    const map = {
      'main-menu': 'main-menu-screen',
      'capture': 'capture-screen',
      'team': 'team-screen',
      'battle-menu': 'battle-menu-screen',
      'battle-arena': 'battle-arena-screen',
      'pokedex': 'pokedex-screen',
      'bag': 'bag-screen',
      'settings': 'settings-screen'
    };
    const tid = map[screenName];
    if (tid) {
      const el = document.getElementById(tid);
      if (el) el.classList.remove('hidden');
      this.currentScreen = tid;
    }
    if (screenName === 'main-menu') this.refreshMainMenu();
    if (screenName === 'capture') this.refreshCapture();
    if (screenName === 'team') this.refreshTeam();
    if (screenName === 'pokedex') this.refreshDex();
    if (screenName === 'bag') this.refreshBag();
    if (screenName === 'settings') this.refreshSettings();
    if (screenName === 'battle-menu') this.refreshBattleMenu();
  }

  refreshMainMenu() {
    const nameEl = document.getElementById('player-name');
    const winEl = document.getElementById('win-count');
    const capEl = document.getElementById('capture-count');
    const badgeEl = document.getElementById('team-badge');
    const indEl = document.getElementById('capture-boost-indicator');
    if (nameEl) nameEl.textContent = this.player.name;
    if (winEl) winEl.textContent = this.player.winCount;
    if (capEl) capEl.textContent = this.player.captureCount;
    if (badgeEl) badgeEl.textContent = `${this.player.team.length}/6`;
    if (indEl) {
      indEl.textContent = this.lureActive ? '✨ 诱饵生效中' : '';
      indEl.style.color = 'var(--gold)';
    }
  }

  refreshCapture() {
    const hl = document.getElementById('history-list');
    if (!hl) return;
    const h = this.getCaptureHistory();
    if (h.length === 0) {
      hl.innerHTML = '<p class="empty-hint">还没有识别记录，快去拍第一张吧！</p>';
    } else {
      hl.innerHTML = h.slice(0, 5).map(x => {
        const bird = BIRDS[x.birdId];
        if (!bird) return '';
        return `<div class="history-item" onclick="game.selectHistory('${x.birdId}')">
          <span class="hi-emoji">${bird.emoji}</span>
          <div><div style="font-weight:600">${x.birdName || bird.name}</div>
          <div style="color:var(--text2);font-size:11px">置信度 ${((x.confidence||0.85)*100).toFixed(0)}% · ${new Date(x.timestamp).toLocaleTimeString()}</div></div>
        </div>`;
      }).join('');
    }
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('upload-preview');
    const result = document.getElementById('capture-result');
    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
    if (result) result.classList.add('hidden');
  }

  refreshTeam() {
    const list = document.getElementById('team-list');
    const btn = document.getElementById('goto-battle-btn');
    if (!list) return;
    if (this.player.team.length === 0) {
      list.innerHTML = '<p class="empty-hint">队伍是空的，去捕捉一些鸟灵吧！</p>';
      if (btn) btn.disabled = true;
      return;
    }
    list.innerHTML = this.player.team.map((inst, idx) => {
      const b = BIRDS[inst.birdId];
      if (!b) return '';
      const hpPct = Math.max(0, (inst.currentHp / inst.maxHp) * 100);
      return `<div class="team-card" onclick="game.showBirdDetail(${idx})">
        <span class="tc-sprite">${b.emoji}</span>
        <div class="tc-info">
          <div class="tc-name">${b.name} <span style="color:var(--text2);font-size:11px">Lv.${inst.level}</span></div>
          <div class="tc-meta">${b.types.map(t => `<span class="bird-type type-${t}" style="font-size:10px;padding:1px 6px">${t}</span>`).join('')}</div>
          <div class="tc-hp-bar"><div class="tc-hp-fill ${hpPct<20?'low':''}" style="width:${hpPct}%"></div></div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px">HP ${inst.currentHp}/${inst.maxHp}</div>
        </div>
        <div class="tc-actions"><button class="btn-small" onclick="event.stopPropagation();game.removeFromTeam(${idx})">移除</button></div>
      </div>`;
    }).join('');
    if (btn) btn.disabled = this.player.team.length === 0;
    const hpSum = document.getElementById('team-hp-summary');
    if (hpSum && this.player.team.length > 0) {
      const tHp = this.player.team.reduce((s, i) => s + (i.currentHp || 0), 0);
      const tMx = this.player.team.reduce((s, i) => s + (i.maxHp || 1), 0);
      hpSum.textContent = `HP ${tHp}/${tMx}`;
    }
  }

  refreshDex() {
    const grid = document.getElementById('dex-grid');
    if (!grid) return;
    const total = Object.keys(BIRDS).length;
    const caught = this.player.dex.length;
    const capEl = document.getElementById('dex-captured');
    const totEl = document.getElementById('dex-total');
    const rateEl = document.getElementById('dex-rate');
    if (capEl) capEl.textContent = caught;
    if (totEl) totEl.textContent = total;
    if (rateEl) rateEl.textContent = Math.round(caught/total*100) + '%';
    grid.innerHTML = Object.values(BIRDS).map(b => {
      const c = this.player.dex.includes(b.id);
      return `<div class="dex-card ${c?'caught':''}" onclick="${c?`game.showDexDetail('${b.id}')`:''}">
        <div class="dc-emoji">${b.emoji}</div>
        <div class="dc-name">${c?b.name:'???'}</div>
        <div class="dc-no">No.${String(b.no).padStart(3,'0')}</div>
      </div>`;
    }).join('');
  }

  refreshBag() {
    const list = document.getElementById('bag-list_full');
    if (!list) return;
    const order = ['pokeball','greatball','ultraball','masterball','potion','superPotion','revive','lure'];
    const items = Object.entries(this.player.bag).filter(([_,q])=>q>0).sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
    if (items.length === 0) {
      list.innerHTML = '<p class="empty-hint">背包空空如也！</p>';
    } else {
      list.innerHTML = items.map(([id,q])=>{
        const it = ITEMS[id]; if(!it) return '';
        return `<div class="bag-item"><span class="bag-emoji">${it.emoji}</span><div class="bag-info"><div class="bag-name">${it.name}</div><div class="bag-desc">${it.desc}</div></div><span class="bag-qty">×${q}</span></div>`;
      }).join('');
    }
  }

  refreshSettings() {
    const input = document.getElementById('trainer-name-input');
    const snd = document.getElementById('toggle-sound');
    const vib = document.getElementById('toggle-vibrate');
    if (input) input.value = this.player.name;
    if (snd) snd.classList.toggle('on', !!this.player.settings.sound);
    if (vib) vib.classList.toggle('on', !!this.player.settings.vibrate);
    document.querySelectorAll('#ai-mode .seg-btn').forEach(b => {
      if (b.dataset.mode) b.classList.toggle('active', b.dataset.mode === this.player.settings.aiMode);
    });
  }

  refreshBattleMenu() {
    if (this.player.team.length > 0 && this.player.team.every(i => (i.currentHp||0) <= 0)) {
      this.toast('所有鸟灵都已濒死，请使用复活草！');
    }
  }

  triggerUpload() { const el = document.getElementById('image-input'); if (el) el.click(); }

  handleImageSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { this.toast('图片不能超过 5MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = document.getElementById('preview-img');
      const ph = document.getElementById('upload-placeholder');
      const pv = document.getElementById('upload-preview');
      if (img) img.src = ev.target.result;
      if (ph) ph.classList.add('hidden');
      if (pv) pv.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    this.pendingFile = file;
  }

  retake() {
    this.pendingFile = null;
    const input = document.getElementById('image-input');
    if (input) input.value = '';
    const ph = document.getElementById('upload-placeholder');
    const pv = document.getElementById('upload-preview');
    const cr = document.getElementById('capture-result');
    if (ph) ph.classList.remove('hidden');
    if (pv) pv.classList.add('hidden');
    if (cr) cr.classList.add('hidden');
  }

  async identifyBird() {
    if (!this.pendingFile) { this.toast('请先选择图片'); return; }
    this.toast('AI 正在识别中...');
    try {
      const result = await birdAI.identify(this.pendingFile);
      this.lastIdentifyResult = result;
      this.showCaptureResult(result);
      this.addToHistory(result);
      this.save();
    } catch(err) { console.error(err); this.toast('识别失败，请重试'); }
  }

  selectHistory(birdId) {
    const bird = BIRDS[birdId];
    if (!bird) return;
    const fake = { birdId, rarity: bird.rarity, confidence: 0.85 };
    this.lastIdentifyResult = fake;
    this.showCaptureResult(fake);
  }

  showCaptureResult(result) {
    const b = BIRDS[result.birdId];
    if (!b) return;
    const c = document.getElementById('capture-result');
    if (!c) return;
    c.classList.remove('hidden');
    const rLbl = {common:'常见',uncommon:'少见',rare:'稀有',epic:'史诗',legend:'传说'};
    const rate = BirdAI.calculateCatchRate(result.rarity, result.confidence||0.85, 1, this.lureActive);
    const rc = rate>0.5?'var(--success)':rate>0.2?'var(--electric)':'var(--danger)';
    c.innerHTML = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:40px">${b.emoji}</span>
      <div><div class="bird-name">${b.name} ${b.types.map(t=>`<span class="bird-type type-${t}">${t}</span>`).join('')} <span class="rarity-tag rarity-${result.rarity}">${rLbl[result.rarity]||result.rarity}</span></div>
      <div style="font-size:12px;color:var(--text2)">置信度 ${((result.confidence||0.85)*100).toFixed(0)}%</div></div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${b.desc}</div>
      <div style="font-size:12px;margin-bottom:4px">捕捉概率：<b style="color:${rc}">${(rate*100).toFixed(0)}%</b></div>
      <div class="catch-bar-wrap"><div class="catch-bar-fill" style="width:${rate*100}%;background:${rc}"></div></div>
      <div class="capture-actions">
        <button class="btn-small primary big-btn" onclick="game.attemptCatch('pokeball')">🔴 鸟灵球 ×${this.player.bag.pokeball||0}</button>
        ${this.player.bag.greatball>0?`<button class="btn-small big-btn" onclick="game.attemptCatch('greatball')" style="background:var(--bg3)">🔵 超级球 ×${this.player.bag.greatball}</button>`:''}
        ${this.player.bag.ultraball>0?`<button class="btn-small big-btn" onclick="game.attemptCatch('ultraball')" style="background:var(--bg3)">🟡 高级球 ×${this.player.bag.ultraball}</button>`:''}
      </div>`;
  }

  addToHistory(r) {
    let h = this.getCaptureHistory();
    const bird = BIRDS[r.birdId];
    h.unshift({birdId:r.birdId,birdName:r.birdName||(bird?bird.name:'未知'),confidence:r.confidence||0.85,timestamp:r.timestamp||Date.now()});
    h = h.slice(0,20);
    localStorage.setItem('birdmon_history', JSON.stringify(h));
    this.refreshCapture();
  }

  getCaptureHistory() {
    try { return JSON.parse(localStorage.getItem('birdmon_history')||'[]'); } catch { return []; }
  }

  attemptCatch(ballType) {
    if (!this.lastIdentifyResult) return;
    const qty = this.player.bag[ballType]||0;
    if (qty<=0) { this.toast('没有这种球了！'); return; }
    const ball = ITEMS[ballType]; if (!ball) return;
    const rate = BirdAI.calculateCatchRate(this.lastIdentifyResult.rarity, this.lastIdentifyResult.confidence||0.85, ball.multiplier, this.lureActive);
    this.player.bag[ballType]--;
    if (Math.random() < rate) this.catchSuccess(BIRDS[this.lastIdentifyResult.birdId]);
    else this.catchFail(BIRDS[this.lastIdentifyResult.birdId]);
    this.save();
  }

  catchSuccess(bird) {
    if (!bird) return;
    const inst = this.createBirdInstance(bird.id, 1);
    const iid = Date.now()+'_'+Math.random().toString(36).substr(2,5);
    if (!this.player.dex.includes(bird.id)) this.player.dex.push(bird.id);
    if (!this.player.caughtBirds[bird.id]) this.player.caughtBirds[bird.id] = [];
    this.player.caughtBirds[bird.id].push({...inst, instanceId: iid});
    if (this.player.team.length < 6) this.player.team.push({...inst, instanceId: iid});
    this.player.captureCount++;
    if (this.lureActive) this.lureActive = false;
    this.toast(`🎉 捕捉成功！获得了 ${bird.name}！`);
    this.refreshMainMenu(); this.refreshCapture(); this.save();
  }

  catchFail(bird) {
    if (!bird) return;
    const msgs = ['鸟儿挣脱了！','球裂开了，鸟儿飞走了...','差一点就抓住了！','鸟儿似乎不太喜欢这个球。'];
    this.toast(`💨 ${msgs[Math.floor(Math.random()*msgs.length)]}`);
    if (this.lureActive) this.lureActive = false;
    this.refreshCapture();
  }

  createBirdInstance(id, level) {
    const b = BIRDS[id]; if (!b) return null;
    const s = this.calcStats(b.baseStats, level);
    return {birdId:id,level:level,exp:0,expToNext:expForLevel(level+1)-expForLevel(level),currentHp:s.hp,maxHp:s.hp,stats:s,moves:b.moves.map(m=>{const mv=MOVES[m];return{id:m,pp:mv?mv.pp:20,maxPp:mv?mv.pp:20};}),status:null};
  }

  calcStats(base, level) {
    const s = {};
    for (const [k,v] of Object.entries(base)) s[k] = Math.floor(((v*2)*level)/100)+5;
    return s;
  }

  removeFromTeam(idx) {
    if (idx>=0 && idx<this.player.team.length) {
      this.player.team.splice(idx,1); this.save(); this.refreshTeam(); this.toast('已从队伍中移除');
    }
  }

  showBirdDetail(idx) {
    const inst = this.player.team[idx]; if (!inst) return;
    const b = BIRDS[inst.birdId]; if (!b) return;
    const c = document.getElementById('bird-detail-content'); if (!c) return;
    c.innerHTML = `<div class="bd-emoji">${b.emoji}</div><h3>${b.name} <span style="font-size:12px;color:var(--text2)">Lv.${inst.level}</span></h3>
      <div style="text-align:center;margin-bottom:10px">${b.types.map(t=>`<span class="bird-type type-${t}">${t}</span>`).join('')}<span class="rarity-tag rarity-${b.rarity}">${b.rarity}</span></div>
      <div class="bd-row"><span>HP</span><span>${inst.currentHp}/${inst.maxHp}</span></div><div class="bd-row"><span>攻击</span><span>${inst.stats.atk}</span></div><div class="bd-row"><span>防御</span><span>${inst.stats.def}</span></div><div class="bd-row"><span>特攻</span><span>${inst.stats.spAtk}</span></div><div class="bd-row"><span>特防</span><span>${inst.stats.spDef}</span></div><div class="bd-row"><span>速度</span><span>${inst.stats.speed}</span></div><div class="bd-row"><span>经验</span><span>${inst.exp}/${inst.expToNext}</span></div>
      <div style="margin-top:10px;font-size:12px;color:var(--text2)">${b.desc}</div>`;
    const m = document.getElementById('bird-detail-modal'); if (m) m.classList.remove('hidden');
  }

  closeModal(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

  // ========== 对战 ==========
  startBattle(mode) {
    if (this.player.team.length===0) { this.toast('队伍为空，先去捕捉鸟灵吧！'); return; }
    if (this.player.team.every(i=>(i.currentHp||0)<=0)) { this.toast('所有鸟灵都已濒死！'); return; }
    this.battleState = {mode:mode,log:[],playerActiveIdx:this.findFirstAlive(),opponent:null,opponentParty:[],opponentIdx:0,opponentName:'',canRun:mode==='wild',trainer:null,gym:null};
    this.generateOpponent(mode); this.go('battle-arena'); this.renderBattle(); this.addLog(`对战开始！${this.battleState.opponentName} 出现了！`);
  }

  findFirstAlive() { for (let i=0;i<this.player.team.length;i++) if ((this.player.team[i].currentHp||0)>0) return i; return 0; }

  generateOpponent(mode) {
    const s = this.battleState;
    if (mode==='wild') {
      const birds=Object.values(BIRDS), weights=birds.map(b=>({common:10,uncommon:5,rare:2,epic:0.5,legend:0.1}[b.rarity]||1));
      const total=weights.reduce((a,b)=>a+b,0); let r=Math.random()*total; let sel=birds[0];
      for(let i=0;i<birds.length;i++){r-=weights[i];if(r<=0){sel=birds[i];break;}}
      const lv=Math.max(1,Math.floor(Math.random()*5)+1);
      s.opponent=this.createEnemyInstance(sel.id,lv); s.opponentName=`野生 ${sel.name}`;
    } else if (mode==='trainer') {
      const t=TRAINERS[Math.floor(Math.random()*TRAINERS.length)]; s.trainer=t; s.opponentParty=t.team.map(x=>({...x}));
      const f=s.opponentParty[0]; s.opponent=this.createEnemyInstance(f.birdId,f.level); s.opponentName=`${t.emoji} ${t.name} 的 ${BIRDS[f.birdId].name}`;
    } else {
      const g=GYMS[Math.floor(Math.random()*GYMS.length)]; s.gym=g; s.opponentParty=g.team.map(x=>({...x}));
      const f=s.opponentParty[0]; s.opponent=this.createEnemyInstance(f.birdId,f.level); s.opponentName=`${g.leaderEmoji} ${g.leader} 的 ${BIRDS[f.birdId].name}`;
    }
  }

  createEnemyInstance(id,lv) {
    const b=BIRDS[id]; if(!b) return null;
    const s=this.calcStats(b.baseStats,lv);
    return {birdId:id,level:lv,currentHp:s.hp,maxHp:s.hp,stats:s,moves:b.moves.map(m=>{const mv=MOVES[m];return{id:m,pp:mv?mv.pp:20,maxPp:mv?mv.pp:20};}),status:null};
  }

  renderBattle() {
    const s=this.battleState; if(!s||!s.opponent) return;
    const ml={wild:'🌲 野外遭遇',trainer:'🎓 训练师对战',gym:'👑 道馆挑战'};
    const modeLabel=document.getElementById('battle-mode-label'); if(modeLabel) modeLabel.textContent=ml[s.mode]||'';
    const ob=BIRDS[s.opponent.birdId]; if(!ob) return;
    const oppSprite=document.getElementById('opp-sprite'); if(oppSprite) oppSprite.textContent=ob.emoji;
    const oppName=document.getElementById('opp-name'); if(oppName) oppName.textContent=s.opponentName;
    const oppLevel=document.getElementById('opp-level'); if(oppLevel) oppLevel.textContent=s.opponent.level;
    const oPct=Math.max(0,(s.opponent.currentHp/s.opponent.maxHp)*100);
    const oFill=document.getElementById('opp-hp-fill');
    if(oFill){oFill.style.width=oPct+'%';oFill.className='hp-bar-fill '+(oPct<20?'low':oPct<50?'mid':'');}
    const oText=document.getElementById('opp-hp-text'); if(oText) oText.textContent=`${Math.ceil(s.opponent.currentHp)}/${s.opponent.maxHp}`;
    const pi=this.player.team[s.playerActiveIdx]; if(!pi) return;
    const pb=BIRDS[pi.birdId]; if(!pb) return;
    const plSprite=document.getElementById('player-sprite'); if(plSprite) plSprite.textContent=pb.emoji;
    const plName=document.getElementById('player-bird-name'); if(plName) plName.textContent=pb.name;
    const plLevel=document.getElementById('player-bird-level'); if(plLevel) plLevel.textContent=pi.level;
    const pPct=Math.max(0,(pi.currentHp/pi.maxHp)*100);
    const pFill=document.getElementById('player-hp-fill');
    if(pFill){pFill.style.width=pPct+'%';pFill.className='hp-bar-fill player-hp-fill '+(pPct<20?'low':pPct<50?'mid':'');}
    const pText=document.getElementById('player-hp-text'); if(pText) pText.textContent=`${Math.ceil(pi.currentHp)}/${pi.maxHp}`;
    const pExp=document.getElementById('player-exp-fill'); if(pExp) pExp.style.width=(pi.exp/pi.expToNext*100)+'%';
    this.renderLog();
  }

  renderLog() {
    const el=document.getElementById('battle-log'); if(!el||!this.battleState) return;
    const log=this.battleState.log;
    el.innerHTML=`<div class="log-bubble">${log[log.length-1]||'战斗开始！'}</div>`;
  }

  addLog(msg) { if(!this.battleState) return; this.battleState.log.push(msg); if(this.battleState.log.length>10) this.battleState.log.shift(); this.renderLog(); }

  openMoves() {
    const list=document.getElementById('move-list'); if(!list||!this.battleState) return;
    const inst=this.player.team[this.battleState.playerActiveIdx]; if(!inst) return;
    list.innerHTML=inst.moves.map((m,idx)=>{
      const mv=MOVES[m.id]; if(!mv) return '';
      const dis=m.pp<=0||(inst.currentHp||0)<=0;
      return `<div class="move-item ${dis?'disabled':''}" onclick="${dis?'':`game.useMove(${idx})`}">
        <div class="move-type-dot" style="background:var(--${mv.type==='normal'?'text2':mv.type})"></div>
        <span class="move-name">${mv.name}</span><span class="move-pp">PP ${m.pp}/${m.maxPp}</span><span class="move-power">威力 ${mv.power||'-'}</span></div>`;
    }).join('');
    const p=document.getElementById('move-panel'); if(p) p.classList.remove('hidden');
  }

  openSwitch() {
    const list=document.getElementById('switch-list'); if(!list||!this.battleState) return;
    const s=this.battleState;
    list.innerHTML=this.player.team.map((inst,idx)=>{
      const b=BIRDS[inst.birdId]; if(!b) return '';
      const act=idx===s.playerActiveIdx, dead=(inst.currentHp||0)<=0;
      return `<div class="switch-item ${act?'active':''} ${dead?'disabled':''}" onclick="${dead||act?'':`game.switchBird(${idx})`}">
        <span class="sw-sprite">${b.emoji}</span><div class="sw-info"><div class="sw-name">${b.name} Lv.${inst.level}</div><div class="sw-hp">HP ${Math.ceil(inst.currentHp)}/${inst.maxHp}</div></div>
        ${act?'<span style="font-size:11px;color:var(--accent)">战斗中</span>':''}${dead?'<span style="font-size:11px;color:var(--danger)">濒死</span>':''}</div>`;
    }).join('');
    const p=document.getElementById('switch-panel'); if(p) p.classList.remove('hidden');
  }

  openBagInBattle() {
    const list=document.getElementById('bag-list'); if(!list||!this.battleState) return;
    const usable=['potion','superPotion','revive'];
    const items=Object.entries(this.player.bag).filter(([id,q])=>q>0&&usable.includes(id));
    if(items.length===0) list.innerHTML='<p class="empty-hint">没有可用道具</p>';
    else list.innerHTML=items.map(([id,q])=>{const it=ITEMS[id];if(!it)return'';return`<div class="bag-item" onclick="game.useItemInBattle('${id}')"><span class="bag-emoji">${it.emoji}</span><div class="bag-info"><div class="bag-name">${it.name}</div><div class="bag-desc">${it.desc}</div></div><span class="bag-qty">×${q}</span></div>`;}).join('');
    const p=document.getElementById('bag-panel'); if(p) p.classList.remove('hidden');
  }

  closePanel(id) { const el=document.getElementById(id); if(el) el.classList.add('hidden'); }

  switchBird(idx) {
    if(!this.battleState) return; const s=this.battleState;
    if(idx===s.playerActiveIdx) return;
    const inst=this.player.team[idx]; if(!inst||(inst.currentHp||0)<=0) return;
    s.playerActiveIdx=idx; this.closePanel('switch-panel'); this.renderBattle();
    const b=BIRDS[inst.birdId]; if(b) this.addLog(`换上了 ${b.name}！`);
    setTimeout(()=>this.opponentTurn(),1000);
  }

  useMove(idx) {
    if(!this.battleState) return; const s=this.battleState;
    const pi=this.player.team[s.playerActiveIdx]; if(!pi) return;
    const md=pi.moves[idx]; if(!md) return;
    const mv=MOVES[md.id]; if(!mv) return;
    if(md.pp<=0){this.toast('PP不足！');return;}
    this.closePanel('move-panel'); md.pp--;
    const r=this.executeAttack(pi,s.opponent,mv,true);
    this.addLog(r.message); this.renderBattle();
    if(s.opponent.currentHp<=0){setTimeout(()=>this.onOppFaint(),1200);return;}
    setTimeout(()=>this.opponentTurn(),1200);
  }

  opponentTurn() {
    if(!this.battleState) return; const s=this.battleState;
    if(!s.opponent||s.opponent.currentHp<=0) return;
    let usable=s.opponent.moves.filter(m=>m.pp>0&&MOVES[m.id]);
    if(usable.length===0){
      const pi=this.player.team[s.playerActiveIdx]; const ob=BIRDS[s.opponent.birdId];
      if(pi&&ob){const dmg=Math.max(1,Math.floor(s.opponent.stats.atk/4));pi.currentHp=Math.max(0,pi.currentHp-dmg);this.addLog(`${ob.name} 挣扎着攻击了！`);}
    } else {
      const rand=Math.floor(Math.random()*usable.length), md=usable[rand]; md.pp--;
      const mv=MOVES[md.id]; const pi=this.player.team[s.playerActiveIdx];
      const r=this.executeAttack(s.opponent,pi,mv,false); this.addLog(r.message);
    }
    this.renderBattle();
    const pi=this.player.team[s.playerActiveIdx];
    if(pi&&pi.currentHp<=0){const pb=BIRDS[pi.birdId];if(pb)this.addLog(`${pb.name} 倒下了！`);setTimeout(()=>this.onPlayerFaint(),1200);}
  }

  executeAttack(atk,def,move,isPlayer) {
    if(!atk||!def||!move) return{message:'攻击失败！',damage:0};
    const ab=BIRDS[atk.birdId], db=BIRDS[def.birdId];
    if(!ab||!db) return{message:'攻击失败！',damage:0};
    if(move.category==='status') return{message:`${ab.name} 使用了 ${move.name}！`,damage:0};
    const aS=move.category==='physical'?(atk.stats.atk||1):(atk.stats.spAtk||1);
    const dS=move.category==='physical'?(def.stats.def||1):(def.stats.spDef||1);
    let dmg=Math.floor((((atk.level*2/5+2)*move.power*aS/dS)/50)+2);
    const m1=getTypeMultiplier(move.type,db.types[0]), m2=db.types[1]?getTypeMultiplier(move.type,db.types[1]):1;
    const tm=m1*m2; dmg=Math.floor(dmg*tm); dmg=Math.max(1,dmg);
    if(Math.random()*100>move.accuracy) return{message:`${ab.name} 的 ${move.name} 没有命中！`,damage:0};
    def.currentHp=Math.max(0,def.currentHp-dmg);
    let msg=`${ab.name} 使用了 ${move.name}！`;
    if(tm>1) msg+=' 效果拔群！'; else if(tm<1&&tm>0) msg+=' 效果不理想...';
    return{message:msg,damage:dmg};
  }

  onOppFaint() {
    if(!this.battleState) return; const s=this.battleState;
    const ob=BIRDS[s.opponent.birdId]; if(!ob) return;
    this.addLog(`${ob.name} 倒下了！`);
    const pi=this.player.team[s.playerActiveIdx];
    if(pi){const eg=Math.floor(ob.baseStats.hp*s.opponent.level/7);pi.exp+=eg;this.checkLevelUp(pi);}
    if(s.mode!=='wild'&&s.opponentIdx<s.opponentParty.length-1){
      s.opponentIdx++; const nx=s.opponentParty[s.opponentIdx];
      s.opponent=this.createEnemyInstance(nx.birdId,nx.level);
      let tn=''; if(s.mode==='trainer'&&s.trainer)tn=s.trainer.name; if(s.mode==='gym'&&s.gym)tn=s.gym.leader;
      const nb=BIRDS[nx.birdId]; s.opponentName=`${tn} 的 ${nb.name}`;
      this.addLog(`对手派出了 ${nb.name}！`); this.renderBattle(); return;
    }
    setTimeout(()=>this.showBattleResult(true),1500);
  }

  onPlayerFaint() {
    if(!this.battleState) return; const s=this.battleState;
    const ni=this.player.team.findIndex((x,i)=>i!==s.playerActiveIdx&&(x.currentHp||0)>0);
    if(ni===-1){setTimeout(()=>this.showBattleResult(false),1200);return;}
    s.playerActiveIdx=ni; const nb=BIRDS[this.player.team[ni].birdId];
    if(nb) this.addLog(`派出了 ${nb.name}！`); this.renderBattle();
  }

  checkLevelUp(inst) {
    if(!inst) return;
    while(inst.exp>=inst.expToNext){
      inst.exp-=inst.expToNext; inst.level++;
      const b=BIRDS[inst.birdId]; if(!b) break;
      const ns=this.calcStats(b.baseStats,inst.level);
      const om=inst.maxHp; inst.maxHp=ns.hp; inst.currentHp=Math.min(inst.maxHp,inst.currentHp+(ns.hp-om));
      inst.stats=ns; inst.expToNext=expForLevel(inst.level+1)-expForLevel(inst.level);
      this.addLog(`${b.name} 升到了 Lv.${inst.level}！`);
    }
    this.renderBattle();
  }

  showBattleResult(won) {
    if(!this.battleState) return;
    const m=document.getElementById('battle-result-modal'), e=document.getElementById('result-emoji');
    const t=document.getElementById('result-title'), d=document.getElementById('result-detail');
    if(!m||!e||!t||!d) return;
    if(won){
      e.textContent='🎉'; t.textContent='胜利！'; t.style.color='var(--success)';
      let rt='';
      if(this.battleState.mode==='gym'&&this.battleState.gym){rt=`<br>获得奖励：${this.battleState.gym.reward}`;this.player.winCount++;}
      else if(this.battleState.mode==='trainer') this.player.winCount++;
      d.innerHTML=`经过激烈对战，你获得了胜利！${rt}`;
    } else { e.textContent='💀'; t.textContent='败北'; t.style.color='var(--danger)'; d.textContent='所有鸟灵都倒下了，休息后再来挑战吧！'; }
    m.classList.remove('hidden'); this.save();
  }

  endBattle() { const m=document.getElementById('battle-result-modal'); if(m) m.classList.add('hidden'); this.battleState=null; this.go('main-menu'); }

  runAway() {
    if(!this.battleState) return;
    if(!this.battleState.canRun){this.toast('道馆战不能逃跑！');return;}
    if(Math.random()<0.7){this.addLog('成功逃跑了！');setTimeout(()=>{this.battleState=null;this.go('main-menu');},800);}
    else{this.addLog('逃跑失败！');setTimeout(()=>this.opponentTurn(),1000);}
  }

  confirmQuitBattle() {
    if(!this.battleState) return;
    if(this.battleState.mode==='wild'){this.battleState=null;this.go('main-menu');}else{this.toast('正式对战不能中途退出！');}
  }

  useItemInBattle(id) {
    if(!this.battleState) return; const it=ITEMS[id];
    if(!it||(this.player.bag[id]||0)<=0){this.toast('没有这个道具！');return;}
    if(it.type==='heal'){
      const s=this.battleState, inst=s.playerActiveIdx!==undefined?this.player.team[s.playerActiveIdx]:null;
      if(!inst) return; if(inst.currentHp>=inst.maxHp){this.toast('HP 已满！');return;}
      this.player.bag[id]--; const oh=inst.currentHp; inst.currentHp=Math.min(inst.maxHp,inst.currentHp+it.heal);
      const b=BIRDS[inst.birdId]; if(b) this.addLog(`使用了伤药，${b.name} 恢复了 ${inst.currentHp-oh} HP！`);
      this.renderBattle(); this.closePanel('bag-panel');
    } else if(it.type==='revive'){
      const di=this.player.team.findIndex(x=>(x.currentHp||0)<=0);
      if(di===-1){this.toast('没有需要复活的鸟灵！');return;}
      this.player.bag[id]--; const rv=this.player.team[di]; rv.currentHp=Math.floor(rv.maxHp/2);
      const b=BIRDS[rv.birdId]; if(b) this.addLog(`使用了复活草，${b.name} 复活了！`);
      this.renderBattle(); this.closePanel('bag-panel');
    }
  }

  toggleSetting(k) { if(!this.player.settings)this.player.settings={}; this.player.settings[k]=!this.player.settings[k]; this.save(); this.refreshSettings(); }
  setAIMode(mode,btn) { if(!this.player.settings)this.player.settings={}; this.player.settings.aiMode=mode; birdAI.setMode(mode); this.save(); this.refreshSettings(); }
  saveName() { const input=document.getElementById('trainer-name-input'); if(!input)return; const n=input.value.trim(); if(n){this.player.name=n;this.save();this.toast('名称已保存');this.refreshMainMenu();} }
  clearSave() { if(confirm('确定清除所有存档？不可恢复！')){localStorage.removeItem('birdmon_save');localStorage.removeItem('birdmon_history');localStorage.removeItem('birdmon_starter_chosen');location.reload();} }

  toast(msg) {
    const c=document.getElementById('toast-container'); if(!c) return;
    const el=document.createElement('div'); el.className='toast'; el.textContent=msg; c.appendChild(el);
    setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},1500);
  }

  showDexDetail(id) {
    const b=BIRDS[id]; if(!b) return; const cl=this.player.caughtBirds[id]||[];
    const c=document.getElementById('bird-detail-content'); if(!c) return;
    c.innerHTML=`<div class="bd-emoji">${b.emoji}</div><h3>${b.name} <span style="font-size:12px;color:var(--text2)">No.${String(b.no).padStart(3,'0')}</span></h3>
      <div style="text-align:center;margin-bottom:10px">${b.types.map(t=>`<span class="bird-type type-${t}">${t}</span>`).join('')}<span class="rarity-tag rarity-${b.rarity}">${b.rarity}</span></div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;text-align:center">${b.desc}</div>
      <div class="bd-row"><span>捕获数量</span><span>${cl.length}</span></div>
      ${cl.slice(0,3).map(x=>`<div class="bd-row"><span>Lv.${x.level}</span><span>HP ${x.currentHp}/${x.maxHp}</span></div>`).join('')}`;
    const m=document.getElementById('bird-detail-modal'); if(m) m.classList.remove('hidden');
  }
}

let game;
function initGame(){try{game=new Game();}catch(e){console.error('Game init failed:',e);}}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initGame);}else{initGame();}

