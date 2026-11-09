/**
 * 學習挑戰群島 — 資料模型與島上排版
 *
 * 保護三件事：今日任務 / 練習 / 遊戲的狀態判斷正確、家長關閉的項目不會出現、
 * 建築不重疊且行人路網走得通。
 */

import { describe, it, expect } from 'vitest';
import { buildIslandModel, gameUnlockState, GAME_ISLAND_ID, HARBOR_ISLAND_ID, MONSTER_ISLAND_ID, QUEST_ISLAND_ID, structureKey, toTaipei, type IslandModelInput } from '../features/challengeIsland/model';
import { buildBridges, buildGraph, buildIslands, slotLayout, PATH_R } from '../features/challengeIsland/engine/world';
import { LEARNING_ITEMS } from '../features/learning/config/learningItems';
import { FUN_GAMES } from '../lib/gameConfig';
import type { DailyLog, Quest } from '../types/database';
import * as THREE from 'three';

const TODAY = '2026-10-23';
// 台北 = UTC+8；這兩個時間點分別落在今天 09:15 與昨天
const TODAY_0915 = '2026-10-23T01:15:00Z';
const YESTERDAY = '2026-10-22T03:00:00Z';

const quest = (id: string, title: string, reward = 10): Quest => ({
    id,
    title,
    icon: '👾',
    reward_points: reward,
    is_active: true,
    status: 'active',
    created_at: '',
    updated_at: '',
    quest_assignments: [],
});
const log = (questId: string, status: DailyLog['status'], completed_at = TODAY_0915): DailyLog => ({
    id: `log-${questId}`,
    user_id: 'kid',
    quest_id: questId,
    status,
    completed_at,
    date: TODAY,
    created_at: completed_at,
});

const baseInput = (over: Partial<IslandModelInput> = {}): IslandModelInput => ({
    quests: [],
    logs: [],
    transactions: [],
    learningItems: LEARNING_ITEMS,
    funGames: FUN_GAMES,
    today: TODAY,
    ...over,
});

const find = (model: ReturnType<typeof buildIslandModel>, id: string) => model.islands.flatMap((i) => i.challenges).find((c) => c.id === id);

describe('toTaipei', () => {
    it('UTC 轉成台北日期與分鐘', () => {
        expect(toTaipei('2026-10-22T16:30:00Z')).toEqual({ date: '2026-10-23', minute: 30 });
        expect(toTaipei(TODAY_0915)).toEqual({ date: TODAY, minute: 9 * 60 + 15 });
    });
});

describe('每日任務廣場', () => {
    it('依 daily_logs 判斷 todo / submitted / done', () => {
        const model = buildIslandModel(
            baseInput({
                quests: [quest('a', '運動怪獸'), quest('b', '家事怪獸'), quest('c', '刷牙怪獸')],
                logs: [log('a', 'verified'), log('b', 'completed')],
            }),
        );
        const plaza = model.islands.find((i) => i.id === QUEST_ISLAND_ID)!;
        expect(plaza.challenges.map((c) => [c.name, c.status])).toEqual([
            ['運動怪獸', 'done'],
            ['家事怪獸', 'submitted'],
            ['刷牙怪獸', 'todo'],
        ]);
        // 與儀表板一致：送出（completed）與確認（verified）都算已完成
        expect(model.stats).toMatchObject({ questsDone: 2, questsTotal: 3 });
    });

    it('沒有任務時仍保留廣場', () => {
        const model = buildIslandModel(baseInput());
        expect(model.islands[0].id).toBe(QUEST_ISLAND_ID);
        expect(model.islands[0].challenges).toHaveLength(0);
    });

    it('完成的任務出現在今日紀錄，依時間排序', () => {
        const model = buildIslandModel(
            baseInput({
                quests: [quest('a', '運動怪獸'), quest('b', '家事怪獸')],
                logs: [log('a', 'verified', '2026-10-23T10:00:00Z'), log('b', 'completed', '2026-10-23T00:30:00Z')],
            }),
        );
        expect(model.events.map((e) => [e.minute, e.challengeId])).toEqual([
            [8 * 60 + 30, 'quest:b'],
            [18 * 60, 'quest:a'],
        ]);
    });
});

