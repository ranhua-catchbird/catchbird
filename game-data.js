// ===== 鸟灵大师 v1.2 - 游戏数据 =====

// ---------- 属性克制表 ----------
const TYPE_CHART = {
  fire:    { grass: 2, water: 0.5, ice: 2, bug: 2, steel: 2, fire: 0.5, dragon: 0.5 },
  water:   { fire: 2, grass: 0.5, ground: 2, rock: 2, water: 0.5, dragon: 0.5 },
  grass:   { water: 2, fire: 0.5, flying: 0.5, poison: 0.5, ground: 2, rock: 2, bug: 2, dragon: 0.5, steel: 0.5 },
  electric:{ water: 2, flying: 2, ground: 0.5, electric: 0.5, dragon: 0.5 },
  flying:  { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  normal:  { rock: 0.5, ghost: 0, steel: 0.5 },
  ice:     { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:     { grass: 2, psychic: 2, dark: 2, fire: 0.5, flying: 0.5, fighting: 0.5, ghost: 0.5, steel: 0.5 },
};

function getTypeMultiplier(atkType, defType) {
  if (!TYPE_CHART[atkType]) return 1;
  return TYPE_CHART[atkType][defType] || 1;
}

// ---------- 技能定义 ----------
const MOVES = {
  tackle:       { name: "撞击",     type: "normal",   category: "physical", power: 40,  accuracy: 100, pp: 35 },
  quickAttack:  { name: "电光一闪", type: "normal",   category: "physical", power: 40,  accuracy: 100, pp: 30 },
  wingAttack:   { name: "翼击",     type: "flying",   category: "physical", power: 60,  accuracy: 100, pp: 35 },
  peck:         { name: "啄",       type: "flying",   category: "physical", power: 35,  accuracy: 100, pp: 35 },
  ember:        { name: "火花",     type: "fire",     category: "special",  power: 40,  accuracy: 100, pp: 25 },
  flameCharge:  { name: "火焰冲锋", type: "fire",     category: "physical", power: 50,  accuracy: 100, pp: 20 },
  waterGun:     { name: "水枪",     type: "water",    category: "special",  power: 40,  accuracy: 100, pp: 25 },
  bubble:       { name: "泡沫",     type: "water",    category: "special",  power: 40,  accuracy: 100, pp: 30 },
  razorLeaf:    { name: "飞叶快刀", type: "grass",    category: "physical", power: 55,  accuracy: 95,  pp: 25 },
  vineWhip:     { name: "藤鞭",     type: "grass",    category: "physical", power: 45,  accuracy: 100, pp: 25 },
  thunderShock: { name: "电击",     type: "electric", category: "special",  power: 40,  accuracy: 100, pp: 30 },
  spark:        { name: "火花电击", type: "electric", category: "physical", power: 65,  accuracy: 100, pp: 20 },
  icyWind:      { name: "冰冻之风", type: "ice",      category: "special",  power: 55,  accuracy: 95,  pp: 15 },
  airSlash:     { name: "空气斩",   type: "flying",   category: "special",  power: 75,  accuracy: 95,  pp: 15 },
  drillPeck:    { name: "钻孔啄",   type: "flying",   category: "physical", power: 80,  accuracy: 100, pp: 20 },
  braveBird:    { name: "勇鸟猛攻", type: "flying",   category: "physical", power: 120, accuracy: 100, pp: 15 },
  flamethrower: { name: "喷射火焰", type: "fire",     category: "special",  power: 90,  accuracy: 100, pp: 15 },
  hydroPump:    { name: "水炮",     type: "water",    category: "special",  power: 110, accuracy: 80,  pp: 5 },
  solarBeam:    { name: "日光束",   type: "grass",    category: "special",  power: 120, accuracy: 100, pp: 10 },
  psychic:      { name: "精神强念", type: "psychic",  category: "special",  power: 90,  accuracy: 100, pp: 10 },
  struggle:     { name: "挣扎",     type: "normal",   category: "physical", power: 50,  accuracy: 100, pp: 1 },
};

// ---------- 鸟灵定义 ----------
const BIRDS = {
  sparrow: {
    id: "sparrow", no: 1, name: "麻小雀", emoji: "🐦", types: ["normal"],
    rarity: "common", baseStats: { hp: 45, atk: 49, def: 49, spAtk: 41, spDef: 41, speed: 56 },
    moves: ["tackle", "quickAttack", "wingAttack"],
    desc: "最常见的小鸟，胆大活泼，速度很快。"
  },
  pigeon: {
    id: "pigeon", no: 2, name: "灰鸽", emoji: "🕊️", types: ["normal", "flying"],
    rarity: "common", baseStats: { hp: 60, atk: 45, def: 50, spAtk: 42, spDef: 48, speed: 52 },
    moves: ["tackle", "wingAttack", "airSlash"],
    desc: "城市里随处可见，均衡稳定，耐力出众。"
  },
  bulbul: {
    id: "bulbul", no: 3, name: "白头鹎", emoji: "🐤", types: ["grass", "flying"],
    rarity: "common", baseStats: { hp: 52, atk: 47, def: 46, spAtk: 55, spDef: 50, speed: 48 },
    moves: ["vineWhip", "wingAttack", "razorLeaf"],
    desc: "鸣声优美的林间鸟，擅长草系技能。"
  },
  magpie: {
    id: "magpie", no: 4, name: "喜鹊", emoji: "🐦⬛", types: ["normal", "flying"],
    rarity: "uncommon", baseStats: { hp: 58, atk: 62, def: 54, spAtk: 48, spDef: 52, speed: 65 },
    moves: ["peck", "wingAttack", "quickAttack"],
    desc: "聪明机警，叫声悦耳，被认为能带来好运。"
  },
  parrot: {
    id: "parrot", no: 5, name: "鹦鹉", emoji: "🦜", types: ["grass", "psychic"],
    rarity: "uncommon", baseStats: { hp: 65, atk: 55, def: 52, spAtk: 72, spDef: 60, speed: 58 },
    moves: ["razorLeaf", "psychic", "vineWhip"],
    desc: "色彩艳丽，能模仿声音，拥有心灵感应般的能力。"
  },
  myna: {
    id: "myna", no: 6, name: "八哥", emoji: "🐦", types: ["normal", "flying"],
    rarity: "uncommon", baseStats: { hp: 55, atk: 68, def: 48, spAtk: 50, spDef: 48, speed: 72 },
    moves: ["tackle", "wingAttack", "quickAttack"],
    desc: "善于鸣叫和飞行，性格大胆不怕人。"
  },
  kingfisher: {
    id: "kingfisher", no: 7, name: "翠鸟", emoji: "🪶", types: ["water", "flying"],
    rarity: "rare", baseStats: { hp: 50, atk: 70, def: 50, spAtk: 65, spDef: 58, speed: 85 },
    moves: ["waterGun", "wingAttack", "bubble"],
    desc: "羽毛如宝石般绚丽，潜水捕鱼的高手。"
  },
  owl: {
    id: "owl", no: 8, name: "猫头鹰", emoji: "🦉", types: ["flying", "psychic"],
    rarity: "rare", baseStats: { hp: 65, atk: 52, def: 58, spAtk: 78, spDef: 72, speed: 45 },
    moves: ["wingAttack", "psychic", "airSlash"],
    desc: "夜间猎手，拥有极强的洞察力和精神力量。"
  },
  woodpecker: {
    id: "woodpecker", no: 9, name: "啄木鸟", emoji: "🐦", types: ["flying", "bug"],
    rarity: "rare", baseStats: { hp: 52, atk: 82, def: 55, spAtk: 42, spDef: 48, speed: 68 },
    moves: ["peck", "drillPeck", "wingAttack"],
    desc: "敲击树干发出鼓点般的声响，喙如钻头般坚硬。"
  },
  swan: {
    id: "swan", no: 10, name: "天鹅", emoji: "🦢", types: ["water", "flying"],
    rarity: "rare", baseStats: { hp: 80, atk: 52, def: 68, spAtk: 62, spDef: 72, speed: 45 },
    moves: ["waterGun", "wingAttack", "icyWind"],
    desc: "优雅的水禽，翅膀扇动可掀起寒风。"
  },
  falcon: {
    id: "falcon", no: 11, name: "游隼", emoji: "🦅", types: ["flying"],
    rarity: "epic", baseStats: { hp: 68, atk: 88, def: 52, spAtk: 45, spDef: 55, speed: 125 },
    moves: ["wingAttack", "drillPeck", "braveBird"],
    desc: "俯冲速度极快的猛禽，天空中的闪电。"
  },
  phoenixFinch: {
    id: "phoenixFinch", no: 12, name: "凤凰雀", emoji: "🔥", types: ["fire", "flying"],
    rarity: "epic", baseStats: { hp: 72, atk: 82, def: 58, spAtk: 92, spDef: 65, speed: 88 },
    moves: ["ember", "flameCharge", "braveBird"],
    desc: "传说中浴火重生的神鸟后裔，浑身燃烧着不灭的火焰。"
  },
  thunderbird: {
    id: "thunderbird", no: 13, name: "雷霆雕", emoji: "⚡", types: ["electric", "flying"],
    rarity: "epic", baseStats: { hp: 70, atk: 78, def: 62, spAtk: 95, spDef: 70, speed: 95 },
    moves: ["thunderShock", "spark", "airSlash"],
    desc: "展翅时雷声轰鸣，翼尖闪烁着高压电弧。"
  },
  crane: {
    id: "crane", no: 14, name: "仙鹤", emoji: "🦩", types: ["water", "flying"],
    rarity: "epic", baseStats: { hp: 75, atk: 60, def: 72, spAtk: 85, spDef: 80, speed: 65 },
    moves: ["waterGun", "icyWind", "airSlash"],
    desc: "长寿的象征，舞姿优美如仙，能操控冰雪。"
  },
  roc: {
    id: "roc", no: 15, name: "大鹏", emoji: "🌪️", types: ["flying"],
    rarity: "legend", baseStats: { hp: 95, atk: 105, def: 78, spAtk: 72, spDef: 80, speed: 115 },
    moves: ["braveBird", "drillPeck", "airSlash"],
    desc: "鲲鹏之化，翼若垂天之云，一飞冲天九万里。"
  },
  garuda: {
    id: "garuda", no: 16, name: "迦楼罗", emoji: "👁️", types: ["fire", "psychic"],
    rarity: "legend", baseStats: { hp: 88, atk: 98, def: 72, spAtk: 108, spDef: 85, speed: 102 },
    moves: ["flamethrower", "psychic", "airSlash"],
    desc: "佛教护法神鸟，金翅展开遮蔽烈日，目光洞穿一切虚妄。"
  },
};

// ---------- 训练师 ----------
const TRAINERS = [
  {
    id: "t1", name: "新手小明", emoji: "👦",
    team: [
      { birdId: "sparrow", level: 3 },
      { birdId: "bulbul", level: 4 },
    ]
  },
  {
    id: "t2", name: "观鸟达人", emoji: "🧓",
    team: [
      { birdId: "magpie", level: 6 },
      { birdId: "parrot", level: 6 },
      { birdId: "myna", level: 5 },
    ]
  },
  {
    id: "t3", name: "湿地守护者", emoji: "🧔",
    team: [
      { birdId: "kingfisher", level: 8 },
      { birdId: "swan", level: 9 },
    ]
  },
];

// ---------- 道馆 ----------
const GYMS = [
  {
    id: "g1", leader: "烈焰馆主", leaderEmoji: "🔥", type: "fire",
    team: [
      { birdId: "phoenixFinch", level: 12 },
      { birdId: "falcon", level: 13 },
    ],
    reward: "烈焰之羽 ×1"
  },
  {
    id: "g2", leader: "惊雷馆主", leaderEmoji: "⚡", type: "electric",
    team: [
      { birdId: "thunderbird", level: 15 },
      { birdId: "falcon", level: 14 },
    ],
    reward: "雷电徽章 ×1"
  },
  {
    id: "g3", leader: "碧波馆主", leaderEmoji: "💧", type: "water",
    team: [
      { birdId: "swan", level: 16 },
      { birdId: "kingfisher", level: 17 },
      { birdId: "crane", level: 18 },
    ],
    reward: "碧波鳞片 ×1"
  },
];

// ---------- 道具 ----------
const ITEMS = {
  pokeball:   { name: "鸟灵球",   emoji: "🔴", type: "ball", multiplier: 1,   desc: "标准的捕捉用球" },
  greatball:  { name: "超级球",   emoji: "🔵", type: "ball", multiplier: 1.5, desc: "性能更好的捕捉球" },
  ultraball:  { name: "高级球",   emoji: "🟡", type: "ball", multiplier: 2,   desc: "能捕捉更强鸟灵" },
  masterball: { name: "大师球",   emoji: "🟣", type: "ball", multiplier: 255, desc: "必定捕捉成功" },
  potion:     { name: "伤药",     emoji: "🧪", type: "heal", heal: 20,         desc: "恢复 20 HP" },
  superPotion:{ name: "好伤药",   emoji: "💊", type: "heal", heal: 50,         desc: "恢复 50 HP" },
  revive:     { name: "复活草",   emoji: "🌿", type: "revive",                 desc: "使濒死鸟灵恢复一半 HP" },
  lure:       { name: "诱饵模块", emoji: "✨", type: "lure",                   desc: "下次捕捉概率翻倍" },
};

function getDefaultBag() {
  return {
    pokeball: 50,
    greatball: 10,
    ultraball: 3,
    masterball: 1,
    potion: 5,
    superPotion: 2,
    revive: 2,
    lure: 1,
  };
}

// ---------- 经验公式 ----------
function expForLevel(level) {
  return Math.floor(0.8 * Math.pow(level, 3));
}
