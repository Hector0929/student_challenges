import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeDifficulty, ChallengeProps } from './types';

const SETTINGS: Record<ChallengeDifficulty, { zoneWidth: number; speed: number; attempts: number; needed: number }> = {
    // zoneWidth 是綠區佔整條軌道的比例；speed 是每毫秒移動的比例
    easy: { zoneWidth: 0.3, speed: 0.0011, attempts: 3, needed: 2 },
    normal: { zoneWidth: 0.2, speed: 0.0015, attempts: 3, needed: 2 },
    hard: { zoneWidth: 0.13, speed: 0.0019, attempts: 4, needed: 3 },
};

/** 時機點擊：指針來回掃過刻度，在綠區按下就算命中 */
export const TimingBarChallenge: React.FC<ChallengeProps> = ({ difficulty, onResult }) => {
    const config = SETTINGS[difficulty];

    const [markerPosition, setMarkerPosition] = useState(0);
    const [zoneStart, setZoneStart] = useState(() => Math.random() * (1 - config.zoneWidth));
    const [attemptsLeft, setAttemptsLeft] = useState(config.attempts);
    const [hits, setHits] = useState(0);
    const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);

    const positionRef = useRef(0);
    const directionRef = useRef(1);
    // 命中數與剩餘機會都用 ref 記，孩子連續猛按時才不會讀到過期的 state
    const hitsRef = useRef(0);
    const attemptsRef = useRef(config.attempts);
    const zoneStartRef = useRef(zoneStart);
    const finishedRef = useRef(false);
    const onResultRef = useRef(onResult);
    const flashTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        zoneStartRef.current = zoneStart;
    }, [zoneStart]);

    useEffect(() => {
        onResultRef.current = onResult;
    }, [onResult]);

    useEffect(() => () => {
        if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
    }, []);

    const finish = useCallback((passed: boolean) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onResultRef.current(passed);
    }, []);

    // 指針來回掃動
    useEffect(() => {
        let frame = 0;
        let last = performance.now();

        const tick = (now: number) => {
            const delta = now - last;
            last = now;

            if (!finishedRef.current) {
                let next = positionRef.current + directionRef.current * config.speed * delta;
                if (next >= 1) {
                    next = 1;
                    directionRef.current = -1;
                } else if (next <= 0) {
                    next = 0;
                    directionRef.current = 1;
                }
                positionRef.current = next;
                setMarkerPosition(next);
            }
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [config.speed]);

    const handleTap = () => {
        if (finishedRef.current || attemptsRef.current <= 0) return;

        const position = positionRef.current;
        const start = zoneStartRef.current;
        const isHit = position >= start && position <= start + config.zoneWidth;

        if (isHit) hitsRef.current += 1;
        attemptsRef.current -= 1;
        const nextHits = hitsRef.current;
        const nextAttempts = attemptsRef.current;

        setHits(nextHits);
        setAttemptsLeft(nextAttempts);
        setFlash(isHit ? 'hit' : 'miss');
        if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = window.setTimeout(() => {
            flashTimeoutRef.current = null;
            setFlash(null);
        }, 260);

        if (nextHits >= config.needed) {
            finish(true);
            return;
        }
        if (nextAttempts <= 0) {
            finish(false);
            return;
        }
        // 換一個新的綠區位置，不讓孩子用同一個節奏硬背
        setZoneStart(Math.random() * (1 - config.zoneWidth));
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-amber-300 tabular-nums">
                    命中 {hits} / {config.needed}
                </span>
                <span className="font-black tabular-nums text-cyan-300">剩 {attemptsLeft} 次機會</span>
            </div>

            {/* 軌道 */}
            <div className="relative h-14 rounded-2xl bg-slate-900 border-2 border-slate-700 overflow-hidden mb-4">
                {/* 綠區 */}
                <div
                    className="absolute top-0 bottom-0 bg-gradient-to-b from-emerald-400/45 to-emerald-600/35 border-x-2 border-emerald-300/70"
                    style={{ left: `${zoneStart * 100}%`, width: `${config.zoneWidth * 100}%` }}
                />
                {/* 指針 */}
                <div
                    className="absolute top-0 bottom-0 w-1.5 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                    style={{ left: `calc(${markerPosition * 100}% - 3px)` }}
                />
                {/* 命中／落空回饋 */}
                {flash && (
                    <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${flash === 'hit' ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {flash === 'hit' ? '命中！' : '差一點！'}
                    </div>
                )}
            </div>

            <button
                onClick={handleTap}
                data-testid="timing-tap-btn"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-lg shadow-lg active:scale-95 transition-transform"
            >
                按下去！
            </button>
        </div>
    );
};

export default TimingBarChallenge;
