// 四年級數學的程式出題：億以內的大數、概數、多位數乘除、四則運算、分數（帶分數、整數乘分數）、
// 二位小數、角度、面積單位、時間換算。誘答盡量用孩子真的會犯的錯。

import type { ChoiceQuestion } from '../types';
import { choice, int, near, pick, type LocalGenerator, type Rand } from './shared';

// ─── 共用格式 ─────────────────────────────────────────────

const CN_DIGITS = '零一二三四五六七八九';

/** 四位以內的國字讀法（不含「萬、億」） */
function group4(g: number): string {
    const units = ['千', '百', '十', ''];
    const d = String(g).padStart(4, '0').split('').map(Number);
    let out = '';
    let zero = false;
    d.forEach((x, i) => {
        if (x === 0) {
            if (out) zero = true;
            return;
        }
        if (zero) out += '零';
        zero = false;
        out += CN_DIGITS[x] + units[i];
    });
    return out;
}

/** 億以內整數的國字讀法，例如 30050000 → 三千零五萬 */
export function toChinese(n: number): string {
    if (n === 0) return '零';
    const groups = [Math.floor(n / 1e8), Math.floor(n / 1e4) % 1e4, n % 1e4];
    const names = ['億', '萬', ''];
    let out = '';
    let gap = false;
    groups.forEach((g, i) => {
        if (g === 0) {
            if (out) gap = true;
            return;
        }
        if (out && (gap || g < 1000)) out += '零';
        gap = false;
        out += group4(g) + names[i];
    });
    return out.startsWith('一十') ? out.slice(1) : out;
}

/** 分子、分母寫成分數；大於 1 寫成帶分數「2又1/3」 */
export const mixed = (num: number, den: number) => {
    const w = Math.floor(num / den);
    const r = num % den;
    if (r === 0) return String(w);
    return w === 0 ? `${r}/${den}` : `${w}又${r}/${den}`;
};

