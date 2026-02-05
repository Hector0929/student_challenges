import React, { useState, useCallback } from 'react';
import { Sparkles, Gift, Coins, Dices } from 'lucide-react';
import { RPGButton } from './RPGButton';
import { MONSTERS, type MonsterId } from '../hooks/useTowerProgress';

// Prize configuration
export interface Prize {
    id: string;
    name: string;
    type: 'coins' | 'dice' | 'monster';
    value?: number;
    monsterId?: MonsterId;
    weight: number;
    color: string;
    icon: string;
}

export const LOTTERY_PRIZES: Prize[] = [
    { id: 'coins_10', name: '10 星幣', type: 'coins', value: 10, weight: 30, color: '#FCD34D', icon: '⭐' },
    { id: 'coins_20', name: '20 星幣', type: 'coins', value: 20, weight: 25, color: '#FB923C', icon: '✨' },
    { id: 'coins_50', name: '50 星幣', type: 'coins', value: 50, weight: 15, color: '#F87171', icon: '💫' },
    { id: 'coins_100', name: '100 星幣', type: 'coins', value: 100, weight: 5, color: '#A78BFA', icon: '🌟' },
    { id: 'dice_2', name: '2 顆骰子', type: 'dice', value: 2, weight: 15, color: '#4ADE80', icon: '🎲' },
    { id: 'dice_5', name: '5 顆骰子', type: 'dice', value: 5, weight: 5, color: '#60A5FA', icon: '🎯' },
    { id: 'monster_star', name: '星光精靈', type: 'monster', monsterId: 'star_fairy' as MonsterId, weight: 3, color: '#F472B6', icon: '🌠' },
    { id: 'monster_lucky', name: '幸運草寶寶', type: 'monster', monsterId: 'lucky_clover' as MonsterId, weight: 2, color: '#34D399', icon: '🍀' },
];

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

export const LotteryWheel: React.FC<LotteryWheelProps> = ({ onComplete }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    const [showResult, setShowResult] = useState(false);

    const segmentAngle = 360 / LOTTERY_PRIZES.length;

    const handleSpin = useCallback(() => {
        if (isSpinning || hasSpun) return;

        setIsSpinning(true);

        // Select prize first
        const prize = selectPrize();
        setSelectedPrize(prize);

        // Calculate target rotation
        const prizeIndex = LOTTERY_PRIZES.findIndex(p => p.id === prize.id);
        const targetAngle = 360 - (prizeIndex * segmentAngle) - (segmentAngle / 2);
        const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
        const finalRotation = spins * 360 + targetAngle;

        setRotation(finalRotation);

        // Show result after spin animation
        setTimeout(() => {
            setIsSpinning(false);
            setHasSpun(true);
            setShowResult(true);
        }, 4000);
    }, [isSpinning, hasSpun, segmentAngle]);

    const handleClaim = () => {
        if (selectedPrize) {
            onComplete(selectedPrize);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/95 animate-popup-in" style={{ zIndex: 9999 }}>
            <div className="relative text-center max-w-sm w-full">
                {/* Title */}
                <div className="mb-6">
                    <Sparkles className="mx-auto text-yellow-400 mb-2 animate-star-twinkle" size={40} />
                    <h2 className="font-pixel text-2xl text-yellow-400 drop-shadow-lg">
                        🎉 恭喜攻頂！
                    </h2>
                    <p className="text-white/80 text-sm mt-1">轉動輪盤領取獎勵！</p>
                </div>

                {/* Wheel Container */}
                <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                        <div
                            className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-red-500"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                        />
                    </div>

                    {/* Wheel */}
                    <div
                        className="w-full h-full rounded-full border-8 border-amber-500 shadow-2xl overflow-hidden"
                        style={{
                            background: 'conic-gradient(from 0deg, ' +
                                LOTTERY_PRIZES.map((p, i) =>
                                    `${p.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
                                ).join(', ') + ')',
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                        }}
                    >
                        {/* Prize Labels */}
                        {LOTTERY_PRIZES.map((prize, index) => {
                            const angle = index * segmentAngle + segmentAngle / 2;
                            // Show icon + value for coins and dice
                            const label = prize.type === 'monster'
                                ? prize.icon
                                : `${prize.icon}${prize.value}`;
                            return (
                                <div
                                    key={prize.id}
                                    className="absolute font-bold drop-shadow-lg text-center"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: `rotate(${angle}deg) translateY(-85px) rotate(-${angle}deg)`,
                                        transformOrigin: 'center center',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                    }}
                                >
                                    <span className="text-xl">{label}</span>
                                </div>
                            );
                        })}

                        {/* Center Circle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-amber-300 shadow-lg flex items-center justify-center">
                            <Gift className="text-white" size={24} />
                        </div>
                    </div>
                </div>

                {/* Spin Button */}
                {!hasSpun && (
                    <RPGButton
                        onClick={handleSpin}
                        disabled={isSpinning}
                        variant="primary"
                        className="mt-6 w-48 mx-auto"
                    >
                        {isSpinning ? '🎰 轉動中...' : '🎡 按下旋轉！'}
                    </RPGButton>
                )}

                {/* Result Modal */}
                {showResult && selectedPrize && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 rounded-2xl animate-popup-in">
                        <div className="text-center p-6">
                            <div className="text-6xl mb-4 animate-bounce">{selectedPrize.icon}</div>
                            <h3 className="font-pixel text-xl text-yellow-400 mb-2">獲得獎品！</h3>
                            <p className="text-white text-lg font-bold mb-4">{selectedPrize.name}</p>

                            {selectedPrize.type === 'coins' && (
                                <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
                                    <Coins size={24} />
                                    <span className="text-2xl font-bold">+{selectedPrize.value}</span>
                                </div>
                            )}

                            {selectedPrize.type === 'dice' && (
                                <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                                    <Dices size={24} />
                                    <span className="text-2xl font-bold">+{selectedPrize.value}</span>
                                </div>
                            )}

                            {selectedPrize.type === 'monster' && selectedPrize.monsterId && (
                                <div className="mb-4">
                                    <img
                                        src={MONSTERS[selectedPrize.monsterId]?.image || '/images/monsters/slime.png'}
                                        alt={selectedPrize.name}
                                        className="w-20 h-20 mx-auto animate-player-hop"
                                    />
                                    <p className="text-purple-400 text-sm mt-1">新怪獸加入收藏！</p>
                                </div>
                            )}

                            <RPGButton onClick={handleClaim} variant="primary" className="w-full">
                                🔄 領取並再次挑戰！
                            </RPGButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
