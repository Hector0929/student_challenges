import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Dices, ShoppingCart, FolderOpen, Sparkles, Compass } from 'lucide-react';
import { useTowerProgress, type MonsterId } from '../hooks/useTowerProgress';
import { GEN3_TOTAL_FLOORS } from '../lib/towerGen3Rules';
import { TILE_W, TILE_H, getBoardSize, getTilePlacement } from '../lib/towerIsoLayout';
import { DicePurchaseModal } from './tower/DicePurchaseModal';
import { TowerCollectionPanel } from './tower/TowerCollectionPanel';
import { TowerVictoryFlow } from './tower/TowerVictoryFlow';
import { TowerChallengeOverlay } from './tower/TowerChallengeOverlay';
import { CompanionPicker, EggReveal, TeamEffectBurst } from './tower/TowerGameOverlays';
import { ROLE_META } from './tower/roleMeta';
import { prefersReducedMotion, useTowerGame } from './tower/useTowerGame';
import type { TowerEvent } from '../types/database';

// ── 2.5D 等角棋盤幾何配置（投影數學在 lib/towerIsoLayout.ts） ──
const TILE_CELL_W = TILE_W;
const TILE_CELL_H = TILE_H;
const { width: BOARD_W, height: BOARD_H } = getBoardSize(GEN3_TOTAL_FLOORS);

function getFloorTheme(floor: number): { name: string; bg: string; color: string; desc: string } {
    if (floor <= 20) return { name: '晨霧草原', bg: 'from-emerald-900/40 to-teal-950/60', color: '#34d399', desc: '綠草如茵，微風徐徐的冒險起點' };
    if (floor <= 40) return { name: '冰晶斷崖', bg: 'from-cyan-900/40 to-blue-950/60', color: '#22d3ee', desc: '晶瑩剔透的寒冰秘境' };
    if (floor <= 60) return { name: '熔岩工坊', bg: 'from-amber-900/40 to-orange-950/60', color: '#f59e0b', desc: '翻滾岩漿與灼熱鐵鉆的鍛造之所' };
    if (floor <= 80) return { name: '機械雲城', bg: 'from-indigo-900/40 to-slate-950/60', color: '#818cf8', desc: '漂浮在雲端的精密機關要塞' };
    return { name: '星穹神殿', bg: 'from-purple-900/40 to-rose-950/60', color: '#fb7185', desc: '群星璀璨的終極聖域' };
}

// 樓層座標：等角折返坡道投影（自下而上蛇行攀登）
function getTilePosition(floor: number) {
    return getTilePlacement(floor, GEN3_TOTAL_FLOORS);
}

/** 盤面最大放大倍率（寬螢幕用），超過會讓一次看到的樓層太少 */
const MAX_BOARD_SCALE = 1.5;

// 五大區域的主題樣式與厚度色彩。
// Gen3 專屬地塊放在 /images/tower-gen3/，由 scripts/generate_tower_gen3_tiles.py 產生，
// 五張共用同一組底座幾何所以能無縫接成坡道，且原生就是去背 PNG。
// （V2 仍然用自己的 /images/tower-v2/ 那組，兩版互不影響）
const ZONES = [
    { from: 1, to: 20, name: '晨霧草原', glow: '#34d399', topColor: '#10b981', sideColor: '#064e3b', img: '/images/tower-gen3/tile_grass.png' },
    { from: 21, to: 40, name: '冰晶斷崖', glow: '#22d3ee', topColor: '#06b6d4', sideColor: '#164e63', img: '/images/tower-gen3/tile_ice.png' },
    { from: 41, to: 60, name: '熔岩工坊', glow: '#f59e0b', topColor: '#d97706', sideColor: '#78350f', img: '/images/tower-gen3/tile_lava.png' },
    { from: 61, to: 80, name: '機械雲城', glow: '#818cf8', topColor: '#6366f1', sideColor: '#312e81', img: '/images/tower-gen3/tile_tech.png' },
    { from: 81, to: 100, name: '星穹神殿', glow: '#c084fc', topColor: '#a855f7', sideColor: '#4c1d95', img: '/images/tower-gen3/tile_temple.png' },
];
type Zone = typeof ZONES[0];
const getZone = (floor: number): Zone => ZONES.find((z) => floor >= z.from && floor <= z.to) || ZONES[0];

