import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    claimAdventureRewards,
    createAdventureMission,
    getAdventureStatus,
    type AdventureClaimResult,
    type AdventureEventType,
    type AdventureMission,
    type AdventureMissionType,
    type AdventureRewards,
} from '../lib/world/adventure';

interface UseWorldAdventureOptions {
    active: boolean;
    islandLevel: number;
    heroLevel: number;
    onClaimRewards: (rewards: AdventureRewards) => void;
    pickEventType?: () => AdventureEventType;
}

interface AdventureActionResult {
    ok: boolean;
    error?: string;
    result?: AdventureClaimResult;
}

const ADVENTURE_EVENTS: AdventureEventType[] = ['chest', 'lost', 'monster', 'npc', 'weather'];

function defaultPickEventType(): AdventureEventType {
    return ADVENTURE_EVENTS[Math.floor(Math.random() * ADVENTURE_EVENTS.length)];
}

export function formatAdventureDuration(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function useWorldAdventure({
    active,
    islandLevel,
    heroLevel,
    onClaimRewards,
    pickEventType = defaultPickEventType,
}: UseWorldAdventureOptions) {
    const [selectedMissionType, setSelectedMissionType] = useState<AdventureMissionType>('short');
    const [adventureClockMs, setAdventureClockMs] = useState(Date.now());
    const [activeAdventure, setActiveAdventure] = useState<AdventureMission | null>(null);
    const [lastAdventureResult, setLastAdventureResult] = useState<AdventureClaimResult | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (active) {
                setAdventureClockMs(Date.now());
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [active]);

    const activeAdventureStatus = useMemo(() => {
        if (!activeAdventure) return 'idle';
        return getAdventureStatus(activeAdventure, new Date(adventureClockMs).toISOString());
    }, [activeAdventure, adventureClockMs]);

    const activeAdventureRemainingMs = useMemo(() => {
        if (!activeAdventure) return 0;
        return Math.max(0, new Date(activeAdventure.endsAt).getTime() - adventureClockMs);
    }, [activeAdventure, adventureClockMs]);

    const startAdventure = useCallback((): AdventureActionResult => {
        if (activeAdventure && activeAdventureStatus !== 'claimed' && activeAdventureStatus !== 'idle') {
            return { ok: false, error: '目前已有進行中的冒險任務' };
        }

        const mission = createAdventureMission({
            missionType: selectedMissionType,
            startAt: new Date(adventureClockMs).toISOString(),
            adventureLevel: Math.max(1, islandLevel - 5),
            heroLevel,
        });

        setActiveAdventure(mission);
        setLastAdventureResult(null);
        return { ok: true };
    }, [activeAdventure, activeAdventureStatus, adventureClockMs, heroLevel, islandLevel, selectedMissionType]);

    const fastForwardAdventure = useCallback(() => {
        if (!activeAdventure) return;
        setAdventureClockMs(new Date(activeAdventure.endsAt).getTime() + 1000);
    }, [activeAdventure]);

    const claimAdventure = useCallback((): AdventureActionResult => {
        if (!activeAdventure) {
            return { ok: false, error: '目前沒有可領取的冒險任務' };
        }

        try {
            const eventType = pickEventType();
            const result = claimAdventureRewards({
                mission: activeAdventure,
                now: new Date(adventureClockMs).toISOString(),
                eventType,
            });

            setActiveAdventure(result.updatedMission);
            setLastAdventureResult(result);
            onClaimRewards(result.rewards);
            return { ok: true, result };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : '領取失敗',
            };
        }
    }, [activeAdventure, adventureClockMs, onClaimRewards, pickEventType]);

    const hydrateAdventure = useCallback((mission: AdventureMission | null, claimResult: AdventureClaimResult | null = null) => {
        setActiveAdventure(mission);
        setLastAdventureResult(claimResult);
        if (mission) {
            setSelectedMissionType(mission.missionType);
        }
    }, []);

    return {
        selectedMissionType,
        setSelectedMissionType,
        activeAdventure,
        activeAdventureStatus,
        activeAdventureRemainingMs,
        lastAdventureResult,
        startAdventure,
        fastForwardAdventure,
        claimAdventure,
        hydrateAdventure,
        formatDuration: formatAdventureDuration,
    };
}