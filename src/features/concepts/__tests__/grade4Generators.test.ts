import { describe, expect, it } from 'vitest';
import { GRADE4_GENERATORS, mixed, toChinese } from '../generators/grade4';

const DIFFICULTIES: Record<string, string[]> = {
    g4BigNumbers: ['read', 'place', 'compare'],
    g4Rounding: ['round'],
    g4Multiply: ['2x2', '3x2'],
    g4Divide: ['by1', 'by2'],
    g4OrderOps: ['mixed'],
    g4Fraction: ['convert', 'add-sub', 'times'],
    g4Decimal: ['place', 'compare', 'add-sub', 'times'],
    g4Angle: ['triangle', 'straight', 'clock', 'rotate'],
    g4AreaUnits: ['convert'],
    g4Time: ['convert', 'elapsed'],
};

/** 「2又1/3」或「5/3」或「4」→ 以分母為單位的分子 */
const toNum = (s: string, den: number) => {
    const m = s.match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
    if (!m) return Number(s) * den;
    return Number(m[1] ?? 0) * den + Number(m[2]);
};

/** 從題目文字裡的算式驗算答案；看不懂的題目回傳 null */
const verify = (q: string, a: string): boolean | null => {
    const div = q.match(/^(\d+) ÷ (\d+) = ？$/);
    if (div) {
        const [x, y] = [Number(div[1]), Number(div[2])];
        const r = a.match(/^(\d+) 餘 (\d+)$/);
        return r ? Number(r[2]) > 0 && Number(r[2]) < y && Number(r[1]) * y + Number(r[2]) === x : Number(a) * y === x;
    }
    if (/^[\d ()+\-×÷]+ = ？$/.test(q)) {
        const expr = q.replace(' = ？', '').replace(/×/g, '*').replace(/÷/g, '/');
        return Number(a) === Function(`return (${expr})`)();
    }
    const dec = q.match(/^([\d.]+) ([+\-×]) ([\d.]+) = ？$/);
    if (dec) {
        const c = (s: string) => Math.round(Number(s) * 100);
        const [x, y] = [c(dec[1]), dec[2] === '×' ? Number(dec[3]) : c(dec[3])];
        const expected = dec[2] === '+' ? x + y : dec[2] === '-' ? x - y : x * y;
        return c(a) === expected;
    }
    const fr = q.match(/^(.+?) ([+-]) (.+?) = ？$/);
    if (fr && fr[1].includes('/')) {
        const den = Number(fr[1].split('/')[1]);
        const [x, y] = [toNum(fr[1], den), toNum(fr[3], den)];
        return toNum(a, den) === (fr[2] === '+' ? x + y : x - y);
    }
    const times = q.match(/^(\d+) × (\d+)\/(\d+) = ？$/);
    if (times) return toNum(a, Number(times[3])) === Number(times[1]) * Number(times[2]);
    return null;
};

describe('四年級數學產生器', () => {
    it('每個產生器都有對應的難度表', () => {
        expect(Object.keys(DIFFICULTIES).sort()).toEqual(Object.keys(GRADE4_GENERATORS).sort());
    });

    for (const [id, diffs] of Object.entries(DIFFICULTIES)) {
        it.each(diffs)(`${id}（%s）：格式正確、答案驗算無誤`, (difficulty) => {
            const gen = GRADE4_GENERATORS[id];
            for (let i = 0; i < 300; i++) {
                const q = gen(difficulty, Math.random);
                const where = `${id}/${difficulty}：${q.q} → ${q.a} ✗ ${q.w.join(' / ')}`;
                expect(q.e, where).toBeTruthy();
                expect(q.h?.length, where).toBeGreaterThan(0);
                expect(q.w, where).toHaveLength(3);
                expect(q.w, where).not.toContain(q.a);
                expect(new Set(q.w).size, where).toBe(3);
                // 問「某一位的數字」時，0 是合理的答案
                const zeroOk = q.q.includes('數字是多少');
                for (const t of [q.a, ...q.w]) {
                    expect(t, where).not.toMatch(/NaN|undefined|Infinity|^-|^0 |^0°|又0\//);
                    if (!zeroOk) expect(t, where).not.toBe('0');
                }
                expect(`${q.q}${q.e}`, where).not.toMatch(/NaN|undefined|……$/);
                // 分數題：錯誤選項不能和正解「一樣大」（例如 9又3/6 和 8又9/6）
                const val = (t: string) => {
                    const m = t.match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
                    return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : /^\d+$/.test(t) ? Number(t) : null;
                };
                const av = val(q.a);
                if (av !== null && q.q.includes('/')) for (const t of q.w) expect(val(t) === null || Math.abs(val(t)! - av) > 1e-9, where).toBe(true);
                const ok = verify(q.q, q.a);
                if (ok !== null) expect(ok, where).toBe(true);
            }
        });
    }

    it('大數的國字讀法', () => {
        expect(toChinese(30050000)).toBe('三千零五萬');
        expect(toChinese(100000005)).toBe('一億零五');
        expect(toChinese(120000)).toBe('十二萬');
        expect(toChinese(1100000)).toBe('一百一十萬');
        expect(toChinese(20304)).toBe('二萬零三百零四');
        expect(toChinese(105000000)).toBe('一億零五百萬');
        expect(toChinese(987654321)).toBe('九億八千七百六十五萬四千三百二十一');
    });

    it('帶分數格式', () => {
        expect(mixed(7, 3)).toBe('2又1/3');
        expect(mixed(2, 5)).toBe('2/5');
        expect(mixed(6, 3)).toBe('2');
    });
});