// ── 2.5D 等角立體積木塊 (IsoBrick 升級版) ──
const IsoBrick: React.FC<{
    n: number;
    isCurrent: boolean;
    isPast: boolean;
    isSelected: boolean;
    zone: Zone;
    event?: TowerEvent;
    onClick: () => void;
}> = ({ n, isCurrent, isPast, isSelected, zone, event, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="group cursor-pointer transition-transform duration-200 active:scale-95"
            style={{ width: TILE_CELL_W, height: TILE_CELL_H, position: 'relative' }}
        >
            {/* 樓層編號：磚塊彼此重疊成坡道後，加一顆深色小底讓數字不被鄰塊吃掉 */}
            <span
                style={{
                    color: isPast ? '#cbd5e1' : isCurrent ? '#fef08a' : '#ffffff',
                    zIndex: 12,
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    fontWeight: 800,
                    lineHeight: 1,
                    padding: '2px 5px',
                    borderRadius: 999,
                    background: isCurrent ? 'rgba(120, 53, 15, 0.85)' : 'rgba(2, 6, 23, 0.72)',
                    border: isCurrent ? '1px solid rgba(254, 240, 138, 0.7)' : '1px solid rgba(148, 163, 184, 0.25)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                    pointerEvents: 'none',
                }}
            >
                {n}
            </span>

            {/* 2.5D 立體地塊底層接地陰影 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: -6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 58,
                    height: 14,
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 75%)',
                    borderRadius: '50%',
                    zIndex: 1,
                    pointerEvents: 'none',
                }}
            />

            {/* 2.5D 等角塊本體 */}
            <div
                className={`relative transition-all duration-300 ${isCurrent ? 'scale-110' : 'group-hover:-translate-y-1'}`}
                style={{
                    width: 68,
                    height: 68,
                    position: 'absolute',
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    filter: isPast
                        ? 'grayscale(0.65) brightness(0.7)'
                        : isCurrent
                        ? `brightness(1.15) drop-shadow(0 0 14px ${zone.glow})`
                        : isSelected
                        ? 'brightness(1.2) drop-shadow(0 0 10px #fbbf24)'
                        : 'drop-shadow(0 6px 8px rgba(0,0,0,0.4))',
                    zIndex: 2,
                }}
            >
                <img
                    src={zone.img}
                    alt={`Tile ${n}`}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    onError={(e) => {
                        // 圖片失敗時降級為純 CSS 立體塊
                        e.currentTarget.style.display = 'none';
                    }}
                />

                {/* 當前格子呼吸光環 */}
                {isCurrent && (
                    <div
                        className="absolute inset-0 rounded-2xl animate-ping opacity-30 pointer-events-none"
                        style={{ border: `2px solid ${zone.glow}` }}
                    />
                )}
            </div>

            {/* 事件圖示標記 */}
            {event && (
                <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 text-lg z-10 transition-transform group-hover:scale-125"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                >
                    {event.event_type === 'ladder' && '🪜'}
                    {event.event_type === 'trap' && '🐍'}
                    {event.event_type === 'egg' && '🥚'}
                    {event.event_type === 'treasure' && '💎'}
                    {event.event_type === 'monster' && '👾'}
                </div>
            )}
        </div>
    );
};

