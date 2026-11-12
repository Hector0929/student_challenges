// 六年級數學的程式出題：質因數分解、互質、分數除法、小數除法、比與比值、比例尺、
// 速率、圓周長與圓面積、柱體體積與表面積、簡易方程式、基準量與比較量。
// 圓周率一律用 3.14；小數用整數（百分位、千分位）計算後再轉字串，避免浮點誤差。

import type { ChoiceQuestion } from '../types';
import { frac, gcd } from './grade5';
import { choice, int, near, pick, type LocalGenerator, type Rand } from './shared';

// ─── 共用 ─────────────────────────────────────────────────

/** 以 10^dp 為單位的整數轉成小數字串（去掉多餘的 0） */
export const dec = (n: number, dp: number): string => {
    if (dp === 0) return String(n);
    return (n / 10 ** dp).toFixed(dp).replace(/0+$/, '').replace(/\.$/, '');
};

/** 「2又1/3」「3/4」「31.4 公分」→ 數值；看不懂回傳 NaN */
export const val = (s: string | number): number => {
    const t = String(s).replace(/\s*[^\d./又]+$/, '');
    const m = t.match(/^(?:(\d+)又)?(\d+)\/(\d+)$/);
    if (m) return Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
    return t === '' ? NaN : Number(t);
};

/** 誘答要大於 0，而且和正解的數值不一樣 */
const differs = (a: string | number) => (w: string | number) => {
    const v = val(w);
    return v > 0 && Math.abs(v - val(a)) > 1e-9;
};

/** 互質的真分數 [分子, 分母] */
const properFraction = (rand: Rand, maxDen: number): [number, number] => {
    let n = 0;
    let d = 0;
    do {
        d = int(rand, 2, maxDen);
        n = int(rand, 1, d - 1);
    } while (gcd(n, d) !== 1);
    return [n, d];
};

/** 倒數的寫法：分子是 1 時直接寫整數 */
const reciprocal = (n: number, d: number) => (n === 1 ? String(d) : `${d}/${n}`);

const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((i) => n % i !== 0);

// ─── 質因數分解、互質 ─────────────────────────────────────

export function g6Prime(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'factorize') {
        let fs: number[] = [];
        let n = 0;
        do {
            fs = Array.from({ length: int(rand, 3, 4) }, () => pick(rand, [2, 2, 2, 3, 3, 5, 7])).sort((a, b) => a - b);
            n = fs.reduce((a, b) => a * b, 1);
        } while (n > 200 || n < 20 || new Set(fs).size < 2);
        const show = (xs: number[]) => [...xs].sort((a, b) => a - b).join(' × ');
        const last = fs[fs.length - 1];
        return choice(
            `把 ${n} 做質因數分解，結果是什麼？`,
            show(fs),
            [
                show([fs[0] * fs[1], ...fs.slice(2)]), // 留下合數沒有再分
                show(fs.slice(1)), // 少一個因數
                show([...fs.slice(0, -1), last === 3 ? 5 : 3]), // 換錯一個
                show([...fs, 2]),
            ],
            () => show([...fs.slice(1), pick(rand, [2, 3, 5, 7])]),
            ['從最小的質數 2 開始除，除不下去再換 3、5、7。', '每個因數都要是質數，乘起來要剛好等於原來的數。'],
            `${n} = ${show(fs)}，每個因數都是質數。`,
        );
    }
    // coprime
    let a = 0;
    let b = 0;
    do {
        a = int(rand, 4, 30);
        b = int(rand, 4, 30);
    } while (a === b || gcd(a, b) !== 1 || (isPrime(a) && isPrime(b)));
    [a, b] = [Math.min(a, b), Math.max(a, b)];
    if (rand() < 0.5) {
        const pair = () => {
            const g = pick(rand, [2, 2, 3, 5]);
            const x = g * int(rand, 2, 9);
            let y = g * int(rand, 2, 9);
            if (y === x) y += g;
            return `${Math.min(x, y)} 和 ${Math.max(x, y)}`;
        };
        return choice(
            '下列哪一組數互質？',
            `${a} 和 ${b}`,
            [],
            pair,
            ['兩個數的公因數只有 1，就叫做互質。', '兩個偶數一定有公因數 2，不會互質。'],
            `${a} 和 ${b} 的公因數只有 1，所以互質。其他組都有比 1 大的公因數。`,
            (w) => {
                const m = String(w).match(/^(\d+) 和 (\d+)$/);
                return !!m && gcd(Number(m[1]), Number(m[2])) > 1;
            },
        );
    }
    return choice(
        `${a} 和 ${b} 互質，它們的最小公倍數是多少？`,
        a * b,
        [a + b, b, 1, a * b * 2],
        near(rand, a * b, 10),
        ['互質的兩個數，公因數只有 1。', '互質的兩個數，最小公倍數就是兩數相乘。'],
        `${a} 和 ${b} 互質，最小公倍數 = ${a} × ${b} = ${a * b}。`,
    );
}

// ─── 分數除法 ─────────────────────────────────────────────