describe('學習與遊戲', () => {
    it('今天有練習獎勵（earn）才算完成，昨天的只算累計', () => {
        const model = buildIslandModel(
            baseInput({
                transactions: [
                    { game_id: 'area', type: 'earn', amount: 10, created_at: TODAY_0915 },
                    { game_id: 'area', type: 'earn', amount: 10, created_at: YESTERDAY },
                    { game_id: 'volume', type: 'earn', amount: 10, created_at: YESTERDAY },
                ],
            }),
        );
        expect(find(model, 'area')).toMatchObject({ status: 'done', todayCount: 1, totalCount: 2 });
        expect(find(model, 'volume')).toMatchObject({ status: 'todo', todayCount: 0, totalCount: 1 });
        expect(model.stats.practicedToday).toBe(1);
    });

    it('獎勵遊戲看今天的 spend', () => {
        const model = buildIslandModel(baseInput({ transactions: [{ game_id: 'snake', type: 'spend', amount: -5, created_at: TODAY_0915 }] }));
        expect(find(model, 'snake')).toMatchObject({ kind: 'game', status: 'done', todayCount: 1 });
        expect(model.stats.playedToday).toBe(1);
    });

    it('家長關閉的項目不出現，空島整座拿掉，相關連結線也移除', () => {
        // 成語古城有成語大挑戰和國語概念站，兩個都關掉才會變成空島
        const model = buildIslandModel(baseInput({ learningItems: LEARNING_ITEMS.filter((i) => i.id !== 'idiom' && i.id !== 'concept_chinese') }));
        expect(model.islands.find((i) => i.id === 'chinese')).toBeUndefined();
        expect(model.flows.some((f) => f.from === 'idiom' || f.to === 'idiom')).toBe(false);
        expect(find(model, 'idiom')).toBeUndefined();
    });

    it('概念站住在各科島，自然和社會有自己的島', () => {
        const model = buildIslandModel(baseInput());
        const islandOf = (id: string) => model.islands.find((i) => i.challenges.some((c) => c.id === id))?.id;
        expect(islandOf('concept_chinese')).toBe('chinese');
        expect(islandOf('concept_english')).toBe('english');
        expect(islandOf('concept_math')).toBe('ops');
        expect(islandOf('concept_science')).toBe('science');
        expect(islandOf('concept_social')).toBe('social');
    });

    it('沒列在配置裡的新項目也有地方住', () => {
        const extraLearning = { ...LEARNING_ITEMS[0], id: 'new_english_unit', name: '新單元' };
        const extraGame = { ...FUN_GAMES[0], id: 'brand_new_game', name: '新遊戲' };
        const model = buildIslandModel(baseInput({ learningItems: [...LEARNING_ITEMS, extraLearning], funGames: [...FUN_GAMES, extraGame] }));
        expect(model.islands.find((i) => i.id === 'english')!.challenges.some((c) => c.id === 'new_english_unit')).toBe(true);
        expect(model.islands.find((i) => i.id === 'arcade')!.challenges.some((c) => c.id === 'brand_new_game')).toBe(true);
    });

    it('每個挑戰只出現一次', () => {
        const ids = buildIslandModel(baseInput()).islands.flatMap((i) => i.challenges.map((c) => c.id));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('狀態改變不影響結構鍵，新增任務才會', () => {
        const qs = [quest('a', 'A'), quest('b', 'B'), quest('c', 'C'), quest('d', 'D'), quest('e', 'E')];
        const a = buildIslandModel(baseInput({ quests: qs }));
        const b = buildIslandModel(baseInput({ quests: qs, logs: [log('a', 'verified')] }));
        const c = buildIslandModel(baseInput({ quests: [...qs, quest('f', 'F')] }));
        expect(structureKey(a)).toBe(structureKey(b));
        expect(structureKey(a)).not.toBe(structureKey(c));
    });
});

describe('遊戲島上鎖', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => quest(id, id));
    const arcade = (m: ReturnType<typeof buildIslandModel>) => m.islands.find((i) => i.id === GAME_ISLAND_ID)!;

    it('所有獎勵遊戲都集中在遊戲島，其他島沒有遊戲', () => {
        const m = buildIslandModel(baseInput());
        expect(arcade(m).challenges.map((c) => c.id).sort()).toEqual(FUN_GAMES.map((g) => g.id).sort());
        expect(m.islands.filter((i) => i.id !== GAME_ISLAND_ID).flatMap((i) => i.challenges).some((c) => c.kind === 'game')).toBe(false);
    });

    it('完成 4 項每日任務才開島（送出等確認也算）', () => {
        const three = buildIslandModel(baseInput({ quests: five, logs: [log('a', 'verified'), log('b', 'completed'), log('c', 'verified')] }));
        expect(three.stats).toMatchObject({ questTarget: 4, gamesUnlocked: false });
        expect(arcade(three).locked).toBe(true);
        const four = buildIslandModel(baseInput({ quests: five, logs: [log('a', 'verified'), log('b', 'completed'), log('c', 'verified'), log('d', 'completed')] }));
        expect(four.stats.gamesUnlocked).toBe(true);
        expect(arcade(four).locked).toBe(false);
        expect(structureKey(three)).not.toBe(structureKey(four)); // 開島會改橋與路網
    });

    it('任務少於 4 個時全部完成就開；沒有任務就不開', () => {
        const two = [quest('a', 'a'), quest('b', 'b')];
        expect(buildIslandModel(baseInput({ quests: two, logs: [log('a', 'verified'), log('b', 'verified')] })).stats).toMatchObject({ questTarget: 2, gamesUnlocked: true });
        expect(buildIslandModel(baseInput()).stats.gamesUnlocked).toBe(false);
        expect(gameUnlockState(0, 0)).toEqual({ target: 4, unlocked: false });
    });
});