// ── 連續路徑與發光梯蛇軌道 (2.5D Path & Ladder Connectors) ──
const PathConnectors: React.FC<{ events: TowerEvent[]; totalFloors: number; currentFloor: number }> = ({
    events,
    totalFloors,
    currentFloor,
}) => {
    // 繪製梯子
    const buildLadder = (sx: number, sy: number, ex: number, ey: number) => {
        const dx = ex - sx, dy = ey - sy;
        const len = Math.hypot(dx, dy) || 1;
        const steps = Math.max(3, Math.round(len / 26));
        const perpX = (-dy / len) * 9;
        const perpY = (dx / len) * 9;
        const elements: React.ReactNode[] = [];
        const rail1 = `M ${sx + perpX} ${sy + perpY} L ${ex + perpX} ${ey + perpY}`;
        const rail2 = `M ${sx - perpX} ${sy - perpY} L ${ex - perpX} ${ey - perpY}`;

        elements.push(<path key="g1" d={rail1} stroke="#fbbf24" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.25} />);
        elements.push(<path key="g2" d={rail2} stroke="#fbbf24" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.25} />);
        elements.push(<path key="r1" d={rail1} stroke="#f59e0b" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.95} />);
        elements.push(<path key="r2" d={rail2} stroke="#f59e0b" strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.95} />);

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const rx = sx + dx * t, ry = sy + dy * t;
            elements.push(
                <line
                    key={`rung-${i}`}
                    x1={rx + perpX}
                    y1={ry + perpY}
                    x2={rx - perpX}
                    y2={ry - perpY}
                    stroke="#fef08a"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.9}
                />
            );
        }
        return elements;
    };

    // 繪製滑落藤蔓/蛇
    const buildSnake = (sx: number, sy: number, ex: number, ey: number) => {
        const dx = ex - sx, dy = ey - sy;
        const len = Math.hypot(dx, dy) || 1;
        const waves = Math.max(2, Math.round(len / 48));
        const perpX = -dy / len;
        const perpY = dx / len;
        const amp = 16;
        const pts: string[] = [`M ${sx} ${sy}`];
        const segments = waves * 8;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const bx = sx + dx * t;
            const by = sy + dy * t;
            const offset = Math.sin(t * waves * Math.PI * 2) * amp;
            pts.push(`L ${bx + perpX * offset} ${by + perpY * offset}`);
        }
        const pathD = pts.join(' ');
        return (
            <g key={`snake-${sx}-${sy}`}>
                <path d={pathD} stroke="#f87171" strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.2} />
                <path d={pathD} stroke="#ef4444" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
                <path d={pathD} stroke="#fecaca" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeDasharray="4 6" opacity={0.5} />
                <circle cx={ex} cy={ey} r={7} fill="#dc2626" opacity={0.95} />
                <circle cx={ex - 2} cy={ey - 2} r={1.8} fill="#ffffff" />
                <circle cx={ex + 2} cy={ey - 2} r={1.8} fill="#ffffff" />
            </g>
        );
    };

    // 繪製相鄰格子之間的連續發光微光路徑
    const trailSegments = useMemo(() => {
        const paths: React.ReactNode[] = [];
        for (let f = 1; f < totalFloors; f++) {
            const p1 = getTilePosition(f);
            const p2 = getTilePosition(f + 1);
            const x1 = p1.x, y1 = BOARD_H - p1.y;
            const x2 = p2.x, y2 = BOARD_H - p2.y;
            const isUnlocked = f <= currentFloor;
            paths.push(
                <line
                    key={`trail-${f}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isUnlocked ? '#38bdf8' : '#334155'}
                    strokeWidth={isUnlocked ? 3 : 1.5}
                    strokeDasharray={isUnlocked ? 'none' : '4 4'}
                    strokeLinecap="round"
                    opacity={isUnlocked ? 0.6 : 0.25}
                />
            );
        }
        return paths;
    }, [totalFloors, currentFloor]);

    return (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: BOARD_W, height: BOARD_H }} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
            <defs>
                <filter id="gen3-ladder-glow">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* 連續微光道路 */}
            <g opacity={0.7}>{trailSegments}</g>

            {/* 梯子與滑落通道 */}
            {events.map((ev) => {
                if (!ev.target_floor) return null;
                const isLadder = ev.event_type === 'ladder';
                const s = getTilePosition(ev.floor_number);
                const e = getTilePosition(ev.target_floor);
                const sx = s.x, sy = BOARD_H - s.y;
                const ex = e.x, ey = BOARD_H - e.y;
                return (
                    <g key={`sl-${ev.floor_number}`} filter="url(#gen3-ladder-glow)">
                        {isLadder ? buildLadder(sx, sy, ex, ey) : buildSnake(sx, sy, ex, ey)}
                        <circle cx={sx} cy={sy} r={5} fill={isLadder ? '#fbbf24' : '#ef4444'} opacity={0.8} />
                    </g>
                );
            })}
        </svg>
    );
};

interface MonsterTowerGen3Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const MonsterTowerGen3: React.FC<MonsterTowerGen3Props> = ({ userId, isOpen, onClose }) => {
    const [selectedTileFloor, setSelectedTileFloor] = useState<number | null>(null);
    const [showPurchase, setShowPurchase] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showCompanionPicker, setShowCompanionPicker] = useState(false);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const cameraTargetRef = useRef(0);
    // 等角盤面比舊的矩形盤面寬，手機上等比縮到容器寬度，避免被裁切
    const [boardScale, setBoardScale] = useState(1);

    // 相機：只設定目標，實際位移交給下面的 rAF 迴圈平滑跟隨。
    // （舊版每一步都呼叫一次 smooth scrollTo，前一次還沒到就被下一次打斷，所以會一頓一頓的）
    const scrollToFloor = useCallback((floor: number) => {
        const element = boardRef.current;
        if (!element) return;
        const tile = getTilePosition(floor);
        // 盤面有等比縮放，換算成實際捲動距離；主角維持在畫面偏下 40% 處
        const target = Math.max(0, (BOARD_H - tile.y) * boardScale - element.clientHeight * 0.6);
        cameraTargetRef.current = target;
        if (prefersReducedMotion()) element.scrollTop = target;
    }, [boardScale]);

    // 擲骰、移動、事件、夥伴、挑戰都在共用的遊戲流程裡（V4 也用同一份）
    const game = useTowerGame({ userId, onStep: scrollToFloor });
    const {
        currentFloor,
        diceCount,
        starBalance,
        ownedMonsterIds,
        ownedUniqueMonsters,
        eggs,
        activeEvents,
        eventMap,
        routeMode,
        setRouteMode,
        companion,
        companionRole,
        challengeRetryCredit,
        isRolling,
        isMoving,
        hopTick,
        note: lastDevNote,
        teamEffectPopup,
        challengeFloor,
        challengeRunId,
        eggReveal,
        showVictory,
        displayFloor,
    } = game;

    // 盤面等比縮放，讓等角坡道在窄螢幕也完整看得到
    useEffect(() => {
        if (!isOpen) return;
        const element = boardRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return;

        const fit = () => {
            const available = element.clientWidth - 32; // 扣掉容器的 p-4 內距
            if (available <= 0) return;
            // 寬螢幕時放大到最多 1.5 倍填滿版面（移除側欄後左右本來會空一大片），
            // 窄螢幕則照舊等比縮小以免被裁掉。地塊原圖 200px，放大到 1.5 倍仍然不會糊。
            setBoardScale(Math.min(MAX_BOARD_SCALE, available / BOARD_W));
        };

        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        return () => observer.disconnect();
    }, [isOpen]);

    // 相機平滑跟隨（阻尼追蹤，不用 smooth scroll 以免連續呼叫互相打斷）
    useEffect(() => {
        if (!isOpen || prefersReducedMotion()) return;
        let alive = true;
        let frame = 0;
        const follow = () => {
            if (!alive) return;
            const element = boardRef.current;
            if (element) {
                const diff = cameraTargetRef.current - element.scrollTop;
                if (Math.abs(diff) > 0.5) element.scrollTop += diff * 0.16;
            }
            frame = requestAnimationFrame(follow);
        };
        frame = requestAnimationFrame(follow);
        return () => {
            alive = false;
            cancelAnimationFrame(frame);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const id = window.setTimeout(() => {
            scrollToFloor(displayFloor);
        }, 150);
        return () => window.clearTimeout(id);
    }, [displayFloor, isOpen, scrollToFloor]);

    const handleRoll = game.roll;

    const handleChooseCompanion = (monsterId: MonsterId) => {
        game.chooseCompanion(monsterId);
        setShowCompanionPicker(false);
    };

    const handleRestart = () => {
        game.restart();
        setSelectedTileFloor(null);
        window.setTimeout(() => scrollToFloor(1), 300);
    };

    if (!isOpen) return null;

    const progressPercent = Math.round(((currentFloor - 1) / (GEN3_TOTAL_FLOORS - 1)) * 100);
    const floorTheme = getFloorTheme(currentFloor);
    const selectedFloorInfo = selectedTileFloor ? eventMap.get(selectedTileFloor) : null;
    const selectedFloorTheme = selectedTileFloor ? getFloorTheme(selectedTileFloor) : null;


    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md p-2 sm:p-4 flex items-center justify-center animate-fadeIn">
            <div className="w-full max-w-5xl h-[94vh] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-slate-100 rounded-3xl border-2 border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
                
                {/* ── 頂部導航欄 (Top Bar) ── */}
                <header className="px-5 py-3 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg border border-amber-200">
                            🏰
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black tracking-wide bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
                                    怪獸塔 V3 · 奇幻冒險
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                    2.5D 立體版
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-2">
                                <span>{floorTheme.name}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-cyan-300">第 {currentFloor} 層 / 100</span>
                            </p>
                        </div>
                    </div>

                    {/* 資源統計與關閉 */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-2xl border border-slate-700/60 text-xs">
                            <span className="flex items-center gap-1 text-yellow-300 font-bold">
                                ⭐ {starBalance} 星星
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="flex items-center gap-1 text-cyan-300 font-bold">
                                🎲 {diceCount} 骰子
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors flex items-center justify-center shadow-md"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {/* ── 主內容：全幅等角棋盤 ── */}
                <div className="flex-1 flex flex-col overflow-hidden relative">

                        {/* 狀態快捷列 */}
                        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">目前進度:</span>
                                <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <span className="font-bold text-amber-300">{progressPercent}%</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 hidden sm:inline">路線:</span>
                                <div className="flex rounded-xl border border-slate-700/80 overflow-hidden text-[11px]">
                                    <button
                                        onClick={() => setRouteMode('safe')}
                                        className={`px-2 py-1 transition ${
                                            routeMode === 'safe'
                                                ? 'bg-emerald-600 font-bold text-white shadow'
                                                : 'bg-slate-900 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        安全路
                                    </button>
                                    <button
                                        onClick={() => setRouteMode('risk')}
                                        className={`px-2 py-1 transition ${
                                            routeMode === 'risk'
                                                ? 'bg-rose-700 font-bold text-white shadow'
                                                : 'bg-slate-900 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        冒險路 🔥
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 2.5D 棋盤主舞台（含三層視差天色） */}
                        <div
                            ref={boardRef}
                            className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gradient-to-b from-[#0b1026] via-[#101b3b] to-[#070b18] select-none"
                        >
                            {/* 視差雲霧與光暈裝飾 */}
                            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.15),transparent_60%)]" />
                            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_80%_80%,rgba(244,63,94,0.15),transparent_60%)]" />

                            <div
                                className="relative mx-auto my-4"
                                data-testid="tower-gen3-board"
                                style={{
                                    width: BOARD_W,
                                    height: BOARD_H,
                                    transform: `scale(${boardScale})`,
                                    transformOrigin: 'top center',
                                    marginBottom: BOARD_H * (boardScale - 1),
                                }}
                            >
                                
                                {/* 連續路徑與發光軌道 */}
                                <PathConnectors
                                    events={activeEvents.filter((e) => !!e.target_floor)}
                                    totalFloors={GEN3_TOTAL_FLOORS}
                                    currentFloor={displayFloor}
                                />

                                {/* 2.5D 立體地塊陣列 */}
                                {Array.from({ length: GEN3_TOTAL_FLOORS }, (_, index) => {
                                    const floor = index + 1;
                                    const tile = getTilePosition(floor);
                                    const isCurrent = floor === displayFloor;
                                    const isPast = floor < displayFloor;
                                    const isSelected = floor === selectedTileFloor;
                                    const event = eventMap.get(floor);
                                    const tileZone = getZone(floor);

                                    return (
                                        <div
                                            key={floor}
                                            data-event-type={event?.event_type}
                                            data-testid={`tile-${floor}`}
                                            style={{
                                                position: 'absolute',
                                                left: tile.x - TILE_CELL_W / 2,
                                                bottom: tile.y - TILE_CELL_H / 2,
                                                width: TILE_CELL_W,
                                                height: TILE_CELL_H,
                                                zIndex: tile.depth,
                                                transform: `scale(${tile.scale})`,
                                                transformOrigin: 'bottom center',
                                                filter: `brightness(${(0.72 + tile.scale * 0.28).toFixed(3)})`,
                                            }}
                                        >
                                            <IsoBrick
                                                n={floor}
                                                isCurrent={isCurrent}
                                                isPast={isPast}
                                                isSelected={isSelected}
                                                zone={tileZone}
                                                event={event}
                                                onClick={() => setSelectedTileFloor(floor)}
                                            />
                                        </div>
                                    );
                                })}

                                {/* 玩家角色與出戰怪獸跟班 (2.5D 立體站位) */}
                                {(() => {
                                    const playerPos = getTilePosition(displayFloor);
                                    return (
                                        <div
                                            className="absolute pointer-events-none gen3-player"
                                            style={{
                                                left: playerPos.x - 28,
                                                bottom: playerPos.y + 4,
                                                zIndex: playerPos.depth + 50,
                                            }}
                                            data-testid="player-token"
                                        >
                                            {/* 落地塵土：每跳一格重播一次 */}
                                            <div key={`dust-${hopTick}`} className="gen3-dust absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full bg-white/25 blur-[3px]" />

                                            {/* 角色腳下接地柔邊陰影（跳起時縮小） */}
                                            <div
                                                key={`shadow-${hopTick}`}
                                                className="gen3-player-shadow absolute -bottom-1 left-1/2 w-10 h-3 bg-black/60 rounded-full blur-[2px]"
                                            />

                                            {/* 主角立繪：拋物線跳躍＋擠壓拉伸 */}
                                            <div
                                                key={`hop-${hopTick}`}
                                                className={`gen3-player-hop relative w-14 h-14 flex items-center justify-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] ${isMoving ? '' : 'gen3-player-idle'}`}
                                            >
                                                <img
                                                    src="/images/tower-v2/player.png"
                                                    alt="player"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        // 若無圖片則顯示可愛勇者頭像
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />

                                                {/* 隨行夥伴（浮動在身旁，自動挑選，不需編隊） */}
                                                {companion && (
                                                    <div
                                                        className="gen3-companion absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900/85 border border-amber-400/80 shadow-lg flex items-center justify-center"
                                                        title={`隨行夥伴：${companion.name}`}
                                                    >
                                                        <span className="text-base">{companion.emoji}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* 關卡情報泡泡：點任一格浮出，貼在棋盤上方不佔版面 */}
                            {selectedTileFloor && (
                                <div className="sticky bottom-3 left-0 right-0 mx-auto w-[min(92%,340px)] z-30 rounded-2xl border border-amber-500/40 bg-slate-950/95 backdrop-blur-md p-3.5 shadow-2xl animate-fadeIn">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                            {selectedFloorTheme?.name}
                                        </span>
                                        <button
                                            onClick={() => setSelectedTileFloor(null)}
                                            className="text-slate-400 hover:text-white text-xs"
                                        >
                                            關閉
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                                        <Compass size={15} className="text-cyan-400" />
                                        第 {selectedTileFloor} 層
                                    </h4>
                                    <p className="text-xs text-slate-300 mt-1">
                                        {selectedFloorInfo ? selectedFloorInfo.description : '一般攀登平台，平穩前進。'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 底部操作列：擲骰、商店、收藏、隨行夥伴 */}
                        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex items-center gap-3">
                            <button
                                onClick={handleRoll}
                                disabled={diceCount <= 0 || isRolling || isMoving}
                                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-black text-slate-950 shadow-lg flex items-center gap-2 text-base transition-all shrink-0"
                                data-testid="roll-dice-btn"
                            >
                                <Dices size={22} className={isRolling ? 'animate-spin' : ''} />
                                {isRolling || isMoving ? '前進中...' : `擲骰子 (${diceCount})`}
                            </button>

                            <button
                                onClick={() => setShowPurchase(true)}
                                className="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 flex items-center justify-center shrink-0 transition-colors"
                                title="購買骰子"
                                data-testid="purchase-dice-btn"
                            >
                                <ShoppingCart size={18} />
                            </button>

                            <button
                                onClick={() => setShowCollection(true)}
                                className="relative w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 flex items-center justify-center shrink-0 transition-colors"
                                title="怪獸收藏"
                                data-testid="collection-btn"
                            >
                                <FolderOpen size={18} />
                                {eggs.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 flex items-center justify-center animate-pulse">
                                        {eggs.length}
                                    </span>
                                )}
                            </button>

                            {/* 隨行夥伴：點一下就能換人（不是編隊，只挑一隻） */}
                            {companion && companionRole && (
                                <button
                                    onClick={() => setShowCompanionPicker(true)}
                                    data-testid="companion-btn"
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700 hover:border-amber-500/60 shrink-0 transition-colors active:scale-95"
                                    title={`隨行夥伴：${companion.name}（點擊更換）`}
                                >
                                    <span className="text-xl">{companion.emoji}</span>
                                    <div className="leading-tight text-left hidden sm:block">
                                        <p className="text-[11px] font-bold text-slate-200">{companion.name}</p>
                                        <span className={`text-[10px] flex items-center gap-0.5 font-bold ${ROLE_META[companionRole].color}`}>
                                            {React.createElement(ROLE_META[companionRole].icon, { size: 10 })}
                                            {ROLE_META[companionRole].label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-amber-300 font-bold">更換</span>
                                </button>
                            )}

                            <div className="flex-1 min-w-0 text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-400 shrink-0" />
                                <span className="truncate">{lastDevNote}</span>
                            </div>
                        </div>
                </div>

                {/* ── 塔內挑戰關卡（踩到守門怪獸格） ── */}
                {/* 只有真的有挑戰時才掛載，並用 runId 當 key：
                    否則元件會一直活著，上一場的 phase='result' 會被下一場沿用，
                    變成一遇到守門怪就直接跳出「挑戰成功」而沒有真的玩到。 */}
                {challengeFloor !== null && (
                    <TowerChallengeOverlay
                        key={challengeRunId}
                        userId={userId}
                        floor={challengeFloor}
                        collectionCount={challengeRetryCredit}
                        companionName={companion?.name}
                        onFinish={game.finishChallenge}
                    />
                )}

                {/* ── 換隨行夥伴：只挑一隻，不是編隊 ── */}
                {showCompanionPicker && (
                    <CompanionPicker
                        monsters={ownedUniqueMonsters}
                        currentId={companion?.id}
                        onChoose={handleChooseCompanion}
                        onClose={() => setShowCompanionPicker(false)}
                    />
                )}

                {/* ── 撿到怪獸蛋 ── */}
                {eggReveal && (
                    <EggReveal
                        monsterId={eggReveal}
                        onHatch={() => {
                            game.dismissEgg();
                            setShowCollection(true);
                        }}
                        onClose={game.dismissEgg}
                    />
                )}

                {/* ── 隨行夥伴出手演出（護盾／加速） ── */}
                {teamEffectPopup && <TeamEffectBurst effect={teamEffectPopup} />}

                {/* ── 破頂 → 抽獎輪盤流程 ── */}
                <TowerVictoryFlow userId={userId} open={showVictory} onRestart={handleRestart} />

                {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}

                {/* ── 收藏／孵蛋／進化 ── */}
                <TowerCollectionPanel
                    userId={userId}
                    isOpen={showCollection}
                    onClose={() => setShowCollection(false)}
                    eggs={eggs}
                    monsters={ownedMonsterIds}
                />
            </div>
        </div>
    );
};

export const TowerGen3Preview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);
    const currentFloor = progress?.current_floor ?? 1;
    const diceCount = progress?.dice_count ?? 0;
    const ownedMonsters = (progress?.monsters_collected ?? []).filter((id) => !id.startsWith('egg:')).length;
    const pct = Math.round(((currentFloor - 1) / (GEN3_TOTAL_FLOORS - 1)) * 100);

    return (
        <button
            onClick={onClick}
            className="w-full text-left clay-card p-4 hover:scale-[1.01] transition-transform border border-amber-400/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 shadow-xl"
            data-testid="monster-tower-gen3-open"
        >
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-3xl flex items-center justify-center shadow-lg border border-amber-300">
                    🏰
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-heading text-lg font-bold text-amber-300">怪獸塔 V3 · 奇幻新冒險</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                            2.5D
                        </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                        Floor {currentFloor} · 🎲 {diceCount} 骰子 · 👾 {ownedMonsters} 隻典藏夥伴
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MonsterTowerGen3;

