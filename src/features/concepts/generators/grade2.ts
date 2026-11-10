// 二年級數學的程式出題：千以內的數、二位數加減、九九乘法、長度、時間、錢幣。
// 每個產生器回傳一題選擇題；誘答盡量用孩子真的會犯的錯（忘了進位、位值寫錯…）。

import type { ChoiceQuestion } from '../types';

type Rand = () => number;
const int = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

/** 組一題選擇題：去掉和正解相同、重複或不合理的誘答，不夠 3 個用 fallback 補 */
function choice(
    q: string,
    a: string | number,
    candidates: (string | number)[],
    fallback: () => string | number,
    h: string[],
    e: string,
    valid: (w: string | number) => boolean = (w) => typeof w !== 'number' || w >= 0,
): ChoiceQuestion {
    const ans = String(a);
    const w: string[] = [];
    const push = (c: string | number) => {
        const s = String(c);
        const sane = typeof c === 'number' ? c >= 0 && Number.isInteger(c) : !/^0 |^-|NaN/.test(c);
        if (s !== ans && !w.includes(s) && sane && valid(c) && w.length < 3) w.push(s);
    };
    candidates.forEach(push);
    for (let i = 0; w.length < 3 && i < 50; i++) push(fallback());
    return { type: 'choice', q, a: ans, w, h, e };
}

const near = (rand: Rand, n: number, spread: number) => () => n + pick(rand, [-1, 1]) * int(rand, 1, spread);

// ─── 千以內的數 ───────────────────────────────────────────

export function numbersTo1000(difficulty: string, rand: Rand): ChoiceQuestion {
    const n = int(rand, 101, 999);
    const [h, t, o] = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
    switch (difficulty) {
        case 'place': {
            const kind = int(rand, 0, 2);
            if (kind === 0) {
                // 用位值組成數
                const tens = pick(rand, [0, t]);
                const m = h * 100 + tens * 10 + o;
                return choice(
                    `${h} 個百、${tens} 個十、${o} 個一合起來是多少？`,
                    m,
                    [h * 100 + o * 10 + tens, Number(`${h}${tens || ''}${o}`), h * 10 + tens + o],
                    near(rand, m, 20),
                    ['百位、十位、個位依序寫下來。', tens === 0 ? '沒有十，十位要寫 0。' : '每一位放一個數字。'],
                    `百位 ${h}、十位 ${tens}、個位 ${o}，寫成 ${m}。`,
                );
            }
            if (kind === 1) {
                const places = ['百位', '十位', '個位'];
                const digits = [h, t, o];
                const i = int(rand, 0, 2);
                const value = digits[i] * [100, 10, 1][i];
                return choice(
                    `${n} 的${places[i]}數字代表多少？`,
                    value,
                    [digits[i], digits[i] * [100, 10, 1][(i + 1) % 3], digits[i] * [100, 10, 1][(i + 2) % 3]],
                    near(rand, value, 9),
                    ['從右邊數：個位、十位、百位。', `${places[i]}的 1 代表 ${[100, 10, 1][i]}。`],
                    `${n} 的${places[i]}是 ${digits[i]}，代表 ${value}。`,
                );
            }
            return choice(
                `${n} 是由幾個百、幾個十、幾個一組成的？`,
                `${h} 個百、${t} 個十、${o} 個一`,
                [`${o} 個百、${t} 個十、${h} 個一`, `${t} 個百、${h} 個十、${o} 個一`, `${h} 個百、${o} 個十、${t} 個一`],
                () => `${h} 個百、${int(rand, 0, 9)} 個十、${int(rand, 0, 9)} 個一`,
                ['最左邊的數字在百位。'],
                `${n} = ${h * 100} + ${t * 10} + ${o}。`,
            );
        }
        case 'compare': {
            // 刻意讓兩個數字只差一位，比較才有意思
            let m = n;
            while (m === n) m = pick(rand, [n + int(rand, 1, 9) * 10, n - int(rand, 1, 9), Number(`${h}${o}${t}`), n + 100 - int(rand, 1, 99)]);
            if (m < 100 || m > 999) m = n === 999 ? 998 : n + 1;
            const big = Math.max(n, m);
            const small = Math.min(n, m);
            const ask = rand() < 0.5;
            return choice(
                `${n} 和 ${m}，哪一個比較${ask ? '大' : '小'}？`,
                ask ? big : small,
                [ask ? small : big, '一樣大'],
                () => '無法比較',
                ['先比百位，百位一樣再比十位。', '百位、十位都一樣，再比個位。'],
                `${big} > ${small}，所以比較${ask ? '大' : '小'}的是 ${ask ? big : small}。`,
            );
        }
        default: {
            // sequence：數的前後、一百一百或十個十個數
            const step = pick(rand, [1, 10, 100]);
            const start = int(rand, 100, 999 - step * 4);
            const kind = int(rand, 0, 1);
            if (kind === 0) {
                const seq = [0, 1, 2, 3].map((i) => start + i * step);
                const ans = start + 4 * step;
                return choice(
                    `${seq.join('、')}，下一個數是多少？`,
                    ans,
                    [start + 3 * step + 1, start + 3 * step + 10, start + 3 * step + 100].filter((x) => x !== ans),
                    near(rand, ans, 5),
                    ['看看每次多了多少。', `每次都多 ${step}。`],
                    `每次多 ${step}，${start + 3 * step} + ${step} = ${ans}。`,
                    (w) => typeof w === 'number' && w <= 1000,
                );
            }
            const base = pick(rand, [start, h * 100, h * 100 + t * 10]);
            const before = base + step > 1000 || (base - step >= 100 && rand() < 0.5);
            const ans = before ? base - step : base + step;
            return choice(
                `比 ${base} ${before ? '少' : '多'} ${step} 的數是多少？`,
                ans,
                [before ? base + step : base - step, base, ans + (before ? -1 : 1) * (step === 1 ? 10 : 1)],
                near(rand, ans, 9),
                [before ? `往回數 ${step}。` : `往後數 ${step}。`],
                `${base} ${before ? '-' : '+'} ${step} = ${ans}。`,
                (w) => typeof w === 'number' && w >= 0 && w <= 1000,
            );
        }
    }
}

