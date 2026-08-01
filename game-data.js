// ========================================
// 鸟灵大师 - 游戏数据
// 20只鸟灵 + 50+技能 + 属性克制 + 训练师/道馆
// ========================================

// ---------- 属性克制表 ----------
// multiplier: 攻击方属性 → 防御方属性 → 倍率
const TYPE_CHART = {
    fire:     { grass: 2, water: 0.5, fire: 0.5, electric: 1, flying: 1 },
    water:    { fire: 2, grass: 0.5, water: 0.5, electric: 0.5, flying: 1 },
    grass:    { water: 2, fire: 0.5, grass: 0.5, electric: 1, flying: 0.5 },
    electric: { water: 2, flying: 2, fire: 1, grass: 0.5, electric: 0.5 },
    flying:   { grass: 2, electric: 0.5, fire: 1, water: 1, flying: 1 },
};

function getTypeMultiplier(atkType, defType) {
    if (!TYPE_CHART[atkType] || !TYPE_CHART[atkType][defType]) return 1;
    return TYPE_CHART[atkType][defType];
}

// ---------- 技能池 ----------
const MOVES = {
    // ===== 火系 =====
    ember:          { name: '火花',       type: 'fire',     power: 40,  pp: 25, accuracy: 100, category: 'special' },
    flamethrower:   { name: '喷射火焰',   type: 'fire',     power: 90,  pp: 15, accuracy: 100, category: 'special' },
    fireSpin:       { name: '火焰漩涡',   type: 'fire',     power: 35,  pp: 15, accuracy: 85,  category: 'special', effect: 'trap' },
    heatWave:       { name: '热风',       type: 'fire',     power: 95,  pp: 10, accuracy: 90,  category: 'special' },

    // ===== 水系 =====
    waterGun:       { name: '水枪',       type: 'water',    power: 40,  pp: 25, accuracy: 100, category: 'special' },
    bubbleBeam:     { name: '泡沫光线',   type: 'water',    power: 65,  pp: 20, accuracy: 100, category: 'special', effect: 'speed-down' },
    hydroPump:      { name: '水炮',       type: 'water',    power: 110, pp: 5,  accuracy: 80,  category: 'special' },
    dive:           { name: '潜水',       type: 'water',    power: 80,  pp: 10, accuracy: 100, category: 'physical' },

    // ===== 草系 =====
    vineWhip:       { name: '藤鞭',       type: 'grass',    power: 45,  pp: 25, accuracy: 100, category: 'physical' },
    razorLeaf:      { name: '飞叶快刀',   type: 'grass',    power: 55,  pp: 25, accuracy: 95,  category: 'physical' },
    solarBeam:      { name: '日光束',     type: 'grass',    power: 120, pp: 10, accuracy: 100, category: 'special' },
    leafStorm:      { name: '叶暴风',     type: 'grass',    power: 130, pp: 5,  accuracy: 90,  category: 'special' },

    // ===== 电系 =====
    thunderShock:   { name: '电击',       type: 'electric', power: 40,  pp: 30, accuracy: 100, category: 'special' },
    thunderbolt:    { name: '十万伏特',   type: 'electric', power: 90,  pp: 15, accuracy: 100, category: 'special' },
    thunder:        { name: '打雷',       type: 'electric', power: 110, pp: 10, accuracy: 70,  category: 'special' },
    chargeBeam:     { name: '充电光束',   type: 'electric', power: 50,  pp: 10, accuracy: 90,  category: 'special', effect: 'self-spatk-up' },

    // ===== 飞行系 =====
    gust:           { name: '起风',       type: 'flying',   power: 40,  pp: 35, accuracy: 100, category: 'special' },
    wingAttack:     { name: '翼击',       type: 'flying',   power: 60,  pp: 35, accuracy: 100, category: 'physical' },
    aerialAce:      { name: '燕返',       type: 'flying',   power: 60,  pp: 20, accuracy: 100, category: 'physical' },
    hurricane:      { name: '暴风',       type: 'flying',   power: 110, pp: 10, accuracy: 70,  category: 'special' },

    // ===== 物理通用 =====
    peck:           { name: '啄',         type: 'flying',   power: 35,  pp: 35, accuracy: 100, category: 'physical' },
    tackle:         { name: '撞击',       type: 'normal',   power: 40,  pp: 35, accuracy: 100, category: 'physical' },
    quickAttack:    { name: '电光一闪',   type: 'normal',   power: 40,  pp: 30, accuracy: 100, category: 'physical' },
    drillPeck:      { name: '钻孔啄',     type: 'flying',   power: 80,  pp: 20, accuracy: 100, category: 'physical' },

    // ===== 变化技能 =====
    growl:          { name: '叫声',       type: 'normal',   power: 0,   pp: 40, accuracy: 100, category: 'status', effect: 'atk-down' },
    sandAttack:     { name: '沙暴',       type: 'normal',   power: 0,   pp: 15, accuracy: 100, category: 'status', effect: 'acc-down' },
    agility:        { name: '高速移动',   type: 'psychic',  power: 0,   pp: 30, accuracy: 100, category: 'status', effect: 'self-speed-up' },
};