export function g6FracDiv(difficulty: string, rand: Rand): ChoiceQuestion {
    const hints = (n: number, d: number) => ['除以一個數，等於乘以它的倒數。', `${n}/${d} 的倒數是 ${reciprocal(n, d)}。`];
    if (difficulty === 'frac-frac') {
        const [n0, ad] = properFraction(rand, 9);
        const an = rand() < 0.3 ? n0 + ad * int(rand, 1, 2) : n0; // 三成是帶分數
        let [bn, bd] = properFraction(rand, 9);
        while (bn * ad === an * bd) [bn, bd] = properFraction(rand, 9);
        const A = frac(an, ad);
        const ans = frac(an * bd, ad * bn);
        return choice(
            `${A} ÷ ${bn}/${bd} = ？`,
            ans,
            [frac(an * bn, ad * bd), frac(ad * bn, an * bd), frac(an * bd + bn, ad * bn)],
            () => frac(an * bd + int(rand, 1, 4), ad * bn),
            hints(bn, bd),
            `${A} ÷ ${bn}/${bd} = ${A} × ${reciprocal(bn, bd)} = ${ans}。`,
            differs(ans),
        );
    }
    if (difficulty === 'whole-frac') {
        const W = int(rand, 2, 9);
        const [bn, bd] = properFraction(rand, 9);
        const ans = frac(W * bd, bn);
        return choice(
            `${W} ÷ ${bn}/${bd} = ？`,
            ans,
            [frac(W * bn, bd), frac(bn, W * bd), frac(W * bd, bn + 1)],
            () => frac(W * bd + int(rand, 1, 4), bn),
            hints(bn, bd),
            `${W} ÷ ${bn}/${bd} = ${W} × ${reciprocal(bn, bd)} = ${ans}。`,
            differs(ans),
        );
    }
    if (difficulty === 'frac-whole') {
        const [an, ad] = properFraction(rand, 9);
        const W = int(rand, 2, 9);
        const ans = frac(an, ad * W);
        return choice(
            `${an}/${ad} ÷ ${W} = ？`,
            ans,
            [frac(an * W, ad), frac(ad * W, an), frac(an, ad + W)],
            () => frac(an, ad * W + int(rand, 1, 5)),
            [`除以 ${W}，等於乘以 1/${W}。`, '分子不變，分母乘上除數。'],
            `${an}/${ad} ÷ ${W} = ${an}/${ad} × 1/${W} = ${ans}。`,
            differs(ans),
        );
    }
    // word
    if (rand() < 0.5) {
        const [bn, bd] = properFraction(rand, 8);
        const k = int(rand, 2, 12);
        const A = frac(k * bn, bd);
        return choice(
            `一條緞帶長 ${A} 公尺，每 ${bn}/${bd} 公尺剪成一段，可以剪成幾段？`,
            `${k} 段`,
            [`${k + 1} 段`, `${k - 1} 段`, `${k * 2} 段`, `${k + bd} 段`],
            () => `${k + int(rand, 2, 6)} 段`,
            ['想一想：全長裡面有幾個「每段的長度」？', '用除法：全長 ÷ 每段長。'],
            `${A} ÷ ${bn}/${bd} = ${k}，可以剪成 ${k} 段。`,
            differs(`${k} 段`),
        );
    }
    const [n0, ad] = properFraction(rand, 9);
    const an = rand() < 0.5 ? n0 + ad : n0;
    const W = int(rand, 2, 6);
    const A = frac(an, ad);
    const ans = frac(an, ad * W);
    return choice(
        `${A} 公升的果汁平分給 ${W} 個人，每人分到幾公升？`,
        `${ans} 公升`,
        [`${frac(an * W, ad)} 公升`, `${frac(ad * W, an)} 公升`, `${frac(an, ad + W)} 公升`],
        () => `${frac(an, ad * W + int(rand, 1, 4))} 公升`,
        ['平分就是用除法。', `${A} ÷ ${W}，等於乘以 1/${W}。`],
        `${A} ÷ ${W} = ${ans}，每人分到 ${ans} 公升。`,
        differs(`${ans} 公升`),
    );
}

// ─── 小數除法 ─────────────────────────────────────────────

export function g6DecDiv(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'div') {
        let bt = 0; // 除數，以 0.1 為單位
        do bt = int(rand, 2, 99);
        while (bt % 10 === 0);
        // 商：整數或一位小數（以 0.1 為單位）
        let qt = rand() < 0.6 ? int(rand, 2, 40) * 10 : int(rand, 11, 99);
        if (qt % 10 === 0 && rand() < 0.3) qt += 5;
        const dividend = dec(bt * qt, 2);
        const divisor = dec(bt, 1);
        const ans = dec(qt, 1);
        return choice(
            `${dividend} ÷ ${divisor} = ？`,
            ans,
            [dec(qt, 0), dec(qt, 2), dec(qt + 10, 1), dec(qt - 10, 1)],
            () => dec(qt + pick(rand, [-1, 1]) * int(rand, 1, 9), 1),
            ['先讓除數變成整數：除數和被除數的小數點同時往右移一位。', '移好之後，再用整數除法來算。'],
            `兩數同乘 10：${dec(bt * qt, 1)} ÷ ${bt} = ${ans}。驗算：${ans} × ${divisor} = ${dividend}。`,
            differs(ans),
        );
    }
    // round：商四捨五入到小數第一位
    let a = 0;
    let b = 0;
    let t = 0;
    do {
        a = int(rand, 10, 99);
        b = pick(rand, [3, 6, 7, 9, 11]);
        t = Math.floor((20 * a + b) / (2 * b));
    } while (a % b === 0 || t % 10 === 0);
    const trunc = Math.floor((10 * a) / b);
    const two = Math.floor((200 * a + b) / (2 * b));
    const ans = (t / 10).toFixed(1);
    return choice(
        `${a} ÷ ${b} 的商，用四捨五入法取到小數第一位是多少？`,
        ans,
        [(trunc / 10).toFixed(1), (two / 100).toFixed(2), ((t + 1) / 10).toFixed(1), ((t - 1) / 10).toFixed(1)],
        () => ((t + int(rand, 2, 4)) / 10).toFixed(1),
        ['要取到小數第一位，就先算到小數第二位。', '看小數第二位：4 以下捨去，5 以上進位。'],
        `${a} ÷ ${b} = ${(Math.floor((100 * a) / b) / 100).toFixed(2)}……，看小數第二位四捨五入，得 ${ans}。`,
        differs(ans),
    );
}

