import React from 'react';
import { ArrowRight, MapPin } from 'lucide-react';

interface WorldPreviewCardProps {
    islandLevel?: number;
    heroLevel?: number;
    timeOfDay?: 'day' | 'dusk';
    unlockedPlots?: number;
    totalPlots?: number;
    onClick: () => void;
}

export const WorldPreviewCard: React.FC<WorldPreviewCardProps> = ({
    islandLevel = 1,
    heroLevel = 1,
    timeOfDay = 'day',
    unlockedPlots = 0,
    totalPlots = 6,
    onClick,
}) => {
    const isDusk = timeOfDay === 'dusk';
    const bgGradient = isDusk
        ? 'from-amber-100 via-orange-50 to-purple-100'
        : 'from-sky-100 via-emerald-50 to-blue-100';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full bg-gradient-to-br ${bgGradient} border-4 border-deep-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all overflow-hidden group`}
        >
            {/* Island illustration (CSS-based, no 3D rendering) */}
            <div className="relative h-36 sm:h-44 flex items-center justify-center overflow-hidden">
                {/* Animated floating island icon */}
                <div className="animate-float flex flex-col items-center">
                    <div className="text-6xl sm:text-7xl mb-1 drop-shadow-lg">🏝️</div>
                    <div className="flex gap-1 text-lg sm:text-xl">
                        <span>🌲</span>
                        <span>⛰️</span>
                        <span>🏪</span>
                        {islandLevel >= 5 && <span>🏛️</span>}
                        {islandLevel >= 6 && <span>📦</span>}
                        {islandLevel >= 7 && <span>🗺️</span>}
                    </div>
                </div>

                {/* Decorative clouds */}
                <div className="absolute top-3 left-6 text-2xl opacity-40 animate-pulse">☁️</div>
                <div className="absolute top-8 right-8 text-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}>☁️</div>
                <div className="absolute bottom-4 left-1/4 text-lg opacity-20 animate-pulse" style={{ animationDelay: '2s' }}>☁️</div>

                {/* Time indicator */}
                <div className="absolute top-3 right-3 text-2xl">
                    {isDusk ? '🌅' : '☀️'}
                </div>
            </div>

            {/* Info bar */}
            <div className="px-4 py-3 bg-white/70 backdrop-blur-sm border-t-2 border-deep-black flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-emerald-600" />
                        <span className="font-pixel text-xs text-slate-700">
                            島 Lv.{islandLevel}
                        </span>
                    </div>
                    <span className="font-pixel text-xs text-slate-500">
                        角色 Lv.{heroLevel}
                    </span>
                    <span className="font-pixel text-xs text-slate-500">
                        地塊 {unlockedPlots}/{totalPlots}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 font-pixel text-xs text-emerald-700 group-hover:text-emerald-900 transition-colors">
                    <span>進入家園</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </button>
    );
};
