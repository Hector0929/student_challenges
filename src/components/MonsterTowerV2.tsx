/**
 * Monster Tower V2 – Snakes & Ladders Board Game
 * Isometric 3D floating block tiles with dark theme.
 * Numbers behind tiles, player stands ON TOP of bricks.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, ShoppingCart, RotateCcw, FolderOpen, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
    useTowerProgress,
    useRollDice,
    useResetTower,
    usePurchaseDice,
    useLotteryReward,
    useHatchEgg,
    useUpgradeMonster,
    generateRandomEvents,
    MONSTERS,
    EVOLUTION_MAP,
    EVOLUTION_COST,
    type MonsterId,
} from '../hooks/useTowerProgress';
import { useStarBalance } from '../hooks/useQuests';
import { LotteryWheel } from './LotteryWheel';
import { type Prize } from '../lib/gameConfig';
import type { TowerEvent } from '../types/database';

// ============ LAYOUT CONSTANTS ============
const TOTAL_TILES = 100;
const COLS = 5;
const TILE_CELL_W = 68;       // cell width including space
const TILE_CELL_H = 72;       // cell height including space (taller for iso depth)
const TILE_GAP = 6;           // gap between cells
const ROW_GAP = 16;           // extra vertical spacing between rows
const ROW_H = TILE_CELL_H + ROW_GAP;
const PAD_X = 16;
const PAD_BOTTOM = 48;



// Zone definitions – neon colour per zone
const ZONES = [
    { name: '🌿 草原', from: 1, to: 20, bg: 'from-emerald-500 to-green-400', topColor: '#2dd4bf', sideLight: '#0d9488', sideDark: '#065f53', glow: '#2dd4bf', accent: '#34d399', img: '/images/tower-v2/tile_grass.png' },
    { name: '🏔️ 山岳', from: 21, to: 40, bg: 'from-amber-500 to-yellow-400', topColor: '#fbbf24', sideLight: '#d97706', sideDark: '#92400e', glow: '#fbbf24', accent: '#f59e0b', img: '/images/tower-v2/tile_mountain.png' },
    { name: '☁️ 雲端', from: 41, to: 60, bg: 'from-sky-500 to-cyan-400', topColor: '#22d3ee', sideLight: '#0891b2', sideDark: '#155e75', glow: '#22d3ee', accent: '#06b6d4', img: '/images/tower-v2/tile_cloud.png' },
    { name: '🌙 星空', from: 61, to: 80, bg: 'from-indigo-500 to-violet-400', topColor: '#818cf8', sideLight: '#6366f1', sideDark: '#3730a3', glow: '#818cf8', accent: '#6366f1', img: '/images/tower-v2/tile_starry.png' },
    { name: '🏰 頂峰', from: 81, to: 100, bg: 'from-rose-500 to-orange-400', topColor: '#fb7185', sideLight: '#e11d48', sideDark: '#881337', glow: '#fb7185', accent: '#f43f5e', img: '/images/tower-v2/tile_castle.png' },
];
const getZone = (floor: number) => ZONES.find(z => floor >= z.from && floor <= z.to) || ZONES[0];

// ============ POSITION HELPERS ============
const getTilePosition = (n: number) => {
    const row = Math.floor((n - 1) / COLS);
    const col = (n - 1) % COLS;
    const ltr = row % 2 === 0;
    const c = ltr ? col : COLS - 1 - col;
    const x = PAD_X + c * (TILE_CELL_W + TILE_GAP) + TILE_CELL_W / 2;
    const y = PAD_BOTTOM + row * ROW_H + TILE_CELL_H / 2;
    return { x, y, row, col: c };
};

const BOARD_W = PAD_X * 2 + COLS * TILE_CELL_W + (COLS - 1) * TILE_GAP;
const TOTAL_ROWS = Math.ceil(TOTAL_TILES / COLS);
const BOARD_H = PAD_BOTTOM + TOTAL_ROWS * ROW_H + 40;

// Dice face pips
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

// ============ SUB-COMPONENTS ============

/** Isometric 3D block tile – drawn with inline SVG for pixel-perfect geometry */
const IsoBrick: React.FC<{
    n: number;
    isCurrent: boolean;
    isPast: boolean;
    zone: typeof ZONES[0];
    event?: TowerEvent;
}> = ({ n, isCurrent, isPast, zone, event }) => {
    // 3D Image Tile
    return (
        <div className="tv2-iso-cell" style={{ width: TILE_CELL_W, height: TILE_CELL_H, position: 'relative' }}>
            {/* Number label behind the block */}
            <span className="tv2-iso-num" style={{
                color: isPast ? '#4a556880' : 'rgba(255,255,255,0.9)',
                zIndex: 5,
                position: 'absolute',
                top: -10,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '12px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}>
                {n}
            </span>

            {/* The 3D isometric block (Image) */}
            <div className={`tv2-iso-block ${isCurrent ? 'tv2-iso-active' : ''}`}
                style={{
                    width: 64,
                    height: 64,
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    filter: isPast ? 'grayscale(0.8) brightness(0.6)' : isCurrent ? `brightness(1.1) drop-shadow(0 0 10px ${zone.glow})` : 'none',
                    transition: 'filter 0.3s ease, transform 0.3s ease',
                    zIndex: 1
                }}
            >
                <img
                    src={(zone as any).img}
                    alt={`Tile ${n}`}
                    className="w-full h-full object-contain"
                    style={{ pointerEvents: 'none' }}
                />
            </div>

            {/* Event badge — only show for ladder/trap (snake) events */}
            {event && (event.event_type === 'ladder' || event.event_type === 'trap') && (
                <div className={`tv2-iso-event ${event.event_type === 'ladder' ? 'tv2-icon-ladder' : 'tv2-icon-snake'}`} style={{ zIndex: 10 }}>
                    {event.event_type === 'ladder' ? '🪜' : '🐍'}
                </div>
            )}
            {/* Other event types get distinct icons */}
            {event && event.event_type === 'egg' && (
                <div className="tv2-iso-event" style={{ zIndex: 10 }}>🥚</div>
            )}
            {event && event.event_type === 'treasure' && (
                <div className="tv2-iso-event" style={{ zIndex: 10 }}>💎</div>
            )}
            {event && event.event_type === 'monster' && (
                <div className="tv2-iso-event" style={{ zIndex: 10 }}>👾</div>
            )}
        </div>
    );
};

/** CSS dice face with pips */
const DiceFace: React.FC<{ value: number; size?: number; className?: string }> = ({ value, size = 44, className = '' }) => {
    const pips = DICE_PIPS[value] || DICE_PIPS[1];
    const u = size / 4;
    return (
        <div className={`relative rounded-xl bg-slate-800 shadow-[0_3px_0_0_#1e293b,0_4px_10px_rgba(0,0,0,0.3)] border border-slate-600 ${className}`} style={{ width: size, height: size }}>
            {pips.map(([r, c], i) => (
                <div key={i} className="absolute rounded-full bg-cyan-400" style={{ width: u * 0.65, height: u * 0.65, top: u * 0.85 + r * u, left: u * 0.85 + c * u }} />
            ))}
        </div>
    );
};

/** Purchase dice modal */
const DicePurchaseModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
    const [packs, setPacks] = useState(1); // 1 pack = 2 dice
    const purchaseDiceMutation = usePurchaseDice();
    const { data: starBalance = 0 } = useStarBalance(userId);
    const pricePerPack = 5;
    const totalCost = packs * pricePerPack;
    const diceCount = packs * 2;
    const canAfford = starBalance >= totalCost;
    const handlePurchase = async () => { try { await purchaseDiceMutation.mutateAsync({ userId, diceAmount: diceCount }); onClose(); } catch { console.error('Purchase failed'); } };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]" data-testid="purchase-modal">
            <div className="bg-slate-800 rounded-3xl p-6 w-80 shadow-2xl tv2-pop-in border border-slate-600">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-300"><ShoppingCart size={22} /> 購買骰子</h3>
                <div className="mb-4 text-sm space-y-1 text-slate-300">
                    <p>優惠方案: <span className="font-bold text-cyan-300">5 ⭐ / 2 顆</span></p>
                    <p>你的星幣: <span className="font-bold text-cyan-300">{starBalance} ⭐</span></p>
                </div>
                <div className="flex items-center justify-center gap-6 mb-4">
                    <button onClick={() => setPacks(Math.max(1, packs - 1))} className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 text-2xl font-bold transition-colors active:scale-95 text-slate-200">−</button>
                    <div className="flex flex-col items-center">
                        <span className="text-4xl font-black tabular-nums text-white">{diceCount}</span>
                        <span className="text-xs text-slate-400">顆骰子</span>
                    </div>
                    <button onClick={() => setPacks(packs + 1)} className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 text-2xl font-bold transition-colors active:scale-95 text-slate-200">+</button>
                </div>
                <p className="text-center mb-4 text-lg text-slate-200">總價: <span className="font-black text-2xl text-orange-400">{totalCost} ⭐</span></p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 font-bold transition-colors text-slate-200">取消</button>
                    <button onClick={handlePurchase} disabled={!canAfford || purchaseDiceMutation.isPending} className="flex-1 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {purchaseDiceMutation.isPending ? '購買中...' : '確認購買'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============ SVG CONNECTORS — neon snakes & ladders on dark board ============
const SnakeLadderConnectors: React.FC<{ events: TowerEvent[] }> = ({ events }) => {
    const buildLadder = (sx: number, sy: number, ex: number, ey: number) => {
        const dx = ex - sx, dy = ey - sy;
        const len = Math.hypot(dx, dy);
        const steps = Math.max(3, Math.round(len / 28));
        const perpX = -dy / len * 8;
        const perpY = dx / len * 8;
        const elements: React.ReactNode[] = [];

        const rail1 = `M ${sx + perpX} ${sy + perpY} L ${ex + perpX} ${ey + perpY}`;
        const rail2 = `M ${sx - perpX} ${sy - perpY} L ${ex - perpX} ${ey - perpY}`;
        // Glow
        elements.push(<path key="g1" d={rail1} stroke="#fbbf24" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.15} />);
        elements.push(<path key="g2" d={rail2} stroke="#fbbf24" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.15} />);
        // Rails
        elements.push(<path key="r1" d={rail1} stroke="#fbbf24" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.9} />);
        elements.push(<path key="r2" d={rail2} stroke="#fbbf24" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.9} />);

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const rx = sx + dx * t, ry = sy + dy * t;
            elements.push(
                <line key={`rung-${i}`} x1={rx + perpX} y1={ry + perpY} x2={rx - perpX} y2={ry - perpY}
                    stroke="#fde68a" strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
            );
        }
        return elements;
    };

    const buildSnake = (sx: number, sy: number, ex: number, ey: number) => {
        const dx = ex - sx, dy = ey - sy;
        const len = Math.hypot(dx, dy);
        const waves = Math.max(2, Math.round(len / 50));
        const perpX = -dy / len;
        const perpY = dx / len;
        const amp = 14;

        const pts: string[] = [`M ${sx} ${sy}`];
        const segments = waves * 8;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const bx = sx + dx * t;
            const by = sy + dy * t;
            const offset = Math.sin(t * waves * Math.PI * 2) * amp;
            pts.push(`L ${bx + perpX * offset} ${by + perpY * offset}`);
        }

        const elements: React.ReactNode[] = [];
        const pathD = pts.join(' ');

        elements.push(<path key="glow" d={pathD} stroke="#f87171" strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.15} />);
        elements.push(<path key="body" d={pathD} stroke="#ef4444" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />);
        elements.push(<path key="pat" d={pathD} stroke="#fca5a5" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeDasharray="3 6" opacity={0.4} />);
        elements.push(<circle key="head" cx={ex} cy={ey} r={6} fill="#dc2626" opacity={0.9} />);
        elements.push(<circle key="eye1" cx={ex - 2} cy={ey - 2} r={1.5} fill="#fecaca" />);
        elements.push(<circle key="eye2" cx={ex + 2} cy={ey - 2} r={1.5} fill="#fecaca" />);
        elements.push(<path key="tongue" d={`M ${ex} ${ey + 5} l -2 4 M ${ex} ${ey + 5} l 2 4`} stroke="#f87171" strokeWidth={1.2} fill="none" />);

        return elements;
    };

    return (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: BOARD_W, height: BOARD_H }} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
            <defs>
                <filter id="sl-glow">
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

                return (
                    <g key={`sl-${ev.floor_number}`} filter="url(#sl-glow)">
                        {isLadder ? buildLadder(sx, sy, ex, ey) : buildSnake(sx, sy, ex, ey)}
                        <circle cx={sx} cy={sy} r={4} fill={isLadder ? '#fbbf24' : '#ef4444'} opacity={0.7} />
                    </g>
                );
            })}
        </svg>
    );
};

