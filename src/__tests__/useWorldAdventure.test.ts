import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldAdventure } from '../hooks/useWorldAdventure';

describe('useWorldAdventure', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-12T10:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts a mission and transitions to completed after time passes', () => {
        const onClaimRewards = vi.fn();
        const { result } = renderHook(() => useWorldAdventure({
            active: true,
            islandLevel: 7,
            heroLevel: 3,
            onClaimRewards,
            pickEventType: () => 'npc',
        }));

        act(() => {
            result.current.startAdventure();
        });

        expect(result.current.activeAdventureStatus).toBe('running');

        act(() => {
            vi.advanceTimersByTime(30 * 60 * 1000 + 1000);
        });

        expect(result.current.activeAdventureStatus).toBe('completed');
    });

    it('claims rewards and forwards them to world state consumer', () => {
        const onClaimRewards = vi.fn();
        const { result } = renderHook(() => useWorldAdventure({
            active: true,
            islandLevel: 7,
            heroLevel: 4,
            onClaimRewards,
            pickEventType: () => 'monster',
        }));

        act(() => {
            result.current.startAdventure();
        });

        act(() => {
            result.current.fastForwardAdventure();
        });

        expect(result.current.activeAdventureStatus).toBe('completed');

        let claimResult;
        act(() => {
            claimResult = result.current.claimAdventure();
        });

        expect(claimResult).toEqual(expect.objectContaining({ ok: true }));
        expect(result.current.activeAdventureStatus).toBe('claimed');
        expect(result.current.lastAdventureResult?.eventType).toBe('monster');
        expect(onClaimRewards).toHaveBeenCalledWith(expect.objectContaining({ monsterShards: expect.any(Number) }));
    });
});