// ─── 比與比值 ─────────────────────────────────────────────

const coprimePair = (rand: Rand, maxA: number, maxB: number): [number, number] => {
    let x = 0;
    let y = 0;
    do {
        x = int(rand, 1, maxA);
        y = int(rand, 1, maxB);
    } while (x === y || gcd(x, y) !== 1);
    return [x, y];
};

export function g6Ratio(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'simplify') {
        const [x, y] = coprimePair(rand, 9, 12);
        const g = int(rand, 2, 9);
        // 四成題目用小數比（以 0.1 為單位），至少一項要真的是小數
        const decimal = rand() < 0.4 && ((x * g) % 10 !== 0 || (y * g) % 10 !== 0);
        const [A, B] = decimal ? [dec(x * g, 1), dec(y * g, 1)] : [String(x * g), String(y * g)];
        const r = (p: number, q: number) => `${p}：${q}`;
        const half = g % 2 === 0 && g > 2 ? r((x * g) / 2, (y * g) / 2) : r(x + 1, y);
        return choice(
            `${A}：${B} 化成最簡單整數比是多少？`,
            r(x, y),
            [r(y, x), decimal ? r(x * g, y * g) : half, r(x, y + 1), r(x + 1, y + 1)],
            () => r(x + int(rand, 1, 3), y),
            decimal
                ? ['先把前項和後項同乘 10，變成整數比。', '再同除以它們的最大公因數。']
                : ['前項和後項同除以它們的最大公因數。', `${x * g} 和 ${y * g} 的最大公因數是多少？`],
            decimal
                ? `${A}：${B} 同乘 10 得 ${x * g}：${y * g}，再同除以 ${g}，得 ${r(x, y)}。`
                : `${x * g} 和 ${y * g} 的最大公因數是 ${g}，同除以 ${g} 得 ${r(x, y)}。`,
            (w) => w !== r(x, y),
        );
    }
    if (difficulty === 'value') {
        const [x, y] = coprimePair(rand, 9, 9);
        const g = int(rand, 1, 6);
        const ans = frac(x, y);
        return choice(
            `${x * g}：${y * g} 的比值是多少？`,
            ans,
            [frac(y, x), frac(x, x + y), frac(x + 1, y), frac(x * g, y * g + 1)],
            () => frac(x + int(rand, 2, 5), y),
            ['比值 = 前項 ÷ 後項。', '算出來的分數記得約成最簡分數。'],
            `${x * g} ÷ ${y * g} = ${ans}。`,
            differs(ans),
        );
    }
    if (difficulty === 'missing') {
        const [x, y] = coprimePair(rand, 9, 9);
        const k = int(rand, 2, 9);
        if (rand() < 0.5) {
            return choice(
                `${x}：${y} = ${x * k}：？，問號是多少？`,
                y * k,
                [y + (x * k - x), y * k + k, y * k - k, x * k * y],
                near(rand, y * k, 5),
                [`前項 ${x} 變成 ${x * k}，乘了多少？`, '後項也要乘一樣的數，比才會相等。'],
                `${x} × ${k} = ${x * k}，所以後項也乘 ${k}：${y} × ${k} = ${y * k}。`,
                (w) => typeof w !== 'number' || (w > 0 && w * x !== x * k * y),
            );
        }
        return choice(
            `${x}：${y} = ？：${y * k}，問號是多少？`,
            x * k,
            [x + (y * k - y), x * k + k, x * k - k, x * y * k],
            near(rand, x * k, 5),
            [`後項 ${y} 變成 ${y * k}，乘了多少？`, '前項也要乘一樣的數，比才會相等。'],
            `${y} × ${k} = ${y * k}，所以前項也乘 ${k}：${x} × ${k} = ${x * k}。`,
            (w) => typeof w !== 'number' || (w > 0 && w * y !== x * y * k),
        );
    }
    // share：按比例分配
    const [x, y] = coprimePair(rand, 7, 7);
    const unit = int(rand, 2, 30) * pick(rand, [1, 5, 10]);
    const total = (x + y) * unit;
    const [who, item] = pick(rand, [
        ['哥哥和弟弟', '元零用錢'],
        ['姊姊和妹妹', '張貼紙'],
        ['甲班和乙班', '本故事書'],
    ] as const);
    const first = who.slice(0, 2);
    const u = item.slice(0, 1);
    return choice(
        `${who}按照 ${x}：${y} 分 ${total} ${item}，${first}分到多少${u}？`,
        `${x * unit} ${u}`,
        [`${y * unit} ${u}`, `${total % 2 === 0 ? total / 2 : total - unit} ${u}`, `${unit} ${u}`, `${x * unit + unit} ${u}`],
        () => `${x * unit + pick(rand, [-1, 1]) * int(rand, 1, 3) * unit} ${u}`,
        [`把全部分成 ${x} + ${y} = ${x + y} 份。`, `${first}拿其中的 ${x} 份。`],
        `${total} ÷ ${x + y} = ${unit}（一份），${first}分到 ${unit} × ${x} = ${x * unit} ${u}。`,
        differs(`${x * unit} ${u}`),
    );
}

