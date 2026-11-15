import type { LearningItem, LearningSubjectId } from '../types/learning';
import { LEARNING_SUBJECT_MAP } from '../config/learningSubjects';

/** 學習紀錄：練滿一輪（3 分鐘）發星幣時寫入 star_transactions，game_id = 學習項目 id */
export interface PracticeRecord {
    game_id: string | null;
    type: string;
    created_at: string;
}

export interface Recommendation {
    item: LearningItem;
    /** 顯示在卡片上的推薦理由 */
    reason: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 最近 7 天各科練習次數（只算 earn 且 game_id 對得到學習項目） */
export function weeklySubjectCounts(items: LearningItem[], records: PracticeRecord[], now = Date.now()) {
    const byId = new Map(items.map((i) => [i.id, i]));
    const counts = {} as Record<LearningSubjectId, number>;
    for (const it of items) counts[it.subjectId] = 0;
    for (const r of records) {
        if (r.type !== 'earn' || !r.game_id) continue;
        const it = byId.get(r.game_id);
        if (!it) continue;
        if (now - new Date(r.created_at).getTime() > WEEK_MS) continue;
        counts[it.subjectId] = (counts[it.subjectId] ?? 0) + 1;
    }
    return counts;
}

/**
 * 今天推薦的 2–3 個學習：
 * 1. 最近練過的那一項（接著練）
 * 2. 這週練最少的科目裡，練最少的一項
 * 3. 第二少的科目裡，練最少的一項
 * 同一科不重複；沒有紀錄時依科目順序推薦每科第一項。
 */
export function recommendLearning(items: LearningItem[], records: PracticeRecord[], now = Date.now(), max = 3): Recommendation[] {
    if (items.length === 0) return [];
    const byId = new Map(items.map((i) => [i.id, i]));
    const plays = new Map<string, number>();
    let last: LearningItem | null = null;
    // records 依時間新到舊
    const sorted = [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const r of sorted) {
        if (r.type !== 'earn' || !r.game_id) continue;
        const it = byId.get(r.game_id);
        if (!it) continue;
        if (!last) last = it;
        plays.set(it.id, (plays.get(it.id) ?? 0) + 1);
    }

    const out: Recommendation[] = [];
    const usedSubjects = new Set<LearningSubjectId>();
    if (last) {
        out.push({ item: last, reason: '上次練過，接著練' });
        usedSubjects.add(last.subjectId);
    }

    const weekly = weeklySubjectCounts(items, records, now);
    const subjects = [...new Set(items.map((i) => i.subjectId))].sort(
        (a, b) => (weekly[a] ?? 0) - (weekly[b] ?? 0) || LEARNING_SUBJECT_MAP[a].order - LEARNING_SUBJECT_MAP[b].order,
    );
    for (const s of subjects) {
        if (out.length >= max) break;
        if (usedSubjects.has(s)) continue;
        const candidates = items
            .filter((i) => i.subjectId === s)
            .sort((a, b) => (plays.get(a.id) ?? 0) - (plays.get(b.id) ?? 0) || a.order - b.order);
        if (!candidates.length) continue;
        const n = weekly[s] ?? 0;
        out.push({
            item: candidates[0],
            reason: n === 0 ? `這週還沒練${LEARNING_SUBJECT_MAP[s].name.replace('學習', '')}` : `這週${LEARNING_SUBJECT_MAP[s].name.replace('學習', '')}練得比較少`,
        });
        usedSubjects.add(s);
    }
    return out;
}
