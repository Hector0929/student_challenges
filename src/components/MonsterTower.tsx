import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dices, Trophy, Sparkles, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useTowerProgress, useTowerEvents, useRollDice, useResetTower, MONSTERS, GAME_ASSETS, type MonsterId } from '../hooks/useTowerProgress';
import { RPGButton } from './RPGButton';
import type { TowerEvent } from '../types/database';

interface MonsterTowerProps {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Zone info
const getZoneInfo = (floor: number) => {
    if (floor <= 25) return { name: '🌲 森林入口', monster: 'slime' as MonsterId, color: 'from-green-600 to-emerald-700' };
    if (floor <= 50) return { name: '💎 水晶洞穴', monster: 'water_spirit' as MonsterId, color: 'from-blue-600 to-cyan-700' };
    if (floor <= 75) return { name: '🔥 熔岩地帶', monster: 'flame_bird' as MonsterId, color: 'from-orange-500 to-red-600' };
    return { name: '☁️ 雲端天空', monster: 'thunder_cloud' as MonsterId, color: 'from-purple-500 to-indigo-600' };
};

// Generate S-path grid (蛇梯棋風格) - 每行 5 格，更緊湊
const generateGridRows = (centerFloor: number): number[][] => {
    const COLS = 5;
    const ROWS = 8;
    const rows: number[][] = [];

    const pageStart = Math.floor((centerFloor - 1) / 40) * 40 + 1;
    const pageEnd = Math.min(pageStart + 39, 100);

    for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
        const rowEndFloor = pageEnd - (rowIdx * COLS);
        const isReversed = rowIdx % 2 === 1;

        const row: number[] = [];
        for (let col = 0; col < COLS; col++) {
            const floor = isReversed
                ? rowEndFloor - (COLS - 1) + col
                : rowEndFloor - col;
            if (floor >= pageStart && floor <= pageEnd && floor >= 1) {
                row.push(floor);
            }
        }
        if (row.length > 0) rows.push(row);
    }

    return rows;
};

