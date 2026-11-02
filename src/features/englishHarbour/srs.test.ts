import { describe, expect, it } from 'vitest';
import { WORDS, WORD_MAP } from './vocab';
import { addDays, applyAnswer, applySort, buildSession, markKnown, pickDistractors, questionTypeFor, spellTiles, type WordProgress } from './srs';

const TODAY = '2026-11-02';
const NOW = '2026-11-02T10:00:00+08:00';
const seq = (...vals: number[]) => {
    let i = 0;
    return () => vals[i++ % vals.length];
};

describe('vocab', () => {
    it('parses about 1200 unique words with topics', () => {
        expect(WORDS.length).toBeGreaterThan(1150);
        expect(new Set(WORDS.map((w) => w.word)).size).toBe(WORDS.length);
        expect(WORD_MAP.get('apple')).toMatchObject({ zh: '蘋果', topic: 'food', spellable: true });
        expect(WORD_MAP.get('ice cream')?.spellable).toBe(false);
    });
});

describe('applyAnswer', () => {
    it('levels up one step on a first-try answer and schedules the next review', () => {
        let p = applyAnswer(undefined, 'bird', true, TODAY, NOW);
        expect(p).toMatchObject({ level: 1, due_on: addDays(TODAY, 1), correct_count: 1 });
        p = applyAnswer(p, 'bird', true, TODAY, NOW);
        expect(p).toMatchObject({ level: 2, due_on: '2026-11-05', familiar_at: null });
        p = applyAnswer(p, 'bird', true, TODAY, NOW);
        expect(p).toMatchObject({ level: 3, due_on: '2026-11-09', familiar_at: NOW });
    });

    it('drops back to learning and keeps it due today when wrong', () => {
        const prev: WordProgress = { ...applyAnswer(undefined, 'bird', true, TODAY, NOW), level: 3, familiar_at: NOW };
        const p = applyAnswer(prev, 'bird', false, TODAY, NOW);
        expect(p).toMatchObject({ level: 1, due_on: TODAY, wrong_count: 1, familiar_at: NOW });
    });

    it('does not count self-marked words as newly familiar', () => {
        const known = applySort('cat', 'know', TODAY, NOW)!;
        expect(known).toMatchObject({ level: 3, self_marked: true, familiar_at: null });
        expect(applyAnswer(known, 'cat', true, TODAY, NOW).familiar_at).toBeNull();
        expect(markKnown(undefined, 'dog', TODAY, NOW)).toMatchObject({ level: 4, self_marked: true, due_on: '2026-12-02' });
        expect(applySort('dog', 'new', TODAY, NOW)).toBeNull();
    });
});

describe('buildSession', () => {
    const food = WORDS.filter((w) => w.topic === 'food');

    it('puts due reviews first, adds new words and skips mastered words that are not due', () => {
        const progress = new Map<string, WordProgress>();
        const set = (word: string, level: 0 | 1 | 2 | 3 | 4, due: string) => progress.set(word, { ...applyAnswer(undefined, word, true, TODAY, NOW), level, due_on: due });
        set('apple', 2, TODAY);
        set('banana', 1, '2026-11-01');
        set('rice', 4, '2026-12-30');
        set('bread', 3, '2026-11-20');
        const items = buildSession(food, progress, TODAY, { newLeft: 5, random: seq(0.5) });
        const words = items.map((i) => i.word.word);
        expect(words).toEqual(expect.arrayContaining(['apple', 'banana']));
        expect(words).not.toContain('rice');
        expect(words).not.toContain('bread');
        expect(items.filter((i) => i.isNew)).toHaveLength(5);
        expect(items).toHaveLength(7);
    });

    it('stops adding new words once the daily limit is used', () => {
        const items = buildSession(food, new Map(), TODAY, { newLeft: 0, random: seq(0.5) });
        // 沒有到期也沒有新字額度 → 仍給少量新字，不會是空的
        expect(items.length).toBeGreaterThan(0);
        expect(items.length).toBeLessThanOrEqual(3);
    });
});

describe('question helpers', () => {
    it('chooses harder question types as the level grows', () => {
        const bird = WORD_MAP.get('bird')!;
        expect([0, 1, 2, 3, 4].map((l) => questionTypeFor(l as 0, bird))).toEqual(['listen', 'listen', 'meaning', 'spell', 'spellHard']);
        expect(questionTypeFor(3, WORD_MAP.get('ice cream')!)).toBe('meaning');
    });

    it('gives distinct distractors and tiles that contain the word', () => {
        const bird = WORD_MAP.get('bird')!;
        const d = pickDistractors(bird, WORDS, 'listen');
        expect(d).toHaveLength(3);
        expect(new Set(d.map((w) => w.zh)).size).toBe(3);
        expect(d.every((w) => w.word !== 'bird' && w.zh !== bird.zh)).toBe(true);
        const tiles = spellTiles('bird', 2);
        expect(tiles).toHaveLength(6);
        expect([...'bird'].every((c) => tiles.includes(c))).toBe(true);
    });
});
