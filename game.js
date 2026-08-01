// ========================================
// 鸟灵大师 - CatchBird Master v1.1
// 主游戏引擎
// ========================================

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
        this.bindEvents();
        birdAI.setMode(this.player.settings.aiMode, this.player.settings.aiEndpoint, this.player.settings.aiKey);
        setTimeout(() => this.hideLoading(), 1800);
    }

    hideLoading() {
        if (this.player.team.length === 0 && !localStorage.getItem('birdmon_starter_chosen')) {
            this.showStarterSelection();
        } else {
            document.getElementById('loading-screen').classList.add('hidden');
            this.go('main-menu');
        }
    }

    showStarterSelection() {
        const modal = document.getElementById('starter-modal');
        const list = document.getElementById('starter-list');
        modal.classList.remove('hidden');
        const starters = [
            { id: 'sparrow', desc: '胆大活泼，速度最快', emoji: '⚡' },
            { id: 'pigeon',  desc: '均衡稳定，血量最厚', emoji: '🛡️' },
            { id: 'bulbul',  desc: '鸣声优美，会草系技能', emoji: '🌿' },
        ];
        list.innerHTML = starters.map(s => {
            const bird = BIRDS[s.id];
            return `
                <div class="starter-item" onclick="game.chooseStarter('${s.id}')">
                    <div class="starter-emoji">${bird.emoji}</div>
                    <div class="starter-info">
                        <div class="starter-name">${bird.name}</div>
                        <div class="starter-types">${bird.types.map(t => `<span class="bird-type type-${t}">${t}</span>`).join('')}</div>
                        <div class="starter-desc">${s.desc}</div>
                    </div>
                    <div class="starter-arrow">›</div>
                </div>
            `;
        }).join('');
    }

    chooseStarter(birdId) {
        const instance = this.createBirdInstance(birdId, 5);
        const instanceId = 'starter_' + Date.now();
        this.player.team.push({ ...instance, instanceId });
        if (!this.player.dex.includes(birdId)) this.player.dex.push(birdId);
        if (!this.player.caughtBirds[birdId]) this.player.caughtBirds[birdId] = [];
        this.player.caughtBirds[birdId].push({ ...instance, instanceId });
        this.player.captureCount++;
        localStorage.setItem('birdmon_starter_chosen', 'true');
        this.save();
        document.getElementById('starter-modal').classList.add('hidden');
        document.getElementById('loading-screen').classList.add('hidden');
        this.toast(`欢迎！你选择了 ${BIRDS[birdId].name} 作为初始伙伴！`);
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
        document.getElementById('loading-screen').classList.add('hidden');
        const map = {
            'main-menu':'main-menu-screen','capture':'capture-screen','team':'team-screen',
            'battle-menu':'battle-menu-screen','battle-arena':'battle-arena-screen',
            'pokedex':'pokedex-screen','bag':'bag-screen','settings':'settings-screen'
        };
        const tid = map[screenName];
        if (tid) { document.getElementById(tid).classList.remove('hidden'); this.currentScreen = tid; }
        if (screenName==='main-menu') this.refreshMainMenu();
        if (screenName==='capture') this.refreshCapture();
        if (screenName==='team') this.refreshTeam();
        if (screenName==='pokedex') this.refreshDex();
        if (screenName==='bag') this.refreshBag();
        if (screenName==='settings') this.refreshSettings();
        if (screenName==='battle-menu') this.refreshBattleMenu();
    }

    refreshMainMenu() {
        document.getElementById('player-name').textContent = this.player.name;
        document.getElementById('win-count').textContent = this.player.winCount;
        document.getElementById('capture-count').textContent = this.player.captureCount;
        document.getElementById('team-badge').textContent = `${this.player.team.length}/6`;
        const ind = document.getElementById('capture-boost-indicator');
        ind.textContent = this.lureActive ? '✨ 诱饵生效中' : '';
        ind.style.color = 'var(--gold)';
    }

    refreshCapture() {
        const hl = document.getElementById('history-list');
        const h = this.getCaptureHistory();
        hl.innerHTML = h.length === 0
            ? '<p class="empty-hint">还没有识别记录，快去拍第一张吧！</p>'
            : h.slice(0,5).map(x => `
                <div class="history-item" onclick="game.selectHistory('${x.birdId}')">
                    <span class="hi-emoji">${BIRDS[x.birdId]?.emoji||'🐦'}</span>
                    <div><div style="font-weight:600">${x.birdName}</div><div style="color:var(--text2);font-size:11px">置信度 ${(x.confidence*100).toFixed(0)}% · ${new Date(x.timestamp).toLocaleTimeString()}</div></div>
                </div>`).join('');
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('capture-result').classList.add('hidden');
    }

    refreshTeam() {
        const list = document.getElementById('team-list');
        if (this.player.team.length===0) { list.innerHTML='<p class="empty-hint">队伍是空的，去捕捉一些鸟灵吧！</p>'; document.getElementById('goto-battle-btn').disabled=true; return; }
        list.innerHTML = this.player.team.map((inst,idx)=>{
            const b = BIRDS[inst.birdId]; const hpPct = Math.max(0,(inst.currentHp/inst.maxHp)*100);
            return `<div class="team-card" onclick="game.showBirdDetail(${idx})">
                <span class="tc-sprite">${b.emoji}</span>
                <div class="tc-info"><div class="tc-name">${b.name} <span style="color:var(--text2);font-size:11px">Lv.${inst.level}</span></div>
                <div class="tc-meta">${b.types.map(t=>`<span class="bird-type type-${t}" style="font-size:10px;padding:1px 6px">${t}</span>`).join('')}</div>
                <div class="tc-hp-bar"><div class="tc-hp-fill ${hpPct<20?'low':''}" style="width:${hpPct}%"></div></div>
                <div style="font-size:10px;color:var(--text2);margin-top:2px">HP ${inst.currentHp}/${inst.maxHp}</div></div>
                <div class="tc-actions"><button class="btn-small" onclick="event.stopPropagation();game.removeFromTeam(${idx})">移除</button></div>
            </div>`;
        }).join('');
        document.getElementById('goto-battle-btn').disabled = this.player.team.length===0;
        const tHp=this.player.team.reduce((s,i)=>s+i.currentHp,0), tMx=this.player.team.reduce((s,i)=>s+i.maxHp,0);
        document.getElementById('team-hp-summary').textContent = `HP ${tHp}/${tMx}`;
    }

    refreshDex() {
        const grid = document.getElementById('dex-grid');
        const total = Object.keys(BIRDS).length, caught = this.player.dex.length;
        document.getElementById('dex-captured').textContent = caught;
        document.getElementById('dex-total').textContent = total;
        document.getElementById('dex-rate').textContent = Math.round(caught/total*100)+'%';
        grid.innerHTML = Object.values(BIRDS).map(b=>{
            const c = this.player.dex.includes(b.id);
            return `<div class="dex-card ${c?'caught':''}" onclick="${c?`game.showDexDetail('${b.id}')`:''}">
                <div class="dc-emoji">${b.emoji}</div><div class="dc-name">${c?b.name:'???'}</div><div class="dc-no">No.${String(b.no).padStart(3,'0')}</div></div>`;
        }).join('');
    }

    refreshBag() {
        const list = document.getElementById('bag_list_full');
        const items = Object.entries(this.player.bag).filter(([_,q])=>q>0).sort((a,b)=>['pokeball','greatball','ultraball','masterball','potion','superPotion','revive','lure'].indexOf(a[0])-['pokeball','greatball','ultraball','masterball','potion','superPotion','revive','lure'].indexOf(b[0]));
        list.innerHTML = items.length===0 ? '<p class="empty-hint">背包空空如也！</p>'
            : items.map(([id,qty])=>{ const item=ITEMS[id]; return `<div class="bag-item"><span class="bag-emoji">${item.emoji}</span><div class="bag-info"><div class="bag-name">${item.name}</div><div class="bag-desc">${item.desc}</div></div><span class="bag-qty">×${qty}</span></div>`; }).join('');
    }

    refreshSettings() {
        document.getElementById('trainer-name-input').value = this.player.name;
        document.getElementById('toggle-sound').classList.toggle('on',this.player.settings.sound);
        document.getElementById('toggle-vibrate').classList.toggle('on',this.player.settings.vibrate);
        document.querySelectorAll('#ai-mode .seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===this.player.settings.aiMode));
    }

    refreshBattleMenu() {
        if (this.player.team.length>0 && this.player.team.every(i=>i.currentHp<=0)) this.toast('所有鸟灵都已濒死，请使用复活草！');
    }

    triggerUpload() { document.getElementById('image-input').click(); }

    handleImageSelect(e) {
        const file = e.target.files[0]; if(!file) return;
        if (file.size>5*1024*1024) { this.toast('图片不能超过 5MB'); return; }
        const reader = new FileReader();
        reader.onload = ev => { document.getElementById('preview-img').src=ev.target.result; document.getElementById('upload-placeholder').classList.add('hidden'); document.getElementById('upload-preview').classList.remove('hidden'); };
        reader.readAsDataURL(file); this.pendingFile = file;
    }

    retake() {
        this.pendingFile=null; document.getElementById('image-input').value='';
        document.getElementById('upload-placeholder').classList.remove('hidden');
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('capture-result').classList.add('hidden');
    }

    async identifyBird() {
        if (!this.pendingFile) { this.toast('请先选择图片'); return; }
        this.toast('AI 正在识别中...');
        try {
            const result = await birdAI.identify(this.pendingFile);
            this.lastIdentifyResult = result; this.showCaptureResult(result); this.addToHistory(result); this.save();
        } catch(err) { console.error(err); this.toast('识别失败，请重试'); }
    }

    selectHistory(birdId) {
        const fakeResult = { birdId, rarity: BIRDS[birdId].rarity, confidence: 0.85 };
        this.lastIdentifyResult = fakeResult; this.showCaptureResult(fakeResult);
    }

    showCaptureResult(result) {
        const b = BIRDS[result.birdId]; const c = document.getElementById('capture-result'); c.classList.remove('hidden');
        const rLbl = {common:'常见',uncommon:'少见',rare:'稀有',epic:'史诗',legend:'传说'};
        const rate = birdAI.calculateCatchRate(result.rarity, result.confidence||0.85, 1, this.lureActive);
        c.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:40px">${b.emoji}</span>
                <div><div class="bird-name">${b.name} ${b.types.map(t=>`<span class="bird-type type-${t}">${t}</span>`).join('')} <span class="rarity-tag rarity-${result.rarity}">${rLbl[result.rarity]}</span></div>
                <div style="font-size:12px;color:var(--text2)">置信度 ${((result.confidence||0.85)*100).toFixed(0)}%</div></div></div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${b.desc}</div>
            <div style="font-size:12px;margin-bottom:4px">捕捉概率：<b style="color:${rate>0.5?'var(--success)':rate>0.2?'var(--electric)':'var(--danger)'}">${(rate*100).toFixed(0)}%</b></div>
            <div class="catch-bar-wrap"><div class="catch-bar-fill" style="width:${rate*100}%;background:${rate>0.5?'var(--success)':rate>0.2?'var(--electric)':'var(--danger)'}"></div></div>
            <div class="capture-actions">
                <button class="btn-small primary big-btn" onclick="game.attemptCatch('pokeball')">🔴 鸟灵球 ×${this.player.bag.pokeball||0}</button>
                ${this.player.bag.greatball>0?`<button class="btn-small big-btn" onclick="game.attemptCatch('greatball')" style="background:var(--bg3)">🔵 超级球 ×${this.player.bag.greatball}</button>`:''}
                ${this.player.bag.ultraball>0?`<button class="btn-small big-btn" onclick="game.attemptCatch('ultraball')" style="background:var(--bg3)">🟡 高级球 ×${this.player.bag.ultraball}</button>`:''}
            </div>`;
    }

    addToHistory(r) {
        let h = this.getCaptureHistory(); h.unshift({birdId:r.birdId,birdName:r.birdName||BIRDS[r.birdId]?.name,confidence:r.confidence||0.85,timestamp:r.timestamp||Date.now()}); h=h.slice(0,20); localStorage.setItem('birdmon_history',JSON.stringify(h)); this.refreshCapture();
    }

    getCaptureHistory() { try { return JSON.parse(localStorage.getItem('birdmon_history')||'[]'); } catch { return []; } }

    attemptCatch(ballType) {
        if (!this.lastIdentifyResult) return;
        const qty = this.player.bag[ballType]||0; if (qty<=0) { this.toast('没有这种球了！'); return; }
        const rate = birdAI.calculateCatchRate(this.lastIdentifyResult.rarity, this.lastIdentifyResult.confidence||0.85, ITEMS[ballType].multiplier, this.lureActive);
        this.player.bag[ballType]--;
        if (Math.random()<rate) this.catchSuccess(BIRDS[this.lastIdentifyResult.birdId]); else this.catchFail(BIRDS[this.lastIdentifyResult.birdId]);
        this.save();
    }

    catchSuccess(bird) {
        const inst = this.createBirdInstance(bird.id, 1); const iid = Date.now()+'_'+Math.random().toString(36).substr(2,5);
        if (!this.player.dex.includes(bird.id)) this.player.dex.push(bird.id);
        if (!this.player.caughtBirds[bird.id]) this.player.caughtBirds[bird.id]=[];
        this.player.caughtBirds[bird.id].push({...inst,instanceId:iid});
        if (this.player.team.length<6) this.player.team.push({...inst,instanceId:iid});
        this.player.captureCount++; if (this.lureActive) this.lureActive=false;
        this.toast(`🎉 捕捉成功！获得了 ${bird.name}！`); this.refreshMainMenu(); this.refreshCapture(); this.save();
    }

    catchFail(bird) {
        const msgs=['鸟儿挣脱了！','球裂开了，鸟儿飞走了...','差一点就抓住了！','鸟儿似乎不太喜欢这个球。'];
        this.toast(`💨 ${msgs[Math.floor(Math.random()*msgs.length)]}`); if (this.lureActive) this.lureActive=false; this.refreshCapture();
    }

    createBirdInstance(id, level) {
        const b = BIRDS[id]; const s = this.calcStats(b.baseStats, level);
        return { birdId:id, level, exp:0, expToNext:expForLevel(level+1)-expForLevel(level), currentHp:s.hp, maxHp:s.hp, stats:s, moves:b.moves.map(m=>({id:m,pp:MOVES[m].pp,maxPp:MOVES[m].pp})), status:null };
    }

    calcStats(base, level) {
        const s={}; for(const[k,v]of Object.entries(base)) s[k]=Math.floor(((v*2)*level)/100)+5; return s;
    }

    removeFromTeam(idx) {
        if (idx>=0 && idx<this.player.team.length) { this.player.team.splice(idx,1); this.save(); this.refreshTeam(); this.toast('已从队伍中移除'); }
    }

    showBirdDetail(idx) {
        const inst=this.player.team[idx], b=BIRDS[inst.birdId], c=document.getElementById('bird-detail-content');
        c.innerHTML = `<div class="bd-emoji">${b.emoji}</div><h3>${b.name} <span style="font-size:12px;color:var(--text2)">Lv.${inst.level}</span></h3>
            <div style="text-align:center;margin-bottom:10px">${b.types.map(t=>`<span class="bird-type type-${t}">${t}</span>`).join('')} <span class="rarity-tag rarity-${b.rarity}">${b.rarity}</span></div>
            <div class="bd-row"><span>HP</span><span>${inst.currentHp}/${inst.maxHp}</span></div>
            <div class="bd-row"><span>攻击</span><span>${inst.stats.atk}</span></div>
            <div class="bd-row"><span>防御</span><span>${inst.stats.def}</span></div>
            <div class="bd-row"><span>特攻</span><span>${inst.stats.spAtk}</span></div>
            <div class="bd-row"><span>特防</span><span>${inst.stats.spDef}</span></div>
            <div class="bd-row"><span>速度</span><span>${inst.stats.speed}</span></div>
            <div class="bd-row"><span>经验</span><span>${inst.exp}/${inst.expToNext}</span></div>
            <div style="margin-top:10px;font-size:12px;color:var(--text2)">${b.desc}</div>`;
        document.getElementById('bird-detail-modal').classList.remove('hidden');
    }

    closeModal(id) { document.getElementById(id).classList.add('hidden'); }

    // ========== 对战 ==========
    startBattle(mode) {
        if (this.player.team.length===0) { this.toast('队伍为空，先去捕捉鸟灵吧！'); return; }
        if (this.player.team.every(i=>i.currentHp<=0)) { this.toast('所有鸟灵都已濒死！'); return; }
        this.battleState = { mode, log:[], playerActiveIdx:this.findFirstAlive(), opponent:null, opponentParty:[], opponentIdx:0, canRun:mode==='wild' };
        this.generateOpponent(mode); this.go('battle-arena'); this.renderBattle(); this.addLog(`对战开始！${this.getOppName()} 出现了！`);
    }

    findFirstAlive() { for(let i=0;i<this.player.team.length;i++) if(this.player.team[i].currentHp>0) return i; return 0; }

    generateOpponent(mode) {
        const s=this.battleState;
        if (mode==='wild') {
            const ab=Object.values(BIRDS), w=ab.map(b=>({common:10,uncommon:5,rare:2,epic:0.5,legend:0.1}[b.rarity]||1));
            const b=this.weightedRandom(ab,w), lv=Math.max(1,Math.floor(Math.random()*5)+1);
            s.opponent=this.createEnemyInstance(b.id,lv); s.opponentName=`野生 ${b.name}`;
        } else if (mode==='trainer') {
            const t=TRAINERS[Math.floor(Math.random()*TRAINERS.length)]; s.opponentParty=t.team.map(x=>({...x})); s.trainer=t;
            s.opponent=this.createEnemyInstance(s.opponentParty[0].birdId,s.opponentParty[0].level); s.opponentName=`${t.emoji} ${t.name}`;
        } else {
            const g=GYMS[Math.floor(Math.random()*GYMS.length)]; s.opponentParty=g.team.map(x=>({...x})); s.gym=g;
            s.opponent=this.createEnemyInstance(s.opponentParty[0].birdId,s.opponentParty[0].level); s.opponentName=`${g.leaderEmoji} ${g.leader}`;
        }
    }

    createEnemyInstance(id,lv) { const b=BIRDS[id],s=this.calcStats(b.baseStats,lv); return {birdId:id,level:lv,currentHp:s.hp,maxHp:s.hp,stats:s,moves:b.moves.map(m=>({id:m,pp:MOVES[m].pp,maxPp:MOVES[m].pp})),status:null}; }

    weightedRandom(items,weights) { const t=weights.reduce((a,b)=>a+b,0); let r=Math.random()*t; for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i];} return items[0]; }

    getOppName() { return this.battleState?.opponentName||'对手'; }

    renderBattle() {
        const s=this.battleState; if(!s) return;
        const ml={wild:'🌲 野外遭遇',trainer:'🎓 训练师对战',gym:'👑 道馆挑战'};
        document.getElementById('battle-mode-label').textContent=ml[s.mode]||'';
        const ob=BIRDS[s.opponent.birdId];
        document.getElementById('opp-sprite').textContent=ob.emoji; document.getElementById('opp-name').textContent=s.opponentName; document.getElementById('opp-level').textContent=s.opponent.level;
        const oPct=Math.max(0,(s.opponent.currentHp/s.opponent.maxHp)*100), oF=document.getElementById('opp-hp-fill');
        oF.style.width=oPct+'%'; oF.className='hp-bar-fill '+(oPct<20?'low':oPct<50?'mid':''); document.getElementById('opp-hp-text').textContent=`${Math.ceil(s.opponent.currentHp)}/${s.opponent.maxHp}`;
        const pi=this.player.team[s.playerActiveIdx], pb=BIRDS[pi.birdId];
        document.getElementById('player-sprite').textContent=pb.emoji; document.getElementById('player-bird-name').textContent=pb.name; document.getElementById('player-bird-level').textContent=pi.level;
        const pPct=Math.max(0,(pi.currentHp/pi.maxHp)*100), pF=document.getElementById('player-hp-fill');
        pF.style.width=pPct+'%'; pF.className='hp-bar-fill player-hp-fill '+(pPct<20?'low':pPct<50?'mid':''); document.getElementById('player-hp-text').textContent=`${Math.ceil(pi.currentHp)}/${pi.maxHp}`;
        document.getElementById('player-exp-fill').style.width=(pi.exp/pi.expToNext*100)+'%';
        this.renderLog();
    }

    renderLog() { const l=this.battleState?.log||[]; document.getElementById('battle-log').innerHTML=`<div class="log-bubble">${l[l.length-1]||'战斗开始！'}</div>`; }

    addLog(msg) { if(!this.battleState) return; this.battleState.log.push(msg); if(this.battleState.log.length>10) this.battleState.log.shift(); this.renderLog(); }

    openMoves() {
        const list=document.getElementById('move-list'), inst=this.player.team[this.battleState.playerActiveIdx];
        list.innerHTML=inst.moves.map((m,idx)=>{ const mv=MOVES[m.id], dis=m.pp<=0||inst.currentHp<=0;
            return `<div class="move-item ${dis?'disabled':''}" onclick="${dis?'':`game.useMove(${idx})`}"><div class="move-type-dot" style="background:var(--${mv.type==='normal'?'text2':mv.type})"></div><span class="move-name">${mv.name}</span><span class="move-pp">PP ${m.pp}/${m.maxPp}</span><span class="move-power">威力 ${mv.power||'-'}</span></div>`;
        }).join(''); document.getElementById('move-panel').classList.remove('hidden');
    }

    openSwitch() {
        const list=document.getElementById('switch-list');
        list.innerHTML=this.player.team.map((inst,idx)=>{ const b=BIRDS[inst.birdId], act=idx===this.battleState.playerActiveIdx, dead=inst.currentHp<=0;
            return `<div class="switch-item ${act?'active':''} ${dead?'disabled':''}" onclick="${dead||act?'':`game.switchBird(${idx})`}"><span class="sw-sprite">${b.emoji}</span><div class="sw-info"><div class="sw-name">${b.name} Lv.${inst.level}</div><div class="sw-hp">HP ${Math.ceil(inst.currentHp)}/${inst.maxHp}</div></div>${act?'<span style="font-size:11px;color:var(--accent)">战斗中</span>':''}${dead?'<span style="font-size:11px;color:var(--danger)">濒死</span>':''}</div>`;
        }).join(''); document.getElementById('switch-panel').classList.remove('hidden');
    }

    openBagInBattle() {
        const list=document.getElementById('bag-list');
        const u=Object.entries(this.player.bag).filter(([id,q])=>q>0&&['potion','superPotion','revive'].includes(id));
        list.innerHTML=u.length===0?'<p class="empty-hint">没有可用道具</p>':u.map(([id,q])=>{const it=ITEMS[id];return `<div class="bag-item" onclick="game.useItemInBattle('${id}')"><span class="bag-emoji">${it.emoji}</span><div class="bag-info"><div class="bag-name">${it.name}</div><div class="bag-desc">${it.desc}</div></div><span class="bag-qty">×${q}</span></div>`;}).join('');
        document.getElementById('bag-panel').classList.remove('hidden');
    }

    closePanel(id) { document.getElementById(id).classList.add('hidden'); }

    switchBird(idx) {
        if(idx===this.battleState.playerActiveIdx||this.player.team[idx].currentHp<=0) return;
        this.battleState.playerActiveIdx=idx; this.closePanel('switch-panel'); this.renderBattle(); this.addLog(`换上了 ${BIRDS[this.player.team[idx].birdId].name}！`); setTimeout(()=>this.opponentTurn(),1000);
    }

    useMove(idx) {
        const s=this.battleState, pi=this.player.team[s.playerActiveIdx], md=pi.moves[idx];
        if(md.pp<=0){this.toast('PP不足！');return;} this.closePanel('move-panel'); md.pp--;
        const r=this.executeAttack(pi,s.opponent,MOVES[md.id],true); this.addLog(r.message); this.renderBattle();
        if(s.opponent.currentHp<=0){setTimeout(()=>this.onOppFaint(),1200);return;} setTimeout(()=>this.opponentTurn(),1200);
    }

    opponentTurn() {
        const s=this.battleState; if(!s||s.opponent.currentHp<=0) return;
        const mi=Math.floor(Math.random()*s.opponent.moves.length), md=s.opponent.moves[mi], mv=MOVES[md.id];
        if(md.pp<=0){this.executeStruggle(s.opponent,this.player.team[s.playerActiveIdx]);} else {md.pp--; const r=this.executeAttack(s.opponent,this.player.team[s.playerActiveIdx],mv,false); this.addLog(r.message);}
        this.renderBattle(); const pi=this.player.team[s.playerActiveIdx];
        if(pi.currentHp<=0){this.addLog(`${BIRDS[pi.birdId].name} 倒下了！`); setTimeout(()=>this.onPlayerFaint(),1200);}
    }

    executeAttack(atk,def,move,isP) {
        const ab=BIRDS[atk.birdId], db=BIRDS[def.birdId];
        if(move.category==='status') return {message:`${ab.name} 使用了 ${move.name}！`,damage:0};
        const aS=move.category==='physical'?atk.stats.atk:atk.stats.spAtk, dS=move.category==='physical'?def.stats.def:def.stats.spDef;
        let dmg=Math.floor((((atk.level*2/5+2)*move.power*aS/dS)/50)+2);
        const m1=getTypeMultiplier(move.type,db.types[0]), m2=db.types[1]?getTypeMultiplier(move.type,db.types[1]):1, tm=m1*m2;
        dmg=Math.floor(dmg*tm); dmg=Math.max(1,dmg);
        if(Math.random()*100>move.accuracy) return {message:`${ab.name} 的 ${move.name} 没有命中！`,damage:0};
        def.currentHp=Math.max(0,def.currentHp-dmg); let msg=`${ab.name} 使用了 ${move.name}！`;
        if(tm>1)msg+=' 效果拔群！'; else if(tm<1&&tm>0)msg+=' 效果不理想...'; return {message:msg,damage:dmg};
    }

    executeStruggle(atk,def) { def.currentHp=Math.max(0,def.currentHp-Math.max(1,Math.floor(atk.stats.atk/4))); this.addLog(`${BIRDS[atk.birdId].name} 挣扎着攻击了！`); }

    async onOppFaint() {
        const s=this.battleState; const ob=BIRDS[s.opponent.birdId]; this.addLog(`${ob.name} 倒下了！`);
        const pi=this.player.team[s.playerActiveIdx]; pi.exp+=Math.floor(ob.baseStats.hp*s.opponent.level/7); this.checkLevelUp(pi);
        if(s.mode!=='wild'&&s.opponentIdx<s.opponentParty.length-1){s.opponentIdx++;const nx=s.opponentParty[s.opponentIdx];s.opponent=this.createEnemyInstance(nx.birdId,nx.level);const pf=s.mode==='trainer'?s.trainer.name:s.gym.leader;s.opponentName=`${pf} 的 ${BIRDS[nx.birdId].name}`;this.addLog(`对手派出了 ${BIRDS[nx.birdId].name}！`);this.renderBattle();return;}
        setTimeout(()=>this.showBattleResult(true),1500);
    }

    onPlayerFaint() {
        const s=this.battleState; const ni=this.player.team.findIndex((x,i)=>i!==s.playerActiveIdx&&x.currentHp>0);
        if(ni===-1){setTimeout(()=>this.showBattleResult(false),1200);return;} s.playerActiveIdx=ni; this.addLog(`派出了 ${BIRDS[this.player.team[ni].birdId].name}！`); this.renderBattle();
    }

    checkLevelUp(inst) {
        while(inst.exp>=inst.expToNext){inst.exp-=inst.expToNext;inst.level++;const b=BIRDS[inst.birdId],ns=this.calcStats(b.baseStats,inst.level);inst.maxHp=ns.hp;inst.currentHp=Math.min(inst.maxHp,inst.currentHp+(ns.hp-inst.maxHp));inst.stats=ns;inst.expToNext=expForLevel(inst.level+1)-expForLevel(inst.level);this.addLog(`${BIRDS[inst.birdId].name} 升到了 Lv.${inst.level}！`);} this.renderBattle();
    }

    showBattleResult(won) {
        const m=document.getElementById('battle-result-modal'),e=document.getElementById('result-emoji'),t=document.getElementById('result-title'),d=document.getElementById('result-detail');
        if(won){e.textContent='🎉';t.textContent='胜利！';t.style.color='var(--success)';let rt='';if(this.battleState.mode==='gym'){rt=`<br>获得奖励：${this.battleState.gym.reward}`;this.player.winCount++;}else if(this.battleState.mode==='trainer')this.player.winCount++;d.innerHTML=`经过激烈对战，你获得了胜利！${rt}`;} else {e.textContent='💀';t.textContent='败北';t.style.color='var(--danger)';d.textContent='所有鸟灵都倒下了，休息后再来挑战吧！';}
        m.classList.remove('hidden'); this.save();
    }

    endBattle() { document.getElementById('battle-result-modal').classList.add('hidden'); this.battleState=null; this.go('main-menu'); }

    runAway() { if(!this.battleState.canRun){this.toast('道馆战不能逃跑！');return;} if(Math.random()<0.7){this.addLog('成功逃跑了！');setTimeout(()=>{this.battleState=null;this.go('main-menu');},800);}else{this.addLog('逃跑失败！');setTimeout(()=>this.opponentTurn(),1000);} }

    confirmQuitBattle() { if(this.battleState?.mode==='wild'){this.battleState=null;this.go('main-menu');}else{this.toast('正式对战不能中途退出！');} }

    useItemInBattle(id) {
        const it=ITEMS[id]; if(!it||(this.player.bag[id]||0)<=0){this.toast('没有这个道具！');return;}
        if(it.type==='heal'){const s=this.battleState,inst=s.playerActiveIdx!==undefined?this.player.team[s.playerActiveIdx]:null;if(!inst)return;if(inst.currentHp>=inst.maxHp){this.toast('HP 已满！');return;}this.player.bag[id]--;const oh=inst.currentHp;inst.currentHp=Math.min(inst.maxHp,inst.currentHp+it.heal);this.addLog(`使用了伤药，${BIRDS[inst.birdId].name} 恢复了 ${inst.currentHp-oh} HP！`);this.renderBattle();this.closePanel('bag-panel');}
        else if(it.type==='revive'){const di=this.player.team.findIndex(x=>x.currentHp<=0);if(di===-1){this.toast('没有需要复活的鸟灵！');return;}this.player.bag[id]--;this.player.team[di].currentHp=Math.floor(this.player.team[di].maxHp/2);this.addLog(`使用了复活草，${BIRDS[this.player.team[di].birdId].name} 复活了！`);this.renderBattle();this.closePanel('bag-panel');}
    }

    toggleSetting(k) { this.player.settings[k]=!this.player.settings[k]; this.save(); this.refreshSettings(); }
    setAIMode(mode,btn) { this.player.settings.aiMode=mode; birdAI.setMode(mode); this.save(); this.refreshSettings(); }
    _saveName() { const n=document.getElementById('trainer-name-input').value.trim(); if(n){this.player.name=n;this.save();this.toast('名称已保存');this.refreshMainMenu();} }
    clearSave() { if(confirm('确定清除所有存档？不可恢复！')){localStorage.removeItem('birdmon_save');localStorage.removeItem('birdmon_history');localStorage.removeItem('birdmon_starter_chosen');location.reload();} }

    toast(msg) { const c=document.getElementById('toast-container'),el=document.createElement('div'); el.className='toast';el.textContent=msg;c.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},1500); }

    showDexDetail(id) {
        const b=BIRDS[id],cl=this.player.caughtBirds[id]||[],c=document.getElementById('bird-detail-content');
        c.innerHTML=`<div class="bd-emoji">${b.emoji}</div><h3>${b.name} <span style="font-size:12px;color:var(--text2)">No.${String(b.no).padStart(3,'0')}</span></h3><div style="text-align:center;margin-bottom:10px">${b.types.map(t=>`<span class="bird-type type-${t}">${t}</span>`).join('')} <span class="rarity-tag rarity-${b.rarity}">${b.rarity}</span></div><div style="font-size:12px;color:var(--text2);margin-bottom:10px">${b.desc}</div><div class="bd-row"><span>捕获数量</span><span>${cl.length}</span></div>${cl.slice(0,3).map(x=>`<div class="bd-row"><span>Lv.${x.level}</span><span>HP ${x.currentHp}/${x.maxHp}</span></div>`).join('')}`;
        document.getElementById('bird-detail-modal').classList.remove('hidden');
    }
}

let game;
document.addEventListener('DOMContentLoaded', ()=>{ game = new Game(); });

