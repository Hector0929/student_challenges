import React from 'react';
import { useTowerProgress } from '../hooks/useTowerProgress';
import { getZoneIndex } from '../lib/towerSpiralLayout';
import { ZONE_ICONS, ZONE_STYLES } from './tower/v4/zoneStyles';

// 首頁的怪獸塔預覽卡片。和完整的 MonsterTowerV4 分開，打開首頁時不必載入 3D 場景。
export const TowerV4Preview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);
    const currentFloor = progress?.current_floor ?? 1;
    const diceCount = progress?.dice_count ?? 0;
    const ownedMonsters = (progress?.monsters_collected ?? []).filter((id) => !id.startsWith('egg:')).length;
    const eggCount = (progress?.monsters_collected ?? []).filter((id) => id.startsWith('egg:')).length;
    const zoneIdx = getZoneIndex(currentFloor);

    return (
        <button
            onClick={onClick}
            className="w-full text-left clay-card p-4 hover:scale-[1.01] transition-transform border border-emerald-300 bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 shadow-xl"
            data-testid="monster-tower-v4-open"
        >
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-300 to-emerald-600 text-3xl flex items-center justify-center shadow-lg border-2 border-white">🗼</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-heading text-lg font-bold text-slate-800">怪獸塔 V4 · 螺旋石塔</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">3D</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                        {ZONE_ICONS[zoneIdx]} {ZONE_STYLES[zoneIdx].name} · 第 {currentFloor} 層 · 🎲 {diceCount} · 👾 {ownedMonsters} 隻夥伴{eggCount > 0 ? ` · 🥚 ${eggCount}` : ''}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white overflow-hidden flex">
                        {ZONE_STYLES.map((z, i) => (
                            <div
                                key={z.name}
                                className="h-full"
                                style={{
                                    width: '20%',
                                    background: `#${z.tile[1].toString(16).padStart(6, '0')}`,
                                    opacity: currentFloor > i * 20 ? 1 : 0.25,
                                    clipPath: currentFloor > i * 20 && currentFloor <= (i + 1) * 20 ? `inset(0 ${100 - ((currentFloor - i * 20) / 20) * 100}% 0 0)` : undefined,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </button>
    );
};