// ─── 二位數加減 ───────────────────────────────────────────

export function addSubtract(difficulty: string, rand: Rand): ChoiceQuestion {
    const isAdd = difficulty.startsWith('add');
    let a = 0;
    let b = 0;
    for (let i = 0; i < 200; i++) {
        if (difficulty === 'add-3digit') {
            a = int(rand, 100, 800);
            b = int(rand, 11, 999 - a);
            break;
        }
        a = int(rand, 11, 99);
        b = int(rand, 11, 99);
        if (isAdd) {
            const carry = (a % 10) + (b % 10) >= 10;
            if (a + b <= 99 && carry === (difficulty === 'add-carry')) break;
        } else {
            if (a < b) [a, b] = [b, a];
            const borrow = a % 10 < b % 10;
            if (a > b && borrow === (difficulty === 'sub-borrow')) break;
        }
    }
    const ans = isAdd ? a + b : a - b;
    // 常見錯誤：忘了進位／退位、個位大減小、加減弄反
    const slip = Math.abs((a % 10) - (b % 10)) + (Math.floor(a / 10) - Math.floor(b / 10)) * 10;
    const others = isAdd ? [ans - 10, ans + 10, ans + 1] : [ans + 10, slip, ans - 1];
    const op = isAdd ? '+' : '-';

    if (rand() < 0.4) {
        const story = isAdd
            ? pick(rand, [
                  `圖書館上午借出 ${a} 本書，下午借出 ${b} 本，一天共借出幾本？`,
                  `小美摺了 ${a} 隻紙鶴，哥哥摺了 ${b} 隻，兩人共摺了幾隻？`,
                  `果園第一天摘了 ${a} 顆芭樂，第二天摘了 ${b} 顆，共摘了幾顆？`,
              ])
            : pick(rand, [
                  `一盒彈珠有 ${a} 顆，送給弟弟 ${b} 顆，還剩幾顆？`,
                  `公車上有 ${a} 人，到站下車 ${b} 人，車上還有幾人？`,
                  `小明存了 ${a} 元，買文具用掉 ${b} 元，還剩幾元？`,
              ]);
        return choice(
            story,
            ans,
            [...others, isAdd ? Math.abs(a - b) : a + b],
            near(rand, ans, 10),
            [isAdd ? '「共」「合起來」要用加法。' : '「還剩」要用減法。', `算 ${a} ${op} ${b}。`],
            `${a} ${op} ${b} = ${ans}。`,
        );
    }
    const hint = isAdd
        ? (a % 10) + (b % 10) >= 10
            ? '個位加起來滿 10，要向十位進 1。'
            : '個位加個位，十位加十位。'
        : a % 10 < b % 10
          ? '個位不夠減，要向十位借 1 當 10。'
          : '個位減個位，十位減十位。';
    return choice(`${a} ${op} ${b} = ？`, ans, others, near(rand, ans, 10), [hint], `用直式算：${a} ${op} ${b} = ${ans}。`);
}

