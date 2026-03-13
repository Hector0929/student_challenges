import type { WorldResources } from './types';

export type AdventureMissionType = 'short' | 'standard' | 'long';
export type AdventureStatus = 'idle' | 'running' | 'completed' | 'claimed';
export type AdventureEventType = 'chest' | 'lost' | 'monster' | 'npc' | 'weather';

export interface AdventureMission {
    missionType: AdventureMissionType;
    durationMinutes: number;
    startAt: string;
    endsAt: string;
    adventureLevel: number;
    heroLevel: number;
    status: AdventureStatus;
}

export interface AdventureRewards extends WorldResources {
    monsterShards: number;
}

export interface AdventureClaimResult {
    updatedMission: AdventureMission;
    rewards: AdventureRewards;
    eventType: AdventureEventType;
}

const MISSION_DURATION: Record<AdventureMissionType, number> = {
    short: 30,
    standard: 120,
    long: 480,
};

const EVENT_MULTIPLIER: Record<AdventureEventType, number> = {
    chest: 1.35,
    lost: 0.55,
    monster: 1.1,
    npc: 1.18,
    weather: 0.92,
};

function addMinutes(isoString: string, minutes: number): string {
    return new Date(new Date(isoString).getTime() + minutes * 60 * 1000).toISOString();
}

function floorPositive(value: number): number {
    return Math.max(0, Math.floor(value));
}

export function createAdventureMission({
    missionType,
    startAt,
    adventureLevel,
    heroLevel,
}: {
    missionType: AdventureMissionType;
    startAt: string;
    adventureLevel: number;
    heroLevel: number;
}): AdventureMission {
    const durationMinutes = MISSION_DURATION[missionType];
    return {
        missionType,
        durationMinutes,
        startAt,
        endsAt: addMinutes(startAt, durationMinutes),
        adventureLevel: Math.max(1, Math.floor(adventureLevel)),
        heroLevel: Math.max(1, Math.floor(heroLevel)),
        status: 'running',
    };
}

export function getAdventureStatus(mission: AdventureMission, now: string): AdventureStatus {
    if (mission.status === 'claimed') return 'claimed';
    const nowMs = new Date(now).getTime();
    const endMs = new Date(mission.endsAt).getTime();
    return nowMs >= endMs ? 'completed' : 'running';
}

export function calculateAdventureRewards({
    mission,
    eventType,
}: {
    mission: AdventureMission;
    eventType: AdventureEventType;
}): AdventureRewards {
    const durationFactor = mission.durationMinutes / 30;
    const levelFactor = 1 + mission.adventureLevel * 0.12 + mission.heroLevel * 0.08;
    const eventMultiplier = EVENT_MULTIPLIER[eventType];

    const baseWood = 10 * durationFactor * levelFactor;
    const baseStone = 7 * durationFactor * levelFactor;
    const baseCrystal = 3 * durationFactor * (1 + mission.adventureLevel * 0.05);
    const baseShards = (mission.missionType === 'long' ? 2 : 1) * (1 + mission.adventureLevel * 0.15);

    const rewards: AdventureRewards = {
        wood: floorPositive(baseWood * eventMultiplier),
        stone: floorPositive(baseStone * eventMultiplier),
        crystal: floorPositive(baseCrystal * eventMultiplier),
        monsterShards: floorPositive(baseShards * eventMultiplier),
    };

    if (eventType === 'monster') {
        rewards.monsterShards += 1;
    }
    if (eventType === 'npc') {
        rewards.wood += 2;
        rewards.stone += 1;
    }
    if (eventType === 'chest') {
        rewards.crystal += 2;
    }

    return rewards;
}

export function claimAdventureRewards({
    mission,
    now,
    eventType,
}: {
    mission: AdventureMission;
    now: string;
    eventType: AdventureEventType;
}): AdventureClaimResult {
    const status = getAdventureStatus(mission, now);
    if (status !== 'completed') {
        throw new Error('冒險尚未完成，不能領取獎勵');
    }

    return {
        updatedMission: {
            ...mission,
            status: 'claimed',
        },
        rewards: calculateAdventureRewards({ mission, eventType }),
        eventType,
    };
}
