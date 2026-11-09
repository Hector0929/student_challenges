// 概念熟悉度的升降級規則（CONCEPT_BANK_SPEC.md 第 6 節）。純函式，方便測試。

export interface ConceptProgress {
    concept_id: string;
    level: number; // 0 新 1 學習中 2 複習中 3 熟悉 4 精熟
    due_on: string; // YYYY-MM-DD（台北日期）
    correct_count: number;
    wrong_count: number;
    recent_wrong: string[];
    last_seen_at: string | null;
}

export const LEVEL_LABELS = ['新概念', '學習中', '複習中', '熟悉', '精熟'] as const;
export const MAX_LEVEL = 4;
/** 各等級到下次複習的天數 */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 21];
const RECENT_WRONG_LIMIT = 10;
export const PROMOTE_ACCURACY = 0.8;
export const DEMOTE_ACCURACY = 0.5;

export interface RoundResult {
    /** 第一次作答就答對的題數 */
    correct: number;
    total: number;
    /** 這輪答錯的題目 key（生成題沒有固定 key，不放進來） */
    wrongKeys: string[];
    /** 這輪答對、可以從錯題清單移除的題目 key */
    rightKeys: string[];
}

export const addDays = (date: string, days: number) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

/**
 * 一輪結束後的新進度。
 * - 正確率 ≥ 80% 升一級；但只有「到期了」才升，避免同一天連刷好幾輪就變精熟。
 * - 正確率 < 50% 降一級，並且當天就要再複習。
 * - 練過一次之後最低是「學習中」，不會回到「新概念」。
 */
export function applyRound(prev: ConceptProgress | undefined, conceptId: string, round: RoundResult, today: string, nowIso: string): ConceptProgress {
    const level0 = prev?.level ?? 0;
    const accuracy = round.total > 0 ? round.correct / round.total : 0;
    const isDue = !prev || prev.due_on <= today;

    let level = Math.max(1, level0);
    if (accuracy >= PROMOTE_ACCURACY && isDue && prev) level = Math.min(MAX_LEVEL, level0 + 1);
    else if (accuracy < DEMOTE_ACCURACY) level = Math.max(1, level0 - 1);

    const dueOn = accuracy < DEMOTE_ACCURACY ? today : isDue ? addDays(today, REVIEW_INTERVAL_DAYS[level]) : prev!.due_on;

    const right = new Set(round.rightKeys);
    const recentWrong = [...round.wrongKeys, ...(prev?.recent_wrong ?? []).filter((k) => !right.has(k) && !round.wrongKeys.includes(k))].slice(0, RECENT_WRONG_LIMIT);

    return {
        concept_id: conceptId,
        level,
        due_on: dueOn,
        correct_count: (prev?.correct_count ?? 0) + round.correct,
        wrong_count: (prev?.wrong_count ?? 0) + (round.total - round.correct),
        recent_wrong: recentWrong,
        last_seen_at: nowIso,
    };
}

export const isDue = (p: ConceptProgress | undefined, today: string) => !!p && p.due_on <= today;
