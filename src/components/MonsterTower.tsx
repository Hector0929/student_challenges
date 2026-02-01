import React, { useState } from 'react';
import { Dices, ChevronUp, ChevronDown, Trophy, Sparkles, X } from 'lucide-react';
import { useTowerProgress, useTowerEvents, useRollDice, useResetTower, MONSTERS, type MonsterId } from '../hooks/useTowerProgress';
import { RPGButton } from './RPGButton';
import type { TowerEvent } from '../types/database';

interface MonsterTowerProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Zone colors based on floor range
const getZoneStyle = (floor: number) => {
    if (floor <= 25) return { bg: 'from-green-400 to-green-600', name: '🌲 森林入口' };
    if (floor <= 50) return { bg: 'from-blue-400 to-cyan-600', name: '💎 水晶洞穴' };
    if (floor <= 75) return { bg: 'from-orange-400 to-red-500', name: '🔥 熔岩地帶' };
    return { bg: 'from-purple-400 to-indigo-600', name: '☁️ 雲端天空' };
};

// Get zone monster for decoration
const getZoneMonster = (floor: number): MonsterId => {
    if (floor <= 25) return 'slime';
    if (floor <= 50) return 'water_spirit';
    if (floor <= 75) return 'flame_bird';
    return 'thunder_cloud';
};

