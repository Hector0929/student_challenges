/**
 * 怪獸塔 Gen3 — 塔內挑戰關卡
 *
 * 保護兩件事：
 * 1. 難度／獎勵／重試次數的規則正確
 * 2. 每款挑戰真的會回報過關與失敗（onResult 只呼叫一次）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import {
    CHALLENGE_REWARD_STARS,
    difficultyForFloor,
    retriesFromCollection,
    MAX_RETRIES,
} from '../components/tower/challenges/types';
import { TOWER_CHALLENGES, pickChallengeForFloor } from '../components/tower/challenges/challengeRegistry';
import { WhackMonsterChallenge } from '../components/tower/challenges/WhackMonsterChallenge';
import { TimingBarChallenge } from '../components/tower/challenges/TimingBarChallenge';

describe('難度與獎勵規則', () => {
    it('依樓層分三段難度', () => {
        expect(difficultyForFloor(1)).toBe('easy');
        expect(difficultyForFloor(33)).toBe('easy');
        expect(difficultyForFloor(34)).toBe('normal');
        expect(difficultyForFloor(66)).toBe('normal');
        expect(difficultyForFloor(67)).toBe('hard');
        expect(difficultyForFloor(100)).toBe('hard');
    });

    it('越難給越多星幣', () => {
        expect(CHALLENGE_REWARD_STARS.easy).toBeLessThan(CHALLENGE_REWARD_STARS.normal);
        expect(CHALLENGE_REWARD_STARS.normal).toBeLessThan(CHALLENGE_REWARD_STARS.hard);
    });
});

describe('收藏換重試次數', () => {
    it('每 10 隻怪獸換一次重試', () => {
        expect(retriesFromCollection(0)).toBe(0);
        expect(retriesFromCollection(9)).toBe(0);
        expect(retriesFromCollection(10)).toBe(1);
        expect(retriesFromCollection(25)).toBe(2);
    });

    it('重試次數有上限，收藏再多也不會無限重來', () => {
        expect(retriesFromCollection(500)).toBe(MAX_RETRIES);
    });
});

describe('挑戰清單', () => {
    it('同一層永遠對到同一款挑戰，孩子可以預期', () => {
        expect(pickChallengeForFloor(42).id).toBe(pickChallengeForFloor(42).id);
    });

    it('三款挑戰都有唯一 id 與說明文字', () => {
        const ids = TOWER_CHALLENGES.map((challenge) => challenge.id);
        expect(new Set(ids).size).toBe(TOWER_CHALLENGES.length);
        TOWER_CHALLENGES.forEach((challenge) => {
            expect(challenge.title.length).toBeGreaterThan(0);
            expect(challenge.howTo.length).toBeGreaterThan(0);
        });
    });
});

describe('打怪獸挑戰', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        cleanup();
    });

    it('時間到還沒打到目標數量就算失敗，而且只回報一次', () => {
        const onResult = vi.fn();
        render(<WhackMonsterChallenge difficulty="easy" onResult={onResult} />);

        // easy 是 10 秒，直接把時間跑完（完全不點擊）
        act(() => {
            vi.advanceTimersByTime(11000);
        });

        expect(onResult).toHaveBeenCalledTimes(1);
        expect(onResult).toHaveBeenCalledWith(false);
    });

    it('打滿目標數量就立刻過關', () => {
        const onResult = vi.fn();
        render(<WhackMonsterChallenge difficulty="easy" onResult={onResult} />);

        // 讓怪獸持續冒出來，看到一隻就打一隻，直到過關
        for (let i = 0; i < 40; i += 1) {
            act(() => {
                vi.advanceTimersByTime(700);
            });
            const holes = screen.getAllByTestId(/whack-hole-/);
            const occupied = holes.find((hole) => hole.textContent && hole.textContent.length > 0);
            if (occupied) {
                act(() => {
                    fireEvent.click(occupied);
                });
            }
            if (onResult.mock.calls.length > 0) break;
        }

        expect(onResult).toHaveBeenCalledTimes(1);
        expect(onResult).toHaveBeenCalledWith(true);
    });
});

describe('挑戰不會殘留上一場的結果', () => {
    afterEach(() => cleanup());

    // 迴歸測試：挑戰元件曾經被永久掛載、只靠 floor=null 回傳 null，
    // 導致上一場的 phase='result' 被下一場沿用，一遇到守門怪就直接顯示「挑戰成功」。
    // 修法是在有挑戰時才掛載並用 runId 當 key，這裡確認換 key 會拿到全新的一場。
    it('換一場（新的 key）就會回到說明畫面，不會直接顯示結果', () => {
        const onResult = vi.fn();
        const { rerender } = render(
            <div>
                <TimingBarChallenge key="run-1" difficulty="easy" onResult={onResult} />
            </div>,
        );

        // 第一場：用完機會，元件進入已完成狀態
        act(() => {
            for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByTestId('timing-tap-btn'));
        });
        expect(onResult).toHaveBeenCalledTimes(1);

        // 第二場：換 key 之後應該是全新一場，機會數回到滿的
        rerender(
            <div>
                <TimingBarChallenge key="run-2" difficulty="easy" onResult={onResult} />
            </div>,
        );
        expect(screen.getByText(/剩 3 次機會/)).toBeTruthy();

        // 而且新的一場還能再回報一次結果（不是沿用舊的）
        act(() => {
            for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByTestId('timing-tap-btn'));
        });
        expect(onResult).toHaveBeenCalledTimes(2);
    });
});

describe('時機點擊挑戰', () => {
    afterEach(() => cleanup());

    it('用完所有機會都沒命中就失敗，且只回報一次', () => {
        const onResult = vi.fn();
        render(<TimingBarChallenge difficulty="easy" onResult={onResult} />);

        const button = screen.getByTestId('timing-tap-btn');
        // easy 有 3 次機會，連按 5 次確認不會重複回報
        act(() => {
            for (let i = 0; i < 5; i += 1) fireEvent.click(button);
        });

        expect(onResult).toHaveBeenCalledTimes(1);
        expect(onResult.mock.calls[0][0]).toBe(false);
    });
});
