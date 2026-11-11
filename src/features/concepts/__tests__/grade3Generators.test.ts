import { describe, expect, it } from 'vitest';
import { GRADE3_GENERATORS } from '../generators/grade3';

const DIFFICULTIES: Record<string, string[]> = {
    g3Numbers: ['place', 'compare', 'sequence'],
    g3AddSub: ['add', 'sub'],
    g3Multiply: ['2x1', '3x1'],
    g3Divide: ['exact', 'remainder'],
    g3Fraction: ['meaning', 'compare', 'add-sub'],
    g3Decimal: ['meaning', 'compare', 'add-sub'],
    g3Measure: ['length', 'capacity', 'weight'],
    g3Time: ['24h', 'seconds', 'elapsed'],
    g3WordProblem: ['two-step'],
};

/** 從題目文字裡的算式驗算答案（整數、一位小數、同分母分數、有餘數的除法） */
const verify = (q: string, a: string): boolean | null => {
    const int = q.match(/^(\d+) ([+\-×÷]) (\d+) = ？$/);
    if (int) {
        const [x, y] = [Number(int[1]), Number(int[3])];
        if (int[2] === '÷') {
            const r = a.match(/^(\d+) 餘 (\d+)$/);
            if (r) return Number(r[2]) < y && Number(r[1]) * y + Number(r[2]) === x;
            return Number(a) * y === x;
        }
        return Number(a) === (int[2] === '+' ? x + y : int[2] === '-' ? x - y : x * y);
    }
    const dec = q.match(/^([\d.]+) ([+-]) ([\d.]+) = ？$/);
    if (dec) {
        const t = (s: string) => Math.round(Number(s) * 10);
        return t(a) === (dec[2] === '+' ? t(dec[1]) + t(dec[3]) : t(dec[1]) - t(dec[3]));
    }
    const fr = q.match(/^(\d+)\/(\d+) ([+-]) (\d+)\/\2 = ？$/);
    if (fr) {
        const n = fr[3] === '+' ? Number(fr[1]) + Number(fr[4]) : Number(fr[1]) - Number(fr[4]);
        return a === `${n}/${fr[2]}`;
    }
    return null;
};

describe('三年級數學產生器', () => {
    it('每個產生器都有對應的難度表', () => {
        expect(Object.keys(DIFFICULTIES).sort()).toEqual(Object.keys(GRADE3_GENERATORS).sort());
    });

    for (const [id, diffs] of Object.entries(DIFFICULTIES)) {
        it.each(diffs)(`${id}（%s）：格式正確、答案驗算無誤`, (difficulty) => {
            const gen = GRADE3_GENERATORS[id];
            for (let i = 0; i < 300; i++) {
                const q = gen(difficulty, Math.random);
                const where = `${id}/${difficulty}：${q.q} → ${q.a} ✗ ${q.w.join(' / ')}`;
                expect(q.e, where).toBeTruthy();
                expect(q.h?.length, where).toBeGreaterThan(0);
                expect(q.w, where).toHaveLength(3);
                expect(q.w, where).not.toContain(q.a);
                expect(new Set(q.w).size, where).toBe(3);
                for (const t of [q.a, ...q.w]) {
                    expect(t, where).not.toMatch(/NaN|undefined|Infinity|^-|^0 |^0\/| 0 [^\d]/);
                }
                expect(`${q.q}${q.e}`, where).not.toMatch(/NaN|undefined/);
                const ok = verify(q.q, q.a);
                if (ok !== null) expect(ok, where).toBe(true);
            }
        });
    }

    it('四位數加減一定有進位或退位', () => {
        for (let i = 0; i < 200; i++) {
            const add = GRADE3_GENERATORS.g3AddSub('add', Math.random);
            const [x, y] = add.q.match(/\d+/g)!.map(Number);
            const digits = (n: number) => String(n).padStart(4, '0').split('').map(Number);
            expect(digits(x).some((d, k) => d + digits(y)[k] >= 10), add.q).toBe(true);
        }
    });
});
