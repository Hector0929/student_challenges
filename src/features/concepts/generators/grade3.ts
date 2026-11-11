// 三年級數學的程式出題：一萬以內的數、四位數加減、乘法、除法、同分母分數、一位小數、
// 長度容量重量的單位換算、時間（24 時制、秒）、兩步驟應用題。
// 誘答盡量用孩子真的會犯的錯（忘了進位、單位換算用錯倍數、餘數比除數大…）。

import type { ChoiceQuestion } from '../types';
import { choice, dec1, int, near, pick, type LocalGenerator, type Rand } from './shared';

const digitsOf = (n: number) => String(n).split('').map(Number);

// ─── 一萬以內的數 ─────────────────────────────────────────

const PLACES = ['千位', '百位', '十位', '個位'];
const PLACE_VALUES = [1000, 100, 10, 1];

export function g3Numbers(difficulty: string, rand: Rand): ChoiceQuestion {
    const n = int(rand, 1001, 9999);
    const d = digitsOf(n);
    if (difficulty === 'place') {
        if (rand() < 0.5) {
            const tens = pick(rand, [0, d[2]]);
            const m = d[0] * 1000 + d[1] * 100 + tens * 10 + d[3];
            return choice(
                `${d[0]} 個千、${d[1]} 個百、${tens} 個十、${d[3]} 個一合起來是多少？`,
                m,
                [Number(`${d[0]}${d[1]}${tens || ''}${d[3]}`), d[0] * 1000 + d[1] * 100 + d[3] * 10 + tens, d[0] * 100 + d[1] * 10 + tens + d[3]],
                near(rand, m, 30),
                ['千位、百位、十位、個位依序寫下來。', tens === 0 ? '沒有十，十位要寫 0 佔位子。' : '每一位放一個數字。'],
                `千位 ${d[0]}、百位 ${d[1]}、十位 ${tens}、個位 ${d[3]}，寫成 ${m}。`,
            );
        }
        const idx = pick(rand, [0, 1, 2, 3].filter((i) => d[i] !== 0));
        const value = d[idx] * PLACE_VALUES[idx];
        return choice(
            `${n} 的${PLACES[idx]}數字代表多少？`,
            value,
            [d[idx], ...PLACE_VALUES.filter((_, i) => i !== idx).map((p) => d[idx] * p)],
            near(rand, value, 9),
            ['從右邊數：個位、十位、百位、千位。', `${PLACES[idx]}的 1 代表 ${PLACE_VALUES[idx]}。`],
            `${n} 的${PLACES[idx]}是 ${d[idx]}，代表 ${d[idx]} 個 ${PLACE_VALUES[idx]}，也就是 ${value}。`,
        );
    }
    if (difficulty === 'compare') {
        // 四個位數相近的數，選最大或最小
        const pool = new Set<number>([n]);
        const tries = [
            Number(`${d[0]}${d[2]}${d[1]}${d[3]}`),
            Number(`${d[0]}${d[1]}${d[3]}${d[2]}`),
            n + pick(rand, [-1, 1]) * 100,
            n + pick(rand, [-1, 1]) * 10,
            n + pick(rand, [-1, 1]) * 1000,
        ];
        for (const t of tries) if (t >= 1000 && t <= 9999 && pool.size < 4) pool.add(t);
        while (pool.size < 4) pool.add(int(rand, 1000, 9999));
        const nums = [...pool];
        const askBig = rand() < 0.5;
        const ans = askBig ? Math.max(...nums) : Math.min(...nums);
        return choice(
            `下列哪一個數最${askBig ? '大' : '小'}？`,
            ans,
            nums.filter((x) => x !== ans),
            near(rand, ans, 50),
            ['先比千位，千位一樣再比百位。', '一位一位往右比，第一個不一樣的位就決定大小。'],
            `從千位開始比較，最${askBig ? '大' : '小'}的是 ${ans}。`,
        );
    }
    // sequence
    const step = pick(rand, [1, 10, 100, 1000]);
    const up = rand() < 0.5;
    let base = n;
    if (up && base + step > 9999) base = 9999 - step - int(rand, 0, 50);
    if (!up && base - step < 1000) base = 1000 + step + int(rand, 0, 50);
    const ans = up ? base + step : base - step;
    return choice(
        `比 ${base} ${up ? '多' : '少'} ${step} 的數是多少？`,
        ans,
        [up ? base - step : base + step, ...[1, 10, 100, 1000].filter((s) => s !== step).map((s) => (up ? base + s : base - s))],
        near(rand, ans, 9),
        [`${up ? '多' : '少'} ${step}，就是${PLACES[PLACE_VALUES.indexOf(step)]}${up ? '加' : '減'} 1。`, '注意有沒有要進位或退位。'],
        `${base} ${up ? '+' : '-'} ${step} = ${ans}。`,
    );
}

