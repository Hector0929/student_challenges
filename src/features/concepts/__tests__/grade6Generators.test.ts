import { describe, expect, it } from 'vitest';
import { gcd } from '../generators/grade5';
import { dec, GRADE6_GENERATORS, val } from '../generators/grade6';

const DIFFICULTIES: Record<string, string[]> = {
    g6Prime: ['factorize', 'coprime'],
    g6FracDiv: ['frac-frac', 'whole-frac', 'frac-whole', 'word'],
    g6DecDiv: ['div', 'round'],
    g6Ratio: ['simplify', 'value', 'missing', 'share'],
    g6Scale: ['map-to-real', 'real-to-map'],
    g6Speed: ['distance', 'speed', 'time', 'units'],
    g6Circle: ['circumference', 'reverse', 'area', 'sector'],
    g6Solid: ['prism', 'cylinder', 'surface'],
    g6Equation: ['add-sub', 'mul-div', 'two-step'],
    g6Base: ['compare', 'base'],
};

// ─── 精確的分數運算 ───────────────────────────────────────

type R = [number, number];
const norm = ([n, d]: R): R => {
    const g = gcd(n, d);
    return [n / g, d / g];
};
const R = (n: number, d = 1): R => norm([n, d]);
const mul = (a: R, b: R) => R(a[0] * b[0], a[1] * b[1]);
const div = (a: R, b: R) => R(a[0] * b[1], a[1] * b[0]);
const add = (a: R, b: R) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const PI: R = [157, 50];

/** 「2又1/3」「5/3」「31.4 公分」「4」→ 分數；看不懂回傳 null */
const parse = (s: string): R | null => {
    const t = s.replace(/ \S+$/, '');
    let m = t.match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
    if (m) return R(Number(m[1] ?? 0) * Number(m[3]) + Number(m[2]), Number(m[3]));
    m = t.match(/^(\d+)(?:\.(\d+))?$/);
    if (m) return R(Number(m[1] + (m[2] ?? '')), 10 ** (m[2] ?? '').length);
    return null;
};
const P = (s: string) => parse(s)!;
const N = (s: string) => R(Number(s));
const same = (a: R | null, b: R | null) => !!a && !!b && a[0] * b[1] === b[0] * a[1];
const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((i) => n % i !== 0);
const simplest = (a: string) => {
    const m = a.match(/(\d+)\/(\d+)$/);
    return !m || gcd(Number(m[1]), Number(m[2])) === 1;
};

