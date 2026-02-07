/**
 * Monster Tower V2 – "Mountain Trail" Redesign
 * Clean, modern snakes-and-ladders with zone-based color gradients,
 * CSS-only tiles, SVG connectors, and smooth hop animations.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, ShoppingCart, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import {
    useTowerProgress,
    useTowerEvents,
    useRollDice,
    useResetTower,
    usePurchaseDice,
    useLotteryReward
} from '../hooks/useTowerProgress';
import { useStarBalance } from '../hooks/useQuests';
import { LotteryWheel } from './LotteryWheel';
import { type Prize } from '../lib/gameConfig';
import type { TowerEvent } from '../types/database';

// ============ CONSTANTS ============
const TOTAL_TILES = 100;
const COLS = 5;
const CELL = 58;
const GAP_X = 10;
const GAP_Y = 14;
const ROW_H = CELL + GAP_Y;

// Zone definitions – visual theme changes as player climbs
const ZONES = [
    { name: '🌿 草原', from: 1, to: 20, bg: 'from-emerald-500 to-green-400', tile: '#34d399', tileRing: '#10b981', accent: '#34d399' },
    { name: '🏔️ 山岳', from: 21, to: 40, bg: 'from-amber-500 to-yellow-400', tile: '#fbbf24', tileRing: '#f59e0b', accent: '#fbbf24' },
    { name: '☁️ 雲端', from: 41, to: 60, bg: 'from-sky-500 to-cyan-400', tile: '#38bdf8', tileRing: '#0ea5e9', accent: '#38bdf8' },
    { name: '🌙 星空', from: 61, to: 80, bg: 'from-indigo-500 to-purple-400', tile: '#818cf8', tileRing: '#6366f1', accent: '#818cf8' },
    { name: '🏰 頂峰', from: 81, to: 100, bg: 'from-rose-500 to-orange-400', tile: '#fb7185', tileRing: '#f43f5e', accent: '#fb7185' },
];

const getZone = (floor: number) => ZONES.find(z => floor >= z.from && floor <= z.to) || ZONES[0];

// ============ LAYOUT ============
const getTilePosition = (n: number) => {
    const row = Math.floor((n - 1) / COLS);
    const col = (n - 1) % COLS;
    const totalRows = Math.ceil(TOTAL_TILES / COLS);
    const ltr = row % 2 === 0;
    const x = (ltr ? col : COLS - 1 - col) * (CELL + GAP_X) + CELL / 2;
    const y = (totalRows - 1 - row) * ROW_H + CELL / 2;
    return { x, y, row, col: ltr ? col : COLS - 1 - col };
};

const BOARD_W = COLS * (CELL + GAP_X) - GAP_X;
const BOARD_H = Math.ceil(TOTAL_TILES / COLS) * ROW_H + 60;

// Dice face pips layout
const DICE_PIPS: Record<number, number[][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// ============ INTERFACES ============
interface MonsterTowerV2Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

// ============ DICE FACE COMPONENT ============
const DiceFace: React.FC<{ value: number; size?: number; className?: string }> = ({ value, size = 48, className = '' }) => {
    const pips = DICE_PIPS[value] || DICE_PIPS[1];
    const unit = size / 4;
    return (
        <div
            className={`relative rounded-xl bg-white shadow-[0_3px_0_0_#d1d5db,0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 ${className}`}
            style={{ width: size, height: size }}
        >
            {pips.map(([r, c], i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-gray-700"
                    style={{
                        width: unit * 0.7,
                        height: unit * 0.7,
                        top: unit * 0.8 + r * unit,
                        left: unit * 0.8 + c * unit,
                    }}
                />
            ))}
        </div>
    );
};

// ============ DICE PURCHASE MODAL ============
const DicePurchaseModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
    const [amount, setAmount] = useState(1);
    const purchaseDiceMutation = usePurchaseDice();
    const { data: starBalance = 0 } = useStarBalance(userId);
    const pricePerDice = 5;
    const totalCost = amount * pricePerDice;
    const canAfford = starBalance >= totalCost;

    const handlePurchase = async () => {
        try {
            await purchaseDiceMutation.mutateAsync({ userId, diceAmount: amount });
            onClose();
        } catch { console.error('Purchase failed'); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000]" data-testid="purchase-modal">
            <div className="bg-white rounded-3xl p-6 w-80 shadow-2xl tv2-pop-in">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart size={22} /> 購買骰子
                </h3>
                <div className="mb-4 text-sm space-y-1 text-gray-600">
                    <p>每顆骰子: <span className="font-bold text-gray-900">{pricePerDice} ⭐</span></p>
                    <p>你的星幣: <span className="font-bold text-gray-900">{starBalance} ⭐</span></p>
                </div>
                <div className="flex items-center justify-center gap-6 mb-4">
                    <button onClick={() => setAmount(Math.max(1, amount - 1))} className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-2xl font-bold transition-colors active:scale-95">−</button>
                    <span className="text-4xl font-black w-16 text-center tabular-nums">{amount}</span>
                    <button onClick={() => setAmount(amount + 1)} className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-2xl font-bold transition-colors active:scale-95">+</button>
                </div>
                <p className="text-center mb-4 text-lg">
                    總價: <span className="font-black text-2xl text-orange-600">{totalCost} ⭐</span>
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 font-bold transition-colors">取消</button>
                    <button
                        onClick={handlePurchase}
                        disabled={!canAfford || purchaseDiceMutation.isPending}
                        className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {purchaseDiceMutation.isPending ? '購買中...' : '確認購買'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============ SVG CONNECTORS (smooth curves for snakes & ladders) ============
const EventConnectors: React.FC<{ events: TowerEvent[] }> = ({ events }) => (
    <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: BOARD_W, height: BOARD_H }}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        preserveAspectRatio="none"
    >
        <defs>
            <filter id="connector-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
        </defs>
        {events.map(ev => {
            if (!ev.target_floor) return null;
            const isLadder = ev.event_type === 'ladder';
            const s = getTilePosition(ev.floor_number);
            const e = getTilePosition(ev.target_floor);
            const sx = s.x, sy = BOARD_H - s.y;
            const ex = e.x, ey = BOARD_H - e.y;
            const cpOff = Math.abs(ey - sy) * 0.35;
            const cp1x = (sx + ex) / 2 + (isLadder ? -cpOff : cpOff);
            const cp2x = (sx + ex) / 2 + (isLadder ? cpOff : -cpOff);
            const color = isLadder ? '#f59e0b' : '#ef4444';

            return (
                <g key={`c-${ev.floor_number}`} filter="url(#connector-glow)">
                    <path
                        d={`M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray={isLadder ? 'none' : '6 4'}
                        opacity={0.55}
                    />
                    {/* Arrowhead dot */}
                    <circle cx={ex} cy={ey} r={4} fill={color} opacity={0.7} />
                </g>
            );
        })}
    </svg>
);

