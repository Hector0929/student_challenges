import { describe, expect, it } from 'vitest';
import { computeTodayProgress } from '../todayProgress';

describe('computeTodayProgress', () => {
    it('門檻是 4 個，任務比 4 少時以任務數為準', () => {
        expect(computeTodayProgress(0, 11)).toMatchObject({ goal: 4, left: 4, unlocked: false, headline: '再 4 個任務，就能玩遊戲' });
        expect(computeTodayProgress(1, 2)).toMatchObject({ goal: 2, left: 1 });
    });
    it('達到門檻後解鎖，全部做完另外提示', () => {
        expect(computeTodayProgress(4, 11)).toMatchObject({ unlocked: true, allDone: false, headline: '遊戲時間解鎖了 🎮' });
        expect(computeTodayProgress(11, 11)).toMatchObject({ allDone: true });
    });
    it('沒有任務時不算解鎖', () => {
        expect(computeTodayProgress(0, 0)).toMatchObject({ unlocked: false, headline: '今天還沒有任務' });
    });
});
