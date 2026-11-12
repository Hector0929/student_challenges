// 五年級數學的程式出題：因數倍數、約分擴分、異分母分數加減、分數乘法、整數相除、
// 小數乘除、多邊形面積、體積與容積、百分率。誘答盡量用孩子真的會犯的錯。

import type { ChoiceQuestion } from '../types';
import { choice, int, near, pick, type LocalGenerator, type Rand } from './shared';

// ─── 共用 ─────────────────────────────────────────────────

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** 最簡分數；大於 1 寫成帶分數「2又1/3」，整除寫成整數 */
export function frac(num: number, den: number): string {
    const g = gcd(num, den);
    const [n, d] = [num / g, den / g];
    const w = Math.floor(n / d);
    const r = n % d;
    if (r === 0) return String(w);
    return w === 0 ? `${r}/${d}` : `${w}又${r}/${d}`;
}

/** 不約分，直接寫成 a/b */
const raw = (n: number, d: number) => `${n}/${d}`;

/** 以 0.001 為單位的整數轉成小數字串 */
const dec3 = (t: number) => (t / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const ODD_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 77, 81, 85, 87, 91, 93, 95];
const factorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0);

// ─── 因數與倍數 ───────────────────────────────────────────

export function g5Factors(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'factor') {
        const n = pick(rand, [12, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 60, 64, 72, 84, 90, 96]);
        const fs = factorsOf(n);
        if (rand() < 0.5) {
            return choice(
                `${n} 有幾個因數？`,
                `${fs.length} 個`,
                [`${fs.length - 1} 個`, `${fs.length + 1} 個`, `${fs.length - 2} 個`, `${fs.length + 2} 個`],
                () => `${fs.length + int(rand, 3, 5)} 個`,
                ['一對一對找：1 × ' + n + '、2 × ……', '別忘了 1 和它自己也是因數。'],
                `${n} 的因數有 ${fs.join('、')}，共 ${fs.length} 個。`,
                (w) => !/^0 /.test(String(w)),
            );
        }
        const f = pick(rand, fs.filter((x) => x > 1 && x < n));
        const non = Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => n % x !== 0 && Math.abs(x - f) <= 8);
        return choice(
            `下列哪一個是 ${n} 的因數？`,
            f,
            non,
            () => int(rand, 2, n - 1),
            [`能把 ${n} 整除的數就是 ${n} 的因數。`, '試著用每個選項去除除看。'],
            `${n} ÷ ${f} = ${n / f}，可以整除，所以 ${f} 是 ${n} 的因數。`,
            (w) => typeof w !== 'number' || n % w !== 0,
        );
    }
    if (difficulty === 'prime') {
        const askPrime = rand() < 0.6;
        if (askPrime) {
            const p = pick(rand, PRIMES.slice(3));
            return choice(
                '下列哪一個是質數？',
                p,
                [...ODD_COMPOSITES.filter((c) => Math.abs(c - p) < 20), 1],
                () => pick(rand, ODD_COMPOSITES),
                ['質數只有 1 和自己兩個因數。', '試試看能不能被 3、7 整除。'],
                `${p} 只有 1 和 ${p} 兩個因數，是質數。`,
            );
        }
        const c = pick(rand, ODD_COMPOSITES);
        const smallest = factorsOf(c)[1];
        return choice(
            '下列哪一個「不是」質數？',
            c,
            PRIMES.filter((p) => p > 2 && Math.abs(p - c) < 20),
            () => pick(rand, PRIMES.slice(1)),
            ['不是質數的數，除了 1 和自己，還有別的因數。', '奇數也可能不是質數，試試看 3、5、7。'],
            `${c} = ${smallest} × ${c / smallest}，除了 1 和 ${c} 還有其他因數，所以不是質數（是合數）。`,
        );
    }
    // 先選互質的 x、y，再乘上公因數 g
    let x = 0;
    let y = 0;
    do {
        x = int(rand, 2, 9);
        y = int(rand, 2, 9);
    } while (x === y || gcd(x, y) !== 1);
    const g = int(rand, 2, 8);
    const [a, b] = [g * x, g * y];
    const l = lcm(a, b);
    if (difficulty === 'gcf-lcm') {
        if (rand() < 0.5) {
            return choice(
                `${a} 和 ${b} 的最大公因數是多少？`,
                g,
                [l, Math.min(a, b), 1, g * 2, a * b],
                () => int(rand, 2, 12),
                ['先列出兩個數的因數。', '找出共同的因數中最大的一個。'],
                `${a} 的因數和 ${b} 的因數中，共同最大的是 ${g}。`,
                (w) => typeof w !== 'number' || (w > 0 && w !== g),
            );
        }
        return choice(
            `${a} 和 ${b} 的最小公倍數是多少？`,
            l,
            [a * b === l ? l * 2 : a * b, g, Math.max(a, b), l + g],
            near(rand, l, 6),
            ['列出兩個數的倍數。', '找出共同的倍數中最小的一個。'],
            `${a} 和 ${b} 共同的倍數中，最小的是 ${l}。`,
        );
    }
    // word
    if (rand() < 0.5) {
        return choice(
            `甲公車每 ${a} 分鐘一班，乙公車每 ${b} 分鐘一班。兩車同時發車後，至少再過幾分鐘會再同時發車？`,
            `${l} 分鐘`,
            [`${a * b === l ? l * 2 : a * b} 分鐘`, `${a + b} 分鐘`, `${g} 分鐘`, `${Math.max(a, b)} 分鐘`],
            () => `${l + g * int(rand, 1, 3)} 分鐘`,
            ['再同時發車的時間，要同時是兩個數的倍數。', '找最小公倍數。'],
            `${a} 和 ${b} 的最小公倍數是 ${l}，所以 ${l} 分鐘後再同時發車。`,
        );
    }
    return choice(
        `兩條緞帶長 ${a} 公分和 ${b} 公分，要剪成一樣長的小段，而且都沒有剩下，每段最長是幾公分？`,
        `${g} 公分`,
        [`${l} 公分`, `${Math.min(a, b)} 公分`, `${g * 2} 公分`, '1 公分'],
        () => `${g + int(rand, 3, 6)} 公分`,
        ['每段的長度要能同時整除兩條緞帶。', '找最大公因數。'],
        `${a} 和 ${b} 的最大公因數是 ${g}，每段最長 ${g} 公分。`,
    );
}

