import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Home, Star, Palette } from 'lucide-react';
import { World3D } from './World3D';
import { useGameWindowController } from '../hooks/useGameWindowController';
import type { AdventureEventType, AdventureRewards, AdventureStatus } from '../lib/world/adventure';
import type { WorldTheme } from '../hooks/useWorldState';

interface WorldFullScreenProps {
    isOpen: boolean;
    onClose: () => void;
    onGoHome?: () => void;
    starBalance?: number;
    islandLevel?: number;
    heroLevel?: number;
    timeOfDay?: 'day' | 'dusk';
    selectedPlotKey?: string;
    onPlotSelect?: (plotKey: string) => void;
    adventureStatus?: AdventureStatus;
    lastAdventureEventType?: AdventureEventType | null;
    lastAdventureRewards?: AdventureRewards | null;
    buildings?: {
        forest?: number;
        mine?: number;
        academy?: number;
        market?: number;
    };
    worldTheme?: WorldTheme;
    onThemeChange?: (theme: WorldTheme) => void;
}

export const WorldFullScreen: React.FC<WorldFullScreenProps> = ({
    isOpen,
    onClose,
    onGoHome,
    starBalance = 0,
    islandLevel,
    heroLevel,
    timeOfDay,
    selectedPlotKey,
    onPlotSelect,
    adventureStatus,
    lastAdventureEventType,
    lastAdventureRewards,
    buildings,
    worldTheme = 'normal',
    onThemeChange,
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const { handleEndGame, handleGoHome } = useGameWindowController({
        isOpen,
        isImmersivePhase: isOpen,
        onClose,
        onGoHome,
    });

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.gameModalOpen;
            return;
        }
        document.body.style.overflow = 'hidden';
        document.body.dataset.gameModalOpen = 'true';
        return () => {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.gameModalOpen;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const atmosOptions: Array<{ key: WorldTheme; label: string; emoji: string; colors: string }> = [
        { key: 'normal', label: '晴天', emoji: '☀️', colors: 'from-sky-400 to-blue-500' },
        { key: 'night',  label: '星夜', emoji: '🌙', colors: 'from-indigo-600 to-purple-700' },
        { key: 'sakura', label: '櫻花', emoji: '🌸', colors: 'from-pink-300 to-rose-400' },
        { key: 'monster_forest', label: '怪獸森林', emoji: '🌲', colors: 'from-green-400 to-emerald-600' },
        { key: 'monster_sky', label: '怪獸飛行', emoji: '☁️', colors: 'from-purple-300 to-pink-400' },
    ];

    const modalTree = (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEndGame}
                        className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                        aria-label="返回"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="font-pixel text-white text-xs sm:text-sm drop-shadow-lg">
                        冒險家家園
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className={`p-2 rounded-xl backdrop-blur-sm transition-colors ${showPicker ? 'bg-white/40 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        aria-label="切換背景"
                    >
                        <Palette size={20} />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/90 backdrop-blur-sm border border-yellow-500/50">
                        <Star size={14} className="text-yellow-700" fill="currentColor" />
                        <span className="font-pixel text-sm text-amber-800">{starBalance}</span>
                    </div>
                    {onGoHome && (
                        <button
                            onClick={handleGoHome}
                            className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                            aria-label="回首頁"
                        >
                            <Home size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Background picker panel */}
            {showPicker && (
                <div className="absolute top-14 right-3 sm:right-4 z-20 pointer-events-auto">
                    <div className="bg-black/75 backdrop-blur-md rounded-2xl border border-white/20 p-3 shadow-2xl min-w-[130px]">
                        <div className="font-pixel text-white/60 text-[10px] mb-2 uppercase tracking-wider">背景</div>
                        <div className="flex flex-col gap-1.5">
                            {atmosOptions.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => { onThemeChange?.(t.key); setShowPicker(false); }}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-left ${
                                        worldTheme === t.key
                                            ? 'bg-white/25 ring-2 ring-white/50'
                                            : 'bg-white/10 hover:bg-white/20'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${t.colors} flex items-center justify-center text-xs`}>
                                        {t.emoji}
                                    </div>
                                    <span className="font-pixel text-white text-xs">{t.label}</span>
                                    {worldTheme === t.key && <span className="ml-auto text-[10px] text-yellow-300">✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 3D world fills the rest */}
            <div className="flex-1">
                <World3D
                    fullScreen
                    islandLevel={islandLevel}
                    heroLevel={heroLevel}
                    timeOfDay={timeOfDay}
                    worldTheme={worldTheme}
                    selectedPlotKey={selectedPlotKey}
                    onPlotSelect={onPlotSelect}
                    adventureStatus={adventureStatus}
                    lastAdventureEventType={lastAdventureEventType}
                    lastAdventureRewards={lastAdventureRewards}
                    buildings={buildings}
                />
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalTree, document.body) : modalTree;
};