// ─── 比例尺 ───────────────────────────────────────────────

const SCALES = [1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 500000];

/** 公分數換成好讀的長度：10 萬公分以上用公里，其他用公尺 */
const length = (cm: number) => (cm >= 100000 ? `${dec(cm / 1000, 2)} 公里` : `${cm / 100} 公尺`);

export function g6Scale(difficulty: string, rand: Rand): ChoiceQuestion {
    const S = pick(rand, SCALES);
    const m = int(rand, 2, 15);
    const cm = m * S;
    const real = length(cm);
    const [num, unit] = real.split(' ');
    const shift = (k: number) => `${dec(Math.round(val(num) * 1000 * k), 3)} ${unit}`;
    if (difficulty === 'map-to-real') {
        return choice(
            `比例尺 1：${S} 的地圖上，${m} 公分代表實際距離多少？`,
            real,
            [shift(10), shift(0.1), shift(100), shift(0.01)],
            () => shift(int(rand, 2, 5)),
            [`比例尺 1：${S} 表示圖上 1 公分是實際的 ${S} 公分。`, '先算出實際有幾公分，再換成公尺或公里（1 公尺 = 100 公分，1 公里 = 100000 公分）。'],
            `${m} × ${S} = ${cm} 公分 = ${real}。`,
            differs(real),
        );
    }
    return choice(
        `比例尺 1：${S} 的地圖上，實際距離 ${real}，要畫成幾公分？`,
        `${m} 公分`,
        [`${m * 10} 公分`, `${dec(m, 1)} 公分`, `${m * 100} 公分`, `${m + 1} 公分`],
        () => `${m + int(rand, 2, 5)} 公分`,
        [`先把 ${real} 換成公分。`, `再除以 ${S}。`],
        `${real} = ${cm} 公分，${cm} ÷ ${S} = ${m} 公分。`,
        differs(`${m} 公分`),
    );
}

// ─── 速率 ─────────────────────────────────────────────────

