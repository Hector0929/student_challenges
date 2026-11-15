import { describe, expect, it } from 'vitest';
import { FUN_GAMES, FUN_GAME_CATEGORIES } from '../gameConfig';
import { groupFunGames, recentFunGames } from '../funGameCatalog';

const at = (min: number) => new Date(Date.UTC(2026, 10, 15, 10, min)).toISOString();

describe('recentFunGames', () => {
    it('只看 spend，新到舊且不重複', () => {
        const r = recentFunGames(FUN_GAMES, [
            { game_id: 'snake', type: 'spend', created_at: at(1) },
            { game_id: 'tetris', type: 'spend', created_at: at(5) },
            { game_id: 'snake', type: 'spend', created_at: at(9) },
            { game_id: 'parkour', type: 'earn', created_at: at(20) },
            { game_id: 'akila_math', type: 'spend', created_at: at(30) },
        ]);
        expect(r.map((g) => g.id)).toEqual(['snake', 'tetris']);
    });

    it('最多回傳 max 個', () => {
        const recs = FUN_GAMES.map((g, i) => ({ game_id: g.id, type: 'spend', created_at: at(i) }));
        expect(recentFunGames(FUN_GAMES, recs, 3)).toHaveLength(3);
    });
});

describe('groupFunGames', () => {
    it('依分區順序分組，每個遊戲都有分區與封面', () => {
        const groups = groupFunGames(FUN_GAMES);
        expect(groups.map((g) => g.category.id)).toEqual(FUN_GAME_CATEGORIES.map((c) => c.id));
        expect(groups.reduce((n, g) => n + g.games.length, 0)).toBe(FUN_GAMES.length);
        for (const g of FUN_GAMES) expect(g.cover).toMatch(/^\/games\/covers\/.+\.jpg$/);
    });

    it('略過空的分區', () => {
        const groups = groupFunGames(FUN_GAMES.filter((g) => g.category === 'puzzle'));
        expect(groups.map((g) => g.category.id)).toEqual(['puzzle']);
    });
});
