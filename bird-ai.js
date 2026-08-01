// ========================================
// 鸟灵大师 - AI 识鸟模块
// 模拟模式（开箱即用）+ 真实 API 预留
// ========================================

class BirdAI {
    constructor() {
        this.mode = 'simulate'; // 'simulate' | 'real'
        this.apiEndpoint = '';
        this.apiKey = '';
    }

    setMode(mode, endpoint = '', key = '') {
        this.mode = mode;
        this.apiEndpoint = endpoint;
        this.apiKey = key;
    }

    /**
     * 识别图片中的鸟
     * @param {File|Blob} imageFile - 图片文件
     * @returns {Promise<Object>} 识别结果
     */
    async identify(imageFile) {
        if (this.mode === 'real' && this.apiEndpoint) {
            return await this.identifyReal(imageFile);
        }
        return await this.identifySimulated(imageFile);
    }

    // ========== 模拟模式 ==========
    async identifySimulated(imageFile) {
        return new Promise((resolve) => {
            // 模拟网络延迟 1.5-2.5 秒
            const delay = 1500 + Math.random() * 1000;
            setTimeout(() => {
                resolve(this.generateSimulatedResult(imageFile));
            }, delay);
        });
    }

    generateSimulatedResult(imageFile) {
        const fileName = (imageFile.name || '').toLowerCase();
        const size = imageFile.size || 0;

        // ---- 1. 尝试从文件名推断鸟种 ----
        let matchedBirdId = null;
        for (const [id, bird] of Object.entries(BIRDS)) {
            const keywords = [id, bird.name.toLowerCase(), ...bird.types];
            for (const kw of keywords) {
                if (fileName.includes(kw.toLowerCase())) {
                    matchedBirdId = id;
                    break;
                }
            }
            if (matchedBirdId) break;
        }

        // ---- 2. 伪视觉特征分析（基于文件大小哈希） ----
        const visualFeatures = this.extractVisualFeatures(size);

        // ---- 3. 如果文件名没匹配到，用视觉特征选鸟 ----
        if (!matchedBirdId) {
            matchedBirdId = this.selectByVisualFeatures(visualFeatures);
        }

        const bird = BIRDS[matchedBirdId];

        // ---- 4. 计算置信度 ----
        let confidence = 0.65 + Math.random() * 0.3; // 基础 65-95%
        if (matchedBirdId && fileName.length > 3) {
            confidence = Math.min(confidence + 0.1, 0.99);
        }

        // ---- 5. 生成识别结果 ----
        const result = {
            success: true,
            birdId: matchedBirdId,
            birdName: bird.name,
            types: [...bird.types],
            rarity: bird.rarity,
            confidence: parseFloat(confidence.toFixed(2)),
            visualFeatures: visualFeatures,
            suggestions: this.generateSuggestions(matchedBirdId),
            timestamp: Date.now(),
        };

        return result;
    }

    extractVisualFeatures(fileSize) {
        // 用文件大小作为伪随机种子，模拟视觉分析结果
        const seed = fileSize % 10000;
        return {
            dominantColor: this.getDominantColor(seed),
            hasLongBeak: seed % 7 === 0 || seed % 7 === 3,
            hasCrest: seed % 5 === 0,
            hasLongTail: seed % 6 === 0 || seed % 6 === 4,
            hasBrightColors: seed % 4 === 0 || seed % 4 === 1,
            bodyShape: seed % 3 === 0 ? 'compact' : seed % 3 === 1 ? 'elongated' : 'rounded',
            wingPattern: seed % 4 === 0 ? 'striped' : seed % 4 === 1 ? 'spotted' : 'solid',
            estimatedSize: seed % 5 === 0 ? 'large' : seed % 5 === 1 ? 'medium' : 'small',
        };
    }

    getDominantColor(seed) {
        const colors = ['brown', 'grey', 'white', 'black', 'blue', 'green', 'red', 'yellow', 'orange', 'pink'];
        return colors[seed % colors.length];
    }

