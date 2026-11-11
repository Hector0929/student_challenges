import React, { useState } from 'react';
import { X, FolderOpen, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
    useHatchEgg,
    useUpgradeMonster,
    MONSTERS,
    EVOLUTION_MAP,
    EVOLUTION_COST,
    type MonsterId,
} from '../../hooks/useTowerProgress';

interface TowerCollectionPanelProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    eggs: { eggIndex: number; monsterId: string }[];
    monsters: string[];
}

/**
 * Egg-hatching + monster evolution collection folder.
 * Shared between Monster Tower V2 and Gen3 so both stay in sync with the
 * same hatch/evolve rules instead of drifting into two copies.
 */
export const TowerCollectionPanel: React.FC<TowerCollectionPanelProps> = ({ userId, isOpen, onClose, eggs, monsters }) => {
    const hatchEggMutation = useHatchEgg();
    const upgradeMonsterMutation = useUpgradeMonster();

    const [hatchingIndex, setHatchingIndex] = useState<number | null>(null);
    const [hatchedMonster, setHatchedMonster] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [upgradingMonster, setUpgradingMonster] = useState<string | null>(null);
    const [evolvedReveal, setEvolvedReveal] = useState<string | null>(null);

    const handleClose = () => {
        setHatchedMonster(null);
        setHatchingIndex(null);
        setLightboxIndex(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-[2000] backdrop-blur-sm">
            <div className="tv2-pop-in w-[90%] max-w-sm max-h-[80vh] flex flex-col bg-slate-800 rounded-3xl border border-slate-600 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-cyan-200 flex items-center gap-2">
                        <FolderOpen size={20} /> 我的收藏
                    </h3>
                    <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Eggs Section */}
                    <div>
                        <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1">🥚 未孵化的蛋 ({eggs.length})</h4>
                        {eggs.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4">還沒有蛋，繼續冒險吧！</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-3">
                                {eggs.map((egg, idx) => {
                                    const isHatching = hatchingIndex === idx;
                                    return (
                                        <button
                                            key={`egg-${idx}`}
                                            onClick={async () => {
                                                if (hatchEggMutation.isPending || isHatching) return;
                                                setHatchingIndex(idx);
                                                await new Promise(r => setTimeout(r, 1200));
                                                try {
                                                    await hatchEggMutation.mutateAsync({ userId, eggIndex: idx });
                                                    setHatchedMonster(egg.monsterId);
                                                } catch (e) { console.error('Hatch failed:', e); }
                                                setHatchingIndex(null);
                                            }}
                                            disabled={hatchEggMutation.isPending}
                                            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <span className={`text-3xl ${isHatching ? 'tv2-egg-shake' : ''}`} style={{ filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.4))' }}>🥚</span>
                                            <span className="text-[10px] text-slate-400 font-medium">點擊孵化</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Monsters Section — grouped by type with counts */}
                    <div>
                        <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1">👾 我的怪獸 ({monsters.length})</h4>
                        {monsters.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4">孵化蛋來獲得怪獸！</p>
                        ) : (() => {
                            // Group monsters by type
                            const grouped = new Map<string, number>();
                            monsters.forEach(mId => grouped.set(mId, (grouped.get(mId) || 0) + 1));
                            const groupedEntries = Array.from(grouped.entries());

                            return (
                                <div className="grid grid-cols-3 gap-3">
                                    {groupedEntries.map(([mId, count], idx) => {
                                        const info = MONSTERS[mId as MonsterId];
                                        const isEvolved = (info as { isEvolved?: boolean } | undefined)?.isEvolved;
                                        const canEvolve = !isEvolved && EVOLUTION_MAP[mId as MonsterId] && count >= EVOLUTION_COST;
                                        const isUpgrading = upgradingMonster === mId;

                                        return (
                                            <div key={`mon-${mId}`} className="relative">
                                                <button
                                                    onClick={() => {
                                                        setLightboxIndex(idx);
                                                    }}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl w-full transition-all active:scale-95 ${isEvolved
                                                            ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-2 border-amber-500/60 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                                                            : 'bg-slate-700/40 border border-slate-600/50 hover:bg-slate-600/60'
                                                        }`}
                                                >
                                                    {/* Count badge */}
                                                    {count > 1 && (
                                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md">
                                                            ×{count}
                                                        </span>
                                                    )}
                                                    {/* Evolved crown */}
                                                    {isEvolved && (
                                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm" style={{ filter: 'drop-shadow(0 1px 3px rgba(251,191,36,0.6))' }}>👑</span>
                                                    )}
                                                    {info?.image ? (
                                                        <img src={info.image} alt={info.name} className="w-10 h-10 object-contain" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                                                    ) : (
                                                        <span className="text-3xl">{info?.emoji || '❓'}</span>
                                                    )}
                                                    <span className="text-[10px] text-slate-300 font-bold text-center leading-tight">{info?.name || mId}</span>
                                                </button>

                                                {/* Upgrade button */}
                                                {canEvolve && (
                                                    <button
                                                        onClick={async () => {
                                                            if (upgradeMonsterMutation.isPending) return;
                                                            setUpgradingMonster(mId);
                                                            await new Promise(r => setTimeout(r, 800));
                                                            try {
                                                                const result = await upgradeMonsterMutation.mutateAsync({ userId, monsterId: mId as MonsterId });
                                                                setEvolvedReveal(result.evolvedId);
                                                            } catch (e) { console.error('Upgrade failed:', e); }
                                                            setUpgradingMonster(null);
                                                        }}
                                                        disabled={upgradeMonsterMutation.isPending}
                                                        className={`mt-1 w-full py-1 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${isUpgrading
                                                                ? 'bg-amber-600 text-white animate-pulse'
                                                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 active:scale-95'
                                                            }`}
                                                    >
                                                        <Sparkles size={10} />
                                                        {isUpgrading ? '進化中...' : `進化 (${count}/${EVOLUTION_COST})`}
                                                    </button>
                                                )}
                                                {/* Progress toward evolution */}
                                                {!isEvolved && EVOLUTION_MAP[mId as MonsterId] && count < EVOLUTION_COST && count > 1 && (
                                                    <div className="mt-1 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${(count / EVOLUTION_COST) * 100}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* ── Monster Lightbox ── */}
            {lightboxIndex !== null && monsters.length > 0 && (() => {
                // Build grouped entries for lightbox navigation
                const lbGrouped = new Map<string, number>();
                monsters.forEach(mid => lbGrouped.set(mid, (lbGrouped.get(mid) || 0) + 1));
                const lbEntries = Array.from(lbGrouped.entries());
                const safeIdx = Math.min(lightboxIndex, lbEntries.length - 1);
                const [mId, mCount] = lbEntries[safeIdx];
                const info = MONSTERS[mId as MonsterId];
                const isEvolved = (info as { isEvolved?: boolean } | undefined)?.isEvolved;

                // Touch swipe handlers
                let touchStartX = 0;
                const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
                const handleTouchEnd = (e: React.TouchEvent) => {
                    const dx = e.changedTouches[0].clientX - touchStartX;
                    if (Math.abs(dx) > 50) {
                        if (dx > 0) setLightboxIndex(prev => prev !== null ? (prev - 1 + lbEntries.length) % lbEntries.length : null);
                        else setLightboxIndex(prev => prev !== null ? (prev + 1) % lbEntries.length : null);
                    }
                };

                return (
                    <div
                        className="absolute inset-0 flex items-center justify-center z-[2100] bg-black/90 backdrop-blur-md"
                        onClick={() => setLightboxIndex(null)}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div className="relative w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
                            {/* Close button */}
                            <button
                                onClick={() => setLightboxIndex(null)}
                                className="absolute -top-2 -right-2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-500 shadow-lg transition-colors active:scale-90"
                            >
                                <X size={18} className="text-slate-300" />
                            </button>

                            {/* Nav arrows */}
                            <button
                                onClick={() => setLightboxIndex(prev => prev !== null ? (prev - 1 + lbEntries.length) % lbEntries.length : null)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 border border-slate-500 shadow-lg transition-colors active:scale-90"
                            >
                                <ChevronLeft size={22} className="text-slate-300" />
                            </button>
                            <button
                                onClick={() => setLightboxIndex(prev => prev !== null ? (prev + 1) % lbEntries.length : null)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 border border-slate-500 shadow-lg transition-colors active:scale-90"
                            >
                                <ChevronRight size={22} className="text-slate-300" />
                            </button>

                            {/* Monster card */}
                            <div className={`p-6 rounded-3xl text-center ${isEvolved
                                    ? 'bg-gradient-to-br from-slate-800 to-amber-950/60 border-2 border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]'
                                    : 'bg-slate-800 border border-slate-600 shadow-2xl'
                                }`}>
                                {isEvolved && (
                                    <div className="text-2xl mb-2" style={{ filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))' }}>👑</div>
                                )}
                                <div className="text-4xl mb-3">{info?.emoji || '❓'}</div>
                                {info?.image ? (
                                    <img
                                        src={info.image}
                                        alt={info?.name}
                                        className="w-48 h-48 mx-auto mb-4 object-contain"
                                        style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6))', animation: 'tv2-idle 2s ease-in-out infinite' }}
                                    />
                                ) : (
                                    <div className="text-8xl mb-4" style={{ animation: 'tv2-idle 2s ease-in-out infinite' }}>{info?.emoji || '❓'}</div>
                                )}
                                <h3 className={`text-xl font-black mb-1 ${isEvolved ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400' : 'text-white'
                                    }`}>
                                    {info?.name || mId}
                                </h3>
                                <p className="text-slate-400 text-sm mb-2">{info?.zone || '未知區域'}</p>
                                {isEvolved && (
                                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">✨ 進化形態</span>
                                )}
                                {mCount > 1 && (
                                    <p className="text-cyan-400 text-xs mt-2 font-bold">擁有 ×{mCount}</p>
                                )}
                                <p className="text-slate-500 text-xs mt-1">{safeIdx + 1} / {lbEntries.length} 種</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Hatched monster reveal overlay */}
            {hatchedMonster && (
                <div className="absolute inset-0 flex items-center justify-center z-[2200] bg-black/80 animate-popup-in" onClick={() => setHatchedMonster(null)}>
                    <div className="text-center tv2-pop-in" onClick={e => e.stopPropagation()}>
                        <div className="text-6xl mb-3" style={{ animation: 'tv2-idle 1.2s ease-in-out infinite' }}>
                            {MONSTERS[hatchedMonster as MonsterId]?.emoji || '✨'}
                        </div>
                        {MONSTERS[hatchedMonster as MonsterId]?.image && (
                            <img
                                src={MONSTERS[hatchedMonster as MonsterId].image}
                                alt="monster"
                                className="w-24 h-24 mx-auto mb-3 object-contain"
                                style={{ animation: 'tv2-idle 1.2s ease-in-out infinite', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
                            />
                        )}
                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 mb-1">
                            孵化成功！
                        </h3>
                        <p className="text-white font-bold text-lg mb-1">
                            {MONSTERS[hatchedMonster as MonsterId]?.name || hatchedMonster}
                        </p>
                        <p className="text-slate-400 text-sm mb-4">
                            來自 {MONSTERS[hatchedMonster as MonsterId]?.zone || '未知區域'}
                        </p>
                        <button onClick={() => setHatchedMonster(null)} className="px-6 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg active:scale-95 transition-all">
                            太棒了！
                        </button>
                    </div>
                </div>
            )}

            {/* Evolved monster reveal overlay */}
            {evolvedReveal && (
                <div className="absolute inset-0 flex items-center justify-center z-[2200] bg-black/90 backdrop-blur-sm" onClick={() => setEvolvedReveal(null)}>
                    <div className="text-center tv2-pop-in" onClick={e => e.stopPropagation()}>
                        <div className="text-4xl mb-2" style={{ filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.6))' }}>👑</div>
                        <div className="text-5xl mb-3" style={{ animation: 'tv2-idle 1.2s ease-in-out infinite' }}>
                            {MONSTERS[evolvedReveal as MonsterId]?.emoji || '✨'}
                        </div>
                        {MONSTERS[evolvedReveal as MonsterId]?.image && (
                            <img
                                src={MONSTERS[evolvedReveal as MonsterId].image}
                                alt="evolved monster"
                                className="w-32 h-32 mx-auto mb-3 object-contain"
                                style={{ animation: 'tv2-idle 1.2s ease-in-out infinite', filter: 'drop-shadow(0 6px 20px rgba(251,191,36,0.4))' }}
                            />
                        )}
                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 mb-1">
                            進化成功！
                        </h3>
                        <p className="text-white font-bold text-lg mb-1">
                            {MONSTERS[evolvedReveal as MonsterId]?.name || evolvedReveal}
                        </p>
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-4">✨ 進化限定</span>
                        <div>
                            <button onClick={() => setEvolvedReveal(null)} className="px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg active:scale-95 transition-all">
                                太棒了！
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TowerCollectionPanel;
