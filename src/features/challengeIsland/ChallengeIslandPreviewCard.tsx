import React from 'react';
import { ArrowRight, Target } from 'lucide-react';

interface ChallengeIslandPreviewCardProps {
    completedQuests: number;
    totalQuests: number;
    onClick: () => void;
}

const ISLES = ['🎯', '🔤', '🧮', '🍰', '📐', '🔭', '♟', '🕹️'];

export const ChallengeIslandPreviewCard: React.FC<ChallengeIslandPreviewCardProps> = ({ completedQuests, totalQuests, onClick }) => {
    const pct = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;
    const allDone = totalQuests > 0 && completedQuests >= totalQuests;

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full border-4 border-deep-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all overflow-hidden group bg-gradient-to-br from-cyan-100 via-sky-50 to-amber-50"
        >
            {/* 預覽：一圈小島 */}
            <div className="relative h-32 sm:h-40 flex items-center justify-center overflow-hidden">
                <div className="grid grid-cols-4 gap-2 sm:gap-3 animate-float">
                    {ISLES.map((icon, i) => (
                        <div
                            key={icon}
                            className={`w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl bg-white/80 border-2 border-deep-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${i === 0 ? 'bg-amber-200' : ''}`}
                            style={{ clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}
                        >
                            {icon}
                        </div>
                    ))}
                </div>
                <div className="absolute top-3 left-4 font-pixel text-[10px] text-sky-800/70 tracking-widest">CHALLENGE ISLES</div>
                {allDone && <div className="absolute top-2 right-3 text-2xl">🏁</div>}
            </div>

            {/* 資訊列 */}
            <div className="px-4 py-3 bg-white/70 backdrop-blur-sm border-t-2 border-deep-black flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <Target size={14} className="text-orange-600" />
                        <span className="font-pixel text-xs text-slate-700">
                            今日任務 {completedQuests}/{totalQuests}
                        </span>
                    </div>
                    <div className="hidden sm:block w-24 h-2 bg-slate-200 border border-deep-black overflow-hidden">
                        <div className="h-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
                <div className="flex items-center gap-1.5 font-pixel text-xs text-orange-700 group-hover:text-orange-900 transition-colors whitespace-nowrap">
                    <span>學習挑戰群島</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </button>
    );
};