// ─── 分數 ─────────────────────────────────────────────────

export function g5Fraction(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'simplify') {
        let n = 0;
        let d = 0;
        do {
            d = int(rand, 3, 12);
            n = int(rand, 1, d - 1);
        } while (gcd(n, d) !== 1);
        const k = int(rand, 2, 6);
        const [bn, bd] = [n * k, d * k];
        // 只約一部分（沒有約到最簡）也是常見錯誤
        const partial = k % 2 === 0 && k > 2 ? raw(bn / 2, bd / 2) : raw(bn / k + 1, bd / k);
        return choice(
            `把 ${raw(bn, bd)} 約成最簡分數是多少？`,
            raw(n, d),
            [partial, raw(d, n), raw(bn - k, bd - k), raw(n + 1, d)],
            () => raw(int(rand, 1, d), d + int(rand, 1, 3)),
            [`找出 ${bn} 和 ${bd} 的最大公因數。`, '分子、分母同時除以最大公因數。'],
            `${bn} 和 ${bd} 的最大公因數是 ${k}，同除以 ${k} 得 ${raw(n, d)}。`,
            (w) => {
                const m = String(w).match(/^(\d+)\/(\d+)$/);
                return !m || (Number(m[1]) > 0 && Number(m[1]) * d !== Number(m[2]) * n);
            },
        );
    }
    if (difficulty === 'equivalent') {
        const d = int(rand, 2, 9);
        const n = int(rand, 1, d - 1);
        const k = int(rand, 2, 7);
        return choice(
            `${raw(n, d)} = ？/${d * k}，問號是多少？`,
            n * k,
            [n + k, n * k + 1, d * k - n, n * (k + 1)],
            near(rand, n * k, 4),
            [`分母 ${d} 變成 ${d * k}，乘了多少？`, '分子也要乘一樣的數。'],
            `分母乘 ${k}，分子也乘 ${k}：${n} × ${k} = ${n * k}。`,
            (w) => typeof w !== 'number' || w > 0,
        );
    }
    if (difficulty === 'compare') {
        let a = [0, 0];
        let b = [0, 0];
        do {
            const d1 = int(rand, 2, 9);
            let d2 = int(rand, 2, 9);
            if (d2 === d1) d2 = d1 + 1;
            a = [int(rand, 1, d1 - 1), d1];
            b = [int(rand, 1, d2 - 1), d2];
        } while (a[0] * b[1] === b[0] * a[1]);
        const askBig = rand() < 0.5;
        const aBig = a[0] * b[1] > b[0] * a[1];
        const ans = askBig === aBig ? raw(a[0], a[1]) : raw(b[0], b[1]);
        const other = ans === raw(a[0], a[1]) ? raw(b[0], b[1]) : raw(a[0], a[1]);
        const L = lcm(a[1], b[1]);
        return choice(
            `${raw(a[0], a[1])} 和 ${raw(b[0], b[1])}，哪一個比較${askBig ? '大' : '小'}？`,
            ans,
            [other, '一樣大'],
            () => '無法比較',
            ['分母不一樣，先通分。', `把兩個分數的分母都變成 ${L}。`],
            `通分後：${raw(a[0], a[1])} = ${raw((a[0] * L) / a[1], L)}，${raw(b[0], b[1])} = ${raw((b[0] * L) / b[1], L)}，所以比較${askBig ? '大' : '小'}的是 ${ans}。`,
        );
    }
    if (difficulty === 'add-sub') {
        const d1 = int(rand, 2, 9);
        let d2 = int(rand, 2, 10);
        if (d2 === d1) d2 = d1 + 1;
        // 題目裡的分數本身要是最簡分數
        const simplest = (d: number) => {
            let n = int(rand, 1, d - 1);
            while (gcd(n, d) !== 1) n = int(rand, 1, d - 1);
            return n;
        };
        const x = simplest(d1);
        const y = simplest(d2);
        const L = lcm(d1, d2);
        const add = rand() < 0.5 || x * d2 === y * d1;
        const big = x * d2 >= y * d1;
        const [p, q, sign] = add ? [[x, d1], [y, d2], '+'] : big ? [[x, d1], [y, d2], '-'] : [[y, d2], [x, d1], '-'];
        const num = sign === '+' ? (p[0] * L) / p[1] + (q[0] * L) / q[1] : (p[0] * L) / p[1] - (q[0] * L) / q[1];
        const ans = frac(num, L);
        const naive = sign === '+' ? raw(p[0] + q[0], p[1] + q[1]) : Math.abs(p[0] - q[0]) > 0 ? raw(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]) || p[1]) : raw(1, L);
        return choice(
            `${raw(p[0], p[1])} ${sign} ${raw(q[0], q[1])} = ？`,
            ans,
            [naive, frac(num + 1, L), frac(Math.max(1, num - 1), L), frac(num, L * 2)],
            () => frac(num + int(rand, 2, 5), L),
            ['分母不同不能直接加減，要先通分。', `兩個分母的最小公倍數是 ${L}。`],
            `通分成分母 ${L}：${raw((p[0] * L) / p[1], L)} ${sign} ${raw((q[0] * L) / q[1], L)} = ${raw(num, L)}${raw(num, L) === ans ? '' : ` = ${ans}`}。`,
            (w) => String(w) !== ans && !/^0\/|\/0$/.test(String(w)),
        );
    }
    if (difficulty === 'multiply') {
        const b = int(rand, 2, 9);
        const d = int(rand, 2, 9);
        let a = int(rand, 1, b - 1);
        while (gcd(a, b) !== 1) a = int(rand, 1, b - 1);
        let c = int(rand, 1, d - 1);
        while (gcd(c, d) !== 1) c = int(rand, 1, d - 1);
        const ans = frac(a * c, b * d);
        return choice(
            `${raw(a, b)} × ${raw(c, d)} = ？`,
            ans,
            [raw(a + c, b + d), frac(a * d, b * c), raw(a * c, b + d), frac(a * c + 1, b * d)],
            () => frac(int(rand, 1, 9), b * d),
            ['分子乘分子，分母乘分母。', '能約分的要約到最簡。'],
            `${a} × ${c} = ${a * c}，${b} × ${d} = ${b * d}，${raw(a * c, b * d)}${raw(a * c, b * d) === ans ? '' : ` = ${ans}`}。`,
            (w) => String(w) !== ans,
        );
    }
    // divide-whole：整數 ÷ 整數，商用分數表示
    const total = int(rand, 2, 9);
    let people = int(rand, 2, 9);
    if (people === total) people += 1;
    const ans = frac(total, people);
    const thing = pick(rand, [['公升果汁', '公升'], ['公斤米', '公斤'], ['個披薩', '個']] as const);
    return choice(
        `把 ${total} ${thing[0]}平分給 ${people} 個人，每人分到多少${thing[1]}？`,
        `${ans} ${thing[1]}`,
        [`${frac(people, total)} ${thing[1]}`, `${frac(1, people)} ${thing[1]}`, `${total * people} ${thing[1]}`, `${frac(total + 1, people)} ${thing[1]}`],
        () => `${frac(int(rand, 1, 9), people + 1)} ${thing[1]}`,
        ['平分用除法。', `${total} ÷ ${people} 可以寫成分數 ${total}/${people}。`],
        `${total} ÷ ${people} = ${raw(total, people)}${raw(total, people) === ans ? '' : ` = ${ans}`}（${thing[1]}）。`,
        (w) => !String(w).startsWith(`${ans} `),
    );
}

