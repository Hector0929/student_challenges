// 學習挑戰群島 — 純資料模型
//
// 把「每日任務 + 今日紀錄 + 星幣交易」轉成 3D 群島要畫的島嶼與建築。
// 這裡不碰 React、Supabase 或 three.js，方便單元測試。

import type { DailyLog, Quest } from '../../types/database';
import type { LearningItem } from '../learning/types/learning';
import type { FunGame } from '../../lib/gameConfig';
import { DAILY_QUEST_TARGET } from '../../lib/constants';

/** feature：冒險港上的功能建築（怪獸塔、商店街…），不算進度 */
export type ChallengeKind = 'quest' | 'learning' | 'game' | 'feature';
/** todo: 今天還沒做；submitted: 已送出等家長確認（僅任務）；done: 今天完成 */
export type ChallengeStatus = 'todo' | 'submitted' | 'done';
export type BuildingStyle =
    | 'monster'
    | 'library'
    | 'temple'
    | 'tower'
    | 'bakery'
    | 'blocks'
    | 'observatory'
    | 'castle'
    | 'arcade'
    | 'stall'
    | 'well'
    | 'spire';

export interface IslandChallenge {
    id: string;
    kind: ChallengeKind;
    name: string;
    icon: string;
    desc: string;
    tags: string[];
    status: ChallengeStatus;
    /** 今天的次數（練習 / 遊玩 / 任務 0 或 1） */
    todayCount: number;
    /** 累計次數（僅學習與遊戲） */
    totalCount: number;
    rewardPoints?: number;
    /** 對應的原始資料，用來開啟遊戲或完成任務 */
    sourceId: string;
    /** 覆寫島嶼的建築風格（冒險港每棟長得不一樣） */
    style?: BuildingStyle;
}

export interface IslandDef {
    id: string;
    name: string;
    en: string;
    icon: string;
    axial: [number, number];
    style: BuildingStyle;
    ground: string;
    accent: string;
    summary: string;
    challenges: IslandChallenge[];
    /** 遊戲島：今日任務沒達標前封島 */
    locked?: boolean;
    /** 功能島：不顯示完成進度 */
    hub?: boolean;
}

export interface FlowDef {
    id: string;
    from: string;
    to: string;
    label: string;
    note: string;
}

export interface TodayEvent {
    /** 台北時間的分鐘數 (0–1439) */
    minute: number;
    challengeId: string;
    kind: ChallengeKind;
    text: string;
}

export interface IslandModel {
    islands: IslandDef[];
    flows: FlowDef[];
    events: TodayEvent[];
    /** 今天沒有任何紀錄時的示範行程 */
    suggested: TodayEvent[];
    stats: {
        questsDone: number;
        questsTotal: number;
        practicedToday: number;
        playedToday: number;
        /** 開啟遊戲島需要完成的每日任務數（與儀表板「獎勵時間」同一規則） */
        questTarget: number;
        gamesUnlocked: boolean;
    };
}

/** 冒險港的功能建築，由呼叫端提供（描述可帶即時資訊，例如怪獸塔樓層） */
export interface FeatureDef {
    id: string;
    name: string;
    icon: string;
    desc: string;
    tags: string[];
    style: BuildingStyle;
    /** 放在哪座功能島；預設冒險港 */
    island?: typeof HARBOR_ISLAND_ID | typeof MONSTER_ISLAND_ID;
}

export interface StarTransactionLite {
    game_id: string | null;
    type: string;
    amount: number;
    created_at: string;
    description?: string | null;
}

export interface IslandModelInput {
    /** 已過濾成這位小孩看得到的任務 */
    quests: Quest[];
    /** 今天的 daily_logs */
    logs: DailyLog[];
    /** 這位小孩帶 game_id 的星幣交易 */
    transactions: StarTransactionLite[];
    /** 家長允許的學習項目 */
    learningItems: LearningItem[];
    /** 家長允許的獎勵遊戲 */
    funGames: FunGame[];
    /** 台北時間 YYYY-MM-DD */
    today: string;
    /** 今天在英文書港靠作答升到「熟悉」的單字（依時間排序） */
    familiarWords?: Array<{ word: string; at: string }>;
    /** 冒險港功能建築；沒給就不畫冒險港 */
    features?: FeatureDef[];
}

export const QUEST_ISLAND_ID = 'quests';
export const HARBOR_ISLAND_ID = 'harbor';
export const MONSTER_ISLAND_ID = 'monster';
export const GAME_ISLAND_ID = 'arcade';