// ─── 四位數加減 ───────────────────────────────────────────

const digitwise = (a: number, b: number, op: (x: number, y: number) => number) => {
    const da = digitsOf(a);
    const db = digitsOf(b);
    const len = Math.max(da.length, db.length);
    const pa = Array(len - da.length).fill(0).concat(da);
    const pb = Array(len - db.length).fill(0).concat(db);
    return Number(pa.map((x, i) => op(x, pb[i])).join(''));
};

export function g3AddSub(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'add') {
        let a = 0;
        let b = 0;
        // 至少要進位一次，才是三年級的重點
        do {
            a = int(rand, 1000, 7999);
            b = int(rand, 100, 1999);
        } while (a + b > 9999 || digitwise(a, b, (x, y) => (x + y) % 10) === a + b);
        const s = a + b;
        return choice(
            `${a} + ${b} = ？`,
            s,
            [digitwise(a, b, (x, y) => (x + y) % 10), s + 10, s - 10, s + 100, s - 100],
            near(rand, s, 20),
            ['從個位開始加，對齊位數。', '哪一位加起來滿 10，就向左邊進 1。'],
            `${a} + ${b} = ${s}，滿 10 的位要記得進位。`,
        );
    }
    let a = 0;
    let b = 0;
    do {
        a = int(rand, 2000, 9999);
        b = int(rand, 100, a - 500);
    } while (digitwise(a, b, (x, y) => Math.abs(x - y)) === a - b);
    const diff = a - b;
    return choice(
        `${a} - ${b} = ？`,
        diff,
        [digitwise(a, b, (x, y) => Math.abs(x - y)), diff + 10, diff - 10, diff + 100, diff - 100],
        near(rand, diff, 20),
        ['從個位開始減，對齊位數。', '不夠減就向左邊借 1 當 10。'],
        `${a} - ${b} = ${diff}，不夠減的位要記得退位。可以用 ${diff} + ${b} = ${a} 驗算。`,
    );
}

// ─── 乘法 ─────────────────────────────────────────────────

export function g3Multiply(difficulty: string, rand: Rand): ChoiceQuestion {
    const a = difficulty === '3x1' ? int(rand, 102, 999) : int(rand, 12, 99);
    const b = int(rand, 2, 9);
    const p = a * b;
    // 常見錯誤：每一位乘完忘了加上進位（98 × 9 寫成 812）
    const da = digitsOf(a);
    const noCarry = Number(`${da[0] * b}${da.slice(1).map((x) => (x * b) % 10).join('')}`);
    if (rand() < 0.3) {
        const [thing, unit, box] = pick(rand, [
            ['色筆', '枝', '盒'],
            ['餅乾', '片', '包'],
            ['貼紙', '張', '本'],
            ['雞蛋', '顆', '盒'],
        ] as const);
        return choice(
            `每${box}有 ${a} ${unit}${thing}，${b} ${box}一共有幾${unit}？`,
            `${p} ${unit}`,
            [`${noCarry} ${unit}`, `${a + b} ${unit}`, `${p + a} ${unit}`, `${p - a} ${unit}`],
            () => `${p + pick(rand, [-1, 1]) * int(rand, 1, 20)} ${unit}`,
            ['一樣多的東西有好幾份，用乘法。', `算 ${a} × ${b}。`],
            `${a} × ${b} = ${p}，一共 ${p} ${unit}。`,
        );
    }
    return choice(
        `${a} × ${b} = ？`,
        p,
        [noCarry, p + b, p - b, p + 10, a * (b + 1), a * (b - 1)],
        near(rand, p, 20),
        ['先算個位乘，再算十位乘。', '每一位乘完滿 10 的部分要進到左邊。'],
        `${a} × ${b} = ${p}。`,
    );
}