// ---------- 鸟灵定义 ----------
// stats: hp, atk, def, spAtk, spDef, speed
const BIRDS = {
    // ===== 常见 (Common) =====
    sparrow: {
        id: 'sparrow', no: 1, name: '家麻雀', emoji: '🐦', types: ['flying'], rarity: 'common',
        baseStats: { hp: 40, atk: 45, def: 40, spAtk: 35, spDef: 35, speed: 56 },
        moves: ['peck', 'quickAttack', 'wingAttack', 'growl'],
        desc: '最常见的城市小鸟，胆子大不怕人。'
    },
    pigeon: {
        id: 'pigeon', no: 2, name: '原鸽', emoji: '🕊️', types: ['flying'], rarity: 'common',
        baseStats: { hp: 50, atk: 42, def: 45, spAtk: 38, spDef: 42, speed: 48 },
        moves: ['tackle', 'wingAttack', 'gust', 'sandAttack'],
        desc: '广场上的常客，适应力极强。'
    },
    magpie: {
        id: 'magpie', no: 3, name: '喜鹊', emoji: '🐦⬛', types: ['flying'], rarity: 'common',
        baseStats: { hp: 45, atk: 50, def: 43, spAtk: 40, spDef: 40, speed: 55 },
        moves: ['peck', 'drillPeck', 'wingAttack', 'agility'],
        desc: '黑白分明，聪明且领地意识强。'
    },
    crow: {
        id: 'crow', no: 4, name: '乌鸦', emoji: '🐦⬛', types: ['flying'], rarity: 'common',
        baseStats: { hp: 48, atk: 52, def: 42, spAtk: 42, spDef: 38, speed: 50 },
        moves: ['peck', 'drillPeck', 'tackle', 'sandAttack'],
        desc: '全身乌黑，智商极高，会使用工具。'
    },

    // ===== 少见 (Uncommon) =====
    kingfisher: {
        id: 'kingfisher', no: 5, name: '翠鸟', emoji: '🟦🐦', types: ['water', 'flying'], rarity: 'uncommon',
        baseStats: { hp: 40, atk: 55, def: 38, spAtk: 65, spDef: 48, speed: 72 },
        moves: ['dive', 'waterGun', 'aerialAce', 'agility'],
        desc: '羽毛如宝石般绚丽，捕鱼高手。'
    },
    woodpecker: {
        id: 'woodpecker', no: 6, name: '啄木鸟', emoji: '🐦🔨', types: ['flying'], rarity: 'uncommon',
        baseStats: { hp: 45, atk: 65, def: 45, spAtk: 30, spDef: 40, speed: 58 },
        moves: ['drillPeck', 'peck', 'tackle', 'growl'],
        desc: '敲击树干寻找昆虫，头部有天然减震。'
    },
    heron: {
        id: 'heron', no: 7, name: '苍鹭', emoji: '🦩', types: ['water', 'flying'], rarity: 'uncommon',
        baseStats: { hp: 62, atk: 52, def: 55, spAtk: 58, spDef: 58, speed: 42 },
        moves: ['waterGun', 'bubbleBeam', 'vineWhip', 'gust'],
        desc: '长腿涉禽，静立水中等待猎物。'
    },
    hoopoe: {
        id: 'hoopoe', no: 8, name: '戴胜', emoji: '🎨🐦', types: ['flying'], rarity: 'uncommon',
        baseStats: { hp: 45, atk: 48, def: 50, spAtk: 55, spDef: 52, speed: 62 },
        moves: ['gust', 'wingAttack', 'chargeBeam', 'sandAttack'],
        desc: '头顶扇形羽冠，像一把打开的折扇。'
    },
    bulbul: {
        id: 'bulbul', no: 9, name: '白头鹎', emoji: '⚪🐦', types: ['flying'], rarity: 'uncommon',
        baseStats: { hp: 48, atk: 46, def: 47, spAtk: 50, spDef: 48, speed: 60 },
        moves: ['peck', 'vineWhip', 'wingAttack', 'growl'],
        desc: '头顶白色，鸣声婉转多变。'
    },

    // ===== 稀有 (Rare) =====
    parrot: {
        id: 'parrot', no: 10, name: '鹦鹉', emoji: '🦜', types: ['flying'], rarity: 'rare',
        baseStats: { hp: 55, atk: 55, def: 48, spAtk: 68, spDef: 55, speed: 65 },
        moves: ['heatWave', 'wingAttack', 'thunderbolt', 'agility'],
        desc: '色彩斑斓，能模仿人类说话。'
    },
    owl: {
        id: 'owl', no: 11, name: '猫头鹰', emoji: '🦉', types: ['flying'], rarity: 'rare',
        baseStats: { hp: 58, atk: 52, def: 52, spAtk: 62, spDef: 62, speed: 45 },
        moves: ['wingAttack', 'gust', 'solarBeam', 'agility'],
        desc: '夜行猛禽，转动头部可达270度。'
    },
    eagle: {
        id: 'eagle', no: 12, name: '金雕', emoji: '🦅', types: ['flying'], rarity: 'rare',
        baseStats: { hp: 65, atk: 78, def: 55, spAtk: 45, spDef: 50, speed: 70 },
        moves: ['drillPeck', 'wingAttack', 'aerialAce', 'agility'],
        desc: '天空霸主，视力极佳，俯冲时速超200km。'
    },
    falcon: {
        id: 'falcon', no: 13, name: '游隼', emoji: '⚡🦅', types: ['flying'], rarity: 'rare',
        baseStats: { hp: 55, atk: 72, def: 45, spAtk: 42, spDef: 45, speed: 120 },
        moves: ['drillPeck', 'quickAttack', 'aerialAce', 'agility'],
        desc: '俯冲速度世界冠军，可达389km/h。'
    },
    flamingo: {
        id: 'flamingo', no: 14, name: '火烈鸟', emoji: '🌸🦩', types: ['fire', 'flying'], rarity: 'rare',
        baseStats: { hp: 62, atk: 48, def: 55, spAtk: 75, spDef: 65, speed: 52 },
        moves: ['ember', 'flamethrower', 'wingAttack', 'heatWave'],
        desc: '粉色羽毛来自食物中的虾青素。'
    },
    peacock: {
        id: 'peacock', no: 15, name: '孔雀', emoji: '🌈🦚', types: ['grass', 'flying'], rarity: 'rare',
        baseStats: { hp: 60, atk: 52, def: 58, spAtk: 70, spDef: 62, speed: 48 },
        moves: ['leafStorm', 'razorLeaf', 'wingAttack', 'sandAttack'],
        desc: '雄鸟尾屏华丽，开屏求偶震撼人心。'
    },

    // ===== 史诗 (Epic) =====
    penguin: {
        id: 'penguin', no: 16, name: '企鹅', emoji: '🐧', types: ['water', 'ice'], rarity: 'epic',
        baseStats: { hp: 68, atk: 45, def: 65, spAtk: 58, spDef: 70, speed: 38 },
        moves: ['hydroPump', 'dive', 'iceBeam', 'sandAttack'],
        desc: '南极绅士，水下游泳速度极快。'
    },
    phoenix: {
        id: 'phoenix', no: 17, name: '凤凰', emoji: '🔥🦅', types: ['fire', 'flying'], rarity: 'epic',
        baseStats: { hp: 75, atk: 72, def: 60, spAtk: 85, spDef: 70, speed: 80 },
        moves: ['flameThrower', 'fireSpin', 'aerialAce', 'agility'],
        desc: '传说中的不死鸟，浴火重生。'
    },
    thunderbird: {
        id: 'thunderbird', no: 18, name: '雷鸟', emoji: '⚡🦅', types: ['electric', 'flying'], rarity: 'epic',
        baseStats: { hp: 65, atk: 65, def: 55, spAtk: 90, spDef: 65, speed: 85 },
        moves: ['thunderbolt', 'thunder', 'chargeBeam', 'aerialAce'],
        desc: '神话中的雷电之鸟，振翅生电。'
    },

    // ===== 传说 (Legendary) =====
    quetzal: {
        id: 'quetzal', no: 19, name: '凤尾绿咬鹃', emoji: '💎🦜', types: ['grass', 'flying'], rarity: 'legend',
        baseStats: { hp: 70, atk: 68, def: 62, spAtk: 88, spDef: 78, speed: 82 },
        moves: ['solarBeam', 'leafStorm', 'hurricane', 'agility'],
        desc: '中美洲神鸟，羽毛曾被视为货币。'
    },
    roc: {
        id: 'roc', no: 20, name: '大鹏', emoji: '🌪️🦅', types: ['flying'], rarity: 'legend',
        baseStats: { hp: 85, atk: 95, def: 70, spAtk: 65, spDef: 65, speed: 95 },
        moves: ['hurricane', 'drillPeck', 'aerialAce', 'agility'],
        desc: '阿拉伯神话中的巨鸟，翼展遮天蔽日。'
    },
};