/** 與儀表板相同：任務少於 4 個時全部完成即可，沒有任務就不開 */
export function gameUnlockState(questsDone: number, questsTotal: number) {
    const target = questsTotal > 0 ? Math.min(questsTotal, DAILY_QUEST_TARGET) : DAILY_QUEST_TARGET;
    return { target, unlocked: questsTotal > 0 && questsDone >= target };
}

// ---------- 島嶼配置 ----------
// learning / games 列的是 LEARNING_ITEMS 與 FUN_GAMES 的 id；名稱與圖示仍以原設定為準。
interface IslandLayout extends Omit<IslandDef, 'challenges'> {
    learning?: string[];
    games?: string[];
    /** 沒有被列出的新項目依科目落在這座島 */
    subject?: string;
}

const ISLAND_LAYOUT: IslandLayout[] = [
    {
        id: QUEST_ISLAND_ID, name: '每日任務廣場', en: 'Daily Quest Plaza', icon: '🎯',
        axial: [0, -1], style: 'monster', ground: '#e9d8a6', accent: '#db6a41',
        summary: '每一棟怪獸小屋都是今天的一個任務。完成並經家長確認後，屋頂會出現金幣。',
    },
    {
        id: HARBOR_ISLAND_ID, name: '冒險港', en: 'Adventure Harbour', icon: '⚓',
        axial: [-1, -1], style: 'stall', ground: '#d9cdb2', accent: '#2f6f8f', hub: true,
        summary: '商店街、冒險家家園和許願池都在這座港口。',
    },
    {
        id: MONSTER_ISLAND_ID, name: '怪獸島', en: 'Monster Isle', icon: '🐲',
        axial: [2, 0], style: 'spire', ground: '#b8d48c', accent: '#7c3aed', hub: true,
        summary: '螺旋石塔矗立在島中央：擲骰往上爬 100 層，沿路撿怪獸蛋、打守門怪。',
    },
    {
        id: 'english', name: '英文書港', en: 'English Harbour', icon: '🔤',
        axial: [-1, 0], style: 'library', ground: '#bcd39a', accent: '#3f8f8a',
        summary: '單字、發音與句子，三座書塔圍出英文港口。',
        learning: ['english_harbour', 'sentence', 'concept_english'], subject: 'english',
    },
    {
        id: 'chinese', name: '成語古城', en: 'Idiom Old Town', icon: '📚',
        axial: [-1, 1], style: 'temple', ground: '#d8c7a4', accent: '#b4483a',
        summary: '飛簷樓閣裡藏著一句句成語故事。',
        learning: ['idiom', 'concept_chinese'], subject: 'chinese',
    },
    {
        id: 'science', name: '自然實驗森林', en: 'Science Grove', icon: '🔬',
        axial: [-2, 1], style: 'observatory', ground: '#b5d69a', accent: '#2f8f5b',
        summary: '植物、動物、天氣和小實驗，自然的概念都藏在森林裡。',
        learning: ['concept_science'], subject: 'science',
    },
    {
        id: 'social', name: '社會時光港', en: 'Social Time Harbour', icon: '🌏',
        axial: [-2, 0], style: 'stall', ground: '#e3d3b0', accent: '#b8642e',
        summary: '從家庭、社區到臺灣和世界，搭時光船認識我們生活的地方。',
        learning: ['concept_social'], subject: 'social',
    },
    {
        id: 'ops', name: '四則運算鎮', en: 'Arithmetic Town', icon: '🧮',
        axial: [0, 0], style: 'tower', ground: '#c9d8a6', accent: '#3d6fb6',
        summary: '群島中心的鐘塔小鎮，加減乘除是所有數學的起點。',
        learning: ['akila', 'subtraction', 'multiplication', 'division', 'concept_math'], subject: 'math',
    },
    {
        id: 'fraction', name: '分數甜點島', en: 'Fraction Bakery', icon: '🍰',
        axial: [1, -1], style: 'bakery', ground: '#f0d2c4', accent: '#d9667a',
        summary: '每一塊蛋糕都少了一角——那一角就是分數。',
        learning: ['fractions', 'factors_multiples'],
    },
    {
        id: 'geometry', name: '幾何積木島', en: 'Geometry Blocks', icon: '📐',
        axial: [1, 0], style: 'blocks', ground: '#d6dcae', accent: '#e0a23a',
        summary: '方塊、角錐與圓柱堆成的島，量一量就懂周長、面積與體積。',
        learning: ['perimeter', 'area', 'volume'],
    },
    {
        id: 'algebra', name: '代數天文台', en: 'Algebra Observatory', icon: '🔭',
        axial: [2, -1], style: 'observatory', ground: '#b9c7c9', accent: '#4a4f8f',
        summary: '國中數學的觀星台：用 x 看見未知。',
        learning: ['linear_equation', 'polynomials'],
    },
    {
        id: 'puzzle', name: '益智棋堡', en: 'Puzzle Keep', icon: '♟',
        axial: [0, 1], style: 'castle', ground: '#c4d3b0', accent: '#5b5f6b',
        summary: '動腦的城堡：跟電腦下一盤黑白棋。',
        learning: ['othello'],
    },
    {
        id: GAME_ISLAND_ID, name: '霓虹遊樂場', en: 'Neon Arcade', icon: '🕹️',
        axial: [1, 1], style: 'arcade', ground: '#c7c0d6', accent: '#d94f9b',
        summary: '遊戲島：完成今日每日任務才會開放，每玩一次花 5 星幣。',
        games: [], // 所有獎勵遊戲都在這座島，才能一起上鎖
    },
];

