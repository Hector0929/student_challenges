import React from 'react';
import { Star } from 'lucide-react';
import { computeTodayProgress } from '../lib/todayProgress';
import { formatStars } from '../lib/formatStars';

interface TodayProgressCardProps {
    done: number;
    total: number;
    starBalance: number;
    /** 家長開啟星幣兌換時才傳 */
    onExchange?: () => void;
}

/** 孩子首頁最上方的今日進度：一條進度、兩個刻度（解鎖遊戲／全部任務），主標題說出下一步 */
export const TodayProgressCard: React.FC<TodayProgressCardProps> = ({ done, total, starBalance, onExchange }) => {
    const p = computeTodayProgress(done, total);
    const pct = p.total > 0 ? (p.done / p.total) * 100 : 0;
    const goalPct = p.total > 0 ? (p.goal / p.total) * 100 : 100;
    const fill = p.unlocked ? 'var(--color-primary)' : 'var(--color-cta)';

    return (
        <section aria-label="今日進度" className="clay-card p-5 animate-bounce-in md:self-stretch" style={{ borderRadius: '20px', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-body text-xs font-bold" style={{ color: 'var(--color-text-light)' }}>今日進度</p>
                    <h2 className="font-heading text-xl sm:text-2xl font-bold leading-snug" style={{ color: p.unlocked ? 'var(--color-primary-dark)' : 'var(--color-text)' }}>
                        {p.headline}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="clay-star px-3 py-1.5" title="可用星幣">
                        <Star size={16} fill="currentColor" />
                        <span className="font-bold tabular-nums">{formatStars(starBalance)}</span>
                    </span>
                    {onExchange && starBalance > 0 && (
                        <button type="button" onClick={onExchange} className="clay-btn py-1.5 px-3 text-sm cursor-pointer" style={{ borderRadius: '12px' }}>
                            兌換
                        </button>
                    )}
                </div>
            </div>

            {p.total > 0 && (
                <>
                    <div
                        className="relative mt-4 h-4 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--border-soft)' }}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={p.total}
                        aria-valuenow={p.done}
                        aria-label={`已完成 ${p.done} 個，共 ${p.total} 個任務`}
                    >
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: fill }} />
                    </div>
                    {/* 刻度：解鎖遊戲的位置 + 右端全部任務 */}
                    <div className="relative h-5 mt-1 font-body text-xs" style={{ color: 'var(--color-text-light)' }}>
                        {p.goal < p.total && (
                            <span
                                className="absolute -translate-x-1/2 whitespace-nowrap font-bold"
                                style={{ left: `${goalPct}%`, color: p.unlocked ? 'var(--color-primary-dark)' : '#B45309' }}
                            >
                                ▲ {p.goal} 個解鎖遊戲
                            </span>
                        )}
                        <span className="absolute right-0 tabular-nums">
                            {p.done}/{p.total}
                        </span>
                    </div>
                </>
            )}
            <p className="font-body text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>{p.detail}</p>
        </section>
    );
};
