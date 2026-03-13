import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorldAdventurePanel } from './WorldAdventurePanel';

describe('WorldAdventurePanel', () => {
    it('lets user switch mission type and start adventure', () => {
        const onSelectMissionType = vi.fn();
        const onStartAdventure = vi.fn();

        render(
            <WorldAdventurePanel
                selectedMissionType="short"
                onSelectMissionType={onSelectMissionType}
                activeAdventure={null}
                activeAdventureStatus="idle"
                activeAdventureRemainingMs={0}
                lastAdventureResult={null}
                formatDuration={(ms) => `${ms}`}
                onStartAdventure={onStartAdventure}
                onFastForwardAdventure={() => {}}
                onClaimAdventure={() => {}}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '2 小時' }));
        fireEvent.click(screen.getByRole('button', { name: '🚀 開始冒險' }));

        expect(onSelectMissionType).toHaveBeenCalledWith('standard');
        expect(onStartAdventure).toHaveBeenCalledTimes(1);
    });

    it('renders reward summary and enables claim only when completed', () => {
        render(
            <WorldAdventurePanel
                selectedMissionType="long"
                onSelectMissionType={() => {}}
                activeAdventure={{
                    missionType: 'long',
                    durationMinutes: 480,
                    startAt: '2026-03-12T10:00:00.000Z',
                    endsAt: '2026-03-12T18:00:00.000Z',
                    adventureLevel: 2,
                    heroLevel: 3,
                    status: 'claimed',
                }}
                activeAdventureStatus="completed"
                activeAdventureRemainingMs={0}
                lastAdventureResult={{
                    eventType: 'monster',
                    updatedMission: {
                        missionType: 'long',
                        durationMinutes: 480,
                        startAt: '2026-03-12T10:00:00.000Z',
                        endsAt: '2026-03-12T18:00:00.000Z',
                        adventureLevel: 2,
                        heroLevel: 3,
                        status: 'claimed',
                    },
                    rewards: {
                        wood: 10,
                        stone: 8,
                        crystal: 6,
                        monsterShards: 2,
                    },
                }}
                formatDuration={() => '00m 00s'}
                onStartAdventure={() => {}}
                onFastForwardAdventure={() => {}}
                onClaimAdventure={() => {}}
            />
        );

        expect(screen.getByText(/事件結果：monster/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '🎁 領取獎勵' })).toBeEnabled();
        expect(screen.getByRole('button', { name: '⏩ 模擬完成' })).toBeDisabled();
    });
});