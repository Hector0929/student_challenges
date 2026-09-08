import { WhackMonsterChallenge } from './WhackMonsterChallenge';
import { MemoryPairChallenge } from './MemoryPairChallenge';
import { TimingBarChallenge } from './TimingBarChallenge';
import type { ChallengeDefinition } from './types';

/**
 * 塔內挑戰關卡清單。
 *
 * 三款刻意選了三種不同能力（反應、記憶、時機），避免每次遇到守門怪都在做同一件事。
 * 全部是 App 內的 React 元件——不走 public/games 的 iframe，因為那些遊戲是 180 秒
 * 無盡模式、沒有成功／失敗回報，形狀跟 10-20 秒的塔內挑戰對不上。
 */
export const TOWER_CHALLENGES: ChallengeDefinition[] = [
    {
        id: 'whack_monster',
        title: '打怪獸',
        howTo: '怪獸會從洞裡冒出來，快點戳中牠們！',
        icon: '🥊',
        Component: WhackMonsterChallenge,
    },
    {
        id: 'memory_pair',
        title: '記憶配對',
        howTo: '翻開卡片，把一樣的怪獸配成一對！',
        icon: '🧠',
        Component: MemoryPairChallenge,
    },
    {
        id: 'timing_bar',
        title: '時機點擊',
        howTo: '指針掃到綠色區域的時候按下去！',
        icon: '🎯',
        Component: TimingBarChallenge,
    },
];

/**
 * 依樓層挑一款挑戰。用樓層本身當索引，所以同一層永遠是同一款，
 * 孩子可以先看到格子、心裡有底，而不是每次點開都被隨機驚嚇。
 */
export function pickChallengeForFloor(floor: number): ChallengeDefinition {
    return TOWER_CHALLENGES[floor % TOWER_CHALLENGES.length];
}
