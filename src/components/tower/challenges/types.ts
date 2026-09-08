import type React from 'react';

export type ChallengeDifficulty = 'easy' | 'normal' | 'hard';

export interface ChallengeProps {
    difficulty: ChallengeDifficulty;
    /** 挑戰結束時呼叫一次；true = 過關 */
    onResult: (passed: boolean) => void;
}

export interface ChallengeDefinition {
    id: string;
    /** 挑戰名稱，例如「打怪獸」 */
    title: string;
    /** 一句話說明玩法，孩子看得懂就好 */
    howTo: string;
    icon: string;
    Component: React.FC<ChallengeProps>;
}

/** 樓層越高越難：1-33 簡單、34-66 普通、67-100 困難 */
export function difficultyForFloor(floor: number): ChallengeDifficulty {
    if (floor <= 33) return 'easy';
    if (floor <= 66) return 'normal';
    return 'hard';
}

/** 過關給的星幣，跟難度綁在一起 */
export const CHALLENGE_REWARD_STARS: Record<ChallengeDifficulty, number> = {
    easy: 10,
    normal: 15,
    hard: 25,
};

export const DIFFICULTY_LABEL: Record<ChallengeDifficulty, string> = {
    easy: '簡單',
    normal: '普通',
    hard: '困難',
};

/**
 * 收藏怪獸越多，挑戰失敗後可以重試的次數越多（每 10 隻 +1，上限 3）。
 * 這是「收集怪獸」在玩法上的實際用途，取代了原本的編隊面板。
 */
export const RETRIES_PER_MONSTERS = 10;
export const MAX_RETRIES = 3;

export function retriesFromCollection(monsterCount: number): number {
    return Math.min(MAX_RETRIES, Math.floor(monsterCount / RETRIES_PER_MONSTERS));
}