// ─── 小數乘除與換算 ───────────────────────────────────────

export function g5Decimal(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'mul') {
        // 一位小數 × 10；個位是 0 的話看起來會像整數，避開
        let a = int(rand, 11, 99);
        let b = int(rand, 11, 59);
        if (a % 10 === 0) a += 3;
        if (b % 10 === 0) b += 7;
        const p = a * b; // 結果單位 0.01
        const s = (n: number) => (n / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
        const sa = (a / 10).toString();
        const sb = (b / 10).toString();
        return choice(
            `${sa} × ${sb} = ？`,
            s(p),
            [s(p * 10), s(p / 10), String(p), s(a * 10 + b * 10)],
            () => s(p + pick(rand, [-1, 1]) * int(rand, 5, 50)),
            ['先當整數相乘。', `兩個數各有一位小數，答案要有兩位小數。`],
            `${a} × ${b} = ${p}，共兩位小數，所以是 ${s(p)}。`,
            (w) => String(w) !== s(p),
        );
    }
    if (difficulty === 'div') {
        const k = int(rand, 2, 9);
        const q = int(rand, 11, 299); // 商以 0.01 為單位
        const dividend = q * k;
        const s = (n: number) => (n / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
        return choice(
            `${s(dividend)} ÷ ${k} = ？`,
            s(q),
            [s(q * 10), s(q / 10), s(q + 1), s(dividend - k)],
            () => s(q + pick(rand, [-1, 1]) * int(rand, 2, 20)),
            ['商的小數點要和被除數的小數點對齊。', `可以用 ${k} × 答案 來驗算。`],
            `${k} × ${s(q)} = ${s(dividend)}，所以 ${s(dividend)} ÷ ${k} = ${s(q)}。`,
            (w) => String(w) !== s(q) && !/^0$/.test(String(w)),
        );
    }
    // convert：分數 ↔ 小數
    const [n, d] = pick(rand, [
        [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 10], [3, 10], [9, 20], [7, 25], [3, 20],
    ] as const);
    const v = dec3((n * 1000) / d);
    if (rand() < 0.5) {
        return choice(
            `${raw(n, d)} 化成小數是多少？`,
            v,
            [`${n}.${d}`, dec3((d * 1000) / n > 99000 ? 1 : Math.round((d * 1000) / n)), dec3((n * 100) / d), dec3((n * 1000) / d + 100)],
            () => dec3(int(rand, 1, 999)),
            [`分數就是分子 ÷ 分母。`, `算 ${n} ÷ ${d}。`],
            `${n} ÷ ${d} = ${v}。`,
            (w) => String(w) !== v,
        );
    }
    return choice(
        `${v} 化成最簡分數是多少？`,
        raw(n, d),
        [raw(n + 1, d), raw(d, n), raw(Math.round(Number(v) * 100), 1000), raw(n, d * 2)],
        () => raw(int(rand, 1, 9), d + 1),
        ['先寫成分母是 10、100 或 1000 的分數。', '再約分到最簡。'],
        `${v} = ${raw(Math.round(Number(v) * 10 ** (v.split('.')[1]?.length ?? 0)), 10 ** (v.split('.')[1]?.length ?? 0))} = ${raw(n, d)}。`,
        (w) => {
            const m = String(w).match(/^(\d+)\/(\d+)$/);
            return !m || Number(m[1]) * d !== Number(m[2]) * n;
        },
    );
}

// ─── 多邊形面積 ───────────────────────────────────────────

export function g5Area(difficulty: string, rand: Rand): ChoiceQuestion {
    const u = '平方公分';
    if (difficulty === 'parallelogram') {
        const b = int(rand, 4, 25);
        const h = int(rand, 3, 20);
        const side = h + int(rand, 1, 5);
        return choice(
            `平行四邊形的底是 ${b} 公分，高是 ${h} 公分（斜邊長 ${side} 公分），面積是多少？`,
            `${b * h} ${u}`,
            [`${b * side} ${u}`, `${(b * h) / 2} ${u}`, `${(b + side) * 2} ${u}`, `${b + h} ${u}`],
            () => `${b * h + int(rand, 2, 9)} ${u}`,
            ['平行四邊形可以剪拼成長方形。', '面積 = 底 × 高，用的是高，不是斜邊。'],
            `${b} × ${h} = ${b * h}（${u}）。斜邊長不是高，用不到。`,
        );
    }
    if (difficulty === 'triangle') {
        let b = int(rand, 4, 24);
        const h = int(rand, 3, 18);
        if ((b * h) % 2 === 1) b += 1;
        return choice(
            `三角形的底是 ${b} 公分，高是 ${h} 公分，面積是多少？`,
            `${(b * h) / 2} ${u}`,
            [`${b * h} ${u}`, `${b + h} ${u}`, `${(b + h) * 2} ${u}`, `${(b * h) / 2 + b} ${u}`],
            () => `${(b * h) / 2 + int(rand, 2, 9)} ${u}`,
            ['兩個一樣的三角形可以拼成平行四邊形。', '面積 = 底 × 高 ÷ 2。'],
            `${b} × ${h} ÷ 2 = ${(b * h) / 2}（${u}）。`,
        );
    }
    if (difficulty === 'trapezoid') {
        const top = int(rand, 3, 15);
        let bottom = top + int(rand, 2, 12);
        const h = int(rand, 2, 14);
        if (((top + bottom) * h) % 2 === 1) bottom += 1;
        const area = ((top + bottom) * h) / 2;
        return choice(
            `梯形的上底 ${top} 公分、下底 ${bottom} 公分、高 ${h} 公分，面積是多少？`,
            `${area} ${u}`,
            [`${(top + bottom) * h} ${u}`, `${top * bottom * h} ${u}`, `${top + bottom + h} ${u}`, `${(bottom * h) / 2 + top} ${u}`],
            () => `${area + int(rand, 2, 9)} ${u}`,
            ['兩個一樣的梯形可以拼成一個平行四邊形。', '面積 = (上底 + 下底) × 高 ÷ 2。'],
            `(${top} + ${bottom}) × ${h} ÷ 2 = ${area}（${u}）。`,
            (w) => !/\.\d/.test(String(w)),
        );
    }
    // missing：已知三角形面積和底，求高
    const b = int(rand, 3, 16);
    const h = int(rand, 2, 15) * (b % 2 === 0 ? 1 : 2);
    const area = (b * h) / 2;
    return choice(
        `三角形的面積是 ${area} 平方公分，底是 ${b} 公分，高是幾公分？`,
        `${h} 公分`,
        [`${area / b} 公分`, `${area - b} 公分`, `${area * 2} 公分`, `${h + 2} 公分`],
        () => `${h + int(rand, 3, 6)} 公分`,
        ['三角形面積 = 底 × 高 ÷ 2。', '反過來：高 = 面積 × 2 ÷ 底。'],
        `${area} × 2 ÷ ${b} = ${h}（公分）。`,
        (w) => !/\.\d|^0 |^-/.test(String(w)),
    );
}

// ─── 體積與容積 ───────────────────────────────────────────

export function g5Volume(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'cuboid') {
        const cube = rand() < 0.3;
        const l = int(rand, 2, 15);
        const w = cube ? l : int(rand, 2, 12);
        const h = cube ? l : int(rand, 2, 10);
        const v = l * w * h;
        const q = cube ? `邊長 ${l} 公分的正方體，體積是多少？` : `長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的長方體，體積是多少？`;
        return choice(
            q,
            `${v} 立方公分`,
            [`${l * w} 立方公分`, `${l + w + h} 立方公分`, `${2 * (l * w + w * h + l * h)} 立方公分`, `${v} 平方公分`, `${l * 3} 立方公分`],
            () => `${v + int(rand, 2, 20)} 立方公分`,
            ['體積 = 長 × 寬 × 高。', '體積的單位是「立方」公分。'],
            `${l} × ${w} × ${h} = ${v}（立方公分）。`,
        );
    }
    if (difficulty === 'units') {
        const m = int(rand, 2, 9);
        if (rand() < 0.5) {
            return choice(
                `${m} 立方公尺 = 幾立方公分？`,
                `${m * 1000000} 立方公分`,
                [`${m * 1000} 立方公分`, `${m * 10000} 立方公分`, `${m * 100} 立方公分`],
                () => `${m * 100000} 立方公分`,
                ['1 公尺 = 100 公分。', '1 立方公尺 = 100 × 100 × 100 立方公分。'],
                `1 立方公尺 = 1000000 立方公分，所以 ${m} 立方公尺 = ${m * 1000000} 立方公分。`,
            );
        }
        const L = int(rand, 2, 9);
        return choice(
            `${L} 公升 = 幾立方公分？`,
            `${L * 1000} 立方公分`,
            [`${L * 100} 立方公分`, `${L * 10} 立方公分`, `${L * 1000000} 立方公分`],
            () => `${L * 10000} 立方公分`,
            ['1 公升 = 1000 毫公升。', '1 毫公升 = 1 立方公分。'],
            `1 公升 = 1000 立方公分，所以 ${L} 公升 = ${L * 1000} 立方公分。`,
        );
    }
    // capacity：水箱裝幾公升
    const l = pick(rand, [10, 20, 25, 40, 50]);
    const w = pick(rand, [10, 20, 40]);
    let h = int(rand, 1, 6) * 10;
    if ((l * w * h) % 1000 !== 0) h = 10;
    const v = l * w * h;
    return choice(
        `一個水箱的內部長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分，最多可以裝幾公升的水？`,
        `${v / 1000} 公升`,
        [`${v} 公升`, `${v / 100} 公升`, `${v / 10000} 公升`, `${(l + w + h) / 10} 公升`],
        () => `${v / 1000 + int(rand, 1, 9)} 公升`,
        ['先算容積：長 × 寬 × 高。', '1000 立方公分 = 1 公升。'],
        `${l} × ${w} × ${h} = ${v}（立方公分），${v} ÷ 1000 = ${v / 1000}（公升）。`,
        (w2) => !/^0 |^0\.0/.test(String(w2)) && String(w2) !== `${v / 1000} 公升`,
    );
}