// ─── 除法 ─────────────────────────────────────────────────

export function g3Divide(difficulty: string, rand: Rand): ChoiceQuestion {
    const b = int(rand, 2, 9);
    const q = int(rand, 2, Math.floor(99 / b) - (difficulty === 'remainder' ? 1 : 0));
    if (difficulty === 'exact') {
        const a = b * q;
        if (rand() < 0.4) {
            const [thing, unit] = pick(rand, [['貼紙', '張'], ['彈珠', '顆'], ['鉛筆', '枝'], ['餅乾', '片']] as const);
            return choice(
                `${a} ${unit}${thing}平分給 ${b} 個人，每人分到幾${unit}？`,
                `${q} ${unit}`,
                [`${q + 1} ${unit}`, `${q - 1} ${unit}`, `${a - b} ${unit}`, `${b} ${unit}`],
                () => `${q + int(rand, 2, 5)} ${unit}`,
                ['平分用除法。', `想一想：${b} × 多少 = ${a}？`],
                `${a} ÷ ${b} = ${q}，每人 ${q} ${unit}。`,
            );
        }
        return choice(
            `${a} ÷ ${b} = ？`,
            q,
            [q + 1, q - 1, a - b, b],
            near(rand, q, 4),
            ['除法可以用乘法來想。', `${b} × 多少 = ${a}？`],
            `因為 ${b} × ${q} = ${a}，所以 ${a} ÷ ${b} = ${q}。`,
        );
    }
    const r = int(rand, 1, b - 1);
    const a = b * q + r;
    if (rand() < 0.4) {
        const [thing, unit, bag] = pick(rand, [['糖果', '顆', '袋'], ['氣球', '個', '束'], ['卡片', '張', '疊']] as const);
        const ans = `${q} ${bag}，剩 ${r} ${unit}`;
        return choice(
            `${a} ${unit}${thing}，每 ${b} ${unit}裝成一${bag}，可以裝成幾${bag}？還剩幾${unit}？`,
            ans,
            [`${q + 1} ${bag}，剩 ${r} ${unit}`, `${q} ${bag}，剩 ${r + 1 < b ? r + 1 : r - 1} ${unit}`, `${q - 1} ${bag}，剩 ${r + b} ${unit}`],
            () => `${q + int(rand, 1, 3)} ${bag}，剩 ${int(rand, 1, b - 1)} ${unit}`,
            ['用除法：總數 ÷ 每份的數量。', '剩下的數量一定要比每份的數量少。'],
            `${a} ÷ ${b} = ${q} 餘 ${r}，裝成 ${q} ${bag}，剩 ${r} ${unit}。`,
            (w) => !/剩 0 /.test(String(w)),
        );
    }
    return choice(
        `${a} ÷ ${b} = ？`,
        `${q} 餘 ${r}`,
        [`${q + 1} 餘 ${r}`, `${q} 餘 ${r + 1 < b ? r + 1 : r - 1}`, `${q - 1} 餘 ${r + b}`],
        () => `${q + int(rand, 1, 3)} 餘 ${int(rand, 1, b - 1)}`,
        [`${b} 的乘法表裡，找最接近 ${a} 但不超過的數。`, '餘數一定要比除數小。'],
        `${b} × ${q} = ${b * q}，${a} - ${b * q} = ${r}，所以是 ${q} 餘 ${r}。驗算：${b} × ${q} + ${r} = ${a}。`,
        (w) => !/餘 0$/.test(String(w)),
    );
}

// ─── 同分母分數 ───────────────────────────────────────────

const frac = (n: number, d: number) => `${n}/${d}`;

