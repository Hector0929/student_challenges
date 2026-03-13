import { describe, expect, it } from 'vitest';
import {
    claimAdventureRewards,
    createAdventureMission,
    getAdventureStatus,
    type AdventureEventType,
} from '../lib/world/adventure';

describe('world adventure domain rules', () => {
    it('派遣任務會建立正確結束時間', () => {
        const startAt = '2026-03-12T10:00:00.000Z';
        const mission = createAdventureMission({
            missionType: 'short',
            startAt,
            adventureLevel: 1,
            heroLevel: 1,
        });

        expect(mission.status).toBe('running');
        expect(mission.durationMinutes).toBe(30);
        expect(mission.endsAt).toBe('2026-03-12T10:30:00.000Z');
    });

    it('任務完成前不能領取', () => {
        const mission = createAdventureMission({
            missionType: 'short',
            startAt: '2026-03-12T10:00:00.000Z',
            adventureLevel: 1,
            heroLevel: 1,
        });

        expect(getAdventureStatus(mission, '2026-03-12T10:15:00.000Z')).toBe('running');
        expect(() => claimAdventureRewards({
            mission,
            now: '2026-03-12T10:15:00.000Z',
            eventType: 'chest',
        })).toThrow(/尚未完成/);
    });

    it('任務完成後可領取資源', () => {
        const mission = createAdventureMission({
            missionType: 'short',
            startAt: '2026-03-12T10:00:00.000Z',
            adventureLevel: 2,
            heroLevel: 3,
        });

        const result = claimAdventureRewards({
            mission,
            now: '2026-03-12T10:31:00.000Z',
            eventType: 'npc',
        });

        expect(result.updatedMission.status).toBe('claimed');
        expect(result.rewards.wood + result.rewards.stone + result.rewards.crystal).toBeGreaterThan(0);
        expect(result.rewards.monsterShards).toBeGreaterThanOrEqual(0);
    });

    it('事件結果會改變回報', () => {
        const mission = createAdventureMission({
            missionType: 'long',
            startAt: '2026-03-12T10:00:00.000Z',
            adventureLevel: 3,
            heroLevel: 4,
        });

        const positiveEvent: AdventureEventType = 'chest';
        const negativeEvent: AdventureEventType = 'lost';

        const good = claimAdventureRewards({
            mission,
            now: '2026-03-12T18:01:00.000Z',
            eventType: positiveEvent,
        });
        const bad = claimAdventureRewards({
            mission,
            now: '2026-03-12T18:01:00.000Z',
            eventType: negativeEvent,
        });

        const goodTotal = good.rewards.wood + good.rewards.stone + good.rewards.crystal + good.rewards.monsterShards * 10;
        const badTotal = bad.rewards.wood + bad.rewards.stone + bad.rewards.crystal + bad.rewards.monsterShards * 10;

        expect(goodTotal).toBeGreaterThan(badTotal);
        expect(good.eventType).toBe('chest');
        expect(bad.eventType).toBe('lost');
    });
});
