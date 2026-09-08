import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChallengeDifficulty, ChallengeProps } from './types';

const SETTINGS: Record<ChallengeDifficulty, { pairs: number; seconds: number; cols: string }> = {
    easy: { pairs: 3, seconds: 20, cols: 'grid-cols-3' },
    normal: { pairs: 4, seconds: 22, cols: 'grid-cols-4' },
    hard: { pairs: 6, seconds: 30, cols: 'grid-cols-4' },
};

const FACES = ['🟢', '🔵', '🟠', '🟣', '🍄', '🧊', '🐧', '🌵'];

interface Card {
    id: number;
    face: string;
}

function buildDeck(pairs: number): Card[] {
    const chosen = FACES.slice(0, pairs);
    const deck = [...chosen, ...chosen].map((face, id) => ({ id, face }));
    for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

/** 記憶配對：時間內把所有怪獸卡配成對 */
export const MemoryPairChallenge: React.FC<ChallengeProps> = ({ difficulty, onResult }) => {
    const config = SETTINGS[difficulty];
    const deck = useMemo(() => buildDeck(config.pairs), [config.pairs]);

    const [timeLeft, setTimeLeft] = useState(config.seconds);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [matched, setMatched] = useState<number[]>([]);
    const [locked, setLocked] = useState(false);

    const matchedRef = useRef(0);
    // 翻開中的卡片也用 ref 記，避免連點兩張時第二次讀到過期的 state 而漏掉一張
    const flippedRef = useRef<number[]>([]);
    const finishedRef = useRef(false);
    const onResultRef = useRef(onResult);

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

    const finish = useCallback((passed: boolean) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onResultRef.current(passed);
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            setTimeLeft((previous) => {
                const next = Number((previous - 0.1).toFixed(1));
                if (next <= 0) {
                    window.clearInterval(id);
                    finish(matchedRef.current >= config.pairs);
                    return 0;
                }
                return next;
            });
        }, 100);
        return () => window.clearInterval(id);
    }, [config.pairs, finish]);

    const handleFlip = (index: number) => {
        if (finishedRef.current || locked) return;
        if (flippedRef.current.includes(index) || matched.includes(index)) return;

        const next = [...flippedRef.current, index];
        flippedRef.current = next;
        setFlipped(next);
        if (next.length < 2) return;

        const [first, second] = next;
        setLocked(true);

        if (deck[first].face === deck[second].face) {
            window.setTimeout(() => {
                setMatched((current) => {
                    const updated = [...current, first, second];
                    matchedRef.current = updated.length / 2;
                    if (matchedRef.current >= config.pairs) finish(true);
                    return updated;
                });
                flippedRef.current = [];
                setFlipped([]);
                setLocked(false);
            }, 320);
        } else {
            window.setTimeout(() => {
                flippedRef.current = [];
                setFlipped([]);
                setLocked(false);
            }, 700);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-amber-300 tabular-nums">
                    配對 {matched.length / 2} / {config.pairs}
                </span>
                <span className={`font-black tabular-nums ${timeLeft <= 5 ? 'text-rose-400' : 'text-cyan-300'}`}>
                    ⏱ {timeLeft.toFixed(1)}s
                </span>
            </div>

            <div className={`grid ${config.cols} gap-2.5`}>
                {deck.map((card, index) => {
                    const isOpen = flipped.includes(index) || matched.includes(index);
                    const isMatched = matched.includes(index);
                    return (
                        <button
                            key={card.id}
                            onClick={() => handleFlip(index)}
                            data-testid={`memory-card-${index}`}
                            className={`aspect-square rounded-2xl border-2 flex items-center justify-center text-3xl transition-all active:scale-95 ${
                                isMatched
                                    ? 'border-emerald-400/70 bg-emerald-500/20'
                                    : isOpen
                                    ? 'border-cyan-400/70 bg-slate-800'
                                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                            }`}
                        >
                            {isOpen ? <span className="gen3-whack-pop">{card.face}</span> : <span className="text-slate-600 text-xl">❓</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MemoryPairChallenge;