// ============ MAIN COMPONENT ============
export const MonsterTowerV2: React.FC<MonsterTowerV2Props> = ({ userId, isOpen, onClose }) => {
    const { data: progress } = useTowerProgress(userId);

    // Seed for random events — set once on mount, only changes on tower reset
    const [eventSeed, setEventSeed] = useState(() => Date.now());
    const events = useMemo(() => generateRandomEvents(eventSeed), [eventSeed]);
    const rollDiceMutation = useRollDice();
    const resetTowerMutation = useResetTower();
    const lotteryRewardMutation = useLotteryReward();
    const hatchEggMutation = useHatchEgg();
    const upgradeMonsterMutation = useUpgradeMonster();


    const boardRef = useRef<HTMLDivElement>(null);

    const [isRolling, setIsRolling] = useState(false);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showLotteryWheel, setShowLotteryWheel] = useState(false);
    const [showPurchase, setShowPurchase] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [hatchingIndex, setHatchingIndex] = useState<number | null>(null);
    const [hatchedMonster, setHatchedMonster] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [upgradingMonster, setUpgradingMonster] = useState<string | null>(null);
    const [evolvedReveal, setEvolvedReveal] = useState<string | null>(null);
    const [displayDice, setDisplayDice] = useState(1);
    const [animatingFloor, setAnimatingFloor] = useState<number | null>(null);
    const [isHopping, setIsHopping] = useState(false);
    const [eventMessage, setEventMessage] = useState<string | null>(null);

    // Derive eggs and monsters from monsters_collected
    const allItems = progress?.monsters_collected || [];
    const eggs = allItems.filter(m => m.startsWith('egg:')).map((m, i) => ({ eggIndex: i, monsterId: m.replace('egg:', '') }));
    const monsters = allItems.filter(m => !m.startsWith('egg:'));

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
        setDisplayDice(1);

        // Lock the starting position BEFORE the mutation so cache
        // invalidation won't cause the player to teleport.
        const start = currentFloor;
        setAnimatingFloor(start);

        await new Promise(r => setTimeout(r, 800));

        try {
            const result = await rollDiceMutation.mutateAsync({ userId, currentFloor: start, clientEvents: events });
            setDisplayDice(result.roll);
            setIsRolling(false);
            await new Promise(r => setTimeout(r, 400));

            // Step-by-step movement from start to intermediate
            const intermediate = Math.min(start + result.roll, 100);
            for (let f = start + 1; f <= intermediate; f++) {
                setIsHopping(true);
                setAnimatingFloor(f);
                scrollToFloor(f);
                await new Promise(r => setTimeout(r, 280));
                setIsHopping(false);
                await new Promise(r => setTimeout(r, 50));
            }

            // Handle ladder/snake event
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

            // Show egg collection toast
            if (result.event?.event_type === 'egg' && result.event.monster_id) {
                const monsterInfo = MONSTERS[result.event.monster_id as keyof typeof MONSTERS];
                setEventMessage(`🥚 獲得怪獸蛋！${monsterInfo?.emoji || '🥚'}`);
                await new Promise(r => setTimeout(r, 1500));
                setEventMessage(null);
            }

            // Release animation lock — player now follows currentFloor from cache
            setAnimatingFloor(null);
            if (result.reachedTop) setTimeout(() => setShowVictory(true), 400);
        } catch (error) {
            console.error('Roll failed:', error);
            setIsRolling(false);
            setAnimatingFloor(null);
        }
    }, [diceCount, isRolling, currentFloor, userId, rollDiceMutation, scrollToFloor]);

    const handleLotteryComplete = useCallback(async (prize: Prize) => {
        // 1. Award the prize (coins, dice, or monster)
        try {
            await lotteryRewardMutation.mutateAsync({ userId, prizeType: prize.type, prizeValue: prize.value, monsterId: prize.monsterId, prizeName: prize.name });
        } catch (e) { console.error('Lottery failed:', e); }

        // 2. Close all modals
        setShowLotteryWheel(false);
        setShowVictory(false);

        // 3. Reset the tower (back to floor 1)
        try {
            await resetTowerMutation.mutateAsync({ userId });
        } catch (e) { console.error('Reset failed:', e); }

        // 4. New seed → new snake/ladder positions for next game
        setEventSeed(Date.now());

        // 5. Scroll back to start
        setTimeout(() => scrollToFloor(1), 300);
    }, [userId, lotteryRewardMutation, resetTowerMutation, scrollToFloor]);

    const handleReset = useCallback(async () => {
        try { await resetTowerMutation.mutateAsync({ userId }); setShowVictory(false); } catch (e) { console.error('Reset failed:', e); }
        setEventSeed(Date.now()); // New seed → new snake/ladder positions
        setTimeout(() => scrollToFloor(1), 300);
    }, [userId, resetTowerMutation, scrollToFloor]);

    if (!isOpen) return null;

    const displayFloor = animatingFloor ?? currentFloor;
    const playerPos = getTilePosition(displayFloor);
    const zone = getZone(displayFloor);
    const progressPct = ((displayFloor - 1) / (TOTAL_TILES - 1)) * 100;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 backdrop-blur-sm">
            <div className="tv2-shell w-full max-w-md h-[92vh] overflow-hidden flex flex-col relative rounded-3xl">

                {/* ── Header ── */}
                <div className="relative z-20 px-4 py-3 flex items-center justify-between tv2-header">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${zone.bg} flex items-center justify-center text-lg shadow-md`}>🏰</div>
                        <div className="min-w-0">
                            <h2 className="font-extrabold text-[15px] text-cyan-100 leading-tight tracking-tight">怪獸塔 V2</h2>
                            <p className="text-[11px] font-semibold text-slate-400 truncate" data-testid="zone-name">{zone.name} · Floor {displayFloor} / {TOTAL_TILES}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors active:scale-90" data-testid="close-tower-v2">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* ── Progress bar ── */}
                <div className="relative z-20 h-[3px] bg-slate-700">
                    <div className="h-full transition-all duration-700 ease-out rounded-r-full" style={{ width: `${progressPct}%`, background: zone.accent, boxShadow: `0 0 8px ${zone.accent}88` }} />
                </div>

                {/* ── Stats row ── */}
                <div className="relative z-20 px-4 py-2 flex items-center gap-5 tv2-stats">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🎲</span>
                        <span className="font-extrabold text-sm tabular-nums text-cyan-300" data-testid="dice-count">{diceCount}</span>
                    </div>
                    {/* Simplified Stats: Removed Stars & Roll Result as per user request */}
                </div>

                {/* ── Game Board ── */}
                <div ref={boardRef} className="flex-1 overflow-y-auto overflow-x-hidden relative tv2-board-scroll" data-testid="tower-v2-board" style={{ scrollBehavior: 'smooth' }}>
                    <div className="relative mx-auto" style={{ width: BOARD_W, height: BOARD_H }}>

                        {/* Snake & Ladder connectors (behind tiles) */}
                        <SnakeLadderConnectors events={events.filter(e => e.target_floor)} />

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
                                        left: pos.x - TILE_CELL_W / 2,
                                        bottom: pos.y - TILE_CELL_H / 2,
                                        width: TILE_CELL_W,
                                        height: TILE_CELL_H,
                                    }}
                                    data-testid={`tile-${n}`}
                                >
                                    <IsoBrick n={n} isCurrent={isCurrent} isPast={isPast} zone={tileZone} event={event} />
                                </div>
                            );
                        })}

                        {/* Player token – stands centered ON the brick */}
                        <div
                            className={`tv2-player ${isHopping ? 'tv2-player-hop' : ''}`}
                            style={{
                                left: playerPos.x - 20,
                                bottom: playerPos.y - 2,
                                transition: isHopping ? 'none' : 'left 0.3s ease, bottom 0.3s ease',
                            }}
                            data-testid="player-token"
                        >
                            <img
                                src="/images/tower-v2/player.png"
                                alt="player"
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Event overlay ── */}
                {eventMessage && (
                    <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none">
                        <div className="tv2-event-toast">
                            <p className="text-lg font-extrabold text-white">{eventMessage}</p>
                            {showEvent?.target_floor && (
                                <p className="text-xs font-semibold text-slate-400 mt-1">移動到第 {showEvent.target_floor} 層</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Controls ── */}
                <div className="relative z-20 tv2-controls">
                    <div className="flex items-center gap-3 justify-center">
                        <button onClick={handleRoll} disabled={diceCount <= 0 || isRolling} className="tv2-roll-btn group" data-testid="roll-dice-btn">
                            <div className={`${isRolling ? 'tv2-dice-spin' : 'group-hover:scale-110 group-active:scale-95 transition-transform'}`}>
                                <DiceFace value={displayDice} size={40} />
                            </div>
                            <span className="font-extrabold text-[15px] text-cyan-200">{isRolling ? '擲出中…' : '擲骰子'}</span>
                        </button>
                        <button onClick={() => setShowPurchase(true)} className="tv2-side-btn" data-testid="purchase-dice-btn"><ShoppingCart size={18} /></button>
                        <button onClick={() => setShowCollection(true)} className="tv2-side-btn relative" data-testid="collection-btn">
                            <FolderOpen size={18} />
                            {eggs.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                                    {eggs.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Victory → Lottery flow ── */}
                {showVictory && !showLotteryWheel && (
                    <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-[2000] backdrop-blur-sm">
                        <div className="tv2-victory tv2-pop-in">
                            <div className="text-6xl mb-2">🏆</div>
                            <h2 className="text-2xl font-black text-cyan-100 mb-1">登頂成功！</h2>
                            <p className="text-slate-400 text-sm mb-2">恭喜你攻克怪獸塔 100 層！</p>
                            <p className="text-amber-300 text-xs mb-5">轉動輪盤獲得星幣或稀有怪獸蛋！</p>
                            <button
                                onClick={() => setShowLotteryWheel(true)}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02]"
                                data-testid="lottery-wheel-btn"
                            >
                                🎡 轉動抽獎輪盤！
                            </button>
                            <button
                                onClick={handleReset}
                                className="w-full mt-2 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95"
                            >
                                <RotateCcw size={14} /> 跳過，直接重新挑戰
                            </button>
                        </div>
                    </div>
                )}

                {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}
                {showLotteryWheel && <LotteryWheel onComplete={handleLotteryComplete} />}

                {/* ── Collection Folder ── */}
                {showCollection && (
                    <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-[2000] backdrop-blur-sm">
                        <div className="tv2-pop-in w-[90%] max-w-sm max-h-[80vh] flex flex-col bg-slate-800 rounded-3xl border border-slate-600 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="font-extrabold text-lg text-cyan-200 flex items-center gap-2">
                                    <FolderOpen size={20} /> 我的收藏
                                </h3>
                                <button onClick={() => { setShowCollection(false); setHatchedMonster(null); setHatchingIndex(null); setLightboxIndex(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors">
                                    <X size={18} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Eggs Section */}
                                <div>
                                    <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1">🥚 未孵化的蛋 ({eggs.length})</h4>
                                    {eggs.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-4">還沒有蛋，繼續冒險吧！</p>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            {eggs.map((egg, idx) => {
                                                const isHatching = hatchingIndex === idx;
                                                return (
                                                    <button
                                                        key={`egg-${idx}`}
                                                        onClick={async () => {
                                                            if (hatchEggMutation.isPending || isHatching) return;
                                                            setHatchingIndex(idx);
                                                            await new Promise(r => setTimeout(r, 1200));
                                                            try {
                                                                await hatchEggMutation.mutateAsync({ userId, eggIndex: idx });
                                                                setHatchedMonster(egg.monsterId);
                                                            } catch (e) { console.error('Hatch failed:', e); }
                                                            setHatchingIndex(null);
                                                        }}
                                                        disabled={hatchEggMutation.isPending}
                                                        className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        <span className={`text-3xl ${isHatching ? 'tv2-egg-shake' : ''}`} style={{ filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.4))' }}>🥚</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">點擊孵化</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Monsters Section — grouped by type with counts */}
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1">👾 我的怪獸 ({monsters.length})</h4>
                                    {monsters.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-4">孵化蛋來獲得怪獸！</p>
                                    ) : (() => {
                                        // Group monsters by type
                                        const grouped = new Map<string, number>();
                                        monsters.forEach(mId => grouped.set(mId, (grouped.get(mId) || 0) + 1));
                                        const groupedEntries = Array.from(grouped.entries());

                                        return (
                                            <div className="grid grid-cols-3 gap-3">
                                                {groupedEntries.map(([mId, count], idx) => {
                                                    const info = MONSTERS[mId as MonsterId];
                                                    const isEvolved = (info as any)?.isEvolved;
                                                    const canEvolve = !isEvolved && EVOLUTION_MAP[mId as MonsterId] && count >= EVOLUTION_COST;
                                                    const isUpgrading = upgradingMonster === mId;

                                                    return (
                                                        <div key={`mon-${mId}`} className="relative">
                                                            <button
                                                                onClick={() => {
                                                                    // Find index in full monster list for lightbox
                                                                    const flatIdx = groupedEntries.slice(0, idx).reduce((acc, [, c]) => acc + c, 0);
                                                                    setLightboxIndex(flatIdx);
                                                                }}
                                                                className={`flex flex-col items-center gap-1 p-3 rounded-2xl w-full transition-all active:scale-95 ${isEvolved
                                                                        ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-2 border-amber-500/60 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                                                                        : 'bg-slate-700/40 border border-slate-600/50 hover:bg-slate-600/60'
                                                                    }`}
                                                            >
                                                                {/* Count badge */}
                                                                {count > 1 && (
                                                                    <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-md">
                                                                        ×{count}
                                                                    </span>
                                                                )}
                                                                {/* Evolved crown */}
                                                                {isEvolved && (
                                                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm" style={{ filter: 'drop-shadow(0 1px 3px rgba(251,191,36,0.6))' }}>👑</span>
                                                                )}
                                                                {info?.image ? (
                                                                    <img src={info.image} alt={info.name} className="w-10 h-10 object-contain" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                                                                ) : (
                                                                    <span className="text-3xl">{info?.emoji || '❓'}</span>
                                                                )}
                                                                <span className="text-[10px] text-slate-300 font-bold text-center leading-tight">{info?.name || mId}</span>
                                                            </button>

                                                            {/* Upgrade button */}
                                                            {canEvolve && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (upgradeMonsterMutation.isPending) return;
                                                                        setUpgradingMonster(mId);
                                                                        await new Promise(r => setTimeout(r, 800));
                                                                        try {
                                                                            const result = await upgradeMonsterMutation.mutateAsync({ userId, monsterId: mId as MonsterId });
                                                                            setEvolvedReveal(result.evolvedId);
                                                                        } catch (e) { console.error('Upgrade failed:', e); }
                                                                        setUpgradingMonster(null);
                                                                    }}
                                                                    disabled={upgradeMonsterMutation.isPending}
                                                                    className={`mt-1 w-full py-1 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${isUpgrading
                                                                            ? 'bg-amber-600 text-white animate-pulse'
                                                                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 active:scale-95'
                                                                        }`}
                                                                >
                                                                    <Sparkles size={10} />
                                                                    {isUpgrading ? '進化中...' : `進化 (${count}/${EVOLUTION_COST})`}
                                                                </button>
                                                            )}
                                                            {/* Progress toward evolution */}
                                                            {!isEvolved && EVOLUTION_MAP[mId as MonsterId] && count < EVOLUTION_COST && count > 1 && (
                                                                <div className="mt-1 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${(count / EVOLUTION_COST) * 100}%` }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* ── Monster Lightbox ── */}
                        {lightboxIndex !== null && monsters.length > 0 && (() => {
                            const mId = monsters[lightboxIndex];
                            const info = MONSTERS[mId as MonsterId];
                            const isEvolved = (info as any)?.isEvolved;

                            // Touch swipe handlers
                            let touchStartX = 0;
                            const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
                            const handleTouchEnd = (e: React.TouchEvent) => {
                                const dx = e.changedTouches[0].clientX - touchStartX;
                                if (Math.abs(dx) > 50) {
                                    if (dx > 0) setLightboxIndex(prev => prev !== null ? (prev - 1 + monsters.length) % monsters.length : null);
                                    else setLightboxIndex(prev => prev !== null ? (prev + 1) % monsters.length : null);
                                }
                            };

                            return (
                                <div
                                    className="absolute inset-0 flex items-center justify-center z-[2100] bg-black/90 backdrop-blur-md"
                                    onClick={() => setLightboxIndex(null)}
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <div className="relative w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
                                        {/* Close button */}
                                        <button
                                            onClick={() => setLightboxIndex(null)}
                                            className="absolute -top-2 -right-2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 border border-slate-500 shadow-lg transition-colors active:scale-90"
                                        >
                                            <X size={18} className="text-slate-300" />
                                        </button>

                                        {/* Nav arrows */}
                                        <button
                                            onClick={() => setLightboxIndex(prev => prev !== null ? (prev - 1 + monsters.length) % monsters.length : null)}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 border border-slate-500 shadow-lg transition-colors active:scale-90"
                                        >
                                            <ChevronLeft size={22} className="text-slate-300" />
                                        </button>
                                        <button
                                            onClick={() => setLightboxIndex(prev => prev !== null ? (prev + 1) % monsters.length : null)}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 border border-slate-500 shadow-lg transition-colors active:scale-90"
                                        >
                                            <ChevronRight size={22} className="text-slate-300" />
                                        </button>

                                        {/* Monster card */}
                                        <div className={`p-6 rounded-3xl text-center ${isEvolved
                                                ? 'bg-gradient-to-br from-slate-800 to-amber-950/60 border-2 border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]'
                                                : 'bg-slate-800 border border-slate-600 shadow-2xl'
                                            }`}>
                                            {isEvolved && (
                                                <div className="text-2xl mb-2" style={{ filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))' }}>👑</div>
                                            )}
                                            <div className="text-4xl mb-3">{info?.emoji || '❓'}</div>
                                            {info?.image ? (
                                                <img
                                                    src={info.image}
                                                    alt={info?.name}
                                                    className="w-48 h-48 mx-auto mb-4 object-contain"
                                                    style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.6))', animation: 'tv2-idle 2s ease-in-out infinite' }}
                                                />
                                            ) : (
                                                <div className="text-8xl mb-4" style={{ animation: 'tv2-idle 2s ease-in-out infinite' }}>{info?.emoji || '❓'}</div>
                                            )}
                                            <h3 className={`text-xl font-black mb-1 ${isEvolved ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400' : 'text-white'
                                                }`}>
                                                {info?.name || mId}
                                            </h3>
                                            <p className="text-slate-400 text-sm mb-2">{info?.zone || '未知區域'}</p>
                                            {isEvolved && (
                                                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">✨ 進化形態</span>
                                            )}
                                            <p className="text-slate-500 text-xs mt-3">{lightboxIndex + 1} / {monsters.length}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Hatched monster reveal overlay */}
                        {hatchedMonster && (
                            <div className="absolute inset-0 flex items-center justify-center z-[2200] bg-black/80 animate-popup-in" onClick={() => setHatchedMonster(null)}>
                                <div className="text-center tv2-pop-in" onClick={e => e.stopPropagation()}>
                                    <div className="text-6xl mb-3" style={{ animation: 'tv2-idle 1.2s ease-in-out infinite' }}>
                                        {MONSTERS[hatchedMonster as MonsterId]?.emoji || '✨'}
                                    </div>
                                    {MONSTERS[hatchedMonster as MonsterId]?.image && (
                                        <img
                                            src={MONSTERS[hatchedMonster as MonsterId].image}
                                            alt="monster"
                                            className="w-24 h-24 mx-auto mb-3 object-contain"
                                            style={{ animation: 'tv2-idle 1.2s ease-in-out infinite', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
                                        />
                                    )}
                                    <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 mb-1">
                                        孵化成功！
                                    </h3>
                                    <p className="text-white font-bold text-lg mb-1">
                                        {MONSTERS[hatchedMonster as MonsterId]?.name || hatchedMonster}
                                    </p>
                                    <p className="text-slate-400 text-sm mb-4">
                                        來自 {MONSTERS[hatchedMonster as MonsterId]?.zone || '未知區域'}
                                    </p>
                                    <button onClick={() => setHatchedMonster(null)} className="px-6 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg active:scale-95 transition-all">
                                        太棒了！
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Evolved monster reveal overlay */}
                        {evolvedReveal && (
                            <div className="absolute inset-0 flex items-center justify-center z-[2200] bg-black/90 backdrop-blur-sm" onClick={() => setEvolvedReveal(null)}>
                                <div className="text-center tv2-pop-in" onClick={e => e.stopPropagation()}>
                                    <div className="text-4xl mb-2" style={{ filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.6))' }}>👑</div>
                                    <div className="text-5xl mb-3" style={{ animation: 'tv2-idle 1.2s ease-in-out infinite' }}>
                                        {MONSTERS[evolvedReveal as MonsterId]?.emoji || '✨'}
                                    </div>
                                    {MONSTERS[evolvedReveal as MonsterId]?.image && (
                                        <img
                                            src={MONSTERS[evolvedReveal as MonsterId].image}
                                            alt="evolved monster"
                                            className="w-32 h-32 mx-auto mb-3 object-contain"
                                            style={{ animation: 'tv2-idle 1.2s ease-in-out infinite', filter: 'drop-shadow(0 6px 20px rgba(251,191,36,0.4))' }}
                                        />
                                    )}
                                    <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 mb-1">
                                        進化成功！
                                    </h3>
                                    <p className="text-white font-bold text-lg mb-1">
                                        {MONSTERS[evolvedReveal as MonsterId]?.name || evolvedReveal}
                                    </p>
                                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-4">✨ 進化限定</span>
                                    <div>
                                        <button onClick={() => setEvolvedReveal(null)} className="px-6 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg active:scale-95 transition-all">
                                            太棒了！
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
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
        <button onClick={onClick} className="clay-card p-4 w-full text-left hover:scale-[1.02] transition-transform group" data-testid="monster-tower-v2-open">
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