/** 百分位小數：以 0.01 為單位的整數轉成字串，去掉多餘的 0 */
export const dec2 = (h: number) => (h / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

const zeroVariants = (n: number, rand: Rand) => {
    const s = String(n);
    const out: number[] = [n * 10, Math.floor(n / 10)];
    const i = s.indexOf('0', 1);
    if (i > 0) out.push(Number(s.slice(0, i) + s.slice(i + 1)));
    const j = int(rand, 1, s.length - 1);
    out.push(Number(s.slice(0, j) + '0' + s.slice(j)));
    return out.filter((x) => x > 0 && x !== n);
};

// ─── 大數 ─────────────────────────────────────────────────

const BIG_PLACES = ['個位', '十位', '百位', '千位', '萬位', '十萬位', '百萬位', '千萬位', '億位'];

/** 產生有幾個 0 的大數，讀寫才有挑戰 */
function bigNumber(rand: Rand) {
    const len = int(rand, 5, 9);
    const digits = Array.from({ length: len }, (_, i) => (i === 0 ? int(rand, 1, 9) : rand() < 0.35 ? 0 : int(rand, 1, 9)));
    return Number(digits.join(''));
}

export function g4BigNumbers(difficulty: string, rand: Rand): ChoiceQuestion {
    const n = bigNumber(rand);
    if (difficulty === 'read') {
        if (rand() < 0.5) {
            return choice(
                `「${toChinese(n)}」寫成數字是多少？`,
                n,
                zeroVariants(n, rand),
                () => n + pick(rand, [1, 10, 100, 1000, 10000]),
                ['先找「億」和「萬」，把數字分成四位一組。', '每一組不滿四位的，前面要補 0。'],
                `${toChinese(n)}寫成 ${n}。從右邊每四位一組：個、萬、億。`,
            );
        }
        return choice(
            `${n} 怎麼讀？`,
            toChinese(n),
            zeroVariants(n, rand).map(toChinese),
            () => toChinese(n + pick(rand, [10, 100, 10000])),
            ['從右邊數四位是「萬」，再四位是「億」。', '中間有 0 要讀「零」，但連續的 0 只讀一個。'],
            `${n} 讀作「${toChinese(n)}」。`,
        );
    }
    if (difficulty === 'place') {
        const s = String(n);
        const idx = int(rand, 0, s.length - 1);
        const digit = Number(s[s.length - 1 - idx]);
        const value = digit * 10 ** idx;
        if (digit !== 0 && rand() < 0.5) {
            return choice(
                `${n} 的${BIG_PLACES[idx]}數字代表多少？`,
                value,
                [digit, digit * 10 ** (idx + 1), idx > 0 ? digit * 10 ** (idx - 1) : digit * 100],
                () => digit * 10 ** int(rand, 0, 8),
                ['從右邊數：個、十、百、千、萬……', `${BIG_PLACES[idx]}的 1 代表 ${10 ** idx}。`],
                `${BIG_PLACES[idx]}是 ${digit}，代表 ${value}。`,
            );
        }
        return choice(
            `${n} 的${BIG_PLACES[idx]}數字是多少？`,
            digit,
            [...new Set(s.split('').map(Number))].filter((x) => x !== digit),
            () => int(rand, 0, 9),
            ['從最右邊的個位開始往左數。'],
            `從右邊數到${BIG_PLACES[idx]}，數字是 ${digit}。`,
        );
    }
    // compare：四個位數一樣的大數
    const pool = new Set<number>([n]);
    const s = String(n);
    for (let k = 0; pool.size < 4 && k < 20; k++) {
        const i = int(rand, 1, s.length - 1);
        const j = int(rand, 1, s.length - 1);
        const arr = s.split('');
        [arr[i], arr[j]] = [arr[j], arr[i]];
        pool.add(Number(arr.join('')));
        if (pool.size < 4) pool.add(n + pick(rand, [1, -1]) * 10 ** int(rand, 1, s.length - 2));
    }
    const nums = [...pool].slice(0, 4);
    const askBig = rand() < 0.5;
    const ans = askBig ? Math.max(...nums) : Math.min(...nums);
    return choice(
        `下列哪一個數最${askBig ? '大' : '小'}？`,
        ans,
        nums.filter((x) => x !== ans),
        () => ans + (askBig ? -1 : 1) * int(rand, 1, 9),
        ['位數一樣時，從最高位開始比。', '第一個不一樣的位，數字大的就比較大。'],
        `從最高位開始一位一位比，最${askBig ? '大' : '小'}的是 ${ans}。`,
    );
}

// ─── 概數 ─────────────────────────────────────────────────

const ROUND_PLACES: [string, number][] = [
    ['百位', 100],
    ['千位', 1000],
    ['萬位', 10000],
];
const METHODS = ['四捨五入', '無條件捨去', '無條件進入'] as const;
const roundBy = (n: number, unit: number, m: (typeof METHODS)[number]) =>
    m === '四捨五入' ? Math.round(n / unit) * unit : m === '無條件捨去' ? Math.floor(n / unit) * unit : Math.ceil(n / unit) * unit;

export function g4Rounding(_difficulty: string, rand: Rand): ChoiceQuestion {
    const [place, unit] = pick(rand, ROUND_PLACES);
    let n = int(rand, unit * 3, unit * 99);
    if (n % unit === 0) n += int(rand, 1, unit - 1);
    const method = pick(rand, METHODS);
    const ans = roundBy(n, unit, method);
    const half = unit / 2;
    return choice(
        `${n} 用${method}法取概數到${place}，是多少？`,
        ans,
        [...METHODS.filter((m) => m !== method).map((m) => roundBy(n, unit, m)), roundBy(n, unit * 10, method), ans + unit, ans - unit].filter((x) => x > 0 && x !== n),
        () => ans + pick(rand, [-1, 1]) * unit * int(rand, 2, 4),
        method === '四捨五入'
            ? [`看${place}的下一位。`, '小於 5 捨去，大於或等於 5 就進 1。']
            : method === '無條件捨去'
              ? [`${place}以下的數字全部變成 0。`, '不管後面是多少，都捨去。']
              : [`${place}以下只要不是 0，就進 1。`, `進 1 以後，${place}以下都變成 0。`],
        method === '四捨五入'
            ? `${place}的下一位${n % unit >= half ? '大於或等於 5，進 1' : '小於 5，捨去'}，所以是 ${ans}。`
            : `用${method}法，${n} 取到${place}是 ${ans}。`,
        (w) => typeof w !== 'number' || w > 0,
    );
}

// ─── 多位數乘法 ───────────────────────────────────────────

export function g4Multiply(difficulty: string, rand: Rand): ChoiceQuestion {
    const a = difficulty === '3x2' ? int(rand, 102, 999) : int(rand, 13, 99);
    const b = int(rand, 12, 99);
    const p = a * b;
    const tens = Math.floor(b / 10);
    const ones = b % 10;
    // 常見錯誤：十位那一行忘了往左移一位
    const noShift = a * ones + a * tens;
    if (rand() < 0.3) {
        const [item, unit] = pick(rand, [['門票', '張'], ['便當', '個'], ['跳繩', '條'], ['書', '本']] as const);
        const price = a;
        return choice(
            `一${unit}${item} ${price} 元，買 ${b} ${unit}要多少元？`,
            `${p} 元`,
            [`${noShift} 元`, `${price + b} 元`, `${p + price} 元`, `${p - price} 元`],
            () => `${p + pick(rand, [-1, 1]) * int(rand, 1, 9) * 10} 元`,
            ['一樣的東西買很多個，用乘法。', `算 ${price} × ${b}。`],
            `${price} × ${b} = ${p}（元）。`,
        );
    }
    return choice(
        `${a} × ${b} = ？`,
        p,
        [noShift, p + a, p - a, p + 100, p - 10],
        near(rand, p, 50),
        [`先算 ${a} × ${ones}，再算 ${a} × ${tens}0。`, '十位乘出來的結果要往左移一位（後面補 0）。'],
        `${a} × ${ones} = ${a * ones}，${a} × ${tens * 10} = ${a * tens * 10}，相加得 ${p}。`,
    );
}

// ─── 多位數除法 ───────────────────────────────────────────

const qr = (q: number, r: number) => (r === 0 ? String(q) : `${q} 餘 ${r}`);

export function g4Divide(difficulty: string, rand: Rand): ChoiceQuestion {
    const two = difficulty === 'by2';
    const b = two ? int(rand, 12, 49) : int(rand, 2, 9);
    // 一位數除法刻意常出「商中間有 0」的題目，例如 618 ÷ 6 = 103
    let q = two ? int(rand, 3, 40) : int(rand, 21, 999);
    if (!two && rand() < 0.4) q = int(rand, 1, 9) * 100 + int(rand, 1, 9);
    const r = rand() < 0.5 ? 0 : int(rand, 1, b - 1);
    const a = b * q + r;
    const qs = String(q);
    const dropZero = qs.includes('0') ? Number(qs.replace('0', '')) : q * 10;
    return choice(
        `${a} ÷ ${b} = ？`,
        qr(q, r),
        [qr(dropZero, r), qr(q + 1, r), qr(q - 1, r), r ? qr(q, r === b - 1 ? r - 1 : r + 1) : qr(q, 1)],
        () => qr(q + int(rand, 2, 5), r),
        two ? [`先估一估：${b} 大約是幾十？`, '每一步的餘數都要比除數小。'] : ['從最高位開始一位一位除。', '不夠除的那一位，商要寫 0。'],
        `${b} × ${q}${r ? ` + ${r}` : ''} = ${a}，所以 ${a} ÷ ${b} = ${qr(q, r)}。`,
        (w) => !/^0 |餘 0$/.test(String(w)),
    );
}

// ─── 四則運算 ─────────────────────────────────────────────

export function g4OrderOps(_difficulty: string, rand: Rand): ChoiceQuestion {
    const kind = int(rand, 0, 3);
    const a = int(rand, 10, 90);
    const b = int(rand, 2, 12);
    const c = int(rand, 2, 9);
    const hints = ['先算括號裡面的。', '沒有括號時，先乘除、後加減；同一級從左到右算。'];
    if (kind === 0) {
        const ans = a + b * c;
        return choice(`${a} + ${b} × ${c} = ？`, ans, [(a + b) * c, a + b + c, a * b + c], near(rand, ans, 10), hints, `先算 ${b} × ${c} = ${b * c}，再算 ${a} + ${b * c} = ${ans}。`);
    }
    if (kind === 1) {
        const ans = (a + b) * c;
        return choice(`(${a} + ${b}) × ${c} = ？`, ans, [a + b * c, a + b + c, a * c + b], near(rand, ans, 10), hints, `先算括號 ${a} + ${b} = ${a + b}，再乘 ${c}，得 ${ans}。`);
    }
    if (kind === 2) {
        const bb = b * c;
        const big = a + bb;
        const ans = big - bb / c;
        return choice(`${big} - ${bb} ÷ ${c} = ？`, ans, [(big - bb) / c, big - bb - c, big - c], near(rand, ans, 10), hints, `先算 ${bb} ÷ ${c} = ${bb / c}，再算 ${big} - ${bb / c} = ${ans}。`);
    }
    // a × c - b × c，可以用分配律 (a - b) × c
    const aa = Math.max(a, b + 5);
    const ans = (aa - b) * c;
    return choice(
        `${aa} × ${c} - ${b} × ${c} = ？`,
        ans,
        [aa * c - b, (aa * c - b) * c, aa - b * c, ans + c],
        near(rand, ans, 10),
        hints,
        `先算兩個乘法：${aa * c} - ${b * c} = ${ans}。也可以用 (${aa} - ${b}) × ${c} = ${ans}。`,
        (w) => typeof w !== 'number' || w > 0,
    );
}

// ─── 分數 ─────────────────────────────────────────────────

export function g4Fraction(difficulty: string, rand: Rand): ChoiceQuestion {
    const d = int(rand, 3, 12);
    if (difficulty === 'convert') {
        const w = int(rand, 1, 5);
        const r = int(rand, 1, d - 1);
        const num = w * d + r;
        if (rand() < 0.5) {
            return choice(
                `假分數 ${num}/${d} 化成帶分數是多少？`,
                mixed(num, d),
                [`${w}又${d}/${r}`, `${w + 1}又${r}/${d}`, `${r}又${w}/${d}`, w > 1 ? `${w - 1}又${r}/${d}` : `${w}又${r}/${num}`],
                () => `${w}又${int(rand, 1, d - 1)}/${d}`,
                [`${num} 裡面有幾個 ${d}？`, '整數部分是商，分子是餘數，分母不變。'],
                `${num} ÷ ${d} = ${w} 餘 ${r}，所以 ${num}/${d} = ${mixed(num, d)}。`,
            );
        }
        return choice(
            `帶分數 ${w}又${r}/${d} 化成假分數是多少？`,
            `${num}/${d}`,
            [`${w + r}/${d}`, `${w * r + d}/${d}`, `${num}/${d * w}`, `${w * d}/${d}`],
            () => `${num + pick(rand, [-1, 1]) * int(rand, 1, 3)}/${d}`,
            [`${w} 個 1 等於幾個 1/${d}？`, '整數 × 分母，再加上分子。'],
            `${w} × ${d} + ${r} = ${num}，所以 ${w}又${r}/${d} = ${num}/${d}。`,
        );
    }
    if (difficulty === 'add-sub') {
        const w1 = int(rand, 1, 5);
        const w2 = int(rand, 1, 4);
        const x = int(rand, 1, d - 1);
        const y = int(rand, 1, d - 1);
        if (rand() < 0.5) {
            const total = (w1 + w2) * d + x + y;
            return choice(
                `${w1}又${x}/${d} + ${w2}又${y}/${d} = ？`,
                mixed(total, d),
                // 不放「8又9/6」這種沒化簡的寫法：它和正解一樣大，不能當錯誤選項
                [`${w1 + w2}又${(x + y) % d || 1}/${d}`, mixed(total + d, d), mixed(total + 1, d), mixed(total - 1, d)],
                () => mixed(total + pick(rand, [-1, 1]) * int(rand, 2, 4), d),
                ['整數加整數，分子加分子，分母不變。', '分子加起來超過分母，就要進位成 1。'],
                `${w1} + ${w2} = ${w1 + w2}，${x}/${d} + ${y}/${d} = ${x + y}/${d}，合起來是 ${mixed(total, d)}。`,
            );
        }
        // x 比 y 小時要借位，這是最容易錯的地方
        const big = (w1 + w2) * d + x;
        const small = w2 * d + y;
        const diff = big - small;
        const noBorrow = x === y ? mixed(diff + d, d) : `${w1}又${Math.abs(x - y)}/${d}`;
        return choice(
            `${mixed(big, d)} - ${mixed(small, d)} = ？`,
            mixed(diff, d),
            [noBorrow, mixed(diff + d, d), mixed(diff - 1, d), mixed(diff + 1, d)],
            () => mixed(diff + int(rand, 2, 5), d),
            ['整數減整數，分子減分子，分母不變。', '分子不夠減，就從整數借 1 變成分母/分母。'],
            `${mixed(big, d)} - ${mixed(small, d)} = ${mixed(diff, d)}。`,
            (w) => String(w) !== '0',
        );
    }
    // times：整數 × 真分數
    const k = int(rand, 2, 9);
    const x = int(rand, 1, d - 1);
    const num = k * x;
    return choice(
        `${k} × ${x}/${d} = ？`,
        mixed(num, d),
        [`${x}/${k * d}`, `${num}/${k * d}`, mixed(num + d, d), `${k + x}/${d}`],
        () => mixed(num + int(rand, 1, 3), d),
        [`${k} 個 ${x}/${d} 相加。`, '分母不變，分子乘以整數。'],
        `${k} × ${x}/${d} = ${num}/${d}${num >= d ? ` = ${mixed(num, d)}` : ''}。`,
    );
}

// ─── 二位小數 ─────────────────────────────────────────────

/** 小數點沒對齊（靠右對齊）時算出來的錯誤答案 */
const misaligned = (a: string, b: string, op: 1 | -1) => {
    const da = (a.split('.')[1] ?? '').length;
    const db = (b.split('.')[1] ?? '').length;
    if (da === db) return null;
    const v = Number(a.replace('.', '')) + op * Number(b.replace('.', ''));
    return v > 0 ? dec2(v * 10 ** (2 - Math.max(da, db))) : null;
};

export function g4Decimal(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'place') {
        const h = int(rand, 101, 999);
        const v = dec2(h);
        const [ones, tenths, hund] = [Math.floor(h / 100), Math.floor(h / 10) % 10, h % 10];
        if (hund !== 0 && rand() < 0.5) {
            return choice(
                `${v} 的百分位數字是多少？`,
                hund,
                [tenths, ones, hund * 10].filter((x) => x !== hund),
                () => int(rand, 0, 9),
                ['小數點右邊第一位是十分位，第二位是百分位。'],
                `${v} 的十分位是 ${tenths}，百分位是 ${hund}。`,
            );
        }
        return choice(
            `${v} 裡面有幾個 0.01？`,
            h,
            [Math.floor(h / 10), h * 10, ones * 100 + hund, h + 1],
            near(rand, h, 9),
            ['1 裡面有 100 個 0.01。', '0.1 裡面有 10 個 0.01。'],
            `${ones} 有 ${ones * 100} 個 0.01，0.${tenths} 有 ${tenths * 10} 個，再加 ${hund} 個，一共 ${h} 個 0.01。`,
            (w) => typeof w !== 'number' || w > 0,
        );
    }
    if (difficulty === 'compare') {
        const base = int(rand, 101, 899);
        const pool = new Set<number>([base, Math.floor(base / 10) * 10 + pick(rand, [0, 10]), base + pick(rand, [9, -9, 1]), Math.round(base / 10) * 10 + 5]);
        while (pool.size < 4) pool.add(base + int(rand, -40, 40));
        const nums = [...pool].filter((x) => x > 0).slice(0, 4);
        const askBig = rand() < 0.5;
        const ans = askBig ? Math.max(...nums) : Math.min(...nums);
        return choice(
            `下列哪一個數最${askBig ? '大' : '小'}？`,
            dec2(ans),
            nums.filter((x) => x !== ans).map(dec2),
            () => dec2(ans + (askBig ? -1 : 1) * int(rand, 1, 9)),
            ['先比整數部分，再比十分位、百分位。', '0.5 和 0.50 一樣大，位數多不代表比較大。'],
            `一位一位比較，最${askBig ? '大' : '小'}的是 ${dec2(ans)}。`,
        );
    }
    if (difficulty === 'add-sub') {
        const a = int(rand, 50, 999);
        const b = int(rand, 20, 600);
        const [sa, sb] = [dec2(a), dec2(b)];
        if (rand() < 0.5) {
            const s = a + b;
            return choice(
                `${sa} + ${sb} = ？`,
                dec2(s),
                [misaligned(sa, sb, 1) ?? dec2(s + 10), dec2(s + 100), dec2(s - 10), dec2(s + 1)],
                () => dec2(s + pick(rand, [-1, 1]) * int(rand, 2, 30)),
                ['小數點要對齊。', '位數不一樣時，後面可以補 0 再算。'],
                `小數點對齊：${sa} + ${sb} = ${dec2(s)}。`,
            );
        }
        const [big, small] = a > b ? [a, b] : [b, a];
        if (big === small) return g4Decimal('add-sub', rand);
        const [sbig, ssmall] = [dec2(big), dec2(small)];
        const diff = big - small;
        return choice(
            `${sbig} - ${ssmall} = ？`,
            dec2(diff),
            [misaligned(sbig, ssmall, -1) ?? dec2(diff + 10), dec2(diff + 100), dec2(diff - 1), dec2(diff + 1)],
            () => dec2(diff + pick(rand, [-1, 1]) * int(rand, 2, 30)),
            ['小數點要對齊。', '不夠減就向左邊借 1。'],
            `小數點對齊：${sbig} - ${ssmall} = ${dec2(diff)}。`,
            (w) => !/^-|^0$/.test(String(w)),
        );
    }
    // times：小數 × 整數
    const h = int(rand, 12, 499);
    const k = int(rand, 2, 9);
    const p = h * k;
    return choice(
        `${dec2(h)} × ${k} = ？`,
        dec2(p),
        [dec2(p * 10), dec2(Math.round(p / 10)), String(p), dec2(p + k)],
        () => dec2(p + pick(rand, [-1, 1]) * int(rand, 2, 20)),
        ['先當成整數相乘。', `${dec2(h)} 有幾位小數，答案就有幾位小數。`],
        `${h} × ${k} = ${p}，再點回小數點：${dec2(p)}。`,
    );
}

