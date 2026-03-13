import { describe, expect, it } from 'vitest';
import { buildWorldPersistencePayload, parseWorldPersistenceSnapshot } from '../hooks/useWorldPersistence';

describe('world persistence mapping', () => {
    it('builds rows for world tables from current world state', () => {
        const payload = buildWorldPersistencePayload({
            userId: 'user-1',
            worldLab: {
                islandLevel: 6,
                heroLevel: 4,
                heroPower: 220,
                monsterShards: 9,
                timeOfDay: 'dusk',
                buildings: { forest: 3, mine: 2, academy: 2, market: 1 },
                resources: { wood: 40, stone: 18, crystal: 6 },
                lastTickAt: new Date('2026-03-12T10:00:00.000Z').getTime(),
            },
            activeAdventure: {
                missionType: 'standard',
                durationMinutes: 120,
                startAt: '2026-03-12T10:00:00.000Z',
                endsAt: '2026-03-12T12:00:00.000Z',
                adventureLevel: 1,
                heroLevel: 4,
                status: 'running',
            },
            lastAdventureResult: null,
            bankNowMs: new Date('2026-03-13T09:00:00.000Z').getTime(),
            demandDepositAccount: {
                balance: 150,
                lastInterestAt: '2026-03-11T10:00:00.000Z',
            },
            timeDeposits: [
                {
                    id: 'deposit-1',
                    principal: 80,
                    dailyRate: 0.01,
                    startAt: '2026-03-10T00:00:00.000Z',
                    maturesAt: '2026-03-17T00:00:00.000Z',
                    termDays: 7,
                    status: 'active',
                },
            ],
        });

        expect(payload.stateRow.user_id).toBe('user-1');
        expect(payload.inventoryRow.monster_shards).toBe(9);
        expect(payload.characterRow.level).toBe(4);
        expect(payload.buildingRows).toHaveLength(4);
        expect(payload.adventureRow?.mission_type).toBe('standard');
        expect(payload.bankAccountRow.balance).toBe(150);
        expect(payload.timeDepositRows).toHaveLength(1);
    });

    it('parses persisted rows back into a world snapshot', () => {
        const snapshot = parseWorldPersistenceSnapshot({
            stateRow: {
                user_id: 'user-1',
                island_level: 7,
                time_of_day_pref: 'dusk',
                last_collected_at: '2026-03-12T10:00:00.000Z',
            },
            inventoryRow: {
                user_id: 'user-1',
                wood: 12,
                stone: 9,
                crystal: 4,
                monster_shards: 6,
            },
            characterRow: {
                user_id: 'user-1',
                level: 5,
                power: 320,
            },
            buildingRows: [
                { user_id: 'user-1', building_key: 'forest', level: 4 },
                { user_id: 'user-1', building_key: 'market', level: 3 },
            ],
            adventureRow: {
                user_id: 'user-1',
                mission_type: 'long',
                duration_minutes: 480,
                status: 'claimed',
                started_at: '2026-03-12T10:00:00.000Z',
                ends_at: '2026-03-12T18:00:00.000Z',
                adventure_level: 2,
                hero_level: 5,
                result_payload: {
                    eventType: 'chest',
                    rewards: { wood: 20, stone: 12, crystal: 7, monsterShards: 2 },
                    updatedMission: {
                        missionType: 'long',
                        durationMinutes: 480,
                        startAt: '2026-03-12T10:00:00.000Z',
                        endsAt: '2026-03-12T18:00:00.000Z',
                        adventureLevel: 2,
                        heroLevel: 5,
                        status: 'claimed',
                    },
                },
            },
            bankAccountRow: {
                user_id: 'user-1',
                balance: 230,
                last_interest_at: '2026-03-12T00:00:00.000Z',
                simulated_now_at: '2026-03-18T00:00:00.000Z',
            },
            timeDepositRows: [
                {
                    id: 'deposit-2',
                    user_id: 'user-1',
                    principal: 120,
                    daily_rate: 0.012,
                    start_at: '2026-03-12T00:00:00.000Z',
                    matures_at: '2026-03-22T00:00:00.000Z',
                    term_days: 10,
                    status: 'active',
                },
            ],
        });

        expect(snapshot?.worldLab.islandLevel).toBe(7);
        expect(snapshot?.worldLab.heroLevel).toBe(5);
        expect(snapshot?.worldLab.buildings.forest).toBe(4);
        expect(snapshot?.activeAdventure?.missionType).toBe('long');
        expect(snapshot?.lastAdventureResult?.eventType).toBe('chest');
        expect(snapshot?.demandDepositAccount.balance).toBe(230);
        expect(snapshot?.timeDeposits[0].principal).toBe(120);
        expect(snapshot?.bankNowMs).toBe(new Date('2026-03-18T00:00:00.000Z').getTime());
    });
});