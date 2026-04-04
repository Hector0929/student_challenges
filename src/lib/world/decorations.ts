/**
 * 懸空島飾品（Decoration）系統
 *
 * 飾品需要用資源（木材 / 石材 / 晶礦）購買，
 * 購買後會顯示在懸空島地表上。
 * 大多數飾品可以重複購買（maxCount > 1）。
 */

export type DecorationId =
    // 木材類
    | 'bush'
    | 'bush_large'
    | 'bush_small'
    | 'flower_red'
    | 'flower_yellow'
    | 'flower_purple'
    | 'grass_large'
    | 'mushroom'
    | 'log'
    | 'log_stack'
    | 'stump'
    | 'tree_small'
    | 'tree_oak'
    | 'tree_pine'
    | 'tree_pine_small'
    | 'hedge'
    | 'workbench'
    | 'barrel'
    | 'banner_green'
    | 'sign'
    | 'fence'
    | 'tent'
    // 石材類
    | 'stone_pile'
    | 'stone_pile_b'
    | 'rock_large'
    | 'rock_tall'
    | 'campfire'
    | 'campfire_stones'
    | 'lantern'
    | 'pillar'
    | 'cart'
    | 'stall'
    | 'banner_red'
    | 'watermill'
    | 'windmill'
    // 晶礦類
    | 'fountain'
    | 'lily'
    | 'chest';

export interface DecorationCost {
    wood?: number;
    stone?: number;
    crystal?: number;
}

export interface DecorationEntry {
    id: DecorationId;
    name: string;
    emoji: string;
    /** GLB model path */
    modelPath: string;
    scale: number;
    /** Y 軸偏移（相對於島嶼地表），微調貼地高度 */
    yOffset: number;
    cost: DecorationCost;
    /** 分類：wood / stone / crystal */
    category: 'wood' | 'stone' | 'crystal';
    description: string;
    /** 最多可放置數量（-1 表示無限） */
    maxCount: number;
}