/** 依題目算出正確答案（分數）；回傳 null 表示這種題目另外檢查 */
const RULES: [RegExp, (m: string[]) => R][] = [
    [/^([\d.又/]+) ÷ ([\d.又/]+) = ？$/, (m) => div(P(m[1]), P(m[2]))],
    [/緞帶長 ([\d又/]+) 公尺，每 ([\d/]+) 公尺/, (m) => div(P(m[1]), P(m[2]))],
    [/^([\d又/]+) 公升的果汁平分給 (\d+) 個人/, (m) => div(P(m[1]), N(m[2]))],
    [/^(\d+)：(\d+) 的比值/, (m) => R(Number(m[1]), Number(m[2]))],
    [/^(\d+)：(\d+) = (\d+)：？/, (m) => R(Number(m[2]) * Number(m[3]), Number(m[1]))],
    [/^(\d+)：(\d+) = ？：(\d+)/, (m) => R(Number(m[1]) * Number(m[3]), Number(m[2]))],
    [/按照 (\d+)：(\d+) 分 (\d+)/, (m) => R(Number(m[3]) * Number(m[1]), Number(m[1]) + Number(m[2]))],
    [/^比例尺 1：(\d+) 的地圖上，(\d+) 公分代表/, (m) => R(Number(m[1]) * Number(m[2]))], // 公分，下面另外換單位
    [/^比例尺 1：(\d+) 的地圖上，實際距離 ([\d.]+) (公里|公尺)/, (m) => div(mul(P(m[2]), N(m[3] === '公里' ? '100000' : '100')), N(m[1]))],
    [/時速 (\d+) 公里行駛 ([\d.]+) 小時/, (m) => mul(N(m[1]), P(m[2]))],
    [/走了 (\d+) 公尺，花了 (\d+) 分鐘/, (m) => R(Number(m[1]), Number(m[2]))],
    [/(\d+) 小時行駛了 (\d+) 公里/, (m) => R(Number(m[2]), Number(m[1]))],
    [/相距 ([\d.]+) 公里，以時速 (\d+) 公里/, (m) => div(P(m[1]), N(m[2]))],
    [/^秒速 (\d+) 公尺 = 時速/, (m) => R(Number(m[1]) * 3600, 1000)],
    [/^分速 (\d+) 公尺 = 時速/, (m) => R(Number(m[1]) * 60, 1000)],
    [/^時速 (\d+) 公里 = 分速/, (m) => R(Number(m[1]) * 1000, 60)],
    [/^半徑 (\d+) 公分的圓，圓周長/, (m) => mul(R(2 * Number(m[1])), PI)],
    [/^直徑 (\d+) 公分的圓，圓周長/, (m) => mul(N(m[1]), PI)],
    [/圓周長是 ([\d.]+) 公分，它的半徑/, (m) => div(P(m[1]), mul(PI, R(2)))],
    [/圓周長是 ([\d.]+) 公分，它的直徑/, (m) => div(P(m[1]), PI)],
    [/^半徑 (\d+) 公分的圓，面積/, (m) => mul(R(Number(m[1]) ** 2), PI)],
    [/^直徑 (\d+) 公分的圓，面積/, (m) => mul(R(Number(m[1]) ** 2, 4), PI)],
    [/^半徑 (\d+) 公分的半圓形，面積/, (m) => mul(R(Number(m[1]) ** 2, 2), PI)],
    [/^半徑 (\d+) 公分的四分之一圓/, (m) => mul(R(Number(m[1]) ** 2, 4), PI)],
    [/^半徑 (\d+) 公分的半圓形，周長/, (m) => add(mul(N(m[1]), PI), R(2 * Number(m[1])))],
    [/底 (\d+) 公分、高 (\d+) 公分的三角形，柱高 (\d+)/, (m) => R(Number(m[1]) * Number(m[2]) * Number(m[3]), 2)],
    [/底面積是 (\d+) 平方公分，高 (\d+)/, (m) => R(Number(m[1]) * Number(m[2]))],
    [/底面半徑 (\d+) 公分、高 (\d+)/, (m) => mul(R(Number(m[1]) ** 2 * Number(m[2])), PI)],
    [/^邊長 (\d+) 公分的正方體，表面積/, (m) => R(6 * Number(m[1]) ** 2)],
    [/^長 (\d+) 公分、寬 (\d+) 公分、高 (\d+) 公分的長方體，表面積/, (m) => {
        const [a, b, c] = [1, 2, 3].map((i) => Number(m[i]));
        return R(2 * (a * b + b * c + c * a));
    }],
    [/^x \+ (\d+) = (\d+)/, (m) => R(Number(m[2]) - Number(m[1]))],
    [/^x - (\d+) = (\d+)/, (m) => R(Number(m[2]) + Number(m[1]))],
    [/^(\d+) - x = (\d+)/, (m) => R(Number(m[1]) - Number(m[2]))],
    [/^(\d+) × x = (\d+)/, (m) => R(Number(m[2]), Number(m[1]))],
    [/^x ÷ (\d+) = (\d+)/, (m) => R(Number(m[2]) * Number(m[1]))],
    [/某數的 (\d+) 倍再加 (\d+) 等於 (\d+)/, (m) => R(Number(m[3]) - Number(m[2]), Number(m[1]))],
    [/某數減去 (\d+) 以後再除以 (\d+)，得到 (\d+)/, (m) => R(Number(m[3]) * Number(m[2]) + Number(m[1]))],
    [/^(?:全班有|一本書有|果園採了) (\d+) .*? (\d+)\/(\d+)/, (m) => R(Number(m[1]) * Number(m[2]), Number(m[3]))],
    [/(?:有|存了|裡有) (\d+) (?:張|元|朵).*的 (\d+)\/(\d+)/, (m) => R(Number(m[1]) * Number(m[3]), Number(m[2]))],
];

/** 比例尺題的答案帶公里或公尺，換回公分再比 */
const toCm = (a: string): R | null => {
    const m = a.match(/^([\d.]+) (公里|公尺)$/);
    return m ? mul(P(m[1]), R(m[2] === '公里' ? 100000 : 100)) : null;
};