export function g6Speed(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'distance') {
        const v = int(rand, 8, 24) * 5;
        const tt = rand() < 0.6 ? int(rand, 2, 5) * 10 : pick(rand, [15, 25, 35]); // 小時，以 0.1 為單位
        const ans = `${dec(v * tt, 1)} 公里`;
        return choice(
            `一輛車以時速 ${v} 公里行駛 ${dec(tt, 1)} 小時，一共行駛多少公里？`,
            ans,
            [`${dec(v * 10 + tt, 1)} 公里`, `${dec(v * (tt + 10), 1)} 公里`, `${dec(v * (tt - 5), 1)} 公里`, `${v * tt} 公里`],
            () => `${dec(v * tt + int(rand, 1, 6) * 50, 1)} 公里`,
            ['距離 = 速率 × 時間。', `時速 ${v} 公里，表示 1 小時走 ${v} 公里。`],
            `${v} × ${dec(tt, 1)} = ${dec(v * tt, 1)}，共行駛 ${ans}。`,
            differs(ans),
        );
    }
    if (difficulty === 'speed') {
        if (rand() < 0.5) {
            const v = int(rand, 10, 18) * 5;
            const t = int(rand, 4, 30);
            return choice(
                `小安走了 ${v * t} 公尺，花了 ${t} 分鐘，他的分速是多少公尺？`,
                `${v} 公尺`,
                [`${v * t - t} 公尺`, `${v + 10} 公尺`, `${v - 5} 公尺`, `${v * 2} 公尺`],
                () => `${v + int(rand, 2, 8) * 5} 公尺`,
                ['速率 = 距離 ÷ 時間。', '分速是「1 分鐘走多遠」。'],
                `${v * t} ÷ ${t} = ${v}，分速 ${v} 公尺。`,
                differs(`${v} 公尺`),
            );
        }
        const v = int(rand, 8, 24) * 5;
        const t = int(rand, 2, 6);
        return choice(
            `一輛車 ${t} 小時行駛了 ${v * t} 公里，它的時速是多少公里？`,
            `${v} 公里`,
            [`${v * t - t} 公里`, `${v * t + t} 公里`, `${v + 10} 公里`, `${v - 10} 公里`],
            () => `${v + int(rand, 3, 8) * 5} 公里`,
            ['速率 = 距離 ÷ 時間。', '時速是「1 小時走多遠」。'],
            `${v * t} ÷ ${t} = ${v}，時速 ${v} 公里。`,
            differs(`${v} 公里`),
        );
    }
    if (difficulty === 'time') {
        const v = int(rand, 2, 12) * 10;
        const tt = rand() < 0.5 ? int(rand, 2, 6) * 10 : pick(rand, [15, 25, 35, 45]);
        const d = dec(v * tt, 1);
        const ans = `${dec(tt, 1)} 小時`;
        return choice(
            `兩地相距 ${d} 公里，以時速 ${v} 公里前進，要花幾小時才會到？`,
            ans,
            [`${dec(tt + 5, 1)} 小時`, `${dec(tt + 10, 1)} 小時`, `${dec(Math.max(tt - 5, 1), 1)} 小時`, `${dec(tt * 2, 1)} 小時`],
            () => `${dec(tt + int(rand, 2, 6) * 5, 1)} 小時`,
            ['時間 = 距離 ÷ 速率。', `每小時走 ${v} 公里，${d} 公里裡有幾個 ${v}？`],
            `${d} ÷ ${v} = ${dec(tt, 1)}，要花 ${ans}。`,
            differs(ans),
        );
    }
    // units：速率單位換算
    const kind = int(rand, 0, 2);
    if (kind === 0) {
        const s = pick(rand, [5, 10, 15, 20, 25, 30]);
        const ans = `${(s * 36) / 10} 公里`;
        return choice(
            `秒速 ${s} 公尺 = 時速多少公里？`,
            ans,
            [`${s * 60} 公里`, `${s * 3600} 公里`, `${s * 36} 公里`, `${s * 6} 公里`],
            () => `${(s * 36) / 10 + int(rand, 1, 4) * 3} 公里`,
            ['1 小時 = 3600 秒，先算 1 小時走幾公尺。', '1 公里 = 1000 公尺。'],
            `${s} × 3600 = ${s * 3600} 公尺 = ${(s * 36) / 10} 公里，所以是時速 ${ans}。`,
            differs(ans),
        );
    }
    if (kind === 1) {
        const m = int(rand, 1, 20) * 50;
        const ans = `${dec(m * 6, 2)} 公里`;
        return choice(
            `分速 ${m} 公尺 = 時速多少公里？`,
            ans,
            [`${m * 60} 公里`, `${dec(m * 6, 3)} 公里`, `${dec(m * 6, 1)} 公里`, `${dec(m, 3)} 公里`],
            () => `${dec(m * 6 + int(rand, 1, 4) * 50, 2)} 公里`,
            ['1 小時 = 60 分鐘，先算 1 小時走幾公尺。', '再把公尺換成公里：÷ 1000。'],
            `${m} × 60 = ${m * 60} 公尺 = ${dec(m * 6, 2)} 公里，所以是時速 ${ans}。`,
            differs(ans),
        );
    }
    const j = int(rand, 1, 15);
    const k = 6 * j;
    const ans = `${100 * j} 公尺`;
    return choice(
        `時速 ${k} 公里 = 分速多少公尺？`,
        ans,
        [`${k * 1000} 公尺`, `${k * 60} 公尺`, `${10 * j} 公尺`, `${1000 * j} 公尺`],
        () => `${100 * j + int(rand, 1, 4) * 50} 公尺`,
        ['先把公里換成公尺：× 1000。', '1 小時 = 60 分鐘，再 ÷ 60。'],
        `${k} 公里 = ${k * 1000} 公尺，${k * 1000} ÷ 60 = ${100 * j}，所以是分速 ${ans}。`,
        differs(ans),
    );
}

// ─── 圓 ───────────────────────────────────────────────────

