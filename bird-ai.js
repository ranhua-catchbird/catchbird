// ===== 鸟灵大师 v1.2 - AI 识别模块 =====

class BirdAI {
  constructor() {
    this.mode = 'simulate';
    this.endpoint = '';
    this.apiKey = '';
  }

  setMode(mode, endpoint, apiKey) {
    this.mode = mode || 'simulate';
    this.endpoint = endpoint || '';
    this.apiKey = apiKey || '';
  }

  /**
   * 识别图片 → 返回 { birdId, birdName, confidence, rarity, timestamp }
   */
  async identify(file) {
    if (this.mode === 'real' && this.endpoint) {
      return await this.realIdentify(file);
    }
    return this.simulateIdentify();
  }

  // ---------- 模拟识别 ----------
  simulateIdentify() {
    const birdIds = Object.keys(BIRDS);
    const weights = birdIds.map(id => {
      const r = BIRDS[id].rarity;
      return { common: 10, uncommon: 5, rare: 2, epic: 0.5, legend: 0.1 }[r] || 1;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < birdIds.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        const bird = BIRDS[birdIds[i]];
        return {
          birdId: bird.id,
          birdName: bird.name,
          confidence: 0.7 + Math.random() * 0.29,
          rarity: bird.rarity,
          timestamp: Date.now(),
        };
      }
    }
    // fallback
    const fb = BIRDS['sparrow'];
    return {
      birdId: fb.id,
      birdName: fb.name,
      confidence: 0.85,
      rarity: fb.rarity,
      timestamp: Date.now(),
    };
  }

  // ---------- 真实 API（预留） ----------
  async realIdentify(file) {
    try {
      const base64 = await this.fileToBase64(file);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      const birdId = data.birdId || 'sparrow';
      const bird = BIRDS[birdId] || BIRDS['sparrow'];
      return {
        birdId: bird.id,
        birdName: bird.name,
        confidence: data.confidence || 0.85,
        rarity: bird.rarity,
        timestamp: Date.now(),
      };
    } catch (e) {
      console.error('Real AI failed, falling back to simulate:', e);
      return this.simulateIdentify();
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- 捕捉率计算 ----------
  static calculateCatchRate(rarity, confidence, ballMultiplier, lureActive) {
    const baseRate = {
      common: 0.55,
      uncommon: 0.35,
      rare: 0.20,
      epic: 0.10,
      legend: 0.03,
    }[rarity] || 0.3;

    let rate = baseRate * ballMultiplier * (confidence / 0.85);
    if (lureActive) rate *= 2;
    return Math.min(rate, 0.999);
  }
}

// 全局实例
const birdAI = new BirdAI();
