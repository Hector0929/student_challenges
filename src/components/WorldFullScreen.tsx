import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Home, Star } from 'lucide-react';
import { World3D } from './World3D';
import { useGameWindowController } from '../hooks/useGameWindowController';
import type { AdventureEventType, AdventureRewards, AdventureStatus } from '../lib/world/adventure';

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
}) => {
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

            {/* 3D world fills the rest */}
            <div className="flex-1">
                <World3D
                    fullScreen
                    islandLevel={islandLevel}
                    heroLevel={heroLevel}
                    timeOfDay={timeOfDay}
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