export function g6Circle(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'circumference') {
        if (rand() < 0.5) {
            const r = int(rand, 2, 20);
            const ans = `${dec(628 * r, 2)} 公分`;
            return choice(
                `半徑 ${r} 公分的圓，圓周長是多少公分？`,
                ans,
                [`${dec(314 * r, 2)} 公分`, `${dec(314 * r * r, 2)} 公分`, `${dec(1256 * r, 2)} 公分`, `${dec(628 * r + 314, 2)} 公分`],
                () => `${dec(628 * r + int(rand, 1, 5) * 100, 2)} 公分`,
                ['圓周長 = 直徑 × 3.14。', `直徑是半徑的 2 倍：${r} × 2 = ${2 * r}。`],
                `${2 * r} × 3.14 = ${dec(628 * r, 2)}，圓周長是 ${ans}。`,
                differs(ans),
            );
        }
        const d = int(rand, 2, 30);
        const ans = `${dec(314 * d, 2)} 公分`;
        return choice(
            `直徑 ${d} 公分的圓，圓周長是多少公分？`,
            ans,
            [`${dec(628 * d, 2)} 公分`, `${dec(157 * d, 2)} 公分`, `${dec(314 * d + 314, 2)} 公分`, `${dec(314 * d * d, 2)} 公分`],
            () => `${dec(314 * d + int(rand, 1, 5) * 100, 2)} 公分`,
            ['圓周長 = 直徑 × 3.14。', '題目給的是直徑，不用再乘 2。'],
            `${d} × 3.14 = ${dec(314 * d, 2)}，圓周長是 ${ans}。`,
            differs(ans),
        );
    }
    if (difficulty === 'reverse') {
        const d = int(rand, 2, 30);
        const C = dec(314 * d, 2);
        if (d % 2 === 0 && rand() < 0.5) {
            return choice(
                `一個圓的圓周長是 ${C} 公分，它的半徑是多少公分？`,
                `${d / 2} 公分`,
                [`${d} 公分`, `${d * 2} 公分`, `${d / 2 + 1} 公分`, `${d + 1} 公分`],
                () => `${d / 2 + int(rand, 2, 5)} 公分`,
                ['直徑 = 圓周長 ÷ 3.14。', '半徑是直徑的一半。'],
                `${C} ÷ 3.14 = ${d}（直徑），${d} ÷ 2 = ${d / 2}，半徑是 ${d / 2} 公分。`,
                differs(`${d / 2} 公分`),
            );
        }
        return choice(
            `一個圓的圓周長是 ${C} 公分，它的直徑是多少公分？`,
            `${d} 公分`,
            [`${d * 2} 公分`, `${dec(d * 5, 1)} 公分`, `${d + 1} 公分`, `${d + 2} 公分`],
            () => `${d + int(rand, 3, 6)} 公分`,
            ['圓周長 = 直徑 × 3.14，倒過來就是除法。', `直徑 = ${C} ÷ 3.14。`],
            `${C} ÷ 3.14 = ${d}，直徑是 ${d} 公分。`,
            differs(`${d} 公分`),
        );
    }
    if (difficulty === 'area') {
        const r = int(rand, 1, 15);
        const givenD = rand() < 0.4;
        const ans = `${dec(314 * r * r, 2)} 平方公分`;
        return choice(
            givenD ? `直徑 ${2 * r} 公分的圓，面積是多少平方公分？` : `半徑 ${r} 公分的圓，面積是多少平方公分？`,
            ans,
            [`${dec(314 * 4 * r * r, 2)} 平方公分`, `${dec(628 * r, 2)} 平方公分`, `${dec(314 * r, 2)} 平方公分`, `${dec(314 * r * r * 2, 2)} 平方公分`],
            () => `${dec(314 * r * r + int(rand, 1, 6) * 314, 2)} 平方公分`,
            givenD ? ['圓面積 = 半徑 × 半徑 × 3.14。', `題目給的是直徑，半徑是 ${2 * r} ÷ 2 = ${r}。`] : ['圓面積 = 半徑 × 半徑 × 3.14。', `${r} × ${r} = ${r * r}。`],
            `${r} × ${r} × 3.14 = ${dec(314 * r * r, 2)}，面積是 ${ans}。`,
            differs(ans),
        );
    }
    // sector：半圓、四分之一圓
    const r = int(rand, 2, 12);
    const kind = int(rand, 0, 2);
    if (kind === 0) {
        const ans = `${dec(157 * r * r, 2)} 平方公分`;
        return choice(
            `半徑 ${r} 公分的半圓形，面積是多少平方公分？`,
            ans,
            [`${dec(314 * r * r, 2)} 平方公分`, `${dec(314 * r, 2)} 平方公分`, `${dec(785 * r * r, 3)} 平方公分`, `${dec(157 * r, 2)} 平方公分`],
            () => `${dec(157 * r * r + int(rand, 1, 6) * 157, 2)} 平方公分`,
            ['半圓是整個圓的一半。', '先算圓面積，再 ÷ 2。'],
            `${r} × ${r} × 3.14 ÷ 2 = ${dec(157 * r * r, 2)}，面積是 ${ans}。`,
            differs(ans),
        );
    }
    if (kind === 1) {
        const ans = `${dec(785 * r * r, 3)} 平方公分`;
        return choice(
            `半徑 ${r} 公分的四分之一圓（扇形），面積是多少平方公分？`,
            ans,
            [`${dec(157 * r * r, 2)} 平方公分`, `${dec(314 * r * r, 2)} 平方公分`, `${dec(785 * r, 3)} 平方公分`, `${dec(1570 * r, 3)} 平方公分`],
            () => `${dec(785 * r * r + int(rand, 1, 6) * 785, 3)} 平方公分`,
            ['四分之一圓是整個圓的 1/4。', '先算圓面積，再 ÷ 4。'],
            `${r} × ${r} × 3.14 ÷ 4 = ${dec(785 * r * r, 3)}，面積是 ${ans}。`,
            differs(ans),
        );
    }
    const ans = `${dec(514 * r, 2)} 公分`;
    return choice(
        `半徑 ${r} 公分的半圓形，周長是多少公分？`,
        ans,
        [`${dec(314 * r, 2)} 公分`, `${dec(628 * r, 2)} 公分`, `${dec(414 * r, 2)} 公分`, `${dec(157 * r * r, 2)} 公分`],
        () => `${dec(514 * r + int(rand, 1, 5) * 100, 2)} 公分`,
        ['半圓的周長 = 圓周長的一半 + 一條直徑。', '別忘了把直的那條邊加進去。'],
        `圓周長的一半：${2 * r} × 3.14 ÷ 2 = ${dec(314 * r, 2)}，再加直徑 ${2 * r}，共 ${ans}。`,
        differs(ans),
    );
}

// ─── 柱體體積、表面積 ─────────────────────────────────────