/** 飾品目錄 — 依資源種類分組 */
export const DECORATION_CATALOG: DecorationEntry[] = [
    // ── 木材類 ──────────────────────────────────────────────────────────────
    {
        id: 'flower_red',
        name: '紅花叢',
        emoji: '🌸',
        modelPath: '/models/nature/flower_redA.glb',
        scale: 0.3,
        yOffset: 0.02,
        cost: { wood: 3 },
        category: 'wood',
        description: '鮮豔的紅色野花，為島嶼增添色彩。',
        maxCount: 6,
    },
    {
        id: 'flower_yellow',
        name: '黃花叢',
        emoji: '🌼',
        modelPath: '/models/nature/flower_yellowA.glb',
        scale: 0.3,
        yOffset: 0.02,
        cost: { wood: 3 },
        category: 'wood',
        description: '陽光般的黃色花朵，讓島嶼充滿活力。',
        maxCount: 6,
    },
    {
        id: 'flower_purple',
        name: '紫花叢',
        emoji: '💜',
        modelPath: '/models/nature/flower_purpleA.glb',
        scale: 0.28,
        yOffset: 0.02,
        cost: { wood: 3 },
        category: 'wood',
        description: '神秘的紫色花朵，帶點魔法氣息。',
        maxCount: 6,
    },
    {
        id: 'grass_large',
        name: '高草叢',
        emoji: '🌿',
        modelPath: '/models/nature/grass_large.glb',
        scale: 0.3,
        yOffset: 0.02,
        cost: { wood: 2 },
        category: 'wood',
        description: '生機勃勃的高草，最便宜的綠化選擇。',
        maxCount: 8,
    },
    {
        id: 'bush_small',
        name: '小灌木',
        emoji: '🌱',
        modelPath: '/models/nature/plant_bushSmall.glb',
        scale: 0.3,
        yOffset: 0.02,
        cost: { wood: 4 },
        category: 'wood',
        description: '嬌小的灌木球，很可愛。',
        maxCount: 6,
    },
    {
        id: 'bush',
        name: '灌木叢',
        emoji: '🌿',
        modelPath: '/models/nature/plant_bush.glb',
        scale: 0.34,
        yOffset: 0.02,
        cost: { wood: 5 },
        category: 'wood',
        description: '自然清新的灌木叢，讓島嶼更有生氣。',
        maxCount: 5,
    },
    {
        id: 'bush_large',
        name: '大灌木',
        emoji: '🌳',
        modelPath: '/models/nature/plant_bushLarge.glb',
        scale: 0.28,
        yOffset: 0.02,
        cost: { wood: 6 },
        category: 'wood',
        description: '茂盛的大灌木，綠化效果超好。',
        maxCount: 4,
    },
    {
        id: 'mushroom',
        name: '蘑菇群',
        emoji: '🍄',
        modelPath: '/models/nature/mushroom_redGroup.glb',
        scale: 0.3,
        yOffset: 0.02,
        cost: { wood: 4 },
        category: 'wood',
        description: '成群的紅色蘑菇，充滿森林氣息。',
        maxCount: 4,
    },
    {
        id: 'stump',
        name: '圓樹樁',
        emoji: '🪵',
        modelPath: '/models/nature/stump_round.glb',
        scale: 0.3,
        yOffset: 0.02,
        cost: { wood: 5 },
        category: 'wood',
        description: '古老的圓樹樁，展示島嶼的伐木歷史。',
        maxCount: 4,
    },
    {
        id: 'log',
        name: '圓木',
        emoji: '🪵',
        modelPath: '/models/nature/log.glb',
        scale: 0.28,
        yOffset: 0.02,
        cost: { wood: 5 },
        category: 'wood',
        description: '一根粗壯的圓木，可以當椅子坐。',
        maxCount: 4,
    },
    {
        id: 'log_stack',
        name: '木材堆',
        emoji: '🪵',
        modelPath: '/models/nature/log_stack.glb',
        scale: 0.3,
        yOffset: 0.03,
        cost: { wood: 10 },
        category: 'wood',
        description: '整齊堆放的圓木，象徵豐富的木材儲量。',
        maxCount: 3,
    },
    {
        id: 'tree_small',
        name: '小樹',
        emoji: '🌳',
        modelPath: '/models/nature/tree_small.glb',
        scale: 0.26,
        yOffset: 0.02,
        cost: { wood: 8 },
        category: 'wood',
        description: '一棵小巧的樹，為島嶼帶來自然氣息。',
        maxCount: 5,
    },
    {
        id: 'tree_oak',
        name: '橡樹',
        emoji: '🌳',
        modelPath: '/models/nature/tree_oak.glb',
        scale: 0.22,
        yOffset: 0.02,
        cost: { wood: 12 },
        category: 'wood',
        description: '茂盛的橡樹，是島嶼的天然遮蔭。',
        maxCount: 4,
    },
    {
        id: 'tree_pine',
        name: '圓松樹',
        emoji: '🌲',
        modelPath: '/models/nature/tree_pineRoundA.glb',
        scale: 0.24,
        yOffset: 0.02,
        cost: { wood: 10 },
        category: 'wood',
        description: '圓滾滾的可愛松樹，像童話裡的樹。',
        maxCount: 4,
    },
    {
        id: 'tree_pine_small',
        name: '小松樹',
        emoji: '🌲',
        modelPath: '/models/nature/tree_pineSmallA.glb',
        scale: 0.28,
        yOffset: 0.02,
        cost: { wood: 7 },
        category: 'wood',
        description: '嬌小的松樹，群植效果很棒。',
        maxCount: 5,
    },
    {
        id: 'hedge',
        name: '樹籬',
        emoji: '🌿',
        modelPath: '/models/town/hedge.glb',
        scale: 0.26,
        yOffset: 0.02,
        cost: { wood: 8 },
        category: 'wood',
        description: '修剪整齊的樹籬，讓島嶼更有秩序感。',
        maxCount: 4,
    },
    {
        id: 'fence',
        name: '木柵欄',
        emoji: '🪵',
        modelPath: '/models/nature/fence_simple.glb',
        scale: 0.28,
        yOffset: 0.03,
        cost: { wood: 6 },
        category: 'wood',
        description: '簡單的木柵欄，為島嶼劃定範圍。',
        maxCount: 4,
    },
    {
        id: 'barrel',
        name: '木桶',
        emoji: '🪣',
        modelPath: '/models/survival/barrel.glb',
        scale: 0.26,
        yOffset: 0.04,
        cost: { wood: 8 },
        category: 'wood',
        description: '裝滿物資的木桶，讓島嶼看起來更豐實。',
        maxCount: 3,
    },
    {
        id: 'workbench',
        name: '工作台',
        emoji: '🔨',
        modelPath: '/models/survival/workbench.glb',
        scale: 0.24,
        yOffset: 0.04,
        cost: { wood: 15 },
        category: 'wood',
        description: '木製工作台，是工匠們的最愛。',
        maxCount: 2,
    },
    {
        id: 'banner_green',
        name: '綠色旗幟',
        emoji: '🚩',
        modelPath: '/models/town/banner-green.glb',
        scale: 0.26,
        yOffset: 0.04,
        cost: { wood: 6 },
        category: 'wood',
        description: '翠綠的旗幟在風中飄揚，代表大自然的力量。',
        maxCount: 3,
    },
    {
        id: 'sign',
        name: '木製路標',
        emoji: '🪧',
        modelPath: '/models/nature/sign.glb',
        scale: 0.26,
        yOffset: 0.04,
        cost: { wood: 5 },
        category: 'wood',
        description: '指引方向的木製路標，為島嶼增添故事感。',
        maxCount: 3,
    },
    {
        id: 'tent',
        name: '帳篷',
        emoji: '⛺',
        modelPath: '/models/survival/tent.glb',
        scale: 0.22,
        yOffset: 0.04,
        cost: { wood: 12, stone: 5 },
        category: 'wood',
        description: '冒險者的帳篷，表示島上有探險家長駐。',
        maxCount: 2,
    },
    // ── 石材類 ──────────────────────────────────────────────────────────────
    {
        id: 'stone_pile',
        name: '石塊 A',
        emoji: '⛰️',
        modelPath: '/models/nature/stone_largeA.glb',
        scale: 0.24,
        yOffset: 0.02,
        cost: { stone: 4 },
        category: 'stone',
        description: '厚實的大石塊，展現島嶼雄厚的地質資源。',
        maxCount: 5,
    },
    {
        id: 'stone_pile_b',
        name: '石塊 B',
        emoji: '🪨',
        modelPath: '/models/nature/stone_largeB.glb',
        scale: 0.24,
        yOffset: 0.02,
        cost: { stone: 4 },
        category: 'stone',
        description: '另一種形狀的大石塊，可以和石塊A搭配。',
        maxCount: 5,
    },
    {
        id: 'rock_large',
        name: '大岩石',
        emoji: '🪨',
        modelPath: '/models/nature/rock_largeA.glb',
        scale: 0.26,
        yOffset: 0.02,
        cost: { stone: 5 },
        category: 'stone',
        description: '帶有地衣的大岩石，充滿自然感。',
        maxCount: 4,
    },
    {
        id: 'rock_tall',
        name: '高聳岩石',
        emoji: '⛰️',
        modelPath: '/models/nature/rock_tallA.glb',
        scale: 0.22,
        yOffset: 0.02,
        cost: { stone: 7 },
        category: 'stone',
        description: '高聳的岩石柱，讓島嶼看起來更壯觀。',
        maxCount: 3,
    },
    {
        id: 'campfire_stones',
        name: '石頭篝火',
        emoji: '🔥',
        modelPath: '/models/nature/campfire_stones.glb',
        scale: 0.28,
        yOffset: 0.03,
        cost: { stone: 6, wood: 4 },
        category: 'stone',
        description: '石圍篝火，野外風情十足。',
        maxCount: 3,
    },
    {
        id: 'campfire',
        name: '篝火坑',
        emoji: '🔥',
        modelPath: '/models/survival/campfire-pit.glb',
        scale: 0.24,
        yOffset: 0.04,
        cost: { stone: 8, wood: 6 },
        category: 'stone',
        description: '石砌的篝火坑，是夥伴們聚集的地方。',
        maxCount: 2,
    },
    {
        id: 'lantern',
        name: '石燈籠',
        emoji: '🏮',
        modelPath: '/models/town/lantern.glb',
        scale: 0.24,
        yOffset: 0.04,
        cost: { stone: 6, wood: 4 },
        category: 'stone',
        description: '溫暖的石製燈籠，夜晚照亮整個島嶼。',
        maxCount: 4,
    },
    {
        id: 'pillar',
        name: '石柱',
        emoji: '🏛️',
        modelPath: '/models/town/pillar-stone.glb',
        scale: 0.22,
        yOffset: 0.04,
        cost: { stone: 8 },
        category: 'stone',
        description: '古典風格的石柱，讓島嶼帶點神殿氣息。',
        maxCount: 4,
    },
    {
        id: 'cart',
        name: '推車',
        emoji: '🛒',
        modelPath: '/models/town/cart.glb',
        scale: 0.22,
        yOffset: 0.04,
        cost: { stone: 8, wood: 6 },
        category: 'stone',
        description: '裝載貨物的推車，展示島嶼的繁榮貿易。',
        maxCount: 2,
    },
    {
        id: 'stall',
        name: '市集攤位',
        emoji: '🏪',
        modelPath: '/models/town/stall.glb',
        scale: 0.2,
        yOffset: 0.04,
        cost: { stone: 10, wood: 8 },
        category: 'stone',
        description: '熱鬧的市集攤位，讓島嶼更有生活氣息。',
        maxCount: 2,
    },
    {
        id: 'banner_red',
        name: '紅色旗幟',
        emoji: '🚩',
        modelPath: '/models/town/banner-red.glb',
        scale: 0.26,
        yOffset: 0.04,
        cost: { stone: 6 },
        category: 'stone',
        description: '熱情的紅色旗幟，象徵島嶼的勇氣與力量。',
        maxCount: 3,
    },
    {
        id: 'watermill',
        name: '水車',
        emoji: '💧',
        modelPath: '/models/town/watermill.glb',
        scale: 0.2,
        yOffset: 0.04,
        cost: { wood: 15, stone: 10 },
        category: 'stone',
        description: '轉動的水車，利用水力幫助生產工作。',
        maxCount: 1,
    },
    {
        id: 'windmill',
        name: '風車',
        emoji: '🌬️',
        modelPath: '/models/town/windmill.glb',
        scale: 0.2,
        yOffset: 0.04,
        cost: { wood: 20, stone: 15 },
        category: 'stone',
        description: '高聳的風車，借助風力提升整個島嶼的能量。',
        maxCount: 1,
    },
    // ── 晶礦類 ──────────────────────────────────────────────────────────────
    {
        id: 'lily',
        name: '睡蓮',
        emoji: '🪷',
        modelPath: '/models/nature/lily_large.glb',
        scale: 0.28,
        yOffset: 0.03,
        cost: { crystal: 3 },
        category: 'crystal',
        description: '晶瑩剔透的睡蓮，在夜晚散發淡淡光芒。',
        maxCount: 4,
    },
    {
        id: 'chest',
        name: '寶箱',
        emoji: '💎',
        modelPath: '/models/survival/chest.glb',
        scale: 0.22,
        yOffset: 0.04,
        cost: { stone: 8, crystal: 4 },
        category: 'crystal',
        description: '閃閃發光的寶箱，裡面藏著珍貴的晶礦。',
        maxCount: 3,
    },
    {
        id: 'fountain',
        name: '噴泉',
        emoji: '⛲',
        modelPath: '/models/town/fountain-round.glb',
        scale: 0.18,
        yOffset: 0.04,
        cost: { stone: 15, crystal: 6 },
        category: 'crystal',
        description: '晶瑩剔透的噴泉，是島嶼的地標建築。',
        maxCount: 1,
    },
];

