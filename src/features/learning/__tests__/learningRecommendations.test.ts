import { describe, expect, it } from 'vitest';
import { recommendLearning, weeklySubjectCounts, type PracticeRecord } from '../utils/learningRecommendations';
import type { LearningItem } from '../types/learning';

const item = (id: string, subjectId: LearningItem['subjectId'], order = 1): LearningItem => ({
    id,
    name: id,
    icon: '📘',
    description: '',
    subjectId,
    stageId: 'general',
    order,
    enabledByDefault: true,
    status: 'active',
    launcher: { type: 'html', target: '/x.html' },
});

const ITEMS = [item('en1', 'english', 1), item('en2', 'english', 2), item('zh1', 'chinese'), item('ma1', 'math'), item('sc1', 'science'), item('so1', 'social')];
const NOW = new Date('2026-11-15T12:00:00+08:00').getTime();
const rec = (game_id: string, daysAgo: number, type = 'earn'): PracticeRecord => ({ game_id, type, created_at: new Date(NOW - daysAgo * 86400000).toISOString() });

describe('recommendLearning', () => {
    it('沒有紀錄時，依科目順序各推一項', () => {
        const r = recommendLearning(ITEMS, [], NOW);
        expect(r.map((x) => x.item.id)).toEqual(['en1', 'zh1', 'ma1']);
        expect(r[0].reason).toContain('這週還沒練');
    });

    it('第一個推最近練過的，接著推這週練最少的科目，且同科不重複', () => {
        const records = [rec('ma1', 0), rec('en1', 1), rec('en2', 2), rec('zh1', 3), rec('sc1', 3)];
        const r = recommendLearning(ITEMS, records, NOW);
        expect(r[0]).toMatchObject({ item: { id: 'ma1' }, reason: '上次練過，接著練' });
        expect(r[1].item.id).toBe('so1'); // 社會這週 0 次
        expect(new Set(r.map((x) => x.item.subjectId)).size).toBe(r.length);
    });

    it('忽略 spend 紀錄與不存在的項目', () => {
        const r = recommendLearning(ITEMS, [rec('game_x', 0, 'spend'), rec('ghost', 0)], NOW);
        expect(r[0].reason).not.toContain('上次');
    });
});

describe('weeklySubjectCounts', () => {
    it('只算最近 7 天', () => {
        const c = weeklySubjectCounts(ITEMS, [rec('en1', 1), rec('en2', 6), rec('en1', 8)], NOW);
        expect(c.english).toBe(2);
        expect(c.math).toBe(0);
    });
});
