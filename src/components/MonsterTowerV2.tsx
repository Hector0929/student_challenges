/**
 * Monster Tower V2 – Snakes & Ladders Board Game
 * Isometric 3D floating block tiles with dark theme.
 * Numbers behind tiles, player stands ON TOP of bricks.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { X, ShoppingCart, FolderOpen } from 'lucide-react';
import {
    useTowerProgress,
    useRollDice,
    generateRandomEvents,
    MONSTERS,
} from '../hooks/useTowerProgress';
import { DicePurchaseModal } from './tower/DicePurchaseModal';
import { TowerCollectionPanel } from './tower/TowerCollectionPanel';
import { TowerVictoryFlow } from './tower/TowerVictoryFlow';
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

    const boardRef = useRef<HTMLDivElement>(null);

    const [isRolling, setIsRolling] = useState(false);
    const [showEvent, setShowEvent] = useState<TowerEvent | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [showPurchase, setShowPurchase] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
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

    // Called by TowerVictoryFlow once the reward is claimed (or skipped) and the
    // tower has already been reset to floor 1 server-side.
    const handleRestart = useCallback(() => {
        setShowVictory(false);
        setEventSeed(Date.now()); // New seed → new snake/ladder positions for next game
        setTimeout(() => scrollToFloor(1), 300);
    }, [scrollToFloor]);

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
                <TowerVictoryFlow userId={userId} open={showVictory} onRestart={handleRestart} />

                {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}

                {/* ── Collection Folder ── */}
                <TowerCollectionPanel
                    userId={userId}
                    isOpen={showCollection}
                    onClose={() => setShowCollection(false)}
                    eggs={eggs}
                    monsters={monsters}
                />
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
