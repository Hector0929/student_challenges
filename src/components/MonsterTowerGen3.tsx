import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Dices, ShoppingCart, FolderOpen, Shield, Zap, Sparkles, Heart, Crosshair, Hammer, Compass } from 'lucide-react';
import {
    MONSTERS,
    useRollDice,
    useTowerProgress,
    generateRandomEvents,
    type MonsterId,
    type ActiveTeamMember,
    type TeamEffectDetail,
} from '../hooks/useTowerProgress';
import {
    GEN3_TOTAL_FLOORS,
    applyRouteMode,
    getMonsterRole,
    withEncounterTiles,
    type TeamRole,
} from '../lib/towerGen3Rules';
import { TILE_W, TILE_H, getBoardSize, getTilePlacement } from '../lib/towerIsoLayout';
import { useStarBalance } from '../hooks/useQuests';
import { DicePurchaseModal } from './tower/DicePurchaseModal';
import { TowerCollectionPanel } from './tower/TowerCollectionPanel';
import { TowerVictoryFlow } from './tower/TowerVictoryFlow';
import { TowerChallengeOverlay } from './tower/TowerChallengeOverlay';
import { RETRIES_PER_MONSTERS } from './tower/challenges/types';
import type { TowerEvent } from '../types/database';

const COMPANION_STORAGE_KEY = 'monster_tower_gen3_companion_v1';

// ── 2.5D 等角棋盤幾何配置（投影數學在 lib/towerIsoLayout.ts） ──
const TILE_CELL_W = TILE_W;
const TILE_CELL_H = TILE_H;
const { width: BOARD_W, height: BOARD_H } = getBoardSize(GEN3_TOTAL_FLOORS);

const ROLE_META: Record<TeamRole, { label: string; icon: React.FC<{ size?: number; className?: string }>; color: string }> = {
    guardian: { label: '守護', icon: Shield, color: 'text-emerald-400' },
    striker: { label: '輸出', icon: Zap, color: 'text-amber-400' },
    controller: { label: '控場', icon: Crosshair, color: 'text-purple-400' },
    support: { label: '支援', icon: Heart, color: 'text-rose-400' },
    breaker: { label: '破甲', icon: Hammer, color: 'text-orange-400' },
};

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

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 一步的節奏；開啟減少動態時縮短，避免長時間晃動 */
const STEP_MS = 190;
const SLIDE_STEP_MS = 130;

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

// ── 隊伍出手演出：明確告訴玩家「是哪一隻怪獸幫了忙、幫了多少」 ──
const TEAM_EFFECT_THEME: Record<TeamEffectDetail['kind'], { ring: string; glow: string; badge: string; badgeText: string; accent: string; icon: string }> = {
    trap_shield: {
        ring: 'border-emerald-400/70',
        glow: 'rgba(52, 211, 153, 0.55)',
        badge: 'bg-emerald-500/20 border-emerald-400/50',
        badgeText: 'text-emerald-200',
        accent: 'from-emerald-200 via-teal-100 to-emerald-300',
        icon: '🛡️',
    },
    ladder_boost: {
        ring: 'border-cyan-400/70',
        glow: 'rgba(34, 211, 238, 0.55)',
        badge: 'bg-cyan-500/20 border-cyan-400/50',
        badgeText: 'text-cyan-200',
        accent: 'from-cyan-200 via-sky-100 to-cyan-300',
        icon: '🌀',
    },
    monster_bonus: {
        ring: 'border-amber-400/70',
        glow: 'rgba(251, 191, 36, 0.55)',
        badge: 'bg-amber-500/20 border-amber-400/50',
        badgeText: 'text-amber-200',
        accent: 'from-amber-200 via-yellow-100 to-orange-300',
        icon: '⚡',
    },
};

