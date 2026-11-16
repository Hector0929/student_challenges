import { type MonsterId } from '../hooks/useTowerProgress';

// ============================================
// Lottery Wheel Configuration
// ============================================

export interface Prize {
    id: string;
    name: string;
    type: 'coins' | 'dice' | 'monster';
    value?: number;
    monsterId?: MonsterId;
    weight: number;
    color: string;
    icon: string;
}

export const LOTTERY_PRIZES: Prize[] = [
    { id: 'coins_10', name: '10 星幣', type: 'coins', value: 10, weight: 30, color: '#FCD34D', icon: '⭐' },
    { id: 'coins_20', name: '20 星幣', type: 'coins', value: 20, weight: 25, color: '#FB923C', icon: '✨' },
    { id: 'coins_50', name: '50 星幣', type: 'coins', value: 50, weight: 15, color: '#F87171', icon: '💫' },
    { id: 'coins_100', name: '100 星幣', type: 'coins', value: 100, weight: 5, color: '#A78BFA', icon: '🌟' },
    { id: 'dice_2', name: '2 顆骰子', type: 'dice', value: 2, weight: 15, color: '#4ADE80', icon: '🎲' },
    { id: 'dice_5', name: '5 顆骰子', type: 'dice', value: 5, weight: 5, color: '#60A5FA', icon: '🎯' },
    { id: 'monster_star', name: '星光精靈', type: 'monster', monsterId: 'star_fairy' as MonsterId, weight: 3, color: '#F472B6', icon: '🌠' },
    { id: 'monster_lucky', name: '幸運草寶寶', type: 'monster', monsterId: 'lucky_clover' as MonsterId, weight: 2, color: '#34D399', icon: '🍀' },
];

// ============================================
// Fun Games Configuration
// ============================================

/** 遊戲目錄的三個分區 */
export type FunGameCategory = 'adventure' | 'action' | 'puzzle';

export const FUN_GAME_CATEGORIES: Array<{ id: FunGameCategory; name: string; icon: string; hint: string }> = [
    { id: 'adventure', name: '冒險闖關', icon: '⚔️', hint: '有關卡可以一關一關挑戰' },
    { id: 'action', name: '反應動作', icon: '⚡', hint: '手眼要快' },
    { id: 'puzzle', name: '動腦益智', icon: '🧩', hint: '想一想再動手' },
];

export interface FunGame {
    id: string;
    name: string;
    icon: string;
    /** 一句話說明怎麼玩 */
    description: string;
    url: string;
    color: string;
    category: FunGameCategory;
    /** 遊戲畫面截圖（scripts/capture-game-covers.mjs 產生） */
    cover: string;
    /** 卡片上的小標籤，最多兩個 */
    tags?: string[];
    /** 過關會把星幣發回來 */
    earnsStars?: boolean;
}

const cover = (id: string) => `/games/covers/${id}.jpg`;

