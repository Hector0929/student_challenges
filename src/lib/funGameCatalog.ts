import { FUN_GAME_CATEGORIES, type FunGame, type FunGameCategory } from './gameConfig';

export interface PlayRecord {
    game_id: string | null;
    type: string;
    created_at: string;
}

/** 依付費紀錄（spend）找出最近玩過的遊戲，新到舊、不重複 */
export function recentFunGames(games: FunGame[], records: PlayRecord[], max = 3): FunGame[] {
    const byId = new Map(games.map((g) => [g.id, g]));
    const sorted = [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const out: FunGame[] = [];
    const seen = new Set<string>();
    for (const r of sorted) {
        if (r.type !== 'spend' || !r.game_id || seen.has(r.game_id)) continue;
        const g = byId.get(r.game_id);
        if (!g) continue;
        seen.add(g.id);
        out.push(g);
        if (out.length >= max) break;
    }
    return out;
}

/** 依分區順序分組，空的分區不回傳 */
export function groupFunGames(games: FunGame[]) {
    const groups: Array<{ category: (typeof FUN_GAME_CATEGORIES)[number]; games: FunGame[] }> = [];
    for (const category of FUN_GAME_CATEGORIES) {
        const list = games.filter((g) => g.category === (category.id as FunGameCategory));
        if (list.length) groups.push({ category, games: list });
    }
    return groups;
}