const TeamEffectBurst: React.FC<{ effect: TeamEffectDetail }> = ({ effect }) => {
    const theme = TEAM_EFFECT_THEME[effect.kind];
    const roleMeta = ROLE_META[(effect.role as TeamRole)] ?? ROLE_META.striker;
    const monsterImage = MONSTERS[effect.monsterId as MonsterId]?.image;

    return (
        <div className="absolute inset-0 z-[2500] flex items-center justify-center pointer-events-none px-4">
            <div
                className={`gen3-effect-burst relative w-full max-w-sm rounded-3xl border-2 ${theme.ring} bg-slate-950/95 backdrop-blur-md px-6 py-5 text-center shadow-2xl`}
                style={{ boxShadow: `0 0 60px ${theme.glow}, 0 24px 60px rgba(0,0,0,0.65)` }}
            >
                {/* 光暈脈動 */}
                <div
                    className="absolute inset-0 rounded-3xl animate-ping opacity-20 pointer-events-none"
                    style={{ border: `2px solid ${theme.glow}` }}
                />

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold mb-3 ${theme.badge} ${theme.badgeText}`}>
                    <span>{theme.icon}</span>
                    <span>{roleMeta.label}夥伴出手！</span>
                </div>

                {/* 出手的怪獸 */}
                <div className="gen3-effect-monster mx-auto mb-2 flex items-center justify-center">
                    {monsterImage ? (
                        <img
                            src={monsterImage}
                            alt={effect.monsterName}
                            className="w-20 h-20 object-contain"
                            style={{ filter: `drop-shadow(0 6px 18px ${theme.glow})` }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <span className="text-6xl" style={{ filter: `drop-shadow(0 6px 18px ${theme.glow})` }}>{effect.monsterEmoji}</span>
                    )}
                </div>

                <h3 className={`text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r ${theme.accent}`}>
                    {effect.title}
                </h3>
                <p className="text-lg font-black text-white mb-1.5">{effect.monsterName}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{effect.message}</p>

                {/* 具體數字，讓「少滑了幾層」一眼看得到 */}
                {effect.kind === 'trap_shield' && effect.floorsChanged > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40">
                        <span className="text-xs text-emerald-200 font-bold">少滑落</span>
                        <span className="text-2xl font-black text-emerald-300 tabular-nums leading-none">{effect.floorsChanged}</span>
                        <span className="text-xs text-emerald-200 font-bold">層</span>
                    </div>
                )}
                {effect.kind === 'ladder_boost' && effect.floorsChanged > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/40">
                        <span className="text-xs text-cyan-200 font-bold">額外爬升</span>
                        <span className="text-2xl font-black text-cyan-300 tabular-nums leading-none">{effect.floorsChanged}</span>
                        <span className="text-xs text-cyan-200 font-bold">層</span>
                    </div>
                )}
                {effect.kind === 'monster_bonus' && effect.bonusStars > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/40">
                        <span className="text-xs text-amber-200 font-bold">額外獲得</span>
                        <span className="text-2xl font-black text-amber-300 tabular-nums leading-none">{effect.bonusStars}</span>
                        <span className="text-xs text-amber-200 font-bold">星幣 ⭐</span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface MonsterTowerGen3Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const MonsterTowerGen3: React.FC<MonsterTowerGen3Props> = ({ userId, isOpen, onClose }) => {
    const { data: progress, refetch } = useTowerProgress(userId);
    const rollDiceMutation = useRollDice();

    // 每局重新種一次亂數種子，梯子/陷阱位置每次破頂重玩都會洗牌，避免玩家把棋盤背下來
    const [eventSeed, setEventSeed] = useState(() => Date.now());

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [lastDevNote, setLastDevNote] = useState('準備好了！點擊「擲骰子」開始攀登怪獸塔。');
    const [routeMode, setRouteMode] = useState<'safe' | 'risk'>('safe');
    const [animatedFloor, setAnimatedFloor] = useState<number | null>(null);
    const [selectedTileFloor, setSelectedTileFloor] = useState<number | null>(null);
    const [showPurchase, setShowPurchase] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showVictory, setShowVictory] = useState(false);
    const [teamEffectPopup, setTeamEffectPopup] = useState<TeamEffectDetail | null>(null);
    // 踩到守門怪獸格時要打的挑戰關卡樓層（null = 沒有挑戰進行中）
    const [challengeFloor, setChallengeFloor] = useState<number | null>(null);
    // 每開一場挑戰 +1，用來強制重新掛載挑戰元件（同一層再次觸發也要是全新一場）
    const [challengeRunId, setChallengeRunId] = useState(0);
    // 撿到怪獸蛋時要演出的怪獸 id
    const [eggReveal, setEggReveal] = useState<string | null>(null);
    // 玩家自己挑的隨行夥伴（null = 交給系統自動挑最稀有的那隻）
    const [chosenCompanionId, setChosenCompanionId] = useState<MonsterId | null>(null);
    const [showCompanionPicker, setShowCompanionPicker] = useState(false);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const cameraTargetRef = useRef(0);
    // 等角盤面比舊的矩形盤面寬，手機上等比縮到容器寬度，避免被裁切
    const [boardScale, setBoardScale] = useState(1);
    // 每跳一格 +1，用來重新觸發跳躍動畫（重新掛載才會重播 CSS animation）
    const [hopTick, setHopTick] = useState(0);

    const { data: starBalance = 0 } = useStarBalance(userId);

    const currentFloor = progress?.current_floor ?? 1;
    const diceCount = progress?.dice_count ?? 0;

    // 解析孩子累積獲得的所有怪獸（包含先前版本獲得的怪獸）
    const ownedMonsterIds = useMemo(() => {
        const raw = progress?.monsters_collected ?? [];
        return raw.filter((id) => !id.startsWith('egg:')) as MonsterId[];
    }, [progress?.monsters_collected]);

    // 未孵化的怪獸蛋，餵給共用的收藏／孵蛋面板
    const eggs = useMemo(() => {
        const raw = progress?.monsters_collected ?? [];
        return raw
            .filter((id) => id.startsWith('egg:'))
            .map((id, index) => ({ eggIndex: index, monsterId: id.replace('egg:', '') }));
    }, [progress?.monsters_collected]);

    // 梯子/陷阱每局隨機（沿用 V1/V2 既有的 generateRandomEvents），
    // 里程碑怪獸蛋固定在 25/50/75/100 層——這是 generateRandomEvents 本身就會保證的安排。
    const baseEvents = useMemo(() => withEncounterTiles(generateRandomEvents(eventSeed), eventSeed), [eventSeed]);
    const activeEvents = useMemo(() => applyRouteMode(baseEvents, routeMode), [baseEvents, routeMode]);

    // 隨行夥伴：自動挑收藏中最稀有的一隻（進化形態優先，其次解鎖樓層高者）。
    // 刻意不做編隊介面——孩子不需要在開局前設定任何東西。
    const ownedUniqueMonsters = useMemo(
        () => Array.from(new Set(ownedMonsterIds)).filter((monsterId) => !!MONSTERS[monsterId]),
        [ownedMonsterIds],
    );

    const companion = useMemo(() => {
        const owned = ownedUniqueMonsters;
        if (owned.length === 0) return null;
        // 玩家自己挑過就用他挑的（前提是還在收藏裡）
        if (chosenCompanionId && owned.includes(chosenCompanionId)) return MONSTERS[chosenCompanionId];
        const ranked = [...owned].sort((a, b) => {
            const monsterA = MONSTERS[a];
            const monsterB = MONSTERS[b];
            const evolvedA = 'isEvolved' in monsterA && monsterA.isEvolved ? 1 : 0;
            const evolvedB = 'isEvolved' in monsterB && monsterB.isEvolved ? 1 : 0;
            if (evolvedA !== evolvedB) return evolvedB - evolvedA;
            return monsterB.unlockFloor - monsterA.unlockFloor;
        });
        return MONSTERS[ranked[0]];
    }, [chosenCompanionId, ownedUniqueMonsters]);

    // 擲骰規則只需要知道「隨行夥伴是誰、會什麼」
    const activeTeam = useMemo<ActiveTeamMember[]>(() => {
        if (!companion) return [];
        return [{
            id: companion.id,
            name: companion.name,
            emoji: companion.emoji,
            role: getMonsterRole(companion.id as MonsterId),
        }];
    }, [companion]);

    const eventMap = useMemo(() => new Map(activeEvents.map((event) => [event.floor_number, event])), [activeEvents]);

    // 挑戰重試次數的來源：收藏怪獸數，帶「輸出／破甲」夥伴再多一次。
    // （這是輸出定位在新玩法裡的用途——守門怪獸格已改成挑戰關卡，不再自動給星幣）
    const challengeRetryCredit = useMemo(() => {
        const companionRoleId = companion ? getMonsterRole(companion.id as MonsterId) : null;
        const strikerBonus = companionRoleId === 'striker' || companionRoleId === 'breaker' ? RETRIES_PER_MONSTERS : 0;
        return ownedMonsterIds.length + strikerBonus;
    }, [companion, ownedMonsterIds.length]);

    // 讀回玩家上次挑的隨行夥伴
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const saved = window.localStorage.getItem(`${COMPANION_STORAGE_KEY}:${userId}`);
            if (saved && MONSTERS[saved as MonsterId]) setChosenCompanionId(saved as MonsterId);
        } catch {
            // 忽略讀取異常，改用自動挑選
        }
    }, [userId]);

    const handleChooseCompanion = useCallback((monsterId: MonsterId) => {
        setChosenCompanionId(monsterId);
        setShowCompanionPicker(false);
        setLastDevNote(`${MONSTERS[monsterId]?.name} 開始跟著你一起爬塔！`);
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(`${COMPANION_STORAGE_KEY}:${userId}`, monsterId);
        } catch {
            // 忽略儲存異常
        }
    }, [userId]);

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

    const displayFloor = animatedFloor ?? currentFloor;

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

    const handleRoll = async () => {
        if (isRolling || isMoving || diceCount <= 0 || challengeFloor !== null) return;
        setIsRolling(true);
        try {
            const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
            const startFloor = currentFloor;
            setAnimatedFloor(startFloor);

            const result = await rollDiceMutation.mutateAsync({
                userId,
                currentFloor: startFloor,
                clientEvents: activeEvents,
                activeTeam,
            });

            setIsMoving(true);
            const reachedFloor = result.progress.current_floor;
            const routeTag = routeMode === 'risk' ? '冒險路' : '安全路';

            const stepMs = prefersReducedMotion() ? 60 : STEP_MS;
            const slideMs = prefersReducedMotion() ? 50 : SLIDE_STEP_MS;

            const intermediateFloor = Math.min(startFloor + result.roll, GEN3_TOTAL_FLOORS);
            for (let floor = startFloor + 1; floor <= intermediateFloor; floor += 1) {
                setAnimatedFloor(floor);
                setHopTick((tick) => tick + 1);
                scrollToFloor(floor);
                await wait(stepMs);
            }

            if (reachedFloor !== intermediateFloor) {
                const direction = reachedFloor > intermediateFloor ? 1 : -1;
                const event = eventMap.get(intermediateFloor);
                const eventDesc = event?.description ?? (direction > 0 ? '搭乘升降梯上升！' : '不小心掉入陷阱！');
                setLastDevNote(`擲出 🎲 ${result.roll} 點！到達 ${intermediateFloor} 層，${eventDesc}`);
                await wait(280);

                // 隊伍出手時，先把「是誰幫了忙、少滑幾層」演出來，玩家才看得懂
                // 為什麼這次沒有滑到蛇的另一端。
                if (result.teamEffect) {
                    setTeamEffectPopup(result.teamEffect);
                    await wait(900);
                }

                for (let step = intermediateFloor + direction; direction > 0 ? step <= reachedFloor : step >= reachedFloor; step += direction) {
                    setAnimatedFloor(step);
                    setHopTick((tick) => tick + 1);
                    scrollToFloor(step);
                    await wait(slideMs);
                }

                if (result.teamEffect) {
                    await wait(700);
                    setTeamEffectPopup(null);
                }
            } else if (result.teamEffect) {
                // 守門怪獸格不會移動，落地後直接演出擊破畫面
                setTeamEffectPopup(result.teamEffect);
                await wait(1600);
                setTeamEffectPopup(null);
            }

            const finalEvent = eventMap.get(reachedFloor);
            const eventText = finalEvent ? `，觸發事件：${finalEvent.description ?? finalEvent.event_type}` : '';
            setLastDevNote(`抵達第 ${reachedFloor} 層（${routeTag}）${eventText} ${result.teamEffect ? `✨ ${result.teamEffect.message}` : '🎉'}`);
            await refetch();
            setAnimatedFloor(null);

            // 撿到怪獸蛋 → 先演出拿到蛋的畫面，讓孩子知道有東西可以去孵
            if (finalEvent?.event_type === 'egg' && finalEvent.monster_id) {
                setEggReveal(finalEvent.monster_id);
            }

            // 踩到守門怪獸格 → 跳出塔內挑戰關卡
            if (finalEvent?.event_type === 'monster') {
                setChallengeRunId((id) => id + 1);
                setChallengeFloor(reachedFloor);
            } else if (result.reachedTop) {
                setTimeout(() => setShowVictory(true), 400);
            }
        } catch (error) {
            console.error('Gen3 roll failed', error);
            setLastDevNote('擲骰失敗，請稍候重試。');
            setAnimatedFloor(null);
        } finally {
            setIsRolling(false);
            setIsMoving(false);
        }
    };

    const handleRestart = useCallback(() => {
        setShowVictory(false);
        setEventSeed(Date.now()); // 破頂重玩：梯子/陷阱重新洗牌
        setSelectedTileFloor(null);
        setTimeout(() => scrollToFloor(1), 300);
    }, [scrollToFloor]);

    if (!isOpen) return null;

    const progressPercent = Math.round(((currentFloor - 1) / (GEN3_TOTAL_FLOORS - 1)) * 100);
    const floorTheme = getFloorTheme(currentFloor);
    const selectedFloorInfo = selectedTileFloor ? eventMap.get(selectedTileFloor) : null;
    const selectedFloorTheme = selectedTileFloor ? getFloorTheme(selectedTileFloor) : null;

    const companionRole = companion ? getMonsterRole(companion.id as MonsterId) : null;

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
                        onFinish={() => setChallengeFloor(null)}
                    />
                )}

                {/* ── 換隨行夥伴：只挑一隻，不是編隊 ── */}
                {showCompanionPicker && (
                    <div
                        className="absolute inset-0 z-[2350] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowCompanionPicker(false)}
                    >
                        <div
                            className="w-full max-w-sm max-h-[80%] flex flex-col rounded-3xl border-2 border-amber-500/40 bg-slate-950 shadow-2xl overflow-hidden gen3-effect-burst"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950">
                                <div>
                                    <h3 className="font-black text-sm text-amber-200">挑一隻夥伴一起爬塔</h3>
                                    <p className="text-[11px] text-slate-400">夥伴的定位會決定路上幫你做什麼</p>
                                </div>
                                <button
                                    onClick={() => setShowCompanionPicker(false)}
                                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* 定位說明：讓孩子知道挑不同定位差在哪 */}
                            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                                🛡️ 守護／支援：踩到陷阱少滑一半
                                🌀 控場／支援：搭電梯多爬 2 層
                                ⚡ 輸出／破甲：挑戰多一次重試
                            </div>

                            <div className="flex-1 overflow-y-auto p-3">
                                {ownedUniqueMonsters.length === 0 ? (
                                    <p className="text-center text-sm text-slate-500 py-8">
                                        還沒有夥伴，先去孵一顆怪獸蛋吧！
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {ownedUniqueMonsters.map((monsterId) => {
                                            const monster = MONSTERS[monsterId];
                                            const role = getMonsterRole(monsterId);
                                            const roleInfo = ROLE_META[role];
                                            const RoleIcon = roleInfo.icon;
                                            const isCurrent = companion?.id === monsterId;

                                            return (
                                                <button
                                                    key={monsterId}
                                                    onClick={() => handleChooseCompanion(monsterId)}
                                                    data-testid={`companion-option-${monsterId}`}
                                                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                                                        isCurrent
                                                            ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                                                            : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                                                    }`}
                                                >
                                                    {monster.image ? (
                                                        <img src={monster.image} alt={monster.name} className="w-10 h-10 object-contain" />
                                                    ) : (
                                                        <span className="text-3xl">{monster.emoji}</span>
                                                    )}
                                                    <span className="text-[11px] font-bold text-slate-100 text-center leading-tight">{monster.name}</span>
                                                    <span className={`text-[10px] flex items-center gap-0.5 font-bold ${roleInfo.color}`}>
                                                        <RoleIcon size={10} /> {roleInfo.label}
                                                    </span>
                                                    {isCurrent && <span className="text-[9px] text-amber-300 font-black">出戰中</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 撿到怪獸蛋 ── */}
                {eggReveal && (
                    <div
                        className="absolute inset-0 z-[2450] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setEggReveal(null)}
                    >
                        <div
                            className="gen3-effect-burst w-full max-w-xs rounded-3xl border-2 border-amber-400/70 bg-slate-950/95 px-6 py-6 text-center shadow-2xl"
                            style={{ boxShadow: '0 0 60px rgba(251,191,36,0.45), 0 24px 60px rgba(0,0,0,0.65)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="gen3-effect-monster text-6xl mb-2">🥚</div>
                            <h3 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-300">
                                撿到怪獸蛋！
                            </h3>
                            <p className="text-lg font-black text-white mb-1">
                                {MONSTERS[eggReveal as MonsterId]?.name ?? '神秘怪獸'}
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed mb-4">
                                蛋已經放進「收藏」裡了，點右下角的 🗂 就可以孵化牠。
                            </p>
                            <button
                                onClick={() => {
                                    setEggReveal(null);
                                    setShowCollection(true);
                                }}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg active:scale-95 transition-transform mb-2"
                            >
                                去孵蛋！
                            </button>
                            <button
                                onClick={() => setEggReveal(null)}
                                className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors active:scale-95"
                            >
                                繼續爬塔
                            </button>
                        </div>
                    </div>
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