export function g3Fraction(difficulty: string, rand: Rand): ChoiceQuestion {
    const d = int(rand, 3, 12);
    if (difficulty === 'meaning') {
        const x = int(rand, 1, d - 1);
        const [thing, piece] = pick(rand, [['披薩', '片'], ['蛋糕', '塊'], ['巧克力', '格'], ['西瓜', '片']] as const);
        const ateLeft = rand() < 0.5;
        const ans = ateLeft ? frac(d - x, d) : frac(x, d);
        return choice(
            `一個${thing}平分成 ${d} ${piece}，吃了 ${x} ${piece}，${ateLeft ? '剩下' : '吃掉'}的是這個${thing}的幾分之幾？`,
            ans,
            [ateLeft ? frac(x, d) : frac(d - x, d), frac(d, x), frac(x, d + x), frac(d - x, x)],
            () => frac(int(rand, 1, d - 1), d + int(rand, 1, 3)),
            ['平分成幾份，分母就是幾。', ateLeft ? `剩下 ${d} - ${x} 份。` : '吃了幾份，分子就是幾。'],
            `平分成 ${d} 份，${ateLeft ? `剩下 ${d - x}` : `吃了 ${x}`} 份，是 ${ans}。`,
        );
    }
    let x = int(rand, 1, d - 1);
    let y = int(rand, 1, d - 1);
    while (y === x) y = int(rand, 1, d - 1);
    if (difficulty === 'compare') {
        const askBig = rand() < 0.5;
        const ans = frac(askBig ? Math.max(x, y) : Math.min(x, y), d);
        return choice(
            `${frac(x, d)} 和 ${frac(y, d)}，哪一個比較${askBig ? '大' : '小'}？`,
            ans,
            [frac(askBig ? Math.min(x, y) : Math.max(x, y), d), '一樣大'],
            () => '無法比較',
            ['分母一樣，表示每一份一樣大。', '分子越大，份數越多。'],
            `分母都是 ${d}，比分子：${Math.max(x, y)} > ${Math.min(x, y)}，所以比較${askBig ? '大' : '小'}的是 ${ans}。`,
        );
    }
    // add-sub：結果小於 1，避免出現 d/d 和 1 兩種寫法
    if (x + y >= d) {
        // 分母至少 4，才找得到兩個不同、加起來又小於 1 的分數
        const dd = Math.max(d, 4);
        do {
            x = int(rand, 1, dd - 2);
            y = int(rand, 1, dd - 1 - x);
        } while (x === y);
        return fractionAddSub(x, y, dd, rand);
    }
    return fractionAddSub(x, y, d, rand);
}

function fractionAddSub(x: number, y: number, d: number, rand: Rand): ChoiceQuestion {
    if (rand() < 0.5) {
        const s = x + y;
        return choice(
            `${frac(x, d)} + ${frac(y, d)} = ？`,
            frac(s, d),
            [frac(s, d * 2), frac(s + 1, d), frac(s - 1, d), frac(x * y, d)],
            () => frac(int(rand, 1, d - 1), d + 1),
            ['分母一樣時，分母不變。', '只要把分子加起來。'],
            `分母不變，分子 ${x} + ${y} = ${s}，答案是 ${frac(s, d)}。`,
            (w) => !/^0\//.test(String(w)),
        );
    }
    const big = Math.max(x, y);
    const small = Math.min(x, y);
    const diff = big - small;
    return choice(
        `${frac(big, d)} - ${frac(small, d)} = ？`,
        frac(diff, d),
        [frac(big + small, d), frac(diff + 1, d), frac(diff - 1, d), frac(diff, d + 1)],
        () => frac(int(rand, 1, d - 1), d + 2),
        ['分母一樣時，分母不變。', '只要把分子相減。'],
        `分母不變，分子 ${big} - ${small} = ${diff}，答案是 ${frac(diff, d)}。`,
        (w) => !/^0\//.test(String(w)),
    );
}

// ─── 一位小數 ─────────────────────────────────────────────