// ─── 百分率 ───────────────────────────────────────────────

export function g5Percent(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'convert') {
        if (rand() < 0.5) {
            const p = int(rand, 1, 99);
            const d = (p / 100).toString();
            return choice(
                `${d} 用百分率表示是多少？`,
                `${p}%`,
                [`${p / 10}%`, `${p * 10}%`, `${d}%`],
                () => `${p + int(rand, 1, 9)}%`,
                ['百分率的分母是 100。', '小數乘以 100 就是百分率。'],
                `${d} = ${p}/100 = ${p}%。`,
                (w) => String(w) !== `${p}%`,
            );
        }
        const [n, d] = pick(rand, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [7, 10], [3, 20], [9, 25], [1, 20]] as const);
        const p = (n * 100) / d;
        return choice(
            `${raw(n, d)} 用百分率表示是多少？`,
            `${p}%`,
            [`${n}${d}%`, `${n * 10}%`, `${100 - p}%`, `${d}%`],
            () => `${p + int(rand, 1, 9) * 5}%`,
            ['把分母變成 100。', `${raw(n, d)} = ?/100`],
            `${raw(n, d)} = ${raw(p, 100)} = ${p}%。`,
            (w) => String(w) !== `${p}%` && !/^0%/.test(String(w)),
        );
    }
    if (difficulty === 'of') {
        const total = pick(rand, [20, 25, 40, 50, 80, 120, 200, 300, 400, 500]);
        const p = pick(rand, [10, 20, 25, 30, 40, 50, 60, 75, 80].filter((x) => (total * x) % 100 === 0));
        const ans = (total * p) / 100;
        const [who, unit, what] = pick(rand, [['全班', '人', '戴眼鏡'], ['果園的果樹', '棵', '是芒果樹'], ['一包糖果', '顆', '是草莓口味']] as const);
        return choice(
            `${who}有 ${total} ${unit}，其中 ${p}% ${what}，${what}的有幾${unit}？`,
            `${ans} ${unit}`,
            [`${total - ans} ${unit}`, `${p} ${unit}`, `${ans * 10} ${unit}`, `${total / p > 0 ? Math.round(total / p) : 1} ${unit}`],
            () => `${ans + int(rand, 1, 9)} ${unit}`,
            [`${p}% 就是 ${p}/100。`, `算 ${total} × ${p}/100。`],
            `${total} × ${p}% = ${total} × ${p}/100 = ${ans}（${unit}）。`,
            (w) => !/^0 /.test(String(w)) && String(w) !== `${ans} ${unit}`,
        );
    }
    // discount：打折
    const price = int(rand, 2, 30) * 50;
    const off = pick(rand, [9, 8, 7, 6, 5, 75, 85, 95]);
    const rate = off < 10 ? off * 10 : off;
    const word = off < 10 ? `打${'零一二三四五六七八九'[off]}折` : `打${'零一二三四五六七八九'[Math.floor(off / 10)]}${'零一二三四五六七八九'[off % 10]}折`;
    if ((price * rate) % 100 !== 0) return g5Percent('discount', rand);
    const ans = (price * rate) / 100;
    return choice(
        `一件外套原價 ${price} 元，${word}後要付多少元？`,
        `${ans} 元`,
        [`${price - ans} 元`, `${price - rate} 元`, `${(price * (100 - rate)) / 100 + 10} 元`, `${price - off} 元`],
        () => `${ans + int(rand, 1, 9) * 10} 元`,
        [`${word}就是原價的 ${rate}%。`, `算 ${price} × ${rate}/100。`],
        `${word}是原價的 ${rate}%，${price} × ${rate}/100 = ${ans}（元）。`,
        (w) => !/^-|^0 /.test(String(w)) && String(w) !== `${ans} 元`,
    );
}

export const GRADE5_GENERATORS: Record<string, LocalGenerator> = {
    g5Factors,
    g5Fraction,
    g5Decimal,
    g5Area,
    g5Volume,
    g5Percent,
};
