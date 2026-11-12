import { describe, expect, it } from 'vitest';
import { frac, gcd, GRADE5_GENERATORS } from '../generators/grade5';

const DIFFICULTIES: Record<string, string[]> = {
    g5Factors: ['factor', 'prime', 'gcf-lcm', 'word'],
    g5Fraction: ['simplify', 'equivalent', 'compare', 'add-sub', 'multiply', 'divide-whole'],
    g5Decimal: ['mul', 'div', 'convert'],
    g5Area: ['parallelogram', 'triangle', 'trapezoid', 'missing'],
    g5Volume: ['cuboid', 'units', 'capacity'],
    g5Percent: ['convert', 'of', 'discount'],
};

type Q = [number, number]; // 分子、分母
const norm = ([n, d]: Q): Q => {
    const g = gcd(n, d);
    return [n / g, d / g];
};
/** 「2又1/3」「5/3」「0.25」「4」→ 分數；看不懂回傳 null */
const parse = (s: string): Q | null => {
    let m = s.match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
    if (m) return norm([Number(m[1] ?? 0) * Number(m[3]) + Number(m[2]), Number(m[3])]);
    m = s.match(/^(\d+)(?:\.(\d+))?$/);
    if (m) {
        const dp = (m[2] ?? '').length;
        return norm([Number(m[1] + (m[2] ?? '')), 10 ** dp]);
    }
    return null;
};
const eq = (a: Q | null, b: Q | null) => !!a && !!b && a[0] * b[1] === b[0] * a[1];
const op = (a: Q, o: string, b: Q): Q =>
    o === '+' ? [a[0] * b[1] + b[0] * a[1], a[1] * b[1]] : o === '-' ? [a[0] * b[1] - b[0] * a[1], a[1] * b[1]] : o === '×' ? [a[0] * b[0], a[1] * b[1]] : [a[0] * b[1], a[1] * b[0]];

/** 驗算：回傳 null 表示這種題目不驗算 */
const verify = (q: string, a: string): boolean | null => {
    const m = q.match(/^([\d.又/]+) ([+\-×÷]) ([\d.又/]+) = ？$/);
    if (m) {
        const [x, y] = [parse(m[1]), parse(m[3])];
        if (!x || !y) return null;
        const ok = eq(parse(a), op(x, m[2], y));
        // 分數題的答案要是最簡分數
        if (/\//.test(a)) {
            const f = a.match(/(\d+)\/(\d+)$/)!;
            return ok && gcd(Number(f[1]), Number(f[2])) === 1;
        }
        return ok;
    }
    let k = q.match(/^把 (\d+)\/(\d+) 約成最簡分數/);
    if (k) return eq(parse(a), [Number(k[1]), Number(k[2])]) && gcd(...(a.split('/').map(Number) as [number, number])) === 1;
    k = q.match(/^(\d+)\/(\d+) 化成小數/);
    if (k) return eq(parse(a), [Number(k[1]), Number(k[2])]);
    k = q.match(/^([\d.]+) 化成最簡分數/);
    if (k) return eq(parse(a), parse(k[1])) && gcd(...(a.split('/').map(Number) as [number, number])) === 1;
    k = q.match(/^(\d+) 和 (\d+) 的最大公因數/);
    if (k) return Number(a) === gcd(Number(k[1]), Number(k[2]));
    k = q.match(/^(\d+) 和 (\d+) 的最小公倍數/);
    if (k) return Number(a) === (Number(k[1]) * Number(k[2])) / gcd(Number(k[1]), Number(k[2]));
    return null;
};

describe('五年級數學產生器', () => {
    it('每個產生器都有對應的難度表', () => {
        expect(Object.keys(DIFFICULTIES).sort()).toEqual(Object.keys(GRADE5_GENERATORS).sort());
    });

    for (const [id, diffs] of Object.entries(DIFFICULTIES)) {
        it.each(diffs)(`${id}（%s）：格式正確、答案驗算無誤`, (difficulty) => {
            const gen = GRADE5_GENERATORS[id];
            for (let i = 0; i < 300; i++) {
                const q = gen(difficulty, Math.random);
                const where = `${id}/${difficulty}：${q.q} → ${q.a} ✗ ${q.w.join(' / ')}`;
                expect(q.e, where).toBeTruthy();
                expect(q.h?.length, where).toBeGreaterThan(0);
                expect(q.w, where).toHaveLength(3);
                expect(q.w, where).not.toContain(q.a);
                expect(new Set(q.w).size, where).toBe(3);
                for (const t of [q.a, ...q.w]) {
                    expect(t, where).not.toMatch(/NaN|undefined|Infinity|^-|^0 |^0\/|\/0\b|又0\/|^0$|^0%/);
                }
                expect(`${q.q}${q.e}`, where).not.toMatch(/NaN|undefined|Infinity/);
                // 錯誤選項不能和正解一樣大（例如 1/2 和 2/4）
                const strip = (t: string) => t.replace(/ (公升|公斤|個)$/, '');
                const av = parse(strip(q.a));
                if (av) for (const t of q.w) expect(eq(parse(strip(t)), av), where).toBe(false);
                const ok = verify(q.q, q.a);
                if (ok !== null) expect(ok, where).toBe(true);
            }
        });
    }

    it('最簡分數與帶分數', () => {
        expect(frac(6, 8)).toBe('3/4');
        expect(frac(10, 4)).toBe('2又1/2');
        expect(frac(9, 3)).toBe('3');
    });
});
