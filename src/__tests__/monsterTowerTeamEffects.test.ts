/**
 * Monster Tower Gen3 — team-role effects
 *
 * Covers the three things the Gen3 work needs real automated coverage for:
 * 1. The team-role rules in `applyTeamRoleEffects` (useTowerProgress.ts) actually
 *    compute the floor/star adjustments described in the Gen3 "隊伍功用說明" panel.
 * 2. Each effect names the specific monster that helped, so the UI can explain a
 *    partial trap slide instead of it looking like a bug.
 * 3. `ROLE_BY_MONSTER` (lib/towerGen3Rules.ts) has no gaps — every monster in
 *    MONSTERS resolves to a role instead of silently falling back to 'striker'.
 */

import { describe, it, expect } from 'vitest';
import {
    applyTeamRoleEffects,
    TEAM_LADDER_BOOST_FLOORS,
    MONSTERS,
    type ActiveTeamMember,
} from '../hooks/useTowerProgress';
import { ROLE_BY_MONSTER } from '../lib/towerGen3Rules';
import type { TowerEvent } from '../types/database';

function makeEvent(overrides: Partial<TowerEvent>): TowerEvent {
    return {
        id: 'test-event',
        floor_number: 30,
        event_type: 'trap',
        is_active: true,
        ...overrides,
    };
}

function member(role: string, name = `${role}-夥伴`): ActiveTeamMember {
    return { id: `${role}_monster`, name, emoji: '🟢', role };
}

describe('applyTeamRoleEffects — trap tiles', () => {
    const trap = makeEvent({ floor_number: 30, event_type: 'trap', target_floor: 24 }); // 6-floor drop

    it('halves the slide-back distance when a guardian is on the team', () => {
        const result = applyTeamRoleEffects(trap, [member('guardian', '青苔巨像')]);
        // drop = 6, half = 3 (ceil), so landing floor = 30 - 3 = 27
        expect(result.newFloor).toBe(27);
        expect(result.teamEffect?.kind).toBe('trap_shield');
    });

    it('halves the slide-back distance when a support is on the team', () => {
        const result = applyTeamRoleEffects(trap, [member('support')]);
        expect(result.newFloor).toBe(27);
    });

    it('names the monster that shielded and how many floors it saved', () => {
        const result = applyTeamRoleEffects(trap, [member('guardian', '青苔巨像')]);
        expect(result.teamEffect?.monsterName).toBe('青苔巨像');
        expect(result.teamEffect?.floorsChanged).toBe(3); // 6-floor drop → 3 saved
        expect(result.teamEffect?.message).toContain('青苔巨像');
    });

    it('picks the first eligible partner when several could help', () => {
        const result = applyTeamRoleEffects(trap, [member('striker'), member('guardian', '企鵝騎士'), member('support')]);
        expect(result.teamEffect?.monsterName).toBe('企鵝騎士');
    });

    it('applies the full slide-back when no shielding role is present', () => {
        const result = applyTeamRoleEffects(trap, [member('striker')]);
        expect(result.newFloor).toBe(24);
        expect(result.teamEffect).toBeNull();
    });

    it('applies the full slide-back with no team at all', () => {
        const result = applyTeamRoleEffects(trap, []);
        expect(result.newFloor).toBe(24);
    });

    it('rounds an odd drop up when halving (never slides past the original floor)', () => {
        const oddTrap = makeEvent({ floor_number: 21, event_type: 'trap', target_floor: 16 }); // drop = 5
        const result = applyTeamRoleEffects(oddTrap, [member('guardian')]);
        // ceil(5/2) = 3, landing floor = 21 - 3 = 18 (still below 21, never above)
        expect(result.newFloor).toBe(18);
        expect(result.newFloor).toBeLessThan(oddTrap.floor_number);
    });
});

describe('applyTeamRoleEffects — ladder tiles', () => {
    const ladder = makeEvent({ floor_number: 20, event_type: 'ladder', target_floor: 30 });

    it('adds the fixed boost when a controller is on the team', () => {
        const result = applyTeamRoleEffects(ladder, [member('controller', '雷雲君')]);
        expect(result.newFloor).toBe(30 + TEAM_LADDER_BOOST_FLOORS);
        expect(result.teamEffect?.kind).toBe('ladder_boost');
        expect(result.teamEffect?.monsterName).toBe('雷雲君');
        expect(result.teamEffect?.floorsChanged).toBe(TEAM_LADDER_BOOST_FLOORS);
    });

    it('adds the fixed boost when a support is on the team', () => {
        const result = applyTeamRoleEffects(ladder, [member('support')]);
        expect(result.newFloor).toBe(30 + TEAM_LADDER_BOOST_FLOORS);
    });

    it('does not exceed floor 100 even with the boost', () => {
        const topLadder = makeEvent({ floor_number: 95, event_type: 'ladder', target_floor: 99 });
        const result = applyTeamRoleEffects(topLadder, [member('controller')]);
        expect(result.newFloor).toBe(100);
        expect(result.teamEffect?.floorsChanged).toBe(1); // capped, only 1 extra floor gained
    });

    it('lands exactly on the target floor with no boosting role present', () => {
        const result = applyTeamRoleEffects(ladder, [member('guardian')]);
        expect(result.newFloor).toBe(30);
        expect(result.teamEffect).toBeNull();
    });
});

describe('applyTeamRoleEffects — 守門怪獸格', () => {
    const monsterEvent = makeEvent({ floor_number: 40, event_type: 'monster', target_floor: undefined });

    // 守門怪獸格改成跳出塔內挑戰關卡，星幣由挑戰過關發放，
    // 所以這裡不再自動結算任何獎勵，也不移動樓層。
    it('不自動給星幣，交給挑戰關卡處理', () => {
        const result = applyTeamRoleEffects(monsterEvent, [member('striker', '火焰鳥')]);
        expect(result.bonusStars).toBe(0);
        expect(result.teamEffect).toBeNull();
    });

    it('停在原本落點，不因守門怪而移動', () => {
        const result = applyTeamRoleEffects(monsterEvent, [member('breaker')]);
        expect(result.newFloor).toBe(40);
    });
});

describe('ROLE_BY_MONSTER completeness', () => {
    it('assigns an explicit role to every monster in MONSTERS (no silent fallback)', () => {
        const missing = Object.keys(MONSTERS).filter((id) => !(id in ROLE_BY_MONSTER));
        expect(missing).toEqual([]);
    });

    it('only uses the five roles the team UI actually renders', () => {
        const validRoles = new Set(['guardian', 'striker', 'controller', 'support', 'breaker']);
        const invalid = Object.entries(ROLE_BY_MONSTER).filter(([, role]) => role && !validRoles.has(role));
        expect(invalid).toEqual([]);
    });

    it('covers every role the roll rules can reward, so each role has something to do', () => {
        const assignedRoles = new Set(Object.values(ROLE_BY_MONSTER));
        ['guardian', 'support', 'controller', 'striker', 'breaker'].forEach((role) => {
            expect(assignedRoles.has(role as never)).toBe(true);
        });
    });
});
