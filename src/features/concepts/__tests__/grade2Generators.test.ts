import { describe, expect, it } from 'vitest';
import { GRADE2_GENERATORS } from '../generators/grade2';

const DIFFICULTIES: Record<string, string[]> = {
    numbersTo1000: ['place', 'compare', 'sequence'],
    addSubtract: ['add-plain', 'add-carry', 'add-3digit', 'sub-plain', 'sub-borrow'],
    timesTable: ['2-5-10', '3-4', '6-7', '8-9', 'all'],
    length: ['cm', 'm-cm'],
    time: ['elapsed', 'convert'],
    money: ['count', 'change'],
};

/** 從題目文字裡的算式驗算答案 */
const evalArith = (q: string) => {
    const m = q.match(/^(\d+) ([+\-×]) (\d+) = ？$/);
    if (!m) return null;
    const [a, b] = [Number(m[1]), Number(m[3])];
    return m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b;
};

describe('二年級數學產生器', () => {
    it('每個產生器都有對應的難度表', () => {
        expect(Object.keys(DIFFICULTIES).sort()).toEqual(Object.keys(GRADE2_GENERATORS).sort());
    });

    for (const [id, diffs] of Object.entries(DIFFICULTIES)) {
        it.each(diffs)(`${id}（%s）：格式正確、誘答不重複也不等於正解`, (difficulty) => {
            const gen = GRADE2_GENERATORS[id];
            for (let i = 0; i < 300; i++) {
                const q = gen(difficulty, Math.random);
                const where = `${id}/${difficulty}：${q.q}`;
                expect(q.q, where).toBeTruthy();
                expect(q.e, where).toBeTruthy();
                expect(q.h?.length, where).toBeGreaterThan(0);
                expect(q.w, where).toHaveLength(3);
                expect(q.w, where).not.toContain(q.a);
                expect(new Set(q.w).size, where).toBe(3);
                for (const t of [q.a, ...q.w]) {
                    expect(t, where).not.toMatch(/NaN|undefined|-\d|\.\d/);
                    expect(t, where).not.toMatch(/^0 /);
                }
                const expected = evalArith(q.q);
                if (expected !== null) expect(Number(q.a), where).toBe(expected);
            }
        });
    }

    it('二位數加法「不進位」與「進位」分得清楚', () => {
        for (let i = 0; i < 200; i++) {
            const plain = GRADE2_GENERATORS.addSubtract('add-plain', Math.random);
            const m = plain.e!.match(/(\d+) \+ (\d+)/)!;
            expect((Number(m[1]) % 10) + (Number(m[2]) % 10)).toBeLessThan(10);
            const borrow = GRADE2_GENERATORS.addSubtract('sub-borrow', Math.random);
            const n = borrow.e!.match(/(\d+) - (\d+)/)!;
            expect(Number(n[1]) % 10).toBeLessThan(Number(n[2]) % 10);
        }
    });
});