export function g6Solid(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'prism') {
        if (rand() < 0.5) {
            let a = 0;
            let b = 0;
            do {
                a = int(rand, 2, 12);
                b = int(rand, 2, 12);
            } while ((a * b) % 2 !== 0);
            const h = int(rand, 3, 15);
            const V = (a * b * h) / 2;
            return choice(
                `一個三角柱的底面是底 ${a} 公分、高 ${b} 公分的三角形，柱高 ${h} 公分，體積是多少立方公分？`,
                `${V} 立方公分`,
                [`${a * b * h} 立方公分`, `${(a * b) / 2 + h} 立方公分`, `${(a + b) * h} 立方公分`, `${V + (a * b) / 2} 立方公分`],
                () => `${V + int(rand, 1, 5) * h} 立方公分`,
                ['柱體體積 = 底面積 × 高。', `底面是三角形：${a} × ${b} ÷ 2。`],
                `底面積 ${a} × ${b} ÷ 2 = ${(a * b) / 2}，體積 ${(a * b) / 2} × ${h} = ${V} 立方公分。`,
                differs(`${V} 立方公分`),
            );
        }
        const S = int(rand, 6, 60);
        const h = int(rand, 3, 15);
        return choice(
            `一個柱體的底面積是 ${S} 平方公分，高 ${h} 公分，體積是多少立方公分？`,
            `${S * h} 立方公分`,
            [`${S + h} 立方公分`, `${S * h * 2} 立方公分`, `${S * (h + 1)} 立方公分`, `${S * h + h} 立方公分`],
            () => `${S * h + int(rand, 2, 6) * S} 立方公分`,
            ['不管底面是什麼形狀，柱體體積都是「底面積 × 高」。', `${S} × ${h} = ？`],
            `${S} × ${h} = ${S * h} 立方公分。`,
            differs(`${S * h} 立方公分`),
        );
    }
    if (difficulty === 'cylinder') {
        const r = int(rand, 1, 10);
        const h = int(rand, 2, 20);
        const ans = `${dec(314 * r * r * h, 2)} 立方公分`;
        return choice(
            `一個圓柱的底面半徑 ${r} 公分、高 ${h} 公分，體積是多少立方公分？`,
            ans,
            [`${dec(314 * 4 * r * r * h, 2)} 立方公分`, `${dec(628 * r * h, 2)} 立方公分`, `${dec(314 * r * h, 2)} 立方公分`, `${dec(314 * r * r, 2)} 立方公分`],
            () => `${dec(314 * r * r * (h + int(rand, 1, 4)), 2)} 立方公分`,
            ['圓柱體積 = 底面積 × 高。', `底面是圓：${r} × ${r} × 3.14。`],
            `底面積 ${r} × ${r} × 3.14 = ${dec(314 * r * r, 2)}，體積 ${dec(314 * r * r, 2)} × ${h} = ${dec(314 * r * r * h, 2)} 立方公分。`,
            differs(ans),
        );
    }
    // surface
    if (rand() < 0.3) {
        const a = int(rand, 2, 12);
        return choice(
            `邊長 ${a} 公分的正方體，表面積是多少平方公分？`,
            `${6 * a * a} 平方公分`,
            [`${a * a * a} 平方公分`, `${4 * a * a} 平方公分`, `${6 * a} 平方公分`, `${a * a} 平方公分`],
            () => `${6 * a * a + int(rand, 1, 4) * a} 平方公分`,
            ['正方體有 6 個一樣大的正方形面。', `一個面是 ${a} × ${a}。`],
            `${a} × ${a} × 6 = ${6 * a * a} 平方公分。`,
            differs(`${6 * a * a} 平方公分`),
        );
    }
    let [a, b, c] = [0, 0, 0];
    do [a, b, c] = [int(rand, 2, 12), int(rand, 2, 10), int(rand, 2, 8)];
    while (a === b || b === c || a === c);
    const S = 2 * (a * b + b * c + c * a);
    return choice(
        `長 ${a} 公分、寬 ${b} 公分、高 ${c} 公分的長方體，表面積是多少平方公分？`,
        `${S} 平方公分`,
        [`${a * b * c} 平方公分`, `${a * b + b * c + c * a} 平方公分`, `${2 * (a * b + b * c)} 平方公分`, `${4 * (a * b + b * c + c * a)} 平方公分`],
        () => `${S + int(rand, 1, 4) * 2} 平方公分`,
        ['長方體有 6 個面，相對的兩個面一樣大。', '算出 3 種面的面積，加起來再 × 2。'],
        `(${a} × ${b} + ${b} × ${c} + ${c} × ${a}) × 2 = ${S} 平方公分。`,
        differs(`${S} 平方公分`),
    );
}

// ─── 簡易方程式 ───────────────────────────────────────────