export function g3Decimal(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'meaning') {
        const ones = int(rand, 0, 9);
        const tenths = int(rand, 1, 9);
        const v = dec1(ones * 10 + tenths);
        if (rand() < 0.5) {
            return choice(
                `${ones} 個 1 和 ${tenths} 個 0.1 合起來是多少？`,
                v,
                [`${tenths}.${ones}`, `${ones}.0${tenths}`, String(ones + tenths), dec1(ones * 10 + tenths + 1)],
                () => dec1(ones * 10 + tenths + pick(rand, [-1, 1]) * int(rand, 2, 9)),
                ['小數點左邊是個位，右邊第一位是十分位。', '0.1 有幾個，十分位就寫幾。'],
                `${ones} 個 1 是 ${ones}，${tenths} 個 0.1 是 ${dec1(tenths)}，合起來是 ${v}。`,
                (w) => !/^0\.0|^-/.test(String(w)),
            );
        }
        const count = ones * 10 + tenths;
        return choice(
            `${v} 裡面有幾個 0.1？`,
            count,
            [tenths, ones + tenths, count * 10, count + 1],
            near(rand, count, 5),
            ['1 裡面有 10 個 0.1。', `${ones} 裡面有 ${ones * 10} 個 0.1。`],
            `${ones} 有 ${ones * 10} 個 0.1，再加 ${tenths} 個，一共 ${count} 個 0.1。`,
            (w) => typeof w !== 'number' || w > 0,
        );
    }
    if (difficulty === 'compare') {
        const a = int(rand, 1, 99);
        let b = a;
        while (b === a) b = pick(rand, [a + int(rand, 1, 9), a - int(rand, 1, 9), (a % 10) * 10 + Math.floor(a / 10)]);
        if (b <= 0) b = a + 3;
        const askBig = rand() < 0.5;
        const ans = dec1(askBig ? Math.max(a, b) : Math.min(a, b));
        return choice(
            `${dec1(a)} 和 ${dec1(b)}，哪一個比較${askBig ? '大' : '小'}？`,
            ans,
            [dec1(askBig ? Math.min(a, b) : Math.max(a, b)), '一樣大'],
            () => '無法比較',
            ['先比整數部分（小數點左邊）。', '整數一樣，再比十分位。'],
            `${dec1(Math.max(a, b))} > ${dec1(Math.min(a, b))}，所以比較${askBig ? '大' : '小'}的是 ${ans}。`,
        );
    }
    // add-sub（以十分位為單位計算，避免浮點誤差）
    const a = int(rand, 5, 89);
    const b = int(rand, 3, 59);
    if (rand() < 0.5) {
        const s = a + b;
        return choice(
            `${dec1(a)} + ${dec1(b)} = ？`,
            dec1(s),
            [dec1(s - 10), dec1(s + 10), dec1(s + 1), String((a % 10) + (b % 10) > 9 ? `${Math.floor(a / 10) + Math.floor(b / 10)}.${(a % 10) + (b % 10)}` : dec1(s + 2))],
            () => dec1(s + pick(rand, [-1, 1]) * int(rand, 2, 9)),
            ['小數點要對齊再加。', '十分位滿 10 個 0.1，就進位成 1。'],
            `小數點對齊：${dec1(a)} + ${dec1(b)} = ${dec1(s)}。`,
            (w) => !/^-/.test(String(w)),
        );
    }
    const big = Math.max(a, b);
    const small = Math.min(a, b) === big ? big - 2 : Math.min(a, b);
    const diff = big - small;
    return choice(
        `${dec1(big)} - ${dec1(small)} = ？`,
        dec1(diff),
        [dec1(diff + 10), dec1(diff - 10), dec1(diff + 1), dec1(diff - 1)],
        () => dec1(diff + pick(rand, [-1, 1]) * int(rand, 2, 9)),
        ['小數點要對齊再減。', '十分位不夠減，就從個位借 1 當 10 個 0.1。'],
        `小數點對齊：${dec1(big)} - ${dec1(small)} = ${dec1(diff)}。`,
        (w) => !/^-|^0$/.test(String(w)),
    );
}

// ─── 長度、容量、重量 ─────────────────────────────────────

const UNITS: Record<string, { big: string; small: string; ratio: number }[]> = {
    length: [
        { big: '公里', small: '公尺', ratio: 1000 },
        { big: '公分', small: '毫米', ratio: 10 },
        { big: '公尺', small: '公分', ratio: 100 },
    ],
    capacity: [{ big: '公升', small: '毫公升', ratio: 1000 }],
    weight: [{ big: '公斤', small: '公克', ratio: 1000 }],
};