// ─── 九九乘法 ─────────────────────────────────────────────

const TABLES: Record<string, number[]> = {
    '2-5-10': [2, 5, 10],
    '3-4': [3, 4],
    '6-7': [6, 7],
    '8-9': [8, 9],
    all: [2, 3, 4, 5, 6, 7, 8, 9],
};

export function timesTable(difficulty: string, rand: Rand): ChoiceQuestion {
    const a = pick(rand, TABLES[difficulty] ?? TABLES.all);
    const b = int(rand, 1, 9);
    const ans = a * b;
    const neighbors = [a * (b + 1), a * (b - 1), a + b, (a + 1) * b].filter((x) => x > 0);
    const kind = int(rand, 0, 3);
    if (kind === 0) {
        return choice(`${a} × ${b} = ？`, ans, neighbors, near(rand, ans, 5), [`${a} 的乘法：${a}、${a * 2}、${a * 3}…`, `${b} 個 ${a} 連加。`], `${a} × ${b} = ${ans}。`, (w) => typeof w === 'number' && w > 0);
    }
    if (kind === 1) {
        return choice(`${a} × ？ = ${ans}`, b, [b + 1, b - 1, ans - a].filter((x) => x > 0), () => int(rand, 1, 9), [`${a} 的幾倍是 ${ans}？`, `從 ${a} 開始數，數到 ${ans} 要幾次？`], `${a} × ${b} = ${ans}，所以是 ${b}。`, (w) => typeof w === 'number' && w > 0);
    }
    if (kind === 2) {
        const [unit, thing] = pick(rand, [
            ['盒', '顆蛋'],
            ['袋', '顆橘子'],
            ['排', '張椅子'],
            ['盤', '塊餅乾'],
            ['包', '張色紙'],
        ] as const);
        return choice(
            `每${unit}有 ${a} ${thing}，${b} ${unit}共有幾${thing.slice(0, 1)}？`,
            ans,
            [a + b, ...neighbors],
            near(rand, ans, 5),
            ['一樣多的東西有好幾份，可以用乘法。', `${a} × ${b}`],
            `每${unit} ${a}，${b} ${unit}就是 ${a} × ${b} = ${ans}。`,
            (w) => typeof w === 'number' && w > 0,
        );
    }
    return choice(
        `${b} 個 ${a} 連加，可以寫成哪個乘法算式？`,
        `${a} × ${b}`,
        [`${a} + ${b}`, `${a} × ${b + 1}`, `${b} + ${b}`],
        () => `${a} × ${int(rand, 1, 9)}`,
        ['「幾個幾」可以寫成乘法。'],
        `${b} 個 ${a} 是 ${a} × ${b} = ${ans}。`,
    );
}

// ─── 長度（公分、公尺） ───────────────────────────────────