// ─── 角度 ─────────────────────────────────────────────────

export function g4Angle(difficulty: string, rand: Rand): ChoiceQuestion {
    const deg = (n: number) => `${n}°`;
    if (difficulty === 'triangle') {
        const a = int(rand, 20, 100);
        const b = int(rand, 15, 160 - a);
        const c = 180 - a - b;
        return choice(
            `三角形的兩個角是 ${a}° 和 ${b}°，第三個角是幾度？`,
            deg(c),
            [deg(360 - a - b), deg(a + b), deg(Math.abs(90 - a)), deg(c + 10)],
            () => deg(c + pick(rand, [-1, 1]) * int(rand, 5, 20)),
            ['三角形三個角加起來是幾度？', '180° 減掉已知的兩個角。'],
            `三角形內角和是 180°，180 - ${a} - ${b} = ${c}（度）。`,
            (w) => !/^0°|^-/.test(String(w)),
        );
    }
    if (difficulty === 'straight') {
        const a = int(rand, 25, 155);
        if (rand() < 0.5) {
            return choice(
                `兩個角合起來剛好是一條直線（平角），其中一個是 ${a}°，另一個是幾度？`,
                deg(180 - a),
                [deg(Math.abs(90 - a)), deg(360 - a), deg(a), deg(180 - a + 10)],
                () => deg(180 - a + pick(rand, [-1, 1]) * int(rand, 5, 20)),
                ['平角是幾度？'],
                `平角是 180°，180 - ${a} = ${180 - a}（度）。`,
                (w) => !/^0°/.test(String(w)),
            );
        }
        const b = int(rand, 60, 120);
        const c = int(rand, 60, 120);
        // 第四個角落在 40°～170°，避免出現 0° 或平角
        const e = int(rand, Math.max(60, 360 - b - c - 170), Math.min(120, 360 - b - c - 40));
        const fourth = 360 - b - c - e;
        return choice(
            `四邊形的三個角是 ${b}°、${c}° 和 ${e}°，第四個角是幾度？`,
            deg(fourth),
            [deg(Math.abs(180 - b - c - e) || fourth + 90), deg(fourth + 90), deg(fourth - 10), deg(fourth + 30)],
            () => deg(fourth + pick(rand, [-1, 1]) * int(rand, 5, 20)),
            ['四邊形四個角加起來是幾度？', '360° 減掉已知的三個角。'],
            `四邊形內角和是 360°，360 - ${b} - ${c} - ${e} = ${fourth}（度）。`,
            (w) => !/^0°|^-/.test(String(w)),
        );
    }
    if (difficulty === 'clock') {
        const h = int(rand, 1, 11);
        const ang = Math.min(30 * h, 360 - 30 * h);
        return choice(
            `時鐘 ${h} 點整，長針和短針形成的角（比較小的那個）是幾度？`,
            deg(ang),
            [deg(30 * h === ang ? 360 - ang : 30 * h), deg(h * 10), deg(ang + 30), deg(Math.max(30, ang - 30))],
            () => deg(30 * int(rand, 1, 6)),
            ['時鐘一圈 360°，有 12 大格。', '每一大格是 30°。'],
            `${h} 點整兩針相差 ${Math.min(h, 12 - h)} 大格，${Math.min(h, 12 - h)} × 30 = ${ang}（度）。`,
        );
    }
    // rotate
    const k = int(rand, 1, 4);
    const words = ['', '1 個直角', '2 個直角（半圈）', '3 個直角', '4 個直角（一圈）'];
    return choice(
        `一個人原地轉了 ${words[k]}，一共轉了幾度？`,
        deg(90 * k),
        [deg(45 * k), deg(90 * k + 90), deg(180 * k), deg(60 * k)],
        () => deg(90 * int(rand, 1, 4)),
        ['1 個直角是 90°。'],
        `${k} × 90 = ${90 * k}（度）。`,
    );
}