// ---------- 经验值曲线（Medium Fast） ----------
function expForLevel(level) {
    return Math.floor(Math.pow(level, 3));
}

// ---------- 对战训练师 ----------
const TRAINERS = [
    {
        name: '新手观鸟人', emoji: '🎓',
        team: [
            { id: 'sparrow', level: 3 },
            { id: 'pigeon', level: 4 },
        ]
    },
    {
        name: '湿地向导', emoji: '🌾',
        team: [
            { id: 'heron', level: 6 },
            { id: 'kingfisher', level: 7 },
            { id: 'bulbul', level: 6 },
        ]
    },
    {
        name: '森林巡护员', emoji: '🌲',
        team: [
            { id: 'woodpecker', level: 8 },
            { id: 'owl', level: 9 },
            { id: 'magpie', level: 8 },
        ]
    },
    {
        name: '猛禽驯养师', emoji: '🦅',
        team: [
            { id: 'falcon', level: 11 },
            { id: 'eagle', level: 12 },
            { id: 'owl', level: 11 },
        ]
    },
];

// ---------- 道馆 ----------
const GYMS = [
    {
        name: '公园道馆', emoji: '🌳',
        leader: '园丁老李', leaderEmoji: '👴',
        type: 'flying',
        team: [
            { id: 'sparrow', level: 5 },
            { id: 'pigeon', level: 6 },
            { id: 'magpie', level: 7 },
        ],
        reward: '初级鸟灵球 x3'
    },
    {
        name: '湿地道馆', emoji: '🌊',
        leader: '渔夫阿海', leaderEmoji: '🎣',
        type: 'water',
        team: [
            { id: 'kingfisher', level: 10 },
            { id: 'heron', level: 12 },
            { id: 'penguin', level: 11 },
        ],
        reward: '高级鸟灵球 x2'
    },
    {
        name: '密林道馆', emoji: '🌴',
        leader: '植物学家苏', leaderEmoji: '👩🔬',
        type: 'grass',
        team: [
            { id: 'bulbul', level: 14 },
            { id: 'peacock', level: 16 },
            { id: 'quetzal', level: 15 },
        ],
        reward: '大师鸟灵球 x1'
    },
    {
        name: '火山道馆', emoji: '🌋',
        leader: '火焰使者', leaderEmoji: '🔥',
        type: 'fire',
        team: [
            { id: 'flamingo', level: 18 },
            { id: 'phoenix', level: 20 },
            { id: 'parrot', level: 19 },
        ],
        reward: '传说诱饵 x1'
    },
];

