// 從一個概念挑出一輪要作答的題目。

import { generateQuestion } from './generators';
import type { Concept, PlayableQuestion, Question } from './types';

export const ROUND_SIZE = 5;

/** 題目的固定 key：用題目文字做雜湊，題庫調整順序也不會對錯題 */
export function questionKey(q: Question): string {
    let h = 5381;
    for (let i = 0; i < q.q.length; i++) h = ((h << 5) + h + q.q.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * 寫好的題目：先放最近答錯的，再隨機補滿。
 * 生成題：每次產生新題，題目文字不重複。
 */
export function pickQuestions(concept: Concept, recentWrong: string[] = [], size = ROUND_SIZE, rand: () => number = Math.random): PlayableQuestion[] {
    const fixed = (concept.questions ?? []).map((question) => ({ key: questionKey(question), question }));
    const wrongSet = new Set(recentWrong);
    const retry = shuffle(fixed.filter((p) => wrongSet.has(p.key)), rand);
    const rest = shuffle(fixed.filter((p) => !wrongSet.has(p.key)), rand);
    const picked = [...retry, ...rest].slice(0, size);

    if (concept.generator && picked.length < size) {
        const seen = new Set(picked.map((p) => p.question.q));
        for (let attempt = 0; picked.length < size && attempt < size * 10; attempt++) {
            const q = generateQuestion(concept.generator, rand);
            if (!q || seen.has(q.q)) continue;
            seen.add(q.q);
            // 生成題不記錄錯題，key 加前綴以便辨識
            picked.push({ key: `gen:${questionKey(q)}`, question: q });
        }
    }
    return shuffle(picked, rand);
}

export const isGeneratedKey = (key: string) => key.startsWith('gen:');

/** 填答題比對：去頭尾空白、全形轉半形、忽略大小寫與中間空白 */
export function normalizeAnswer(s: string): string {
    return s
        .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/\u3000/g, ' ')
        .replace(/\s+/g, '')
        .toLowerCase();
}

export function isCorrect(question: Question, answer: string | string[] | boolean): boolean {
    switch (question.type) {
        case 'choice':
            return answer === question.a;
        case 'tf':
            return answer === question.a;
        case 'input': {
            const accepted = (Array.isArray(question.a) ? question.a : [question.a]).map(normalizeAnswer);
            return typeof answer === 'string' && accepted.includes(normalizeAnswer(answer));
        }
        case 'order':
            return Array.isArray(answer) && answer.length === question.a.length && answer.every((t, i) => t === question.a[i]);
    }
}

/** 顯示用的正確答案文字 */
export function answerText(question: Question): string {
    switch (question.type) {
        case 'choice':
            return question.a;
        case 'tf':
            return question.a ? '對' : '錯';
        case 'input':
            return Array.isArray(question.a) ? question.a[0] : question.a;
        case 'order':
            return question.a.join(question.a.every((t) => t.length === 1) ? '' : ' ');
    }
}
