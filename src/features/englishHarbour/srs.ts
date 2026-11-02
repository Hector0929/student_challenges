// 英文書港的熟悉度規則（間隔複習）：純函式，方便測試
import type { Word } from './vocab';

/** 0 新字 1 學習中 2 複習中 3 熟悉 4 精熟 */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface WordProgress {
    word: string;
    level: Level;
    /** 下次該複習的台北日期 YYYY-MM-DD */
    due_on: string;
    correct_count: number;
    wrong_count: number;
    /** 自己按「我會了」或快速分類標的，不算進家人動態 */
    self_marked: boolean;
    /** 第一次靠作答升到熟悉的時間 */
    familiar_at: string | null;
    last_seen_at: string | null;
    /** 資料庫建立時間；用來算今天已經學了幾個新字（寫回資料庫時不送） */
    created_at?: string;
}

export type QuestionType = 'listen' | 'meaning' | 'spell' | 'spellHard';

export interface SessionItem {
    word: Word;
    type: QuestionType;
    /** 新字先看一次學習卡 */
    isNew: boolean;
}

export const LEVELS: Array<{ name: string; icon: string; color: string }> = [
    { name: '新字', icon: '🌱', color: 'var(--eh-l0)' },
    { name: '學習中', icon: '📖', color: 'var(--eh-l1)' },
    { name: '複習中', icon: '🔁', color: 'var(--eh-l2)' },
    { name: '熟悉', icon: '⭐', color: 'var(--eh-l3)' },
    { name: '精熟', icon: '👑', color: 'var(--eh-l4)' },
];

/** 升到這一級後隔幾天再複習 */
const INTERVAL_DAYS: Record<Level, number> = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 30 };
export const FAMILIAR_LEVEL = 3;
export const NEW_WORDS_PER_DAY = 5;

export const addDays = (date: string, days: number): string => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

const fresh = (word: string, today: string): WordProgress => ({
    word,
    level: 0,
    due_on: today,
    correct_count: 0,
    wrong_count: 0,
    self_marked: false,
    familiar_at: null,
    last_seen_at: null,
});

/** 第一次就答對（沒用提示、沒按錯）才升一級；答錯回到「學習中」，今天再練 */
export function applyAnswer(prev: WordProgress | undefined, word: string, firstTry: boolean, today: string, now: string): WordProgress {
    const base = prev ?? fresh(word, today);
    if (!firstTry) {
        return { ...base, level: 1, due_on: today, wrong_count: base.wrong_count + 1, last_seen_at: now };
    }
    const level = Math.min(4, base.level + 1) as Level;
    const becameFamiliar = base.level < FAMILIAR_LEVEL && level >= FAMILIAR_LEVEL;
    return {
        ...base,
        level,
        due_on: addDays(today, INTERVAL_DAYS[level]),
        correct_count: base.correct_count + 1,
        familiar_at: becameFamiliar && !base.familiar_at ? now : base.familiar_at,
        last_seen_at: now,
    };
}

/** 「我會了」：直接精熟，30 天後抽查一次 */
export function markKnown(prev: WordProgress | undefined, word: string, today: string, now: string): WordProgress {
    const base = prev ?? fresh(word, today);
    return { ...base, level: 4, self_marked: true, due_on: addDays(today, INTERVAL_DAYS[4]), last_seen_at: now };
}

export type SortChoice = 'know' | 'unsure' | 'new';

/** 第一次進主題的快速分類；「不認識」維持新字，不寫資料 */
export function applySort(word: string, choice: SortChoice, today: string, now: string): WordProgress | null {
    if (choice === 'new') return null;
    if (choice === 'know') return { ...fresh(word, today), level: 3, self_marked: true, due_on: addDays(today, 3), last_seen_at: now };
    return { ...fresh(word, today), level: 1, due_on: today, last_seen_at: now };
}

export function questionTypeFor(level: Level, word: Word): QuestionType {
    if (level <= 1) return 'listen';
    if (level === 2 || !word.spellable) return 'meaning';
    return level === 3 ? 'spell' : 'spellHard';
}

interface SessionOptions {
    topic?: string | null;
    size?: number;
    /** 今天還能學幾個新字 */
    newLeft?: number;
    random?: () => number;
}

