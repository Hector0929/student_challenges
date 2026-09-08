import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeDifficulty, ChallengeProps } from './types';

const SETTINGS: Record<ChallengeDifficulty, { seconds: number; target: number; spawnMs: number; stayMs: number }> = {
    easy: { seconds: 10, target: 5, spawnMs: 700, stayMs: 1100 },
    normal: { seconds: 10, target: 7, spawnMs: 560, stayMs: 900 },
    hard: { seconds: 12, target: 10, spawnMs: 460, stayMs: 750 },
};

const HOLE_COUNT = 9;
const MONSTER_FACES = ['👾', '👹', '🦇', '🕷️', '👻', '🐲'];

/** 打怪獸：怪獸從洞裡冒出來，時間內點掉足夠隻數就過關 */
export const WhackMonsterChallenge: React.FC<ChallengeProps> = ({ difficulty, onResult }) => {
    const config = SETTINGS[difficulty];
    const [timeLeft, setTimeLeft] = useState(config.seconds);
    const [hits, setHits] = useState(0);
    const [activeHoles, setActiveHoles] = useState<Record<number, string>>({});
    const [struck, setStruck] = useState<number | null>(null);

    const hitsRef = useRef(0);
    const finishedRef = useRef(false);
    const onResultRef = useRef(onResult);
    const struckTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

    // 卸載時清掉打擊回饋的計時器，避免對已卸載元件 setState
    useEffect(() => () => {
        if (struckTimeoutRef.current !== null) window.clearTimeout(struckTimeoutRef.current);
    }, []);

    const finish = useCallback(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onResultRef.current(hitsRef.current >= config.target);
    }, [config.target]);

    // 倒數
    useEffect(() => {
        const id = window.setInterval(() => {
            setTimeLeft((previous) => {
                const next = Number((previous - 0.1).toFixed(1));
                if (next <= 0) {
                    window.clearInterval(id);
                    finish();
                    return 0;
                }
                return next;
            });
        }, 100);
        return () => window.clearInterval(id);
    }, [finish]);

    // 怪獸冒出／縮回
    useEffect(() => {
        const timeouts: number[] = [];
        const id = window.setInterval(() => {
            setActiveHoles((current) => {
                const free = Array.from({ length: HOLE_COUNT }, (_, index) => index).filter((index) => !(index in current));
                if (free.length === 0) return current;
                const hole = free[Math.floor(Math.random() * free.length)];
                const face = MONSTER_FACES[Math.floor(Math.random() * MONSTER_FACES.length)];

                const timeout = window.setTimeout(() => {
                    setActiveHoles((latest) => {
                        if (latest[hole] !== face) return latest;
                        const next = { ...latest };
                        delete next[hole];
                        return next;
                    });
                }, config.stayMs);
                timeouts.push(timeout);

                return { ...current, [hole]: face };
            });
        }, config.spawnMs);

        return () => {
            window.clearInterval(id);
            timeouts.forEach((timeout) => window.clearTimeout(timeout));
        };
    }, [config.spawnMs, config.stayMs]);

    const handleWhack = (hole: number) => {
        if (finishedRef.current || !(hole in activeHoles)) return;
        setActiveHoles((current) => {
            const next = { ...current };
            delete next[hole];
            return next;
        });
        hitsRef.current += 1;
        setHits(hitsRef.current);
        setStruck(hole);
        if (struckTimeoutRef.current !== null) window.clearTimeout(struckTimeoutRef.current);
        struckTimeoutRef.current = window.setTimeout(() => {
            struckTimeoutRef.current = null;
            setStruck((value) => (value === hole ? null : value));
        }, 200);

        if (hitsRef.current >= config.target) finish();
    };

    const progress = Math.min(100, (hits / config.target) * 100);

    return (
        <div className="w-full">
            {/* 進度與倒數 */}
            <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-amber-300 tabular-nums">
                    打中 {hits} / {config.target}
                </span>
                <span className={`font-black tabular-nums ${timeLeft <= 3 ? 'text-rose-400' : 'text-cyan-300'}`}>
                    ⏱ {timeLeft.toFixed(1)}s
                </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>

            {/* 3x3 洞口 */}
            <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: HOLE_COUNT }, (_, hole) => {
                    const face = activeHoles[hole];
                    return (
                        <button
                            key={hole}
                            onClick={() => handleWhack(hole)}
                            data-testid={`whack-hole-${hole}`}
                            className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-3xl transition-all active:scale-90 ${
                                struck === hole
                                    ? 'border-amber-400 bg-amber-500/30 scale-95'
                                    : face
                                    ? 'border-rose-500/60 bg-slate-800 hover:bg-slate-700'
                                    : 'border-slate-700/70 bg-slate-900/70'
                            }`}
                        >
                            {face && <span className="gen3-whack-pop">{face}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default WhackMonsterChallenge;
