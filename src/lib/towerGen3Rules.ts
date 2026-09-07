/**
 * 怪獸塔 Gen3 — 盤面組成與怪獸定位規則
 *
 * 這裡只放「純資料與純函式」，不含任何 UI，方便單元測試，也讓 Gen3 元件檔維持
 * 單純只匯出元件（否則會觸發 react-refresh 的 fast refresh 限制）。
 *
 * 擲骰當下的隊伍效果規則（護盾／加速／擊破）住在 useTowerProgress.ts 的
 * applyTeamRoleEffects，因為 V2 與 Gen3 共用同一份結算邏輯。
 */

import { mulberry32, type MonsterId } from '../hooks/useTowerProgress';
import type { TowerEvent } from '../types/database';

export const GEN3_TOTAL_FLOORS = 100;

export type TeamRole = 'guardian' | 'striker' | 'controller' | 'support' | 'breaker';

// ── 守門怪獸格 ──
// generateRandomEvents（V1/V2 共用）只會產生梯子、陷阱與里程碑怪獸蛋，沒有守門怪獸格，
// 所以「輸出／破甲」這個定位在盤面上永遠沒有對手可打。Gen3 在共用盤面之上補進守門怪獸格，
// 讓三種隊伍定位都真的有機會發揮：陷阱給守護、梯子給控場、守門怪給輸出。
// V2 的盤面刻意維持經典蛇梯棋，不受影響。
export const GEN3_ENCOUNTER_COUNT = 8;
const GEN3_ENCOUNTER_MIN_FLOOR = 6;
const GEN3_ENCOUNTER_MAX_FLOOR = 97;
const GEN3_ENCOUNTER_DESCRIPTIONS = [
    '守門怪獸擋住去路！',
    '巡邏怪獸發現你了！',
    '洞窟守衛張牙舞爪！',
    '機關哨兵啟動了！',
    '暴走怪獸衝過來！',
    '塔層看守者現身！',
    '影子怪獸悄悄靠近！',
    '護塔獸發出咆哮！',
];

export function withEncounterTiles(baseEvents: TowerEvent[], seed: number): TowerEvent[] {
    const rng = mulberry32(seed ^ 0x9e3779b9);

    // 不能疊到既有的梯子/陷阱起點、傳送終點或怪獸蛋樓層，否則會蓋掉原本的事件
    const occupied = new Set<number>([1, GEN3_TOTAL_FLOORS]);
    baseEvents.forEach((ev) => {
        occupied.add(ev.floor_number);
        if (ev.target_floor) occupied.add(ev.target_floor);
    });

    const candidates: number[] = [];
    for (let floor = GEN3_ENCOUNTER_MIN_FLOOR; floor <= GEN3_ENCOUNTER_MAX_FLOOR; floor += 1) {
        if (!occupied.has(floor)) candidates.push(floor);
    }

    // Fisher-Yates，用同一顆種子確保同一局的盤面穩定、跨局重新洗牌
    for (let i = candidates.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const encounters: TowerEvent[] = candidates
        .slice(0, GEN3_ENCOUNTER_COUNT)
        .map((floor, index) => ({
            id: `gen3-encounter-${floor}`,
            floor_number: floor,
            event_type: 'monster' as const,
            description: GEN3_ENCOUNTER_DESCRIPTIONS[index % GEN3_ENCOUNTER_DESCRIPTIONS.length],
            is_active: true,
        }));

    return [...baseEvents, ...encounters].sort((a, b) => a.floor_number - b.floor_number);
}

// ── 安全路 / 冒險路 ──
// 冒險路只放大陷阱的滑落距離，梯子/守門怪/怪獸蛋維持原本安排，
// 這樣「安全路 vs 冒險路」才是玩家看得懂的風險/報酬取捨，而不是切換一份看不見的固定表。
export const RISK_ROUTE_TRAP_MULTIPLIER = 1.3;

export function applyRouteMode(baseEvents: TowerEvent[], routeMode: 'safe' | 'risk'): TowerEvent[] {
    if (routeMode === 'safe') return baseEvents;
    return baseEvents.map((ev) => {
        if (ev.event_type !== 'trap' || !ev.target_floor) return ev;
        const drop = ev.floor_number - ev.target_floor;
        const amplifiedDrop = Math.round(drop * RISK_ROUTE_TRAP_MULTIPLIER);
        const target = Math.max(2, ev.floor_number - amplifiedDrop);
        return { ...ev, target_floor: target };
    });
}

// ── 怪獸戰鬥定位 ──
// 依 MONSTER_TOWER_GEN3_MAPPING_TABLE.md 第 5 節「怪獸戰鬥定位映射」補完全部怪獸。
// 映射表裡的第 6 種定位「bruiser」（目前只有 nian_beast）併入 striker，
// 維持畫面既有的 5 色定位圖示，不增加孩子的理解負擔。
export const ROLE_BY_MONSTER: Partial<Record<MonsterId, TeamRole>> = {
    slime: 'guardian',
    wind_slime: 'controller',
    mossy_golem: 'guardian',
    mushroom_kin: 'support',
    nian_beast: 'striker', // mapping table: bruiser → folded into striker
    water_spirit: 'support',
    mystic_water: 'controller',
    ice_cube_slime: 'guardian',
    penguin_knight: 'striker',
    valentine_diamond: 'support',
    flame_bird: 'striker',
    phoenix_chick: 'striker',
    magma_blob: 'guardian',
    demon_imp: 'controller',
    cactus_boy: 'breaker',
    sand_castle_crab: 'guardian',
    thunder_cloud: 'controller',
    storm_lord: 'breaker',
    cloud_puff: 'support',
    star_bit: 'striker',
    ufo_rider: 'breaker',
    moon_bunny: 'support',
    rainbow_dragon: 'striker',
    gold_mimic: 'support',
    star_fairy: 'support',
    lucky_clover: 'support',
    evolved_slime: 'guardian',
    evolved_water_spirit: 'support',
    evolved_flame_bird: 'striker',
    evolved_thunder_cloud: 'controller',
    evolved_rainbow_dragon: 'striker',
    evolved_star_fairy: 'support',
    evolved_lucky_clover: 'support',
    evolved_gold_mimic: 'support',
    evolved_ufo_rider: 'breaker',
};

export function getMonsterRole(monsterId: MonsterId): TeamRole {
    return ROLE_BY_MONSTER[monsterId] ?? 'striker';
}