export function g3Measure(difficulty: string, rand: Rand): ChoiceQuestion {
    const { big, small, ratio } = pick(rand, UNITS[difficulty] ?? UNITS.length);
    const k = int(rand, 1, 9);
    const s = int(rand, 1, ratio - 1);
    const total = k * ratio + s;
    const wrongRatios = [10, 100, 1000].filter((r) => r !== ratio);
    if (rand() < 0.5) {
        return choice(
            `${k} ${big} ${s} ${small} = 幾${small}？`,
            `${total} ${small}`,
            [...wrongRatios.map((r) => `${k * r + s} ${small}`), `${k + s} ${small}`],
            () => `${total + pick(rand, [-1, 1]) * int(rand, 1, 9) * (ratio / 10)} ${small}`,
            [`1 ${big} = ${ratio} ${small}。`, `${k} ${big} = ${k * ratio} ${small}，再加上 ${s} ${small}。`],
            `${k} ${big} = ${k * ratio} ${small}，${k * ratio} + ${s} = ${total}（${small}）。`,
        );
    }
    return choice(
        `${total} ${small} = 幾${big}幾${small}？`,
        `${k} ${big} ${s} ${small}`,
        [
            ...wrongRatios.filter((r) => Math.floor(total / r) > 0).map((r) => `${Math.floor(total / r)} ${big} ${total % r} ${small}`),
            `${k + 1} ${big} ${s} ${small}`,
            `${k} ${big} ${total} ${small}`,
        ],
        () => `${k} ${big} ${int(rand, 1, ratio - 1)} ${small}`,
        [`1 ${big} = ${ratio} ${small}。`, `${total} 裡面有幾個 ${ratio}？剩下的就是${small}。`],
        `${total} = ${k * ratio} + ${s}，${k * ratio} ${small} = ${k} ${big}，所以是 ${k} ${big} ${s} ${small}。`,
        (w) => !/ 0 /.test(String(w)),
    );
}

// ─── 時間 ─────────────────────────────────────────────────

const hhmm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const durText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分鐘` : ''}` : `${m} 分鐘`);

export function g3Time(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === '24h') {
        const realH = int(rand, 1, 11);
        const m = int(rand, 0, 11) * 5;
        const mm = String(m).padStart(2, '0');
        const period = realH <= 5 ? '下午' : '晚上';
        if (rand() < 0.5) {
            return choice(
                `${period} ${realH} 點 ${m === 0 ? '整' : `${m} 分`}，用 24 時制怎麼寫？`,
                `${realH + 12}:${mm}`,
                [`${realH}:${mm}`, `${realH + 10}:${mm}`, `${realH + 2}:${mm}`],
                () => `${realH + 12}:${String((m + 5) % 60).padStart(2, '0')}`,
                ['24 時制：中午 12 點以後繼續數下去。', '下午 1 點是 13 點，所以加 12。'],
                `${period} ${realH} 點就是 ${realH} + 12 = ${realH + 12} 點，寫成 ${realH + 12}:${mm}。`,
            );
        }
        return choice(
            `24 時制的 ${realH + 12}:${mm} 是${period}幾點？`,
            `${realH} 點${m === 0 ? '整' : ` ${m} 分`}`,
            [`${realH + 2} 點${m === 0 ? '整' : ` ${m} 分`}`, `${realH + 1} 點${m === 0 ? '整' : ` ${m} 分`}`, `${Math.max(1, realH - 2)} 點${m === 0 ? '整' : ` ${m} 分`}`],
            () => `${int(rand, 1, 11)} 點${m === 0 ? '整' : ` ${m} 分`}`,
            ['超過 12 點的時刻，減掉 12 就是下午或晚上的幾點。'],
            `${realH + 12} - 12 = ${realH}，所以是${period} ${realH} 點${m === 0 ? '整' : ` ${m} 分`}。`,
        );
    }
    if (difficulty === 'seconds') {
        const m = int(rand, 1, 9);
        const s = int(rand, 1, 59);
        const total = m * 60 + s;
        if (rand() < 0.5) {
            return choice(
                `${m} 分 ${s} 秒 = 幾秒？`,
                `${total} 秒`,
                [`${m * 100 + s} 秒`, `${m * 10 + s} 秒`, `${m * 60} 秒`],
                () => `${total + pick(rand, [-1, 1]) * int(rand, 1, 20)} 秒`,
                ['1 分鐘 = 60 秒。', `${m} 分鐘 = ${m} × 60 秒。`],
                `${m} × 60 = ${m * 60}，${m * 60} + ${s} = ${total}（秒）。`,
            );
        }
        return choice(
            `${total} 秒 = 幾分幾秒？`,
            `${m} 分 ${s} 秒`,
            [`${Math.floor(total / 100)} 分 ${total % 100} 秒`, `${m + 1} 分 ${s} 秒`, `${m} 分 ${s + 10 < 60 ? s + 10 : s - 10} 秒`],
            () => `${m} 分 ${int(rand, 1, 59)} 秒`,
            ['1 分鐘 = 60 秒。', `${total} 裡面有幾個 60？`],
            `${total} = 60 × ${m} + ${s}，所以是 ${m} 分 ${s} 秒。`,
            (w) => !/^0 | 0 秒/.test(String(w)),
        );
    }
    // elapsed：用 24 時制算結束時刻
    const start = int(rand, 8 * 12, 17 * 12) * 5;
    const dur = int(rand, 4, 30) * 5;
    const end = start + dur;
    const activity = pick(rand, ['電影', '球賽', '才藝課', '校外教學', '音樂會']);
    return choice(
        `${activity}從 ${hhmm(start)} 開始，進行了 ${durText(dur)}，幾點幾分結束？`,
        hhmm(end),
        [hhmm(end + 60), hhmm(end - 10), hhmm(end + 10), hhmm(start + (dur % 60))],
        () => hhmm(end + pick(rand, [-1, 1]) * int(rand, 1, 6) * 5),
        ['先加小時，再加分鐘。', '分鐘加起來滿 60，就變成 1 小時。'],
        `${hhmm(start)} 再過 ${durText(dur)}，就是 ${hhmm(end)}。`,
    );
}