// ============ TRAIL DOTS (path between consecutive tiles) ============
const TrailDots: React.FC = () => {
    const dots: { x: number; y: number }[] = [];
    for (let n = 1; n < TOTAL_TILES; n++) {
        const a = getTilePosition(n);
        const b = getTilePosition(n + 1);
        // 2 dots between each pair
        for (let t = 1; t <= 2; t++) {
            const f = t / 3;
            dots.push({
                x: a.x + (b.x - a.x) * f,
                y: BOARD_H - (a.y + (b.y - a.y) * f),
            });
        }
    }
    return (
        <svg
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{ width: BOARD_W, height: BOARD_H }}
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        >
            {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={2} fill="#9ca3af" />
            ))}
        </svg>
    );
};

// ============ MAIN COMPONENT ============
export const MonsterTowerV2: React.FC<MonsterTowerV2Props> = ({ userId, isOpen, onClose }) => {
    const { data: progress } = useTowerProgress(userId);
    const { data: events = [] } = useTowerEvents();
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();
    const lotteryRewardMutation = useLotteryReward();
    const { data: starBalance = 0 } = useStarBalance(userId);

    const boardRef = useRef<HTMLDivElement>(null);

    const [isRolling, setIsRolling] = useState(false);
    const [rollResult, setRollResult] = useState<number | null>(null);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const [showPurchase, setShowPurchase] = useState(false);
    const [displayDice, setDisplayDice] = useState(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);
    const [isHopping, setIsHopping] = useState(false);
    const [eventMessage, setEventMessage] = useState<string | null>(null);

    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const eventMap = useMemo(() => new Map(events.map(e => [e.floor_number, e])), [events]);

    const scrollToFloor = useCallback((floor: number) => {
        if (!boardRef.current) return;
        const pos = getTilePosition(floor);
        const h = boardRef.current.clientHeight;
        const target = BOARD_H - pos.y - h / 2;
        boardRef.current.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (isOpen) setTimeout(() => scrollToFloor(currentFloor), 100);
    }, [isOpen, currentFloor, scrollToFloor]);

    useEffect(() => {
        if (isRolling) {
            const id = setInterval(() => setDisplayDice(Math.floor(Math.random() * 6) + 1), 80);
            return () => clearInterval(id);
        }
    }, [isRolling]);

    const handleRoll = useCallback(async () => {
        if (diceCount <= 0 || isRolling) return;

        setIsRolling(true);
        setRollResult(null);
        setEventMessage(null);

        await new Promise(r => setTimeout(r, 800));

        try {
            const result = await rollDiceMutation.mutateAsync({ userId, currentFloor });

            setRollResult(result.roll);
            setDisplayDice(result.roll);
            setIsRolling(false);

            const start = currentFloor;
            const intermediate = Math.min(start + result.roll, 100);

            for (let f = start + 1; f <= intermediate; f++) {
                setIsHopping(true);
                setAnimatingFloor(f);
                scrollToFloor(f);
                await new Promise(r => setTimeout(r, 300));
                setIsHopping(false);
                await new Promise(r => setTimeout(r, 50));
            }

            const finalFloor = result.progress.current_floor;
            if (finalFloor !== intermediate && result.event) {
                const isLadder = result.event.event_type === 'ladder';
                setEventMessage(isLadder ? '🪜 梯子！往上爬！' : '🐍 蛇！溜下去！');
                setShowEvent(result.event);

                await new Promise(r => setTimeout(r, 600));

                const direction = finalFloor > intermediate ? 1 : -1;
                const steps = Math.abs(finalFloor - intermediate);

                for (let i = 0; i < steps; i++) {
                    setIsHopping(true);
                    setAnimatingFloor(intermediate + (i + 1) * direction);
                    scrollToFloor(intermediate + (i + 1) * direction);
                    await new Promise(r => setTimeout(r, 120));
                    setIsHopping(false);
                }

                await new Promise(r => setTimeout(r, 300));
                setEventMessage(null);
                setShowEvent(null);
            }

            setAnimatingFloor(null);

            if (result.reachedTop) {
                setTimeout(() => setShowVictory(true), 400);
            }
        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
        }
    }, [diceCount, isRolling, currentFloor, userId, rollDiceMutation, scrollToFloor]);

    const handleLotteryComplete = useCallback(async (prize: Prize) => {
        try {
            await lotteryRewardMutation.mutateAsync({
                userId, prizeType: prize.type, prizeValue: prize.value,
                monsterId: prize.monsterId, prizeName: prize.name,
            });
        } catch (e) { console.error('Lottery failed:', e); }
        setShowLotteryWheel(false);
    }, [userId, lotteryRewardMutation]);

    const handleReset = useCallback(async () => {
        try {
            await resetTowerMutation.mutateAsync({ userId });
            setShowVictory(false);
        } catch (e) { console.error('Reset failed:', e); }
    }, [userId, resetTowerMutation]);

    if (!isOpen) return null;

    const displayFloor = animatingFloor ?? currentFloor;
    const playerPos = getTilePosition(displayFloor);
    const zone = getZone(displayFloor);
    const progressPct = ((displayFloor - 1) / (TOTAL_TILES - 1)) * 100;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 backdrop-blur-sm">
            <div className="tv2-shell w-full max-w-md h-[92vh] overflow-hidden flex flex-col relative rounded-3xl">

                {/* ── Header ── */}
                <div className="relative z-20 px-4 py-3 flex items-center justify-between tv2-header">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${zone.bg} flex items-center justify-center text-lg shadow-md tv2-icon-float`}>
                            🏰
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-extrabold text-[15px] text-gray-800 leading-tight tracking-tight">怪獸塔 V2</h2>
                            <p className="text-[11px] font-semibold text-gray-400 truncate" data-testid="zone-name">
                                {zone.name} · Floor {displayFloor} / {TOTAL_TILES}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-90" data-testid="close-tower-v2">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* ── Progress bar ── */}
                <div className="relative z-20 h-[3px] bg-gray-100">
                    <div
                        className="h-full transition-all duration-700 ease-out rounded-r-full"
                        style={{ width: `${progressPct}%`, background: zone.accent }}
                    />
                </div>

                {/* ── Stats row ── */}
                <div className="relative z-20 px-4 py-2 flex items-center gap-5 tv2-stats">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🎲</span>
                        <span className="font-extrabold text-sm tabular-nums text-gray-700" data-testid="dice-count">{diceCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">⭐</span>
                        <span className="font-extrabold text-sm tabular-nums text-gray-700">{starBalance}</span>
                    </div>
                    <div className="flex-1" />
                    {rollResult && (
                        <div className="flex items-center gap-1.5 tv2-result-pop" data-testid="dice-result">
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Roll</span>
                            <span className="text-xl font-black text-orange-500 tabular-nums">{rollResult}</span>
                        </div>
                    )}
                </div>

                {/* ── Game Board ── */}
                <div ref={boardRef} className="flex-1 overflow-y-auto overflow-x-hidden relative tv2-board-scroll" data-testid="tower-v2-board" style={{ scrollBehavior: 'smooth' }}>

                    {/* Zone gradient bands */}
                    <div className="absolute inset-0 pointer-events-none">
                        {ZONES.slice().reverse().map((z, i) => {
                            const rowStart = Math.floor((z.from - 1) / COLS);
                            const rowEnd = Math.floor((z.to - 1) / COLS);
                            const totalRows = Math.ceil(TOTAL_TILES / COLS);
                            const top = (totalRows - 1 - rowEnd) * ROW_H;
                            const height = (rowEnd - rowStart + 1) * ROW_H;
                            return (
                                <div
                                    key={i}
                                    className="absolute w-full"
                                    style={{
                                        top,
                                        height,
                                        background: `linear-gradient(180deg, ${z.accent}12 0%, ${z.accent}05 100%)`,
                                    }}
                                />
                            );
                        })}
                    </div>

                    <div className="relative mx-auto" style={{ width: BOARD_W, height: BOARD_H, padding: '20px 0' }}>

                        {/* Trail dots */}
                        <TrailDots />

                        {/* SVG connectors */}
                        <EventConnectors events={events.filter(e => e.target_floor)} />

                        {/* Tiles */}
                        {Array.from({ length: TOTAL_TILES }, (_, i) => {
                            const n = i + 1;
                            const pos = getTilePosition(n);
                            const event = eventMap.get(n);
                            const isCurrent = n === displayFloor;
                            const isPast = n < displayFloor;
                            const tileZone = getZone(n);

                            return (
                                <div
                                    key={n}
                                    className="tv2-tile"
                                    style={{
                                        left: pos.x - CELL / 2,
                                        bottom: pos.y - CELL / 2,
                                        width: CELL,
                                        height: CELL,
                                    }}
                                    data-testid={`tile-${n}`}
                                >
                                    <div
                                        className={`tv2-tile-circle ${isCurrent ? 'tv2-tile-active' : ''}`}
                                        style={{
                                            background: isPast ? '#e5e7eb' : tileZone.tile,
                                            boxShadow: isCurrent
                                                ? `0 0 0 3px white, 0 0 0 6px ${tileZone.accent}, 0 4px 12px ${tileZone.accent}66`
                                                : isPast
                                                    ? '0 2px 4px rgba(0,0,0,0.06)'
                                                    : `0 3px 0 ${tileZone.tileRing}, 0 4px 8px rgba(0,0,0,0.1)`,
                                        }}
                                    >
                                        <span
                                            className="tv2-tile-num"
                                            style={{ color: isPast ? '#9ca3af' : 'white' }}
                                        >
                                            {n}
                                        </span>
                                    </div>

                                    {/* Event badge */}
                                    {event && (
                                        <div className={`tv2-event-badge ${event.event_type === 'ladder' ? 'tv2-badge-ladder' : 'tv2-badge-snake'}`}>
                                            {event.event_type === 'ladder'
                                                ? <ArrowUp size={11} strokeWidth={3} />
                                                : <ArrowDown size={11} strokeWidth={3} />
                                            }
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Player token */}
                        <div
                            className={`tv2-player ${isHopping ? 'tv2-player-hop' : ''}`}
                            style={{
                                left: playerPos.x - 18,
                                bottom: playerPos.y + 6,
                                transition: isHopping ? 'none' : 'left 0.3s ease, bottom 0.3s ease',
                            }}
                            data-testid="player-token"
                        >
                            <span className="tv2-player-emoji">🧸</span>
                        </div>
                    </div>
                </div>

                {/* ── Event overlay ── */}
                {eventMessage && (
                    <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none">
                        <div className="tv2-event-toast">
                            <p className="text-lg font-extrabold text-gray-800">{eventMessage}</p>
                            {showEvent?.target_floor && (
                                <p className="text-xs font-semibold text-gray-400 mt-1">
                                    移動到第 {showEvent.target_floor} 層
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Controls ── */}
                <div className="relative z-20 tv2-controls">
                    <div className="flex items-center gap-3 justify-center">
                        <button
                            onClick={handleRoll}
                            disabled={diceCount <= 0 || isRolling}
                            className="tv2-roll-btn group"
                            data-testid="roll-dice-btn"
                        >
                            <div className={`${isRolling ? 'tv2-dice-spin' : 'group-hover:scale-110 group-active:scale-95 transition-transform'}`}>
                                <DiceFace value={displayDice} size={40} />
                            </div>
                            <span className="font-extrabold text-[15px] text-gray-700">
                                {isRolling ? '擲出中…' : '擲骰子'}
                            </span>
                        </button>

                        <button
                            onClick={() => setShowPurchase(true)}
                            className="tv2-side-btn"
                            data-testid="purchase-dice-btn"
                        >
                            <ShoppingCart size={18} />
                        </button>
                        <button
                            onClick={() => setShowLotteryWheel(true)}
                            className="tv2-side-btn"
                            data-testid="lottery-wheel-btn"
                        >
                            <span className="text-lg">🎰</span>
                        </button>
                    </div>
                </div>

                {/* ── Victory modal ── */}
                {showVictory && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[2000] backdrop-blur-sm">
                        <div className="tv2-victory tv2-pop-in">
                            <div className="text-6xl mb-3">🏆</div>
                            <h2 className="text-2xl font-black text-gray-800 mb-1">登頂成功！</h2>
                            <p className="text-gray-400 text-sm mb-5">恭喜你攻克怪獸塔！</p>
                            <button
                                onClick={handleReset}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 active:scale-95"
                            >
                                <RotateCcw size={18} /> 再挑戰一次
                            </button>
                        </div>
                    </div>
                )}

                {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}
                {showLotteryWheel && (
                    <LotteryWheel onComplete={(prize) => { handleLotteryComplete(prize); setShowLotteryWheel(false); }} />
                )}
            </div>
        </div>
    );
};

// ============ PREVIEW CARD ============
export const TowerV2Preview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);
    const currentFloor = progress?.current_floor || 1;
    const diceCount = progress?.dice_count || 0;
    const zone = getZone(currentFloor);
    const pct = Math.round(((currentFloor - 1) / (TOTAL_TILES - 1)) * 100);

    return (
        <button
            onClick={onClick}
            className="clay-card p-4 w-full text-left hover:scale-[1.02] transition-transform group"
            data-testid="monster-tower-v2-open"
        >
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${zone.bg} shadow-lg flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`}>🏰</div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-gray-800">怪獸塔 V2</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg">{zone.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg">🎲 {diceCount}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: zone.accent }} />
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MonsterTowerV2;