    selectByVisualFeatures(features) {
        const candidates = Object.entries(BIRDS);

        // 根据特征筛选候选
        let filtered = candidates.filter(([_, bird]) => {
            // 喙长 → 翠鸟、啄木鸟
            if (features.hasLongBeak) {
                if (['kingfisher', 'woodpecker', 'heron'].includes(bird.id)) return true;
            }
            // 羽冠 → 戴胜
            if (features.hasCrest && bird.id === 'hoopoe') return true;
            // 亮色 → 鹦鹉、火烈鸟、孔雀
            if (features.hasBrightColors) {
                if (['parrot', 'flamingo', 'peacock', 'phoenix'].includes(bird.id)) return true;
            }
            // 体型大 → 鹰、雕、企鹅
            if (features.estimatedSize === 'large') {
                if (['eagle', 'roc', 'penguin'].includes(bird.id)) return true;
            }
            return false;
        });

        // 如果筛选后为空，放宽条件：按体型匹配
        if (filtered.length === 0) {
            filtered = candidates.filter(([_, bird]) => {
                if (features.estimatedSize === 'small' && ['sparrow', 'pigeon', 'magpie', 'crow'].includes(bird.id)) return true;
                if (features.estimatedSize === 'medium' && ['bulbul', 'hoopoe', 'kingfisher'].includes(bird.id)) return true;
                if (features.estimatedSize === 'large' && ['eagle', 'heron', 'phoenix'].includes(bird.id)) return true;
                return false;
            });
        }

        // 还为空就随机选
        if (filtered.length === 0) {
            filtered = candidates;
        }

        // 加权选择（稀有度越低权重越高，更容易出现常见鸟）
        const weights = filtered.map(([_, bird]) => {
            const rarityWeights = { common: 10, uncommon: 5, rare: 2, epic: 1, legend: 0.5 };
            return rarityWeights[bird.rarity] || 1;
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalWeight;
        for (let i = 0; i < filtered.length; i++) {
            rand -= weights[i];
            if (rand <= 0) {
                return filtered[i][0];
            }
        }

        return filtered[0][0];
    }

    generateSuggestions(matchedBirdId) {
        const suggestions = [];
        const allBirds = Object.entries(BIRDS);

        // 推荐 2 只相似鸟
        const matched = BIRDS[matchedBirdId];
        const similar = allBirds
            .filter(([id, _]) => id !== matchedBirdId)
            .filter(([_, bird]) => bird.types.some(t => matched.types.includes(t)))
            .slice(0, 2);

        similar.forEach(([id, bird]) => {
            suggestions.push({
                id,
                name: bird.name,
                confidence: (0.3 + Math.random() * 0.25).toFixed(2),
            });
        });

        return suggestions;
    }

    // ========== 真实 API 模式 ==========
    async identifyReal(imageFile) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const headers = {};
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseAPIResponse(data);

        } catch (error) {
            console.error('Real AI identification failed:', error);
            // 降级到模拟模式
            return await this.identifySimulated(imageFile);
        }
    }

    parseAPIResponse(apiData) {
        // 适配常见的鸟类识别 API 返回格式
        // 这里以通用格式为例，实际接入时可调整
        let birdId = null;
        let confidence = 0.5;

        if (apiData.predictions && apiData.predictions.length > 0) {
            const top = apiData.predictions[0];
            confidence = top.confidence || top.probability || 0.5;
            birdId = this.matchBirdByName(top.label || top.class || top.name);
        } else if (apiData.result) {
            confidence = apiData.result.confidence || 0.5;
            birdId = this.matchBirdByName(apiData.result.name || apiData.result.species);
        } else if (apiData.species) {
            birdId = this.matchBirdByName(apiData.species);
            confidence = apiData.confidence || 0.5;
        }

        // 如果匹配不到已知鸟灵，选最接近的
        if (!birdId) {
            birdId = 'sparrow';
            confidence = 0.3;
        }

        const bird = BIRDS[birdId];

        return {
            success: true,
            birdId,
            birdName: bird.name,
            types: [...bird.types],
            rarity: bird.rarity,
            confidence: parseFloat(confidence.toFixed(2)),
            source: 'real-api',
            timestamp: Date.now(),
        };
    }

    matchBirdByName(name) {
        if (!name) return null;
        const lower = name.toLowerCase();

        // 精确匹配
        for (const [id, bird] of Object.entries(BIRDS)) {
            if (id.toLowerCase() === lower || bird.name.toLowerCase() === lower) {
                return id;
            }
        }

        // 模糊匹配
        for (const [id, bird] of Object.entries(BIRDS)) {
            const keywords = [id, bird.name.toLowerCase(), ...bird.types];
            for (const kw of keywords) {
                if (lower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(lower)) {
                    return id;
                }
            }
        }

        return null;
    }

    // ========== 捕捉率计算 ==========
    calculateCatchRate(rarity, confidence, ballMultiplier, lureActive) {
        const baseRates = {
            common: 0.65,
            uncommon: 0.45,
            rare: 0.25,
            epic: 0.12,
            legend: 0.04,
        };

        let rate = baseRates[rarity] || 0.3;

        // 置信度加成（最高 +15%）
        rate += (confidence - 0.5) * 0.3;

        // 球倍率
        rate *= ballMultiplier;

        // 诱饵加成
        if (lureActive) {
            rate *= 1.5;
        }

        // 限制上限
        rate = Math.min(rate, 0.99);
        rate = Math.max(rate, 0.01);

        return parseFloat(rate.toFixed(3));
    }

    // ========== 稀有度提升 ==========
    upgradeRarity(currentRarity) {
        const order = ['common', 'uncommon', 'rare', 'epic', 'legend'];
        const idx = order.indexOf(currentRarity);
        if (idx >= 0 && idx < order.length - 1) {
            return order[idx + 1];
        }
        return currentRarity;
    }
}

// 全局实例
const birdAI = new BirdAI();