export function g6Equation(difficulty: string, rand: Rand): ChoiceQuestion {
    const pos = (w: string | number) => typeof w !== 'number' || w > 0;
    if (difficulty === 'add-sub') {
        const x = int(rand, 5, 90);
        const a = int(rand, 3, 60);
        const kind = int(rand, 0, 2);
        if (kind === 0) {
            const b = x + a;
            return choice(`x + ${a} = ${b}，x 是多少？`, x, [b + a, a, b], near(rand, x, 5),
                ['等號兩邊同時減去同一個數，等式仍然成立。', `兩邊同時減 ${a}。`],
                `x = ${b} - ${a} = ${x}。驗算：${x} + ${a} = ${b}。`, pos);
        }
        if (kind === 1) {
            const b = x;
            const X = x + a;
            return choice(`x - ${a} = ${b}，x 是多少？`, X, [b - a, b, a], near(rand, X, 5),
                ['等號兩邊同時加上同一個數，等式仍然成立。', `兩邊同時加 ${a}。`],
                `x = ${b} + ${a} = ${X}。驗算：${X} - ${a} = ${b}。`, pos);
        }
        const A = x + a;
        return choice(`${A} - x = ${a}，x 是多少？`, x, [A + a, a, A], near(rand, x, 5),
            ['被減數 - 減數 = 差，所以減數 = 被減數 - 差。', `x = ${A} - ${a}。`],
            `x = ${A} - ${a} = ${x}。驗算：${A} - ${x} = ${a}。`, pos);
    }
    if (difficulty === 'mul-div') {
        const x = int(rand, 2, 15);
        const a = int(rand, 2, 9);
        if (rand() < 0.5) {
            const b = a * x;
            return choice(`${a} × x = ${b}，x 是多少？`, x, [b * a, b - a, b + a], near(rand, x, 4),
                ['等號兩邊同時除以同一個數（不是 0），等式仍然成立。', `兩邊同時 ÷ ${a}。`],
                `x = ${b} ÷ ${a} = ${x}。驗算：${a} × ${x} = ${b}。`, pos);
        }
        const X = x * a;
        return choice(`x ÷ ${a} = ${x}，x 是多少？`, X, [x + a, x, X + a, X - a], near(rand, X, 4),
            ['等號兩邊同時乘以同一個數，等式仍然成立。', `兩邊同時 × ${a}。`],
            `x = ${x} × ${a} = ${X}。驗算：${X} ÷ ${a} = ${x}。`, pos);
    }
    // two-step
    const x = int(rand, 2, 20);
    const a = int(rand, 2, 9);
    const b = int(rand, 1, 30);
    if (rand() < 0.5) {
        const c = a * x + b;
        const wrong = (c + b) % a === 0 ? (c + b) / a : x + 2;
        return choice(`某數的 ${a} 倍再加 ${b} 等於 ${c}，某數是多少？`, x, [wrong, c - b, x + 1, Math.floor(c / a)], near(rand, x, 4),
            [`先寫成算式：${a} × x + ${b} = ${c}。`, `先兩邊減 ${b}，再兩邊除以 ${a}。`],
            `${a} × x + ${b} = ${c} → ${a} × x = ${c - b} → x = ${x}。`, pos);
    }
    const q = x;
    const X = q * a + b;
    return choice(`某數減去 ${b} 以後再除以 ${a}，得到 ${q}，某數是多少？`, X, [q * a - b, q * a, (q + b) * a, q + a + b], near(rand, X, 5),
        [`先寫成算式：(x - ${b}) ÷ ${a} = ${q}。`, `倒著做：先 × ${a}，再 + ${b}。`],
        `(x - ${b}) ÷ ${a} = ${q} → x - ${b} = ${q * a} → x = ${X}。`, pos);
}

// ─── 基準量與比較量 ───────────────────────────────────────

export function g6Base(difficulty: string, rand: Rand): ChoiceQuestion {
    const [p, q] = coprimePair(rand, 8, 9);
    const [P, Q] = p < q ? [p, q] : [q, p];
    const k = int(rand, 2, 12);
    if (difficulty === 'compare') {
        const total = Q * k;
        const ans = P * k;
        const [ctx, unit] = pick(rand, [
            [`全班有 ${total} 人，其中 ${P}/${Q} 是女生，女生有幾人？`, '人'],
            [`一本書有 ${total} 頁，小安已經讀了全書的 ${P}/${Q}，讀了幾頁？`, '頁'],
            [`果園採了 ${total} 顆芒果，其中 ${P}/${Q} 要送給鄰居，要送幾顆？`, '顆'],
        ] as const);
        return choice(
            ctx,
            `${ans} ${unit}`,
            [`${total - ans} ${unit}`, `${k} ${unit}`, `${total * P} ${unit}`, `${ans + k} ${unit}`],
            () => `${ans + int(rand, 2, 5) * k} ${unit}`,
            ['基準量是「全部」，比較量 = 基準量 × 幾分之幾。', `${total} × ${P}/${Q} = ？`],
            `${total} × ${P}/${Q} = ${ans}，答案是 ${ans} ${unit}。`,
            differs(`${ans} ${unit}`),
        );
    }
    // base：已知比較量，求基準量
    const C = P * k;
    const base = Q * k;
    const wrong = (C * P) % Q === 0 ? (C * P) / Q : C + k;
    const [ctx, unit] = pick(rand, [
        [`小華有 ${C} 張貼紙，是姊姊的 ${P}/${Q}，姊姊有幾張？`, '張'],
        [`弟弟存了 ${C} 元，是哥哥存款的 ${P}/${Q}，哥哥存了多少元？`, '元'],
        [`花圃裡有 ${C} 朵紅花，是全部花朵的 ${P}/${Q}，花圃裡一共有幾朵花？`, '朵'],
    ] as const);
    return choice(
        ctx,
        `${base} ${unit}`,
        [`${wrong} ${unit}`, `${C * Q} ${unit}`, `${base - C} ${unit}`, `${base + k} ${unit}`],
        () => `${base + int(rand, 2, 5) * k} ${unit}`,
        ['「是……的幾分之幾」，「的」後面的是基準量。', `基準量 × ${P}/${Q} = ${C}，所以基準量 = ${C} ÷ ${P}/${Q}。`],
        `${C} ÷ ${P}/${Q} = ${C} × ${Q}/${P} = ${base}，答案是 ${base} ${unit}。`,
        differs(`${base} ${unit}`),
    );
}

export const GRADE6_GENERATORS: Record<string, LocalGenerator> = {
    g6Prime,
    g6FracDiv,
    g6DecDiv,
    g6Ratio,
    g6Scale,
    g6Speed,
    g6Circle,
    g6Solid,
    g6Equation,
    g6Base,
};
