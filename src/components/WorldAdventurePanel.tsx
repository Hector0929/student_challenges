import React from 'react';
import type {
    AdventureClaimResult,
    AdventureMission,
    AdventureMissionType,
    AdventureStatus,
} from '../lib/world/adventure';

interface WorldAdventurePanelProps {
    selectedMissionType: AdventureMissionType;
    onSelectMissionType: (missionType: AdventureMissionType) => void;
    activeAdventure: AdventureMission | null;
    activeAdventureStatus: AdventureStatus;
    activeAdventureRemainingMs: number;
    lastAdventureResult: AdventureClaimResult | null;
    formatDuration: (ms: number) => string;
    onStartAdventure: () => void;
    onFastForwardAdventure: () => void;
    onClaimAdventure: () => void;
}

const MISSION_OPTIONS: Array<{ key: AdventureMissionType; label: string }> = [
    { key: 'short', label: '30 分鐘' },
    { key: 'standard', label: '2 小時' },
    { key: 'long', label: '8 小時' },
];

export const WorldAdventurePanel: React.FC<WorldAdventurePanelProps> = ({
    selectedMissionType,
    onSelectMissionType,
    activeAdventure,
    activeAdventureStatus,
    activeAdventureRemainingMs,
    lastAdventureResult,
    formatDuration,
    onStartAdventure,
    onFastForwardAdventure,
    onClaimAdventure,
}) => {
    return (
        <div className="mt-4 pt-4 border-t border-amber-200 space-y-3">
            <div>
                <p className="font-heading text-sm mb-2">🧭 派遣任務</p>
                <div className="flex flex-wrap gap-2">
                    {MISSION_OPTIONS.map((mission) => (
                        <button
                            key={mission.key}
                            onClick={() => onSelectMissionType(mission.key)}
                            className={`px-3 py-1.5 rounded-lg border text-sm ${selectedMissionType === mission.key
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-white border-gray-300 text-gray-600'
                                }`}
                        >
                            {mission.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700 space-y-1">
                <div>• 任務狀態：{activeAdventure ? activeAdventureStatus : 'idle'}</div>
                {activeAdventure && (
                    <>
                        <div>• 任務類型：{activeAdventure.missionType}</div>
                        <div>• 倒數：{activeAdventureStatus === 'running' ? formatDuration(activeAdventureRemainingMs) : '可領取 / 已完成'}</div>
                    </>
                )}
                {!activeAdventure && <div>• 尚未派出冒險隊</div>}
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onStartAdventure}
                    disabled={!!activeAdventure && activeAdventureStatus !== 'claimed' && activeAdventureStatus !== 'idle'}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    🚀 開始冒險
                </button>
                <button
                    onClick={onFastForwardAdventure}
                    disabled={!activeAdventure || activeAdventureStatus !== 'running'}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ⏩ 模擬完成
                </button>
                <button
                    onClick={onClaimAdventure}
                    disabled={!activeAdventure || activeAdventureStatus !== 'completed'}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    🎁 領取獎勵
                </button>
            </div>

            {lastAdventureResult && (
                <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-3 text-sm text-fuchsia-900 space-y-1">
                    <div>• 事件結果：{lastAdventureResult.eventType}</div>
                    <div>• 木材 +{lastAdventureResult.rewards.wood} / 石材 +{lastAdventureResult.rewards.stone} / 晶礦 +{lastAdventureResult.rewards.crystal}</div>
                    <div>• 怪獸碎片 +{lastAdventureResult.rewards.monsterShards}</div>
                </div>
            )}
        </div>
    );
};