// ─── 面積單位 ─────────────────────────────────────────────

export function g4AreaUnits(_difficulty: string, rand: Rand): ChoiceQuestion {
    const kind = int(rand, 0, 2);
    if (kind === 0) {
        const m = int(rand, 2, 9);
        return choice(
            `${m} 平方公尺 = 幾平方公分？`,
            `${m * 10000} 平方公分`,
            [`${m * 100} 平方公分`, `${m * 1000} 平方公分`, `${m * 100000} 平方公分`],
            () => `${m * 10} 平方公分`,
            ['1 公尺 = 100 公分。', '1 平方公尺是邊長 100 公分的正方形，面積是 100 × 100。'],
            `1 平方公尺 = 10000 平方公分，所以 ${m} 平方公尺 = ${m * 10000} 平方公分。`,
        );
    }
    if (kind === 1) {
        const m = int(rand, 2, 9);
        return choice(
            `${m * 10000} 平方公分 = 幾平方公尺？`,
            `${m} 平方公尺`,
            [`${m * 100} 平方公尺`, `${m * 10} 平方公尺`, `${m * 1000} 平方公尺`],
            () => `${m + 1} 平方公尺`,
            ['1 平方公尺 = 10000 平方公分。'],
            `${m * 10000} ÷ 10000 = ${m}，所以是 ${m} 平方公尺。`,
        );
    }
    const l = int(rand, 3, 25);
    const w = int(rand, 2, l - 1);
    const [thing] = pick(rand, [['教室地板'], ['花圃'], ['操場一角'], ['游泳池']] as const);
    return choice(
        `長方形的${thing}長 ${l} 公尺、寬 ${w} 公尺，面積是多少？`,
        `${l * w} 平方公尺`,
        [`${(l + w) * 2} 平方公尺`, `${l + w} 平方公尺`, `${l * w} 公尺`, `${l * w * 2} 平方公尺`],
        () => `${l * w + int(rand, 1, 9)} 平方公尺`,
        ['長方形面積 = 長 × 寬。', '面積的單位要用「平方」公尺。'],
        `${l} × ${w} = ${l * w}（平方公尺）。注意 (${l} + ${w}) × 2 = ${(l + w) * 2} 是周長，不是面積。`,
    );
}

