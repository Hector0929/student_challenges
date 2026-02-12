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
// Reward Games Configuration
// ============================================

export interface Game {
    id: string;
    name: string;
    icon: string;
    description: string;
    url: string;
    color: string;
    category: 'learning' | 'fun';
}

export const GAMES: Game[] = [
    {
        id: 'parkour',
        name: '方塊衝刺',
        icon: '🔲',
        description: '節奏跑酷挑戰',
        url: '/games/parkour_game.html',
        color: 'bg-violet-500 hover:bg-violet-600',
        category: 'fun'
    },
    {
        id: 'spelling',
        name: '單字召喚術',
        icon: '🅰️',
        description: '拼字主題挑戰',
        url: '/games/spelling_game.html',
        color: 'bg-teal-400 hover:bg-teal-500',
        category: 'learning'
    },
    {
        id: 'pronunciation',
        name: '發音選單字',
        icon: '👂',
        description: '聽力主題挑戰',
        url: '/games/pronunciation_game.html',
        color: 'bg-indigo-400 hover:bg-indigo-500',
        category: 'learning'
    },
    {
        id: 'sentence',
        name: '句子重組',
        icon: '📝',
        description: '英文文法挑戰',
        url: '/games/sentence_game.html',
        color: 'bg-pink-400 hover:bg-pink-600',
        category: 'learning'
    },
    {
        id: 'akila',
        name: '加法練習',
        icon: '➕',
        description: '數學計算挑戰',
        url: '/games/akila_plus_test.html',
        color: 'bg-blue-400 hover:bg-blue-500',
        category: 'learning'
    },
    {
        id: 'multiplication',
        name: '乘法練習',
        icon: '✖️',
        description: '九九乘法表',
        url: '/games/multiplication_test.html',
        color: 'bg-purple-400 hover:bg-purple-500',
        category: 'learning'
    },
    {
        id: 'shooting',
        name: '射擊遊戲',
        icon: '🎯',
        description: '反應力訓練',
        url: '/games/shooting_game.html',
        color: 'bg-orange-400 hover:bg-orange-500',
        category: 'fun'
    },
    {
        id: 'tetris',
        name: '俄羅斯方塊',
        icon: '🧱',
        description: '經典益智遊戲',
        url: '/games/Tetris.html',
        color: 'bg-green-400 hover:bg-green-500',
        category: 'fun'
    },
    {
        id: 'snake',
        name: '貪食蛇',
        icon: '🐍',
        description: '經典霓虹挑戰',
        url: '/games/snake_game.html',
        color: 'bg-cyan-400 hover:bg-cyan-500',
        category: 'fun'
    },
    {
        id: 'ns_shaft',
        name: '小朋友下樓梯',
        icon: '🧗',
        description: '是男人就下100層',
        url: '/games/ns_shaft.html',
        color: 'bg-purple-400 hover:bg-purple-500',
        category: 'fun'
    },
    {
        id: 'neon_breaker',
        name: '霓虹打磚塊',
        icon: '🧱',
        description: '經典撞擊挑戰',
        url: '/games/neon_breaker.html',
        color: 'bg-pink-500 hover:bg-pink-600',
        category: 'fun'
    },
    {
        id: 'memory_matrix',
        name: '記憶矩陣',
        icon: '🧠',
        description: '極限腦力訓練',
        url: '/games/memory_matrix.html',
        color: 'bg-cyan-500 hover:bg-cyan-600',
        category: 'fun'
    },
    {
        id: 'neon_slicer',
        name: '光劍切切樂',
        icon: '⚔️',
        description: '反應力極限',
        url: '/games/neon_slicer.html',
        color: 'bg-amber-500 hover:bg-amber-600',
        category: 'fun'
    },
    {
        id: '2048_cyber',
        name: '2048 Cyber',
        icon: '🔢',
        description: '邏輯方塊合成',
        url: '/games/2048_cyber.html',
        color: 'bg-blue-500 hover:bg-blue-600',
        category: 'fun'
    },
    {
        id: 'bubble_shooter',
        name: '霓虹泡泡龍',
        icon: '🔴',
        description: '射擊消除挑戰',
        url: '/games/bubble_shooter.html',
        color: 'bg-red-500 hover:bg-red-600',
        category: 'fun'
    }
];

// Pastel color mapping for fun games
export const FUN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    'parkour': { bg: 'var(--pastel-purple-bg)', border: 'var(--pastel-purple-border)', text: 'var(--pastel-purple-text)' },
    'shooting': { bg: 'var(--pastel-orange-bg)', border: 'var(--pastel-orange-border)', text: 'var(--pastel-orange-text)' },
    'tetris': { bg: 'var(--pastel-green-bg)', border: 'var(--pastel-green-border)', text: 'var(--pastel-green-text)' },
    'snake': { bg: 'var(--pastel-cyan-bg)', border: 'var(--pastel-cyan-border)', text: 'var(--pastel-cyan-text)' },
    'ns_shaft': { bg: 'var(--pastel-purple-bg)', border: 'var(--pastel-purple-border)', text: 'var(--pastel-purple-text)' },
    'neon_breaker': { bg: 'var(--pastel-pink-bg)', border: 'var(--pastel-pink-border)', text: 'var(--pastel-pink-text)' },
    'neon_slicer': { bg: 'var(--pastel-orange-bg)', border: 'var(--pastel-orange-border)', text: 'var(--pastel-orange-text)' },
    'bubble_shooter': { bg: 'var(--pastel-pink-bg)', border: 'var(--pastel-pink-border)', text: 'var(--pastel-pink-text)' },
};

export const getFunGameColors = (gameId: string) => {
    return FUN_COLORS[gameId] || {
        bg: 'var(--pastel-orange-bg)',
        border: 'var(--pastel-orange-border)',
        text: 'var(--pastel-orange-text)'
    };
};