// ─── 兩步驟應用題 ─────────────────────────────────────────

export function g3WordProblem(_difficulty: string, rand: Rand): ChoiceQuestion {
    const kind = int(rand, 0, 2);
    if (kind === 0) {
        const per = int(rand, 6, 24);
        const boxes = int(rand, 3, 9);
        const extra = int(rand, 2, 15);
        const ans = per * boxes + extra;
        return choice(
            `一盒色筆有 ${per} 枝，老師買了 ${boxes} 盒，又另外買了 ${extra} 枝，一共有幾枝？`,
            `${ans} 枝`,
            [`${per * boxes} 枝`, `${per + boxes + extra} 枝`, `${per * (boxes + extra)} 枝`],
            () => `${ans + pick(rand, [-1, 1]) * int(rand, 1, 10)} 枝`,
            ['先算 ' + boxes + ' 盒有幾枝。', '再加上另外買的。'],
            `${per} × ${boxes} = ${per * boxes}，${per * boxes} + ${extra} = ${ans}（枝）。`,
        );
    }
    if (kind === 1) {
        const price = int(rand, 12, 45);
        const n = int(rand, 2, 6);
        const pay = Math.ceil((price * n + int(rand, 5, 80)) / 100) * 100;
        const ans = pay - price * n;
        const [item, unit] = pick(rand, [['筆記本', '本'], ['跳繩', '條'], ['水彩', '盒'], ['故事書', '本']] as const);
        return choice(
            `一${unit}${item} ${price} 元，買 ${n} ${unit}，付了 ${pay} 元，要找回多少元？`,
            `${ans} 元`,
            [`${pay - price} 元`, `${price * n} 元`, `${pay - price - n} 元`],
            () => `${ans + pick(rand, [-1, 1]) * int(rand, 1, 10)} 元`,
            ['先算一共要付多少錢。', '再用付的錢減掉。'],
            `${price} × ${n} = ${price * n}，${pay} - ${price * n} = ${ans}（元）。`,
            (w) => !/^-|^0 /.test(String(w)),
        );
    }
    const group = int(rand, 3, 6);
    const groups = int(rand, 4, 8);
    const each = int(rand, 2, 5);
    const students = group * groups;
    const ans = groups * each;
    return choice(
        `全班 ${students} 人，每 ${group} 人一組，每組發 ${each} 張海報紙，一共要發幾張？`,
        `${ans} 張`,
        [`${students * each} 張`, `${groups} 張`, `${students + each} 張`],
        () => `${ans + pick(rand, [-1, 1]) * int(rand, 1, 5)} 張`,
        ['先算可以分成幾組。', `${students} ÷ ${group} 是幾組？再乘每組的張數。`],
        `${students} ÷ ${group} = ${groups}（組），${groups} × ${each} = ${ans}（張）。`,
    );
}

export const GRADE3_GENERATORS: Record<string, LocalGenerator> = {
    g3Numbers,
    g3AddSub,
    g3Multiply,
    g3Divide,
    g3Fraction,
    g3Decimal,
    g3Measure,
    g3Time,
    g3WordProblem,
};