// ─── 時間換算 ─────────────────────────────────────────────

const hhmm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const dur = (m: number) => (m < 60 ? `${m} 分` : m % 60 === 0 ? `${m / 60} 小時` : `${Math.floor(m / 60)} 小時 ${m % 60} 分`);

export function g4Time(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'convert') {
        if (rand() < 0.5) {
            const d = int(rand, 1, 6);
            const h = int(rand, 1, 23);
            const total = d * 24 + h;
            return choice(
                `${d} 日 ${h} 小時 = 幾小時？`,
                `${total} 小時`,
                [`${d * 12 + h} 小時`, `${d * 60 + h} 小時`, `${d * 10 + h} 小時`],
                () => `${total + pick(rand, [-1, 1]) * int(rand, 1, 10)} 小時`,
                ['1 日 = 24 小時。'],
                `${d} × 24 = ${d * 24}，${d * 24} + ${h} = ${total}（小時）。`,
            );
        }
        const h = int(rand, 2, 9);
        const m = int(rand, 5, 55);
        const total = h * 60 + m;
        return choice(
            `${total} 分鐘 = 幾小時幾分？`,
            `${h} 小時 ${m} 分`,
            [`${Math.floor(total / 100)} 小時 ${total % 100} 分`, `${h + 1} 小時 ${m} 分`, `${h} 小時 ${m + 10 < 60 ? m + 10 : m - 10} 分`],
            () => `${h} 小時 ${int(rand, 1, 59)} 分`,
            ['1 小時 = 60 分鐘。', `${total} 裡面有幾個 60？`],
            `${total} = 60 × ${h} + ${m}，所以是 ${h} 小時 ${m} 分。`,
            (w) => !/^0 | 0 分/.test(String(w)),
        );
    }
    // elapsed：兩個時刻相差多久
    const start = int(rand, 7 * 12, 12 * 12) * 5;
    let end = start + int(rand, 13, 72) * 5;
    if (end % 60 === start % 60) end += 15;
    const diff = end - start;
    // 常見錯誤：小時相減、分鐘也直接相減（不借位）
    const naive = dur((Math.floor(end / 60) - Math.floor(start / 60)) * 60 + Math.abs((end % 60) - (start % 60)));
    const event = pick(rand, ['烤蛋糕', '爬山', '圖書館志工', '畫展參觀', '社團活動']);
    return choice(
        `${event}從 ${hhmm(start)} 到 ${hhmm(end)}，一共經過多久？`,
        dur(diff),
        [naive, dur(diff + 60), dur(Math.max(5, diff - 10)), dur(diff + 10)],
        () => dur(diff + pick(rand, [-1, 1]) * int(rand, 1, 6) * 5),
        ['可以先算到整點，再算剩下的。', '分鐘不夠減時，借 1 小時 = 60 分鐘。'],
        `${hhmm(start)} 到 ${hhmm(end)} 相差 ${diff} 分鐘，也就是 ${dur(diff)}。`,
    );
}

export const GRADE4_GENERATORS: Record<string, LocalGenerator> = {
    g4BigNumbers,
    g4Rounding,
    g4Multiply,
    g4Divide,
    g4OrderOps,
    g4Fraction,
    g4Decimal,
    g4Angle,
    g4AreaUnits,
    g4Time,
};
