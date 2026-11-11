// 各年級數學出題程式共用的小工具。

import type { ChoiceQuestion } from '../types';

export type Rand = () => number;
export type LocalGenerator = (difficulty: string, rand: Rand) => ChoiceQuestion;

export const int = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
export const pick = <T,>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

/** 組一題選擇題：去掉和正解相同、重複或不合理的誘答，不夠 3 個用 fallback 補 */
export function choice(
    q: string,
    a: string | number,
    candidates: (string | number)[],
    fallback: () => string | number,
    h: string[],
    e: string,
    valid: (w: string | number) => boolean = (w) => typeof w !== 'number' || w >= 0,
): ChoiceQuestion {
    const ans = String(a);
    const w: string[] = [];
    const push = (c: string | number) => {
        const s = String(c);
        const sane = typeof c === 'number' ? c >= 0 && Number.isInteger(c) : !/^0 |^-|NaN/.test(c);
        if (s !== ans && !w.includes(s) && sane && valid(c) && w.length < 3) w.push(s);
    };
    candidates.forEach(push);
    for (let i = 0; w.length < 3 && i < 50; i++) push(fallback());
    return { type: 'choice', q, a: ans, w, h, e };
}

export const near = (rand: Rand, n: number, spread: number) => () => n + pick(rand, [-1, 1]) * int(rand, 1, spread);

/** 一位小數轉字串，避免 0.1 + 0.2 這類浮點誤差 */
export const dec1 = (tenths: number) => (tenths / 10).toFixed(1).replace(/\.0$/, '');