export const MonsterTower: React.FC<MonsterTowerProps> = ({ userId, isOpen, onClose }) => {
    const { data: progress, isLoading } = useTowerProgress(userId);
    const { data: events = [] } = useTowerEvents();
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [displayDice, setDisplayDice] = useState<number>(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);
    const previousFloorRef = useRef<number>(1);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;

    const eventMap = new Map(events.map(e => [e.floor_number, e]));
    const gridRows = generateGridRows(currentFloor);

    // Step-by-step movement animation
    const animateMovement = useCallback(async (fromFloor: number, toFloor: number, onComplete: () => void) => {
        const steps = Math.abs(toFloor - fromFloor);
        const direction = toFloor > fromFloor ? 1 : -1;

        setIsMoving(true);

        for (let i = 0; i <= steps; i++) {
            const stepFloor = fromFloor + (i * direction);
            setAnimatingFloor(stepFloor);
            await new Promise(resolve => setTimeout(resolve, 300)); // 300ms per step
        }

        setIsMoving(false);
        setAnimatingFloor(null);
        onComplete();
    }, []);

    // Update previous floor ref
    useEffect(() => {
        if (!isMoving && currentFloor !== previousFloorRef.current) {
            previousFloorRef.current = currentFloor;
        }
    }, [currentFloor, isMoving]);

    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling || isMoving) return;

        setIsRolling(true);
        setRollResult(null);
        const startFloor = currentFloor;

        // Dice animation
        const animationInterval = setInterval(() => {
            setDisplayDice(Math.floor(Math.random() * 6) + 1);
        }, 100);

        // Wait for dice animation
        await new Promise(resolve => setTimeout(resolve, 1200));
        clearInterval(animationInterval);

        try {
            const result = await rollDiceMutation.mutateAsync({ userId, currentFloor: startFloor });
            setRollResult(result.roll);
            setDisplayDice(result.roll);
            setIsRolling(false);

            // Calculate intermediate floor (before event)
            const intermediateFloor = Math.min(startFloor + result.roll, 100);

            // Animate movement step by step
            animateMovement(startFloor, intermediateFloor, () => {
                // Check for events after movement
                if (result.event) {
                    setTimeout(() => setShowEvent(result.event), 400);
                }
                if (result.reachedTop) {
                    setTimeout(() => setShowVictory(true), 800);
                }
            });

        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
        }
    }, [diceCount, isRolling, isMoving, rollDiceMutation, userId, currentFloor, animateMovement]);

    const handleReset = async () => {
        await resetTowerMutation.mutateAsync({ userId });
        setShowVictory(false);
    };

    if (!isOpen) return null;

    const zone = getZoneInfo(currentFloor);
    const zoneMonster = MONSTERS[zone.monster];
    const displayFloor = animatingFloor ?? currentFloor;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
            <div className="absolute inset-0 bg-black/90" onClick={onClose} />

            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-600 max-h-[95vh] flex flex-col"
                style={{ background: 'linear-gradient(180deg, #5d3a1a 0%, #3d2510 50%, #2d1a0a 100%)' }}>

                {/* Header - Compact */}
                <div className={`bg-gradient-to-r ${zone.color} p-2 border-b-4 border-amber-900`}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <img src={zoneMonster.image} alt={zoneMonster.name} className="w-10 h-10 object-contain drop-shadow-lg" />
                            <div>
                                <h2 className="font-pixel text-white text-base drop-shadow-md">🏰 怪獸塔</h2>
                                <p className="text-xs text-white/80">{zone.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-black/30 rounded-full transition-colors">
                            <X className="text-white" size={20} />
                        </button>
                    </div>

                    {/* Progress bar - Compact */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-black/50 rounded-full overflow-hidden border border-amber-400/50">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 transition-all duration-500 relative"
                                style={{ width: `${displayFloor}%` }}
                            />
                        </div>
                        <span className="text-white font-bold text-xs bg-black/40 px-2 py-0.5 rounded">
                            {displayFloor}/100
                        </span>
                    </div>
                </div>

                {/* Game Board with Row Connectors */}
                <div className="flex-1 relative p-1 overflow-auto" style={{ minHeight: '280px' }}>
                    {/* Torch decorations with flicker */}
                    <img src={GAME_ASSETS.torch} alt="torch" className="absolute left-0 top-4 w-8 h-12 object-contain animate-torch-flicker z-10" />
                    <img src={GAME_ASSETS.torch} alt="torch" className="absolute right-0 top-4 w-8 h-12 object-contain animate-torch-flicker scale-x-[-1] z-10" style={{ animationDelay: '0.3s' }} />

                    {/* Grid of tiles with connectors */}
                    <div className="flex flex-col items-center py-2 px-6">
                        {gridRows.map((row, rowIndex) => {
                            const isEvenRow = rowIndex % 2 === 0;
                            const showConnector = rowIndex < gridRows.length - 1;

                            return (
                                <React.Fragment key={rowIndex}>
                                    {/* Row of tiles */}
                                    <div className="flex justify-center gap-1">
                                        {row.map((floor) => {
                                            const isCurrentFloor = floor === displayFloor;
                                            const event = eventMap.get(floor);
                                            const isLadder = event?.event_type === 'ladder';
                                            const isTrap = event?.event_type === 'trap';
                                            const isEgg = event?.event_type === 'egg';

                                            return (
                                                <div
                                                    key={floor}
                                                    className={`
                                                        relative w-11 h-11 rounded-lg flex items-center justify-center
                                                        transition-all duration-200 overflow-hidden
                                                        ${isCurrentFloor ? 'animate-floor-glow z-20 scale-110' : 'hover:scale-105'}
                                                    `}
                                                    style={{
                                                        backgroundImage: `url(${GAME_ASSETS.tile})`,
                                                        backgroundSize: 'cover',
                                                        boxShadow: !isCurrentFloor ? 'inset 0 -2px 4px rgba(0,0,0,0.3)' : undefined
                                                    }}
                                                >
                                                    {/* Content */}
                                                    {isCurrentFloor ? (
                                                        <img
                                                            src={GAME_ASSETS.player}
                                                            alt="player"
                                                            className={`w-9 h-9 object-contain drop-shadow-lg ${isMoving ? 'animate-player-hop' : ''}`}
                                                        />
                                                    ) : isLadder ? (
                                                        <img
                                                            src={GAME_ASSETS.ladder}
                                                            alt="ladder"
                                                            className="w-8 h-8 object-contain"
                                                        />
                                                    ) : isTrap ? (
                                                        <img
                                                            src={GAME_ASSETS.snake}
                                                            alt="snake"
                                                            className="w-8 h-8 object-contain"
                                                        />
                                                    ) : isEgg ? (
                                                        <span className="text-xl animate-star-twinkle">🥚</span>
                                                    ) : (
                                                        <span className="font-bold text-amber-900 text-sm drop-shadow-sm">{floor}</span>
                                                    )}

                                                    {/* Target floor indicator */}
                                                    {!isCurrentFloor && (isLadder || isTrap) && event?.target_floor && (
                                                        <div className={`absolute -bottom-0.5 text-[8px] px-1 rounded font-bold animate-arrow-bounce ${isLadder ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                            }`}>
                                                            →{event.target_floor}
                                                        </div>
                                                    )}

                                                    {floor === 100 && !isCurrentFloor && (
                                                        <Trophy className="absolute -top-1 left-1/2 -translate-x-1/2 text-yellow-500" size={14} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Row Connector - Bridge between rows */}
                                    {showConnector && (
                                        <div className="relative h-8 w-full flex items-center justify-center my-1">
                                            {/* Connector line */}
                                            <div className={`
                                                absolute h-full w-1.5 bg-gradient-to-b from-amber-600 to-amber-800 rounded-full
                                                ${isEvenRow ? 'left-4' : 'right-4'}
                                            `}>
                                                {/* Direction arrow */}
                                                <div className={`
                                                    absolute -bottom-1 left-1/2 -translate-x-1/2
                                                    bg-amber-500 rounded-full p-0.5 shadow-lg
                                                `}>
                                                    <ArrowDown size={12} className="text-white" />
                                                </div>
                                            </div>

                                            {/* Direction indicator text */}
                                            <div className={`
                                                absolute text-[10px] font-pixel text-amber-400/70
                                                ${isEvenRow ? 'left-8' : 'right-8'}
                                            `}>
                                                {isEvenRow ? '← 往左' : '往右 →'}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Action Bar with LARGER Dice */}
                <div className="bg-gradient-to-t from-stone-900 via-stone-800 to-amber-900/50 p-3 border-t-4 border-amber-700">
                    <div className="flex items-center gap-3 mb-3">
                        {/* BIGGER Dice Display */}
                        <div className={`
                            w-24 h-24 rounded-2xl bg-gradient-to-br from-white via-gray-100 to-gray-300 
                            flex items-center justify-center 
                            shadow-2xl border-4 border-amber-500
                            ${isRolling ? 'animate-dice-roll' : rollResult ? 'animate-dice-shake' : ''}
                        `}
                            style={{
                                perspective: '1000px',
                                transformStyle: 'preserve-3d',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8)'
                            }}
                        >
                            <span className="text-6xl drop-shadow-lg">
                                {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][displayDice - 1] || '🎲'}
                            </span>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Dices className="text-yellow-400" size={24} />
                                <span className="font-bold text-3xl text-yellow-400">×{diceCount}</span>
                            </div>
                            <p className="text-amber-300 text-sm">可用骰子</p>
                            {rollResult && !isRolling && !isMoving && (
                                <p className="text-green-400 font-bold text-lg animate-pulse">+{rollResult} 步！</p>
                            )}
                            {isMoving && (
                                <p className="text-cyan-400 font-bold animate-pulse">移動中...</p>
                            )}
                        </div>
                    </div>

                    <RPGButton
                        onClick={handleRoll}
                        disabled={diceCount <= 0 || isRolling || isMoving}
                        className="w-full text-lg"
                        variant={diceCount > 0 ? 'primary' : 'secondary'}
                    >
                        {isRolling ? '🎲 擲骰中...' : isMoving ? '🚶 移動中...' : diceCount > 0 ? '🎲 擲骰子！' : '完成任務獲得骰子'}
                    </RPGButton>

                    <p className="text-xs text-amber-500/80 text-center mt-2">
                        💡 完成每日任務 = 獲得 1 顆骰子
                    </p>
                </div>

                {/* Event Popup */}
                {showEvent && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-30">
                        <div className={`
                            rounded-2xl p-6 text-center max-w-xs border-4 shadow-2xl animate-popup-in
                            ${showEvent.event_type === 'ladder'
                                ? 'bg-gradient-to-br from-green-500 to-emerald-700 border-green-300'
                                : showEvent.event_type === 'trap'
                                    ? 'bg-gradient-to-br from-red-500 to-rose-700 border-red-300'
                                    : 'bg-gradient-to-br from-purple-500 to-violet-700 border-purple-300'
                            }
                        `}>
                            <div className="mb-3">
                                {showEvent.event_type === 'ladder' && (
                                    <>
                                        <img src={GAME_ASSETS.ladder} alt="ladder" className="w-20 h-20 mx-auto" />
                                        <ArrowUp className="mx-auto text-white animate-bounce mt-2" size={32} />
                                    </>
                                )}
                                {showEvent.event_type === 'trap' && (
                                    <>
                                        <img src={GAME_ASSETS.snake} alt="snake" className="w-20 h-20 mx-auto" />
                                        <ArrowDown className="mx-auto text-white animate-bounce mt-2" size={32} />
                                    </>
                                )}
                                {showEvent.event_type === 'egg' && (
                                    <span className="text-6xl">🥚✨</span>
                                )}
                            </div>
                            <h3 className="font-pixel text-2xl text-white mb-2 drop-shadow-lg">
                                {showEvent.event_type === 'ladder' && '發現捷徑！⬆️'}
                                {showEvent.event_type === 'trap' && '哎呀滑倒了！⬇️'}
                                {showEvent.event_type === 'egg' && '獲得怪獸蛋！'}
                            </h3>
                            <p className="text-white/90 mb-4">{showEvent.description}</p>
                            {showEvent.target_floor && (
                                <p className="text-white font-bold text-lg mb-3">
                                    {showEvent.event_type === 'ladder' ? '⬆️' : '⬇️'} 移動到第 {showEvent.target_floor} 層
                                </p>
                            )}
                            {showEvent.monster_id && MONSTERS[showEvent.monster_id as MonsterId] && (
                                <img
                                    src={MONSTERS[showEvent.monster_id as MonsterId].image}
                                    alt="monster"
                                    className="w-20 h-20 mx-auto mb-4 animate-bounce drop-shadow-lg"
                                />
                            )}
                            <RPGButton onClick={() => setShowEvent(null)} variant="primary">
                                繼續冒險！
                            </RPGButton>
                        </div>
                    </div>
                )}

                {/* Victory */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-40">
                        <div className="text-center animate-victory-burst">
                            <Sparkles className="mx-auto text-yellow-400 mb-3 animate-star-twinkle" size={60} />
                            <h2 className="font-pixel text-3xl text-yellow-400 mb-3">🎉 恭喜攻頂！</h2>
                            <p className="text-white mb-4 text-lg">成功登上怪獸塔第 100 層！</p>
                            <img src={MONSTERS.rainbow_dragon.image} alt="Rainbow Dragon" className="w-36 h-36 mx-auto mb-6 animate-player-hop drop-shadow-2xl" />
                            <RPGButton onClick={handleReset} variant="primary" className="text-lg">
                                🔄 再次挑戰 (+5 骰子)
                            </RPGButton>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-amber-900/95 flex items-center justify-center z-50">
                        <div className="text-center">
                            <div className="text-5xl animate-bounce mb-3">🏰</div>
                            <p className="text-amber-200 font-pixel text-lg animate-pulse">載入中...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Dashboard Preview
export const TowerPreview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const zone = getZoneInfo(currentFloor);
    const zoneMonster = MONSTERS[zone.monster];

    return (
        <button
            onClick={onClick}
            className={`w-full bg-gradient-to-r ${zone.color} rounded-xl p-4 border-2 border-white/30 shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all text-left group`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={zoneMonster.image} alt={zoneMonster.name} className="w-14 h-14 object-contain group-hover:scale-110 transition-transform drop-shadow-lg" />
                        {diceCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-amber-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white animate-pulse">
                                {diceCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-pixel text-white text-lg drop-shadow-md flex items-center gap-2">
                            🏰 怪獸塔
                        </h3>
                        <p className="text-white/80 text-sm">{zone.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-white drop-shadow-lg">{currentFloor}<span className="text-lg opacity-70">/100</span></div>
                    <div className="w-20 h-3 bg-black/30 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" style={{ width: `${currentFloor}%` }} />
                    </div>
                </div>
            </div>
        </button>
    );
};
