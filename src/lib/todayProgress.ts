import { DAILY_QUEST_TARGET } from './constants';

export interface TodayProgress {
    /** 已完成（含已送審、已核准）的任務數 */
    done: number;
    /** 今天全部的任務數 */
    total: number;
    /** 解鎖遊戲時間要完成的任務數（任務比門檻少時，以任務數為準） */
    goal: number;
    /** 還差幾個解鎖遊戲 */
    left: number;
    unlocked: boolean;
    allDone: boolean;
    /** 主標題：直接說出下一步 */
    headline: string;
    /** 補充說明 */
    detail: string;
}

/**
 * 今日進度的唯一算法。儀表板、群島面板、選角色頁都用這個，避免各自顯示 0/4、0/11 卻不說明關係。
 * - goal：解鎖遊戲時間的門檻（DAILY_QUEST_TARGET，任務不足時取任務數）
 * - total：今天全部的任務
 */
export function computeTodayProgress(done: number, total: number): TodayProgress {
    const safeTotal = Math.max(0, total);
    const safeDone = Math.max(0, Math.min(done, safeTotal || done));
    const goal = safeTotal > 0 ? Math.min(safeTotal, DAILY_QUEST_TARGET) : DAILY_QUEST_TARGET;
    const left = Math.max(0, goal - safeDone);
    const unlocked = safeTotal > 0 && safeDone >= goal;
    const allDone = safeTotal > 0 && safeDone >= safeTotal;

    let headline: string;
    let detail: string;
    if (safeTotal === 0) {
        headline = '今天還沒有任務';
        detail = '請爸爸媽媽新增每日任務，或按「想要新任務」許個願。';
    } else if (allDone) {
        headline = '今天的任務全部完成！🎉';
        detail = '做完的任務會送給爸爸媽媽確認。';
    } else if (unlocked) {
        headline = '遊戲時間解鎖了 🎮';
        detail = `還有 ${safeTotal - safeDone} 個任務，做完可以多賺星幣。`;
    } else {
        headline = `再 ${left} 個任務，就能玩遊戲`;
        detail = `已完成 ${safeDone} 個。前 ${goal} 個任務解鎖遊戲時間，之後每多做一個都能多賺星幣。`;
    }

    return { done: safeDone, total: safeTotal, goal, left, unlocked, allDone, headline, detail };
}