const verify = (q: string, a: string): boolean | null => {
    let m = q.match(/^把 (\d+) 做質因數分解/);
    if (m) {
        const fs = a.split(' × ').map(Number);
        return fs.every(isPrime) && fs.reduce((x, y) => x * y, 1) === Number(m[1]) && fs.join() === [...fs].sort((x, y) => x - y).join();
    }
    m = a.match(/^(\d+) 和 (\d+)$/);
    if (m && q === '下列哪一組數互質？') return gcd(Number(m[1]), Number(m[2])) === 1;
    m = q.match(/^(\d+) 和 (\d+) 互質，它們的最小公倍數/);
    if (m) return gcd(Number(m[1]), Number(m[2])) === 1 && Number(a) === Number(m[1]) * Number(m[2]);
    m = q.match(/^([\d.]+)：([\d.]+) 化成最簡單整數比/);
    if (m) {
        const [x, y] = a.split('：').map(Number);
        return gcd(x, y) === 1 && same(R(x, y), div(P(m[1]), P(m[2])));
    }
    m = q.match(/^(\d+) ÷ (\d+) 的商，用四捨五入/);
    if (m) {
        const exact = Number(m[1]) / Number(m[2]);
        return /^\d+\.\d$/.test(a) && Math.abs(Number(a) - exact) <= 0.05;
    }
    for (const [re, rule] of RULES) {
        const k = q.match(re);
        if (!k) continue;
        const want = rule(k);
        const got = re.source.includes('公分代表') ? toCm(a) : parse(a);
        return same(got, want) && simplest(a);
    }
    return null;
};

describe('六年級數學產生器', () => {
    it('每個產生器都有對應的難度表', () => {
        expect(Object.keys(DIFFICULTIES).sort()).toEqual(Object.keys(GRADE6_GENERATORS).sort());
    });

    for (const [id, diffs] of Object.entries(DIFFICULTIES)) {
        it.each(diffs)(`${id}（%s）：格式正確、答案驗算無誤`, (difficulty) => {
            const gen = GRADE6_GENERATORS[id];
            for (let i = 0; i < 300; i++) {
                const q = gen(difficulty, Math.random);
                const where = `${id}/${difficulty}：${q.q} → ${q.a} ✗ ${q.w.join(' / ')}`;
                expect(q.e, where).toBeTruthy();
                expect(q.h?.length, where).toBeGreaterThan(0);
                expect(q.w, where).toHaveLength(3);
                expect(q.w, where).not.toContain(q.a);
                expect(new Set(q.w).size, where).toBe(3);
                for (const t of [q.a, ...q.w]) {
                    expect(t, where).not.toMatch(/NaN|undefined|Infinity|^-|^0 |^0\/|\/0\b|又0\/|^0$|\/1\b/);
                }
                expect(`${q.q}${q.e}${q.h?.join('')}`, where).not.toMatch(/NaN|undefined|Infinity|\$\{/);
                // 數值型的錯誤選項不能和正解一樣大
                const av = q.a.includes('：') ? null : parse(q.a) ?? toCm(q.a);
                if (av) for (const t of q.w) expect(same(parse(t) ?? toCm(t), av), where).toBe(false);
                // 互質題的錯誤選項都不能互質
                if (q.q === '下列哪一組數互質？') {
                    for (const t of q.w) {
                        const [x, y] = t.split(' 和 ').map(Number);
                        expect(gcd(x, y), where).toBeGreaterThan(1);
                    }
                }
                const ok = verify(q.q, q.a);
                expect(ok, `${where}（沒有對應的驗算規則）`).not.toBeNull();
                expect(ok, where).toBe(true);
            }
        });
    }

    it('小數與數值轉換', () => {
        expect(dec(3140, 2)).toBe('31.4');
        expect(dec(300, 2)).toBe('3');
        expect(dec(785, 3)).toBe('0.785');
        expect(dec(120, 0)).toBe('120');
        expect(val('2又1/2 公升')).toBe(2.5);
        expect(val('31.4 公分')).toBe(31.4);
        expect(val('4 × 5')).toBeNaN();
    });
});
