import { describe, expect, it } from 'vitest';
import { applyRound, addDays, type ConceptProgress } from '../srs';
import { answerText, isCorrect, normalizeAnswer, pickQuestions, questionKey } from '../pickQuestions';
import { generateQuestion, hasGenerator } from '../generators';
import { CONCEPT_SUBJECTS, loadSubjectBank } from '../loadConcepts';
import { CONCEPT_GRADES, type Concept } from '../types';

const TODAY = '2026-11-10';
const NOW = '2026-11-10T08:00:00.000Z';
const round = (correct: number, total = 5, wrongKeys: string[] = [], rightKeys: string[] = []) => ({ correct, total, wrongKeys, rightKeys });

describe('applyRound 熟悉度規則', () => {
    it('第一次練習：不論分數都是「學習中」，答得好明天複習', () => {
        const p = applyRound(undefined, 'math.g3.x', round(5), TODAY, NOW);
        expect(p.level).toBe(1);
        expect(p.due_on).toBe(addDays(TODAY, 1));
        expect(p.correct_count).toBe(5);
    });

    it('到期且正確率 ≥ 80% 升一級，間隔依等級拉長', () => {
        const prev: ConceptProgress = { concept_id: 'c', level: 2, due_on: TODAY, correct_count: 10, wrong_count: 0, recent_wrong: [], last_seen_at: null };
        const p = applyRound(prev, 'c', round(4), TODAY, NOW);
        expect(p.level).toBe(3);
        expect(p.due_on).toBe(addDays(TODAY, 7));
    });

    it('還沒到期就再練，不會升級，複習日期也不變', () => {
        const prev: ConceptProgress = { concept_id: 'c', level: 2, due_on: '2026-11-13', correct_count: 0, wrong_count: 0, recent_wrong: [], last_seen_at: null };
        const p = applyRound(prev, 'c', round(5), TODAY, NOW);
        expect(p.level).toBe(2);
        expect(p.due_on).toBe('2026-11-13');
    });

    it('正確率 < 50% 降一級並且當天要再複習，最低停在「學習中」', () => {
        const prev: ConceptProgress = { concept_id: 'c', level: 1, due_on: '2026-11-20', correct_count: 0, wrong_count: 0, recent_wrong: [], last_seen_at: null };
        const p = applyRound(prev, 'c', round(1), TODAY, NOW);
        expect(p.level).toBe(1);
        expect(p.due_on).toBe(TODAY);
        const q = applyRound({ ...prev, level: 3 }, 'c', round(2), TODAY, NOW);
        expect(q.level).toBe(2);
    });

    it('錯題清單：新錯題放最前面，答對的移除，最多 10 題', () => {
        const prev: ConceptProgress = { concept_id: 'c', level: 1, due_on: TODAY, correct_count: 0, wrong_count: 0, recent_wrong: ['a', 'b', 'c'], last_seen_at: null };
        const p = applyRound(prev, 'c', round(3, 5, ['x', 'b'], ['a']), TODAY, NOW);
        expect(p.recent_wrong).toEqual(['x', 'b', 'c']);
        const many = applyRound(prev, 'c', round(0, 12, Array.from({ length: 12 }, (_, i) => `k${i}`)), TODAY, NOW);
        expect(many.recent_wrong).toHaveLength(10);
    });
});

describe('pickQuestions 挑題', () => {
    const concept: Concept = {
        id: 'math.g3.test',
        grade: 3,
        unit: 'u',
        title: 't',
        summary: 's',
        questions: Array.from({ length: 8 }, (_, i) => ({ type: 'choice' as const, q: `題目${i}`, a: 'a', w: ['b', 'c', 'd'] })),
    };

    it('一輪 5 題，最近答錯的題目一定會出現', () => {
        const wrongKey = questionKey(concept.questions![6]);
        for (let i = 0; i < 20; i++) {
            const picked = pickQuestions(concept, [wrongKey]);
            expect(picked).toHaveLength(5);
            expect(picked.some((p) => p.key === wrongKey)).toBe(true);
        }
    });

    it('生成題的概念會產生不重複的題目', () => {
        const gen: Concept = { ...concept, questions: undefined, generator: { id: 'volume', difficulties: ['easy'] } };
        const picked = pickQuestions(gen);
        expect(picked).toHaveLength(5);
        expect(new Set(picked.map((p) => p.question.q)).size).toBe(5);
        expect(picked.every((p) => p.key.startsWith('gen:'))).toBe(true);
    });
});

describe('作答判定', () => {
    it('填答題忽略全形、空白與大小寫', () => {
        expect(normalizeAnswer(' Ａpple １２ ')).toBe('apple12');
        expect(isCorrect({ type: 'input', q: 'x', a: ['12', '十二'] }, '１２')).toBe(true);
        expect(isCorrect({ type: 'input', q: 'x', a: '12' }, '13')).toBe(false);
    });

    it('排序題要完全一致；是非題比對布林值', () => {
        expect(isCorrect({ type: 'order', q: 'x', a: ['I', 'am', 'Tom'] }, ['I', 'am', 'Tom'])).toBe(true);
        expect(isCorrect({ type: 'order', q: 'x', a: ['I', 'am', 'Tom'] }, ['am', 'I', 'Tom'])).toBe(false);
        expect(isCorrect({ type: 'tf', q: 'x', a: false }, false)).toBe(true);
        expect(answerText({ type: 'order', q: 'x', a: ['天', '地'] })).toBe('天地');
    });
});

describe('數學產生器轉接', () => {
    it('排除只能看圖作答的題型', () => {
        for (let i = 0; i < 30; i++) {
            const q = generateQuestion({ id: 'fractions', difficulties: ['easy', 'medium'] });
            expect(q).not.toBeNull();
            expect(q!.q).not.toContain('圖形');
        }
    });
});

// 題庫內容檢查：之後分批補題時，格式錯誤會在這裡被抓到
describe('題庫內容', () => {
    it.each(CONCEPT_SUBJECTS)('%s 題庫格式正確', async (subject) => {
        const bank = await loadSubjectBank(subject);
        expect(bank.subject).toBe(subject);
        const ids = new Set<string>();
        for (const c of bank.concepts) {
            const where = `${c.id}`;
            expect(c.id, where).toMatch(new RegExp(`^${subject}\\.g${c.grade}\\.[a-z0-9-]+$`));
            expect(CONCEPT_GRADES, where).toContain(c.grade);
            expect(ids.has(c.id), `${where} 重複`).toBe(false);
            ids.add(c.id);
            expect(c.title && c.summary && c.unit, where).toBeTruthy();
            expect(!!c.questions?.length || !!c.generator, `${where} 沒有題目也沒有產生器`).toBe(true);
            if (c.generator) expect(hasGenerator(c.generator.id), `${where} 產生器不存在`).toBe(true);
            const texts = new Set<string>();
            for (const q of c.questions ?? []) {
                expect(texts.has(q.q), `${where} 題目重複：${q.q}`).toBe(false);
                texts.add(q.q);
                expect(q.e, `${where} 缺解析：${q.q}`).toBeTruthy();
                if (q.type === 'choice') {
                    expect(q.w, `${where}：${q.q}`).toHaveLength(3);
                    expect(q.w, `${where} 誘答與正解相同：${q.q}`).not.toContain(q.a);
                    expect(new Set(q.w).size, `${where} 誘答重複：${q.q}`).toBe(3);
                }
            }
        }
        for (const c of bank.concepts) for (const pre of c.prerequisites ?? []) expect(ids.has(pre) || !pre.startsWith(subject), `${c.id} 的先備概念 ${pre} 不存在`).toBe(true);
    });
});