const FLOWS: FlowDef[] = [
    { id: 'f1', from: 'akila', to: 'subtraction', label: '加減互逆', note: '減法就是把加法倒過來看。' },
    { id: 'f2', from: 'multiplication', to: 'division', label: '乘除互逆', note: '背熟九九乘法，除法自然就快。' },
    { id: 'f3', from: 'multiplication', to: 'factors_multiples', label: '乘法 → 因倍數', note: '倍數就是乘法表的一整列。' },
    { id: 'f4', from: 'division', to: 'fractions', label: '除法 → 分數', note: '分數其實是一個還沒算完的除法。' },
    { id: 'f5', from: 'factors_multiples', to: 'fractions', label: '約分需要公因數', note: '最大公因數讓約分一步到位。' },
    { id: 'f6', from: 'multiplication', to: 'area', label: '長 × 寬', note: '面積就是乘法的圖形版本。' },
    { id: 'f7', from: 'akila', to: 'perimeter', label: '邊長相加', note: '周長就是把每條邊加起來。' },
    { id: 'f8', from: 'area', to: 'volume', label: '面積 × 高', note: '把面積往上疊，就變成體積。' },
    { id: 'f9', from: 'fractions', to: 'linear_equation', label: '移項與通分', note: '解方程式常常會遇到分數係數。' },
    { id: 'f10', from: 'linear_equation', to: 'polynomials', label: '同類項', note: '合併同類項是解方程式的第一步。' },
    { id: 'f12', from: 'english_harbour', to: 'sentence', label: '從字到句', note: '認得單字後，練習把它們排成句子。' },
    { id: 'f13', from: 'idiom', to: 'sentence', label: '語感', note: '中英文的語序練習互相幫忙。' },
    { id: 'f14', from: 'othello', to: '2048_cyber', label: '策略思考', note: '都要先想好下一步。' },
    { id: 'f15', from: 'shooting', to: 'akila', label: '心算速度', note: '射擊遊戲考的是心算反應。' },
    { id: 'f16', from: 'memory_matrix', to: 'english_harbour', label: '記憶力', note: '記住格子位置，也幫助記住字母順序。' },
];

// 今天沒有紀錄時的示範行程（只放學習項目，任務每家不同）
const SUGGESTED: Array<[number, string, string]> = [
    [390, 'english_harbour', '晨間聽力：起床先複習幾個英文單字。'],
    [450, 'akila', '早餐前暖身，十題加法。'],
    [510, 'multiplication', '上學路上默背九九乘法。'],
    [600, 'area', '把長方形切成方格數面積。'],
    [690, 'fractions', '午餐切披薩，正好練分數。'],
    [780, 'idiom', '午休後的成語接龍。'],
    [870, 'english_harbour', '英文課：到書港學新單字。'],
    [960, 'factors_multiples', '放學作業：找最大公因數。'],
    [1020, 'linear_equation', '挑戰一題國中方程式。'],
    [1080, 'othello', '晚餐前跟電腦下一盤黑白棋。'],
    [1170, 'sentence', '睡前複習：句子重組。'],
];

// ---------- 時間工具 ----------
const taipeiParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