export const FUN_GAMES: FunGame[] = [
    // ── 冒險闖關 ──
    {
        id: 'parkour',
        name: '方塊衝刺',
        icon: '🏃',
        description: '跳過障礙衝到終點，五大區域一路闖',
        url: '/games/parkour_game_v3.html',
        color: 'bg-violet-500 hover:bg-violet-600',
        category: 'adventure',
        cover: cover('parkour'),
        tags: ['15 關'],
        earnsStars: true,
    },
    {
        id: 'monster_survivor',
        name: '怪獸生存戰',
        icon: '🧛',
        description: '帶著夥伴擋住怪獸大軍，撐到時間結束',
        url: '/games/monster_survivor.html',
        color: 'bg-violet-600 hover:bg-violet-700',
        category: 'adventure',
        cover: cover('monster_survivor'),
        tags: ['6 張地圖'],
        earnsStars: true,
    },
    {
        id: 'ember_corridor',
        name: '銀河守衛',
        icon: '🛩️',
        description: '駕駛戰機編隊，打倒每個星域的魔王',
        url: '/games/ember_corridor.html',
        color: 'bg-amber-600 hover:bg-amber-700',
        category: 'adventure',
        cover: cover('ember_corridor'),
        tags: ['6 大星域'],
        earnsStars: true,
    },
    {
        id: 'ns_shaft',
        name: '小朋友下樓梯',
        icon: '🧗',
        description: '踩著平台往下跳，小心天花板的尖刺',
        url: '/games/ns_shaft.html',
        color: 'bg-purple-400 hover:bg-purple-500',
        category: 'adventure',
        cover: cover('ns_shaft'),
        tags: ['100 層'],
        earnsStars: true,
    },
    {
        id: 'monster_bomber',
        name: '怪獸塔爆爆冒險',
        icon: '💣',
        description: '放炸彈炸開磚牆，打倒怪獸找到出口',
        url: '/games/monster_bomber.html',
        color: 'bg-sky-500 hover:bg-sky-600',
        category: 'adventure',
        cover: cover('monster_bomber'),
        tags: ['10 關'],
        earnsStars: true,
    },
    // ── 反應動作 ──
    {
        id: 'shooting',
        name: '乘法射擊',
        icon: '🎯',
        description: '看算式，射中正確的答案',
        url: '/games/shooting_game.html',
        color: 'bg-orange-400 hover:bg-orange-500',
        category: 'action',
        cover: cover('shooting'),
        tags: ['九九乘法'],
        earnsStars: true,
    },
    {
        id: 'neon_slicer',
        name: '光劍切切樂',
        icon: '⚔️',
        description: '揮動光劍切開飛出來的圖形',
        url: '/games/neon_slicer.html',
        color: 'bg-amber-500 hover:bg-amber-600',
        category: 'action',
        cover: cover('neon_slicer'),
    },
    {
        id: 'neon_breaker',
        name: '霓虹打磚塊',
        icon: '🏓',
        description: '用板子接住小球，打碎每一排磚塊',
        url: '/games/neon_breaker.html',
        color: 'bg-pink-500 hover:bg-pink-600',
        category: 'action',
        cover: cover('neon_breaker'),
    },
    {
        id: 'bubble_shooter',
        name: '霓虹泡泡龍',
        icon: '🫧',
        description: '射出泡泡，三顆同色就會消掉',
        url: '/games/bubble_shooter.html',
        color: 'bg-red-500 hover:bg-red-600',
        category: 'action',
        cover: cover('bubble_shooter'),
    },
    {
        id: 'snake',
        name: '貪食蛇',
        icon: '🐍',
        description: '吃掉能量方塊，讓蛇越來越長',
        url: '/games/snake_game.html',
        color: 'bg-cyan-400 hover:bg-cyan-500',
        category: 'action',
        cover: cover('snake'),
    },
    // ── 動腦益智 ──
    {
        id: 'tetris',
        name: '俄羅斯方塊',
        icon: '🧱',
        description: '轉動方塊，排滿一整行就消除',
        url: '/games/Tetris.html',
        color: 'bg-green-400 hover:bg-green-500',
        category: 'puzzle',
        cover: cover('tetris'),
    },
    {
        id: '2048_cyber',
        name: '2048 合成',
        icon: '🔢',
        description: '滑動合併相同數字，挑戰合出 2048',
        url: '/games/2048_cyber.html',
        color: 'bg-blue-500 hover:bg-blue-600',
        category: 'puzzle',
        cover: cover('2048_cyber'),
    },
    {
        id: 'memory_matrix',
        name: '記憶矩陣',
        icon: '🧠',
        description: '記住卡片的位置，翻出成對的圖案',
        url: '/games/memory_matrix.html',
        color: 'bg-cyan-500 hover:bg-cyan-600',
        category: 'puzzle',
        cover: cover('memory_matrix'),
    },
];