export function length(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'cm') {
        const a = int(rand, 5, 60);
        const b = int(rand, 3, 40);
        if (rand() < 0.5) {
            return choice(
                `一條緞帶長 ${a} 公分，另一條長 ${b} 公分，接起來共長幾公分？（接頭不重疊）`,
                `${a + b} 公分`,
                [`${Math.abs(a - b)} 公分`, `${a + b + 10} 公分`, `${a + b - 1} 公分`],
                () => `${a + b + int(rand, -9, 9)} 公分`,
                ['兩段接起來，長度要相加。'],
                `${a} + ${b} = ${a + b}（公分）。`,
            );
        }
        const [big, small] = a > b ? [a, b] : [b + a, b];
        return choice(
            `紅色緞帶長 ${big} 公分，藍色緞帶長 ${small} 公分，紅色緞帶比藍色緞帶長幾公分？`,
            `${big - small} 公分`,
            [`${big + small} 公分`, `${big - small + 10} 公分`, `${big} 公分`],
            () => `${big - small + int(rand, -5, 5)} 公分`,
            ['「長多少」要用減法。'],
            `${big} - ${small} = ${big - small}（公分）。`,
        );
    }
    // m-cm：公尺和公分的換算與比較
    const m = int(rand, 1, 5);
    const cm = int(rand, 1, 99);
    const total = m * 100 + cm;
    const kind = int(rand, 0, 2);
    if (kind === 0) {
        return choice(
            `${m} 公尺 ${cm} 公分 = 幾公分？`,
            `${total} 公分`,
            [`${m * 10 + cm} 公分`, `${m}${cm} 公分`, `${m * 100} 公分`],
            () => `${total + int(rand, -20, 20)} 公分`,
            ['1 公尺 = 100 公分。', `${m} 公尺是 ${m * 100} 公分。`],
            `${m} 公尺 = ${m * 100} 公分，再加 ${cm} 公分 = ${total} 公分。`,
        );
    }
    if (kind === 1) {
        return choice(
            `${total} 公分 = 幾公尺幾公分？`,
            `${m} 公尺 ${cm} 公分`,
            [`${m * 10 + Math.floor(cm / 10)} 公尺 ${cm % 10} 公分`, `${m + 1} 公尺 ${cm} 公分`, `${Math.floor(total / 10)} 公尺 ${total % 10} 公分`],
            () => `${m} 公尺 ${int(rand, 1, 99)} 公分`,
            ['每 100 公分換成 1 公尺。'],
            `${total} 公分 = ${m * 100} 公分 + ${cm} 公分 = ${m} 公尺 ${cm} 公分。`,
        );
    }
    const other = total + pick(rand, [-1, 1]) * int(rand, 5, 80);
    const a = `${m} 公尺 ${cm} 公分`;
    const b = `${other} 公分`;
    return choice(
        `${a} 和 ${b}，哪一個比較長？`,
        total > other ? a : b,
        [total > other ? b : a, '一樣長'],
        () => '無法比較',
        ['先換成同一個單位再比。', `${a} = ${total} 公分。`],
        `${a} = ${total} 公分，${total > other ? `比 ${other} 公分長` : `比 ${other} 公分短`}。`,
    );
}

// ─── 時刻與時間 ───────────────────────────────────────────

const fmtTime = (minutesOfDay: number) => {
    const h = Math.floor(minutesOfDay / 60) % 24;
    const m = minutesOfDay % 60;
    const half = h < 12 ? '上午' : h === 12 ? '中午' : '下午';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${half} ${h12} 點${m === 0 ? '' : ` ${m} 分`}`;
};

export function time(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'convert') {
        const kind = int(rand, 0, 2);
        if (kind === 0) {
            const h = int(rand, 1, 3);
            const m = pick(rand, [10, 15, 20, 30, 40, 45]);
            return choice(
                `${h} 小時 ${m} 分鐘 = 幾分鐘？`,
                `${h * 60 + m} 分鐘`,
                [`${h * 100 + m} 分鐘`, `${h + m} 分鐘`, `${h * 60} 分鐘`],
                () => `${h * 60 + m + int(rand, -15, 15)} 分鐘`,
                ['1 小時 = 60 分鐘。'],
                `${h} 小時 = ${h * 60} 分鐘，再加 ${m} 分鐘 = ${h * 60 + m} 分鐘。`,
            );
        }
        if (kind === 1) {
            const total = int(rand, 61, 179);
            const h = Math.floor(total / 60);
            const m = total % 60;
            return choice(
                `${total} 分鐘 = 幾小時幾分鐘？`,
                `${h} 小時 ${m} 分鐘`,
                [`${Math.floor(total / 100)} 小時 ${total % 100} 分鐘`, `${h + 1} 小時 ${m} 分鐘`, `${h} 小時 ${(m + 40) % 60} 分鐘`],
                () => `${h} 小時 ${int(rand, 0, 59)} 分鐘`,
                ['每 60 分鐘換成 1 小時。'],
                `${total} = 60 × ${h} + ${m}，是 ${h} 小時 ${m} 分鐘。`,
            );
        }
        const d = int(rand, 1, 3);
        return choice(
            `${d} 天是幾小時？`,
            `${d * 24} 小時`,
            [`${d * 12} 小時`, `${d * 60} 小時`, `${d * 10} 小時`],
            () => `${d * 24 + int(rand, -6, 6)} 小時`,
            ['1 天 = 24 小時。'],
            `${d} × 24 = ${d * 24}（小時）。`,
        );
    }
    // elapsed：經過多久、幾點幾分
    const start = int(rand, 7, 17) * 60 + pick(rand, [0, 10, 15, 20, 30, 40, 45]);
    const dur = pick(rand, [15, 20, 30, 40, 45, 50, 60, 90, 120]);
    const end = start + dur;
    const durText = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} 小時${n % 60 ? ` ${n % 60} 分鐘` : ''}` : `${n} 分鐘`);
    if (rand() < 0.5) {
        return choice(
            `${pick(rand, ['電影', '游泳課', '才藝課', '比賽'])}從${fmtTime(start)}開始，進行 ${durText(dur)}，幾點幾分結束？`,
            fmtTime(end),
            [fmtTime(end + 10), fmtTime(end - 10), fmtTime(start + (dur % 60) + (dur >= 60 ? 0 : 60))],
            () => fmtTime(end + pick(rand, [-1, 1]) * pick(rand, [5, 15, 30])),
            ['先加整點的小時，再加分鐘。', '分鐘滿 60 要進到下一個小時。'],
            `${fmtTime(start)}再過 ${durText(dur)}，是${fmtTime(end)}。`,
        );
    }
    return choice(
        `從${fmtTime(start)}到${fmtTime(end)}，經過了多久？`,
        durText(dur),
        [durText(dur + 10), durText(Math.abs(dur - 10) || 5), durText(dur + 60)],
        () => durText(dur + pick(rand, [-1, 1]) * pick(rand, [5, 15, 30])),
        ['先數經過幾個整點，再數剩下的分鐘。'],
        `從${fmtTime(start)}到${fmtTime(end)}經過 ${durText(dur)}。`,
        (w) => !String(w).startsWith('-'),
    );
}