/**
 * 放置槽位 — [x, y_bias, z] 相對於島嶼地表 group
 * 共 24 個槽位，讓玩家可以放更多裝飾品。
 */
export const DECORATION_SLOTS: Array<[number, number, number]> = [
    // 外圍槽位（原12個）
    [-1.25, 0, 0.55],   // slot  0 — 左前
    [1.30,  0, -0.45],  // slot  1 — 右後
    [0.50,  0, -1.30],  // slot  2 — 遠後
    [-0.55, 0, -1.25],  // slot  3 — 遠後左
    [1.25,  0, 1.00],   // slot  4 — 右前
    [-1.30, 0, -0.55],  // slot  5 — 左後
    [0.75,  0, 1.25],   // slot  6 — 前右
    [-0.85, 0, 1.15],   // slot  7 — 前左
    [1.40,  0, 0.00],   // slot  8 — 正右
    [-1.40, 0, 0.10],   // slot  9 — 正左
    [0.10,  0, 1.50],   // slot 10 — 正前
    [-0.15, 0, -1.50],  // slot 11 — 正後
    // 中圈槽位（新增12個）
    [0.00,  0, 0.85],   // slot 12 — 中前
    [0.85,  0, 0.00],   // slot 13 — 中右
    [-0.85, 0, 0.00],   // slot 14 — 中左
    [0.00,  0, -0.85],  // slot 15 — 中後
    [0.55,  0, 0.60],   // slot 16 — 中前右
    [-0.60, 0, 0.55],   // slot 17 — 中前左
    [0.55,  0, -0.65],  // slot 18 — 中後右
    [-0.55, 0, -0.60],  // slot 19 — 中後左
    [1.10,  0, 0.70],   // slot 20 — 右前
    [-1.15, 0, 0.75],   // slot 21 — 左前
    [1.10,  0, -0.80],  // slot 22 — 右後
    [-1.10, 0, -0.85],  // slot 23 — 左後
];

export interface PlacedDecoration {
    id: DecorationId;
    slotIndex: number;
}

/** 計算某個飾品已放置的數量 */
export function countPlaced(decorations: PlacedDecoration[], id: DecorationId): number {
    return decorations.filter((d) => d.id === id).length;
}

/** 找下一個可用的空位 index；若無空位回傳 -1 */
export function findNextFreeSlot(decorations: PlacedDecoration[]): number {
    const usedSlots = new Set(decorations.map((d) => d.slotIndex));
    for (let i = 0; i < DECORATION_SLOTS.length; i++) {
        if (!usedSlots.has(i)) return i;
    }
    return -1;
}