/** 一輪練習：到期複習優先，再加新字，偶爾抽查精熟的字 */
export function buildSession(words: Word[], progress: Map<string, WordProgress>, today: string, opts: SessionOptions = {}): SessionItem[] {
    const { topic = null, size = 10, newLeft = NEW_WORDS_PER_DAY, random = Math.random } = opts;
    const pool = topic ? words.filter((w) => w.topic === topic) : words;
    const levelOf = (w: Word) => progress.get(w.word)?.level ?? 0;
    const dueOf = (w: Word) => progress.get(w.word)?.due_on ?? today;

    const due = pool
        .filter((w) => levelOf(w) >= 1 && levelOf(w) <= 3 && dueOf(w) <= today)
        .sort((a, b) => dueOf(a).localeCompare(dueOf(b)) || levelOf(a) - levelOf(b));
    const masteredDue = pool.filter((w) => levelOf(w) === 4 && dueOf(w) <= today);
    // 新字：有 emoji 的具體名詞先出，對小孩比較好懂
    const fresh = pool.filter((w) => levelOf(w) === 0).sort((a, b) => Number(!a.emoji) - Number(!b.emoji) || a.index - b.index);

    const picked: Word[] = [];
    const take = (list: Word[], n: number) => {
        for (const w of list) {
            if (picked.length >= size || n <= 0) break;
            if (picked.includes(w)) continue;
            picked.push(w);
            n--;
        }
    };
    // 同一輪的新字分散到不同主題、避開意思相近的字（dad / daddy / father 不要一起學）
    const freshPick: Word[] = [];
    const usedTopics = new Set<string>();
    const usedChars = new Set<string>();
    for (const pass of [0, 1]) {
        for (const w of fresh) {
            if (freshPick.length >= newLeft) break;
            if (freshPick.includes(w)) continue;
            const chars = w.zh.replace(/[（(].*$/, '').split('').filter((c) => !'的；、 一個'.includes(c));
            if (pass === 0 && ((!topic && usedTopics.has(w.topic)) || chars.some((c) => usedChars.has(c)))) continue;
            freshPick.push(w);
            usedTopics.add(w.topic);
            chars.forEach((c) => usedChars.add(c));
        }
    }
    const newCount = Math.min(newLeft, freshPick.length);
    take(due, size - Math.min(newCount, 3) - (masteredDue.length ? 1 : 0));
    take(masteredDue, 1);
    take(freshPick, newCount);
    take(due, size);
    // 都練完了：從還不熟的字加練，再不夠就放新字
    if (!picked.length) {
        take(pool.filter((w) => levelOf(w) >= 1 && levelOf(w) <= 3).sort((a, b) => levelOf(a) - levelOf(b) || dueOf(a).localeCompare(dueOf(b))), size);
        take(fresh, Math.min(3, size));
    }

    const items = picked.map((w) => ({ word: w, type: questionTypeFor(levelOf(w), w), isNew: levelOf(w) === 0 }));
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

/** 選擇題的干擾選項：聽音題挑同主題不同意思的字，看意思題挑拼法相近的字 */
export function pickDistractors(target: Word, words: Word[], type: QuestionType, count = 3, random = Math.random): Word[] {
    const score = (w: Word) => {
        if (type === 'listen') return (w.topic === target.topic ? 3 : 0) + (w.emoji ? 1 : 0);
        let s = 0;
        if (w.word[0]?.toLowerCase() === target.word[0]?.toLowerCase()) s += 2;
        if (Math.abs(w.word.length - target.word.length) <= 1) s += 1;
        if (w.topic === target.topic) s += 1;
        return s;
    };
    const candidates = words
        .filter((w) => w.word.toLowerCase() !== target.word.toLowerCase() && w.zh !== target.zh && (type !== 'listen' || !!w.emoji === !!target.emoji))
        .map((w) => ({ w, s: score(w) + random() * 1.5 }))
        .sort((a, b) => b.s - a.s);
    const out: Word[] = [];
    for (const { w } of candidates) {
        if (out.length >= count) break;
        if (out.some((o) => o.zh === w.zh || o.word.toLowerCase() === w.word.toLowerCase())) continue;
        out.push(w);
    }
    return out;
}

const DECOY_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** 拼字字母磚：這個字的字母 + 幾個干擾字母，打散 */
export function spellTiles(word: string, decoys: number, random = Math.random): string[] {
    const letters = word.toLowerCase().split('');
    const extra: string[] = [];
    while (extra.length < decoys) {
        const c = DECOY_LETTERS[Math.floor(random() * DECOY_LETTERS.length)];
        if (!letters.includes(c) && !extra.includes(c)) extra.push(c);
    }
    const tiles = [...letters, ...extra];
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles;
}

export const isFamiliar = (p: WordProgress | undefined) => (p?.level ?? 0) >= FAMILIAR_LEVEL;