describe('冒險港', () => {
    const features = [
        { id: 'tower', name: '怪獸塔', icon: '🗼', desc: '', tags: [], style: 'castle' as const },
        { id: 'shop', name: '商店街', icon: '🏪', desc: '', tags: [], style: 'stall' as const },
    ];
    it('怪獸塔住在怪獸島，其他功能建築在冒險港', () => {
        const m = buildIslandModel(baseInput({ features: [{ ...features[0], style: 'spire', island: 'monster' }, features[1]] }));
        const monster = m.islands.find((i) => i.id === MONSTER_ISLAND_ID)!;
        expect(monster).toMatchObject({ name: '怪獸島', hub: true });
        expect(monster.challenges.map((c) => c.id)).toEqual(['feature:tower']);
        expect(m.islands.find((i) => i.id === HARBOR_ISLAND_ID)!.challenges.map((c) => c.id)).toEqual(['feature:shop']);
    });

    it('今天的怪獸塔挑戰過關（星幣紀錄）會寫進日誌，接在怪獸塔建築上', () => {
        const m = buildIslandModel(
            baseInput({
                features: [{ ...features[0], island: 'monster' }],
                transactions: [
                    { game_id: 'monster_tower_challenge', type: 'earn', amount: 15, created_at: TODAY_0915, description: '🏰 怪獸塔第 32 層挑戰過關' },
                    { game_id: 'monster_tower_challenge', type: 'earn', amount: 15, created_at: YESTERDAY, description: '🏰 怪獸塔第 20 層挑戰過關' },
                ],
            }),
        );
        expect(m.events).toEqual([{ minute: 9 * 60 + 15, challengeId: 'feature:tower', kind: 'feature', text: '怪獸塔第 32 層挑戰過關（+15 星幣）' }]);
    });

    it('有功能建築才畫冒險港，建築不算完成進度', () => {
        expect(buildIslandModel(baseInput()).islands.some((i) => i.id === HARBOR_ISLAND_ID)).toBe(false);
        const m = buildIslandModel(baseInput({ features }));
        const harbor = m.islands.find((i) => i.id === HARBOR_ISLAND_ID)!;
        expect(harbor.hub).toBe(true);
        expect(harbor.challenges.map((c) => [c.id, c.kind, c.style])).toEqual([
            ['feature:tower', 'feature', 'castle'],
            ['feature:shop', 'feature', 'stall'],
        ]);
        expect(m.events).toHaveLength(0);
    });
});

describe('slotLayout — 島上排版', () => {
    const hexDist = (v: THREE.Vector3) => Math.max(...[0, 1, 2, 3, 4, 5].map((k) => v.x * Math.cos((k * Math.PI) / 3) + v.z * Math.sin((k * Math.PI) / 3)));

    it.each([1, 3, 7, 8, 13, 19])('%i 棟建築不重疊且都在環道內側', (n) => {
        const { slots, scale } = slotLayout(n);
        expect(slots).toHaveLength(n);
        const footprint = 0.95 * scale; // 建築最寬約 0.86–0.95
        for (let i = 0; i < slots.length; i++) {
            expect(hexDist(slots[i]) + (footprint / 2)).toBeLessThan(PATH_R - 0.12);
            for (let j = i + 1; j < slots.length; j++) expect(slots[i].distanceTo(slots[j])).toBeGreaterThan(footprint * 0.8);
        }
    });

    it('超過 19 個只排得下 19 棟', () => {
        expect(slotLayout(25).slots).toHaveLength(19);
    });
});

describe('行人路網', () => {
    it('所有節點彼此連通，每個門口都接上環道', () => {
        const model = buildIslandModel(baseInput({ quests: Array.from({ length: 13 }, (_, i) => quest(`q${i}`, `任務${i}`)) }));
        const scene = new THREE.Scene();
        const { islands } = buildIslands(model.islands, scene);
        const nodes = buildGraph(islands, buildBridges(model.islands, islands, scene));
        const start = nodes.keys().next().value!;
        const seen = new Set([start]);
        const queue = [start];
        while (queue.length) {
            for (const l of nodes.get(queue.shift()!)!.links) {
                if (seen.has(l.to)) continue;
                seen.add(l.to);
                queue.push(l.to);
            }
        }
        expect(seen.size).toBe(nodes.size);
        for (const n of nodes.values()) if (n.building) expect(n.links.length).toBeGreaterThan(0);
    });
});