// ─── 錢幣 ─────────────────────────────────────────────────

export function money(difficulty: string, rand: Rand): ChoiceQuestion {
    if (difficulty === 'count') {
        const counts = { 100: int(rand, 0, 3), 50: int(rand, 0, 2), 10: int(rand, 0, 5), 5: int(rand, 0, 2), 1: int(rand, 0, 4) };
        if (Object.values(counts).every((c) => c === 0)) counts[10] = 2;
        const total = Object.entries(counts).reduce((s, [v, c]) => s + Number(v) * c, 0);
        const parts = Object.entries(counts)
            .filter(([, c]) => c > 0)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([v, c]) => `${v} 元${v === '100' ? '鈔票' : '硬幣'} ${c} 張`.replace(/硬幣 (\d+) 張/, '硬幣 $1 個'));
        const naive = Object.values(counts).reduce((s, c) => s + c, 0);
        return choice(
            `錢包裡有 ${parts.join('、')}，共有多少元？`,
            `${total} 元`,
            [`${total + 10} 元`, `${total - 5 > 0 ? total - 5 : total + 5} 元`, `${naive} 元`],
            () => `${total + pick(rand, [-1, 1]) * pick(rand, [1, 5, 10, 50])} 元`,
            ['從面額大的開始數。', '100、50、10、5、1 元依序加起來。'],
            `${Object.entries(counts)
                .filter(([, c]) => c > 0)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([v, c]) => `${v} × ${c}`)
                .join(' + ')} = ${total}（元）。`,
            (w) => !String(w).startsWith('-') && String(w) !== '0 元',
        );
    }
    // change：買東西找錢
    const item = pick(rand, ['鉛筆盒', '故事書', '水壺', '跳繩', '色鉛筆', '貼紙本']);
    const price = int(rand, 12, 95);
    const pay = price < 50 && rand() < 0.5 ? 50 : 100;
    const change = pay - price;
    return choice(
        `${item}一個 ${price} 元，付了 ${pay} 元，要找回多少元？`,
        `${change} 元`,
        [`${change + 10} 元`, `${change - 10} 元`, `${price} 元`],
        () => `${change + pick(rand, [-1, 1]) * int(rand, 1, 9)} 元`,
        ['找錢 = 付的錢 - 價錢。', `算 ${pay} - ${price}。`],
        `${pay} - ${price} = ${change}（元）。`,
        (w) => !String(w).startsWith('-') && String(w) !== '0 元',
    );
}

export const GRADE2_GENERATORS: Record<string, (difficulty: string, rand: Rand) => ChoiceQuestion> = {
    numbersTo1000,
    addSubtract,
    timesTable,
    length,
    time,
    money,
};
