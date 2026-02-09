import React, { useState, useCallback } from 'react';
import { Coins, Dices } from 'lucide-react';

import { MONSTERS } from '../hooks/useTowerProgress';

import { LOTTERY_PRIZES, type Prize } from '../lib/gameConfig';

interface LotteryWheelProps {
    onComplete: (prize: Prize) => void;
}

// Weighted random selection
const selectPrize = (): Prize => {
    const totalWeight = LOTTERY_PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prize of LOTTERY_PRIZES) {
        random -= prize.weight;
        if (random <= 0) return prize;
    }
    return LOTTERY_PRIZES[0];
};

// Dark-themed segment colours for V2
const SEGMENT_COLORS = [
    ['#1e293b', '#334155'], // slate dark
    ['#1a1a2e', '#2d2b55'], // indigo-dark
    ['#1b2838', '#1e3a5f'], // deep blue
    ['#2d1b2e', '#4a2040'], // purple-dark
    ['#1b2e1b', '#2d4a2d'], // forest
    ['#2e2b1b', '#4a4020'], // bronze
    ['#2e1b1b', '#4a2020'], // crimson
    ['#1b2e2e', '#204a4a'], // teal-dark
];

// SVG arc path helper
const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const rad = (a: number) => ((a - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
};

export const LotteryWheel: React.FC<LotteryWheelProps> = ({ onComplete }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    const [showResult, setShowResult] = useState(false);

    const count = LOTTERY_PRIZES.length;
    const segAngle = 360 / count;
    const SIZE = 300;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const R = SIZE / 2 - 6; // radius minus border

    const handleSpin = useCallback(() => {
        if (isSpinning || hasSpun) return;
        setIsSpinning(true);

        const prize = selectPrize();
        setSelectedPrize(prize);

        const prizeIndex = LOTTERY_PRIZES.findIndex(p => p.id === prize.id);
        const targetAngle = 360 - (prizeIndex * segAngle) - (segAngle / 2);
        const spins = 5 + Math.floor(Math.random() * 3);
        const finalRotation = spins * 360 + targetAngle;
        setRotation(finalRotation);

        setTimeout(() => {
            setIsSpinning(false);
            setHasSpun(true);
            setShowResult(true);
        }, 4000);
    }, [isSpinning, hasSpun, segAngle]);

    const handleClaim = () => {
        if (selectedPrize) onComplete(selectedPrize);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 animate-popup-in" style={{ zIndex: 9999, background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%)' }}>
            <div className="relative text-center max-w-sm w-full">
                {/* Title */}
                <div className="mb-5">
                    <div className="text-4xl mb-1">✨</div>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400">
                        恭喜攻頂！
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">轉動輪盤領取獎勵</p>
                </div>

                {/* Wheel */}
                <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
                    {/* Pointer triangle — sits at top */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-30">
                        <svg width="28" height="32" viewBox="0 0 28 32">
                            <polygon points="14,32 0,0 28,0" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                            <polygon points="14,26 5,4 23,4" fill="#dc2626" />
                        </svg>
                    </div>

                    {/* Outer glow ring */}
                    <div className="absolute inset-0 rounded-full" style={{
                        boxShadow: '0 0 30px rgba(251,191,36,0.3), 0 0 60px rgba(251,191,36,0.1)',
                    }} />

                    {/* SVG Wheel */}
                    <svg
                        width={SIZE}
                        height={SIZE}
                        viewBox={`0 0 ${SIZE} ${SIZE}`}
                        className="rounded-full"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                        }}
                    >
                        {/* Outer border circle */}
                        <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.6" />

                        {/* Segments */}
                        {LOTTERY_PRIZES.map((prize, i) => {
                            const startA = i * segAngle;
                            const endA = (i + 1) * segAngle;
                            const midA = startA + segAngle / 2;
                            const rad = (a: number) => ((a - 90) * Math.PI) / 180;

                            // Icon position (closer to rim)
                            const iconR = R * 0.68;
                            const iconX = CX + iconR * Math.cos(rad(midA));
                            const iconY = CY + iconR * Math.sin(rad(midA));

                            // Value position (below icon, closer to center)
                            const valR = R * 0.44;
                            const valX = CX + valR * Math.cos(rad(midA));
                            const valY = CY + valR * Math.sin(rad(midA));

                            const [bgDark, bgLight] = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
                            const gradId = `seg-grad-${i}`;

                            return (
                                <g key={prize.id}>
                                    <defs>
                                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={bgLight} />
                                            <stop offset="100%" stopColor={bgDark} />
                                        </linearGradient>
                                    </defs>
                                    {/* Segment fill */}
                                    <path d={describeArc(CX, CY, R, startA, endA)} fill={`url(#${gradId})`} stroke="#ffffff10" strokeWidth="1" />
                                    {/* Neon edge accent */}
                                    <path d={describeArc(CX, CY, R, startA, endA)} fill="none" stroke={prize.color} strokeWidth="0.5" opacity="0.4" />

                                    {/* Icon (emoji) */}
                                    <text x={iconX} y={iconY} textAnchor="middle" dominantBaseline="central"
                                        fontSize="26" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                                        {prize.icon}
                                    </text>

                                    {/* Value label */}
                                    {prize.type !== 'monster' && (
                                        <text x={valX} y={valY} textAnchor="middle" dominantBaseline="central"
                                            fontSize="13" fontWeight="bold" fill="#e2e8f0"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                            {prize.type === 'coins' ? `${prize.value}幣` : `×${prize.value}`}
                                        </text>
                                    )}
                                    {prize.type === 'monster' && (
                                        <text x={valX} y={valY} textAnchor="middle" dominantBaseline="central"
                                            fontSize="10" fontWeight="bold" fill="#c4b5fd"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                                            {prize.name}
                                        </text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Segment divider lines */}
                        {LOTTERY_PRIZES.map((_, i) => {
                            const a = i * segAngle;
                            const rad = ((a - 90) * Math.PI) / 180;
                            const x2 = CX + R * Math.cos(rad);
                            const y2 = CY + R * Math.sin(rad);
                            return <line key={`div-${i}`} x1={CX} y1={CY} x2={x2} y2={y2} stroke="#fbbf2440" strokeWidth="1.5" />;
                        })}

                        {/* Center hub */}
                        <circle cx={CX} cy={CY} r={22} fill="url(#hub-grad)" stroke="#fbbf24" strokeWidth="2" />
                        <defs>
                            <radialGradient id="hub-grad"><stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" /></radialGradient>
                        </defs>
                        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize="22">🎁</text>

                        {/* Decorative dots on rim */}
                        {Array.from({ length: 24 }).map((_, i) => {
                            const a = i * 15;
                            const rad = ((a - 90) * Math.PI) / 180;
                            const dx = CX + (R + 1) * Math.cos(rad);
                            const dy = CY + (R + 1) * Math.sin(rad);
                            return <circle key={`dot-${i}`} cx={dx} cy={dy} r={2} fill={i % 2 === 0 ? '#fbbf24' : '#f97316'} opacity={0.6} />;
                        })}
                    </svg>
                </div>

                {/* Spin Button */}
                {!hasSpun && (
                    <button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        className="mt-6 mx-auto block px-8 py-3 rounded-2xl font-bold text-lg
                            bg-gradient-to-r from-amber-500 to-orange-500
                            hover:from-amber-400 hover:to-orange-400
                            disabled:opacity-50 disabled:cursor-not-allowed
                            text-white shadow-lg shadow-amber-500/30
                            transition-all active:scale-95"
                    >
                        {isSpinning ? '🎰 轉動中...' : '🎡 按下旋轉！'}
                    </button>
                )}

                {/* Result Overlay */}
                {showResult && selectedPrize && (
                    <div className="absolute inset-0 flex items-center justify-center animate-popup-in" style={{ background: 'radial-gradient(ellipse, rgba(15,23,42,0.97) 60%, rgba(10,10,15,0.99))', borderRadius: '1.5rem' }}>
                        <div className="text-center p-6 w-full">
                            <div className="text-6xl mb-3" style={{ animation: 'tv2-idle 1.2s ease-in-out infinite' }}>{selectedPrize.icon}</div>
                            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400 mb-1">
                                獲得獎品！
                            </h3>
                            <p className="text-white text-lg font-bold mb-4">{selectedPrize.name}</p>

                            {selectedPrize.type === 'coins' && (
                                <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
                                    <Coins size={24} />
                                    <span className="text-2xl font-bold">+{selectedPrize.value}</span>
                                </div>
                            )}

                            {selectedPrize.type === 'dice' && (
                                <div className="flex items-center justify-center gap-2 text-cyan-400 mb-4">
                                    <Dices size={24} />
                                    <span className="text-2xl font-bold">+{selectedPrize.value}</span>
                                </div>
                            )}

                            {selectedPrize.type === 'monster' && selectedPrize.monsterId && (
                                <div className="mb-4">
                                    <img
                                        src={MONSTERS[selectedPrize.monsterId]?.image || '/images/monsters/slime.png'}
                                        alt={selectedPrize.name}
                                        className="w-20 h-20 mx-auto"
                                        style={{ animation: 'tv2-idle 1.2s ease-in-out infinite' }}
                                    />
                                    <p className="text-purple-400 text-sm mt-1">新怪獸加入收藏！</p>
                                </div>
                            )}

                            <button onClick={handleClaim} className="w-full py-3 rounded-2xl font-bold text-white
                                bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400
                                shadow-lg shadow-cyan-500/20 transition-all active:scale-95">
                                🔄 領取並再次挑戰！
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