export const MonsterTower: React.FC<MonsterTowerProps> = ({ userId, isOpen, onClose }) => {
    const { data: progress, isLoading } = useTowerProgress(userId);
    const { data: events = [] } = useTowerEvents();
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();

    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const monstersCollected = progress?.monsters_collected || [];

    // Create event map for quick lookup
    const eventMap = new Map(events.map(e => [e.floor_number, e]));

    // Handle dice roll
    const handleRoll = async () => {
        if (diceCount <= 0 || isRolling) return;

        setIsRolling(true);
        setRollResult(null);

        // Animate dice rolling
        const animationDuration = 1500;
        const startTime = Date.now();

        const animateRoll = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < animationDuration) {
                setRollResult(Math.floor(Math.random() * 6) + 1);
                requestAnimationFrame(animateRoll);
            }
        };
        animateRoll();

        // Actually roll and update
        setTimeout(async () => {
            try {
                const result = await rollDiceMutation.mutateAsync({
                    userId,
                    currentFloor
                });

                setRollResult(result.roll);
                setAnimatingFloor(result.progress.current_floor);

                // Show event if any
                if (result.event) {
                    setTimeout(() => {
                        setShowEvent(result.event);
                    }, 800);
                }

                // Check for victory
                if (result.reachedTop) {
                    setTimeout(() => {
                        setShowVictory(true);
                    }, 1500);
                }
            } catch (error) {
                console.error('Roll failed:', error);
            } finally {
                setIsRolling(false);
                setTimeout(() => setAnimatingFloor(null), 1000);
            }
        }, animationDuration);
    };

    // Handle tower reset after victory
    const handleReset = async () => {
        await resetTowerMutation.mutateAsync({ userId });
        setShowVictory(false);
    };

    // Generate visible floor range (current ± 5)
    const visibleFloors: number[] = [];
    const rangeStart = Math.max(1, currentFloor - 4);
    const rangeEnd = Math.min(100, currentFloor + 5);
    for (let i = rangeEnd; i >= rangeStart; i--) {
        visibleFloors.push(i);
    }

    if (!isOpen) return null;

    const zone = getZoneStyle(currentFloor);
    const zoneMonster = MONSTERS[getZoneMonster(currentFloor)];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className={`bg-gradient-to-r ${zone.bg} p-4 flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <img src={zoneMonster.image} alt={zoneMonster.name} className="w-10 h-10 object-contain" />
                        <div>
                            <h2 className="font-pixel text-lg text-white drop-shadow-md">🏰 怪獸塔</h2>
                            <p className="text-xs text-white/80">{zone.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-black/30 px-3 py-1 rounded-full">
                            <span className="text-yellow-300 font-bold">{currentFloor}</span>
                            <span className="text-white/70">/100</span>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-black/30 rounded-full transition-colors">
                            <X className="text-white" size={20} />
                        </button>
                    </div>
                </div>

                {/* Monster Collection */}
                <div className="bg-slate-800/80 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                    <span className="text-xs text-slate-400">收集:</span>
                    <div className="flex gap-1">
                        {Object.values(MONSTERS).slice(0, 4).map(monster => (
                            <div
                                key={monster.id}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${monstersCollected.includes(monster.id)
                                    ? 'border-yellow-400 bg-yellow-400/20'
                                    : 'border-slate-600 bg-slate-700/50 opacity-40'
                                    }`}
                            >
                                <img
                                    src={monster.image}
                                    alt={monster.name}
                                    className={`w-6 h-6 object-contain ${!monstersCollected.includes(monster.id) ? 'grayscale' : ''
                                        }`}
                                />
                            </div>
                        ))}
                    </div>
                    <span className="text-xs text-slate-500 ml-auto">
                        {monstersCollected.length}/4
                    </span>
                </div>

                {/* Tower Grid */}
                <div className="flex-1 overflow-hidden relative p-4">
                    {/* Top indicator */}
                    {currentFloor < 95 && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                            <ChevronUp className="text-white/50 animate-bounce" size={24} />
                        </div>
                    )}

                    {/* Floor grid - S-shaped path */}
                    <div className="flex flex-col gap-2 pt-6 pb-6">
                        {visibleFloors.map((floor) => {
                            const isCurrentFloor = floor === currentFloor;
                            const isAnimating = floor === animatingFloor;
                            const event = eventMap.get(floor);
                            const floorZone = getZoneStyle(floor);
                            const isReverse = Math.floor((floor - 1) / 8) % 2 === 1;

                            // Calculate column position in S-pattern
                            const colInRow = (floor - 1) % 8;
                            const displayCol = isReverse ? 7 - colInRow : colInRow;

                            return (
                                <div
                                    key={floor}
                                    className={`relative transition-all duration-300 ${isAnimating ? 'scale-110' : ''
                                        }`}
                                    style={{ marginLeft: `${displayCol * 12}%` }}
                                >
                                    <div
                                        className={`
                                            w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm
                                            border-2 transition-all duration-300
                                            ${isCurrentFloor
                                                ? `bg-gradient-to-br ${floorZone.bg} border-yellow-400 shadow-lg shadow-yellow-500/30 scale-110`
                                                : event
                                                    ? 'bg-slate-700 border-purple-500'
                                                    : 'bg-slate-700/50 border-slate-600'
                                            }
                                        `}
                                    >
                                        {isCurrentFloor ? (
                                            <span className="text-2xl animate-bounce">👤</span>
                                        ) : event ? (
                                            <span className="text-lg">
                                                {event.event_type === 'ladder' && '🪜'}
                                                {event.event_type === 'trap' && '🕳️'}
                                                {event.event_type === 'egg' && '🥚'}
                                                {event.event_type === 'treasure' && '💎'}
                                            </span>
                                        ) : (
                                            <span className="text-white/70">{floor}</span>
                                        )}
                                    </div>

                                    {/* Floor 100 special marker */}
                                    {floor === 100 && (
                                        <div className="absolute -top-3 -right-3">
                                            <Trophy className="text-yellow-400 drop-shadow-lg" size={20} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom indicator */}
                    {currentFloor > 5 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                            <ChevronDown className="text-white/50" size={24} />
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="bg-slate-800 p-4 border-t-2 border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Dices className="text-yellow-400" size={24} />
                            <span className="font-pixel text-lg text-white">× {diceCount}</span>
                        </div>
                        {rollResult && (
                            <div className="flex items-center gap-2 animate-pulse">
                                <span className="text-slate-400">擲出:</span>
                                <span className="text-3xl font-bold text-yellow-400">{rollResult}</span>
                            </div>
                        )}
                    </div>

                    <RPGButton
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling}
                        className="w-full"
                        variant={diceCount > 0 ? 'primary' : 'secondary'}
                    >
                        {isRolling ? (
                            <span className="flex items-center gap-2">
                                <Dices className="animate-spin" size={20} />
                                擲骰中...
                            </span>
                        ) : diceCount > 0 ? (
                            '🎲 擲骰子！'
                        ) : (
                            '沒有骰子了 (完成任務獲得)'
                        )}
                    </RPGButton>

                    <p className="text-xs text-slate-500 text-center mt-2">
                        完成每日任務可以獲得擲骰機會
                    </p>
                </div>

                {/* Event Popup */}
                {showEvent && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-center max-w-xs border-4 border-purple-400">
                            <div className="text-5xl mb-4">
                                {showEvent.event_type === 'ladder' && '🪜'}
                                {showEvent.event_type === 'trap' && '🕳️'}
                                {showEvent.event_type === 'egg' && '🥚'}
                                {showEvent.event_type === 'treasure' && '💎'}
                            </div>
                            <h3 className="font-pixel text-xl text-white mb-2">
                                {showEvent.event_type === 'ladder' && '發現捷徑！'}
                                {showEvent.event_type === 'trap' && '哎呀！'}
                                {showEvent.event_type === 'egg' && '獲得怪獸蛋！'}
                                {showEvent.event_type === 'treasure' && '發現寶箱！'}
                            </h3>
                            <p className="text-purple-200 mb-4">{showEvent.description}</p>
                            {showEvent.monster_id && MONSTERS[showEvent.monster_id as MonsterId] && (
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={MONSTERS[showEvent.monster_id as MonsterId].image}
                                        alt="monster"
                                        className="w-20 h-20 object-contain animate-bounce"
                                    />
                                </div>
                            )}
                            <RPGButton onClick={() => setShowEvent(null)} variant="primary">
                                太棒了！
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Victory Screen */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-30">
                        <div className="text-center">
                            <Sparkles className="mx-auto text-yellow-400 mb-4 animate-pulse" size={60} />
                            <h2 className="font-pixel text-3xl text-yellow-400 mb-2">🎉 恭喜攻頂！</h2>
                            <p className="text-white mb-4">你成功登上了怪獸塔第 100 層！</p>
                            <div className="flex justify-center mb-6">
                                <img
                                    src={MONSTERS.rainbow_dragon.image}
                                    alt="Rainbow Dragon"
                                    className="w-32 h-32 object-contain animate-bounce"
                                />
                            </div>
                            <RPGButton onClick={handleReset} variant="primary">
                                🔄 再次挑戰 (+5 骰子)
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                        <div className="text-white font-pixel animate-pulse">載入中...</div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Compact tower preview for dashboard
export const TowerPreview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const zone = getZoneStyle(currentFloor);
    const zoneMonster = MONSTERS[getZoneMonster(currentFloor)];

    return (
        <button
            onClick={onClick}
            className={`w-full bg-gradient-to-r ${zone.bg} rounded-xl p-4 border-2 border-white/20 shadow-lg hover:scale-[1.02] transition-all text-left`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={zoneMonster.image} alt={zoneMonster.name} className="w-12 h-12 object-contain" />
                    <div>
                        <h3 className="font-pixel text-white text-lg drop-shadow-md">🏰 怪獸塔</h3>
                        <p className="text-white/80 text-sm">{zone.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{currentFloor}<span className="text-sm opacity-70">/100</span></div>
                    <div className="flex items-center gap-1 text-yellow-300">
                        <Dices size={14} />
                        <span className="text-sm font-bold">×{diceCount}</span>
                    </div>
                </div>
            </div>
        </button>
    );
};
