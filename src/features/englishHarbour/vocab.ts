import { RAW_WORDS, TOPICS } from './data/words';

export interface Word {
    /** 單字本身，也是資料庫裡的 key */
    word: string;
    pos: string;
    zh: string;
    emoji: string;
    topic: string;
    /** 在字庫中的順序，新字依這個順序出現 */
    index: number;
    /** 只有英文字母的字才考拼字（片語、縮寫、有標點的不考） */
    spellable: boolean;
}

const parse = (): Word[] => {
    const seen = new Set<string>();
    const list: Word[] = [];
    for (const topic of TOPICS) {
        for (const line of (RAW_WORDS[topic.id] ?? '').split('\n')) {
            const [word, pos, zh, emoji = ''] = line.split('|').map((s) => s.trim());
            if (!word || !zh || seen.has(word)) continue;
            seen.add(word);
            list.push({ word, pos, zh, emoji, topic: topic.id, index: list.length, spellable: /^[A-Za-z]{2,12}$/.test(word) });
        }
    }
    return list;
};

export const WORDS: Word[] = parse();
export const WORD_MAP = new Map(WORDS.map((w) => [w.word, w]));
export { TOPICS };