// ---------- 道具 ----------
const ITEMS = {
    pokeball:      { name: '鸟灵球',     emoji: '🔴', desc: '基础捕捉球，成功率一般。', type: 'ball', multiplier: 1 },
    greatball:     { name: '超级球',     emoji: '🔵', desc: '进阶捕捉球，成功率较高。', type: 'ball', multiplier: 1.5 },
    ultraball:     { name: '高级球',     emoji: '🟡', desc: '高级捕捉球，稀有鸟必备。', type: 'ball', multiplier: 2 },
    masterball:    { name: '大师球',     emoji: '🟣', desc: '必定捕捉成功。', type: 'ball', multiplier: 999 },
    potion:        { name: '伤药',       emoji: '🧪', desc: '恢复一只鸟灵 50 HP。', type: 'heal', heal: 50 },
    superPotion:   { name: '好伤药',     emoji: '💊', desc: '恢复一只鸟灵 120 HP。', type: 'heal', heal: 120 },
    revive:        { name: '复活草',     emoji: '🌿', desc: '使濒死鸟灵恢复一半 HP。', type: 'revive' },
    lure:          { name: '闪光诱饵',   emoji: '✨', desc: '下次捕捉稀有度+1级。', type: 'lure' },
};

// ---------- 初始背包 ----------
function getDefaultBag() {
    return {
        pokeball: 10,
        greatball: 3,
        potion: 3,
        superPotion: 1,
    };
}