/** 把時間戳轉成台北的日期字串與當天分鐘數 */
export function toTaipei(ts: string | number | Date): { date: string; minute: number } {
    const parts = Object.fromEntries(taipeiParts.formatToParts(new Date(ts)).map((p) => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** 今日回顧播到幾點：預設 23:00，最後一筆紀錄更晚就延後 */
export const tourEnd = (steps: Array<{ minute: number }>) => Math.min(1439, Math.max(1380, ...steps.map((s) => s.minute + 20)));

export const hhmm = (minute: number) => {
    const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// ---------- 建構 ----------
function questStatus(log: DailyLog | undefined): ChallengeStatus {
    if (log?.status === 'verified') return 'done';
    if (log?.status === 'completed') return 'submitted';
    return 'todo';
}

export function buildIslandModel(input: IslandModelInput): IslandModel {
    const { quests, logs, transactions, learningItems, funGames, today, features, familiarWords = [] } = input;

    // 交易依 game_id 彙整：學習看 earn（練習滿 3 分鐘才會發），遊戲看 spend（付費開玩）
    const counts = new Map<string, { today: number; total: number; minutes: number[] }>();
    for (const tx of transactions) {
        if (!tx.game_id) continue;
        const key = `${tx.type}:${tx.game_id}`;
        const entry = counts.get(key) ?? { today: 0, total: 0, minutes: [] };
        entry.total++;
        const t = toTaipei(tx.created_at);
        if (t.date === today) {
            entry.today++;
            entry.minutes.push(t.minute);
        }
        counts.set(key, entry);
    }
    const countOf = (type: 'earn' | 'spend', id: string) => counts.get(`${type}:${id}`) ?? { today: 0, total: 0, minutes: [] };

    const learningById = new Map(learningItems.map((i) => [i.id, i]));
    const gamesById = new Map(funGames.map((g) => [g.id, g]));
    const placedLearning = new Set<string>();
    const placedGames = new Set<string>();
    ISLAND_LAYOUT.forEach((l) => {
        l.learning?.forEach((id) => placedLearning.add(id));
        l.games?.forEach((id) => placedGames.add(id));
    });

    const learningChallenge = (item: LearningItem): IslandChallenge => {
        const c = countOf('earn', item.id);
        return {
            id: item.id,
            kind: 'learning',
            name: item.name,
            icon: item.icon,
            desc: item.description,
            tags: item.tags ?? [],
            status: c.today > 0 ? 'done' : 'todo',
            todayCount: c.today,
            totalCount: c.total,
            sourceId: item.id,
        };
    };
    const gameChallenge = (game: FunGame): IslandChallenge => {
        const c = countOf('spend', game.id);
        return {
            id: game.id,
            kind: 'game',
            name: game.name,
            icon: game.icon,
            desc: game.description,
            tags: ['獎勵遊戲'],
            status: c.today > 0 ? 'done' : 'todo',
            todayCount: c.today,
            totalCount: c.total,
            sourceId: game.id,
        };
    };

    const logByQuest = new Map(logs.map((l) => [l.quest_id, l]));
    const questChallenges: IslandChallenge[] = quests.map((q) => {
        const log = logByQuest.get(q.id);
        const status = questStatus(log);
        return {
            id: `quest:${q.id}`,
            kind: 'quest',
            name: q.title,
            icon: q.icon || '👾',
            desc: q.description || '今天的每日任務。',
            tags: ['每日任務'],
            status,
            todayCount: status === 'todo' ? 0 : 1,
            totalCount: 0,
            rewardPoints: q.reward_points,
            sourceId: q.id,
        };
    });

    const islands: IslandDef[] = [];
    for (const layout of ISLAND_LAYOUT) {
        const { learning, games, subject, ...def } = layout;
        let challenges: IslandChallenge[];
        if (def.id === QUEST_ISLAND_ID) {
            challenges = questChallenges;
        } else if (def.id === HARBOR_ISLAND_ID || def.id === MONSTER_ISLAND_ID) {
            challenges = (features ?? []).filter((f) => (f.island ?? HARBOR_ISLAND_ID) === def.id).map((f) => ({
                id: `feature:${f.id}`,
                kind: 'feature' as const,
                name: f.name,
                icon: f.icon,
                desc: f.desc,
                tags: f.tags,
                status: 'todo' as const,
                todayCount: 0,
                totalCount: 0,
                sourceId: f.id,
                style: f.style,
            }));
        } else {
            const ls = (learning ?? []).map((id) => learningById.get(id)).filter((i): i is LearningItem => !!i);
            // 設定檔新增、但群島沒列到的學習項目，依科目歸島
            if (subject) {
                ls.push(...learningItems.filter((i) => !placedLearning.has(i.id) && i.subjectId === subject));
            }
            let gs = (games ?? []).map((id) => gamesById.get(id)).filter((g): g is FunGame => !!g);
            if (def.id === GAME_ISLAND_ID) gs = funGames.filter((g) => !placedGames.has(g.id));
            challenges = [...ls.map(learningChallenge), ...gs.map(gameChallenge)];
        }
        // 每日任務廣場即使今天沒任務也保留，其他空島（家長全部關閉）就不畫
        if (challenges.length || def.id === QUEST_ISLAND_ID) islands.push({ ...def, challenges });
    }

    const ids = new Set(islands.flatMap((i) => i.challenges.map((c) => c.id)));
    const flows = FLOWS.filter((f) => ids.has(f.from) && ids.has(f.to));

    // 今天實際發生的事
    const events: TodayEvent[] = [];
    for (const q of questChallenges) {
        const log = logByQuest.get(q.sourceId);
        if (!log || q.status === 'todo') continue;
        const at = log.completed_at || log.created_at;
        if (!at) continue;
        events.push({
            minute: toTaipei(at).minute,
            challengeId: q.id,
            kind: 'quest',
            text: q.status === 'done' ? `完成「${q.name}」，家長確認了！` : `完成「${q.name}」，等家長確認。`,
        });
    }
    for (const isl of islands) {
        for (const c of isl.challenges) {
            if (c.kind === 'quest' || c.kind === 'feature') continue;
            for (const minute of countOf(c.kind === 'learning' ? 'earn' : 'spend', c.id).minutes) {
                events.push({ minute, challengeId: c.id, kind: c.kind, text: c.kind === 'learning' ? `練習「${c.name}」拿到星幣。` : `玩了一場「${c.name}」。` });
            }
        }
    }
    // 其他真的拿到星幣的紀錄（例如怪獸塔挑戰過關），照交易描述寫進日誌
    const known = new Set(islands.flatMap((i) => i.challenges.filter((c) => c.kind === 'learning' || c.kind === 'game').map((c) => c.id)));
    const towerId = islands.flatMap((i) => i.challenges).find((c) => c.kind === 'feature' && c.sourceId === 'tower')?.id ?? '';
    for (const tx of transactions) {
        if (!tx.game_id || known.has(tx.game_id) || tx.type !== 'earn' || !tx.description) continue;
        const t = toTaipei(tx.created_at);
        if (t.date !== today) continue;
        events.push({
            minute: t.minute,
            challengeId: tx.game_id.startsWith('monster_tower') ? towerId : '',
            kind: 'feature',
            text: `${tx.description.replace(/^🏰\s*/, '')}（+${tx.amount} 星幣）`,
        });
    }
    // 英文書港：今天新熟悉的單字合成一則（時間記在最後一個字）
    if (familiarWords.length && ids.has('english_harbour')) {
        const sample = familiarWords.slice(-3).map((w) => w.word).join('、');
        events.push({
            minute: toTaipei(familiarWords[familiarWords.length - 1].at).minute,
            challengeId: 'english_harbour',
            kind: 'learning',
            text: `今天又熟悉了 ${familiarWords.length} 個新單字（${sample}${familiarWords.length > 3 ? '…' : ''}），好棒！`,
        });
    }
    events.sort((a, b) => a.minute - b.minute);

    const suggested: TodayEvent[] = SUGGESTED.filter(([, id]) => ids.has(id)).map(([minute, challengeId, text]) => ({ minute, challengeId, kind: 'learning', text }));

    const all = islands.flatMap((i) => i.challenges);
    const questsDone = questChallenges.filter((c) => c.status !== 'todo').length;
    const { target, unlocked } = gameUnlockState(questsDone, questChallenges.length);
    for (const isl of islands) if (isl.id === GAME_ISLAND_ID) isl.locked = !unlocked;
    return {
        islands,
        flows,
        events,
        suggested,
        stats: {
            questsDone,
            questsTotal: questChallenges.length,
            practicedToday: all.filter((c) => c.kind === 'learning' && c.todayCount > 0).length,
            playedToday: all.filter((c) => c.kind === 'game' && c.todayCount > 0).length,
            questTarget: target,
            gamesUnlocked: unlocked,
        },
    };
}

/** 島嶼與建築的組成；改變時 3D 場景需要重建（狀態變化則不用） */
export function structureKey(model: IslandModel): string {
    // 封島與否會改變橋與路網，所以也算結構
    return model.islands.map((i) => `${i.id}${i.locked ? '#locked' : ''}:${i.challenges.map((c) => c.id).join(',')}`).join('|');
}
