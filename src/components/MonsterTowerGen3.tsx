import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Dices, PlusCircle, Shield, Zap, Sparkles, Heart, Crosshair, Hammer, Award, Compass, Star, Info } from 'lucide-react';
import { MONSTERS, useAddDice, useRollDice, useTowerProgress, type MonsterId } from '../hooks/useTowerProgress';
import { useStarBalance } from '../hooks/useQuests';
import type { TowerEvent } from '../types/database';

type TeamRole = 'guardian' | 'striker' | 'controller' | 'support' | 'breaker';

type TeamPreset = {
    label: string;
    slots: MonsterId[];
};

const GEN3_TOTAL_FLOORS = 100;
const TEAM_PRESET_STORAGE_KEY = 'monster_tower_gen3_team_presets_v1';

// ── 2.5D 等角棋盤幾何配置 ──
const BOARD_COLS = 5;
const TILE_CELL_W = 74;       // 格子寬度
const TILE_CELL_H = 78;       // 格子高度（保留立體厚度空間）
const TILE_GAP = 8;           // 列間距
const ROW_GAP = 20;           // 行間垂直間距
const ROW_H = TILE_CELL_H + ROW_GAP;
const PAD_X = 24;
const PAD_BOTTOM = 60;
const BOARD_W = PAD_X * 2 + BOARD_COLS * TILE_CELL_W + (BOARD_COLS - 1) * TILE_GAP;
const TOTAL_ROWS = Math.ceil(GEN3_TOTAL_FLOORS / BOARD_COLS);
const BOARD_H = PAD_BOTTOM + TOTAL_ROWS * ROW_H + 60;

const GEN3_EVENTS: TowerEvent[] = [
    { id: 'gen3-10', floor_number: 10, event_type: 'monster', description: '精英守門怪：建議切成防守編隊', is_active: true },
    { id: 'gen3-15', floor_number: 15, event_type: 'treasure', reward_stars: 30, description: '古代補給箱：獲得額外資源', is_active: true },
    { id: 'gen3-20', floor_number: 20, event_type: 'ladder', target_floor: 24, description: '浮空升降梯：直升 4 層', is_active: true },
    { id: 'gen3-25', floor_number: 25, event_type: 'egg', monster_id: 'slime', description: '草原里程碑：小綠球怪獸蛋', is_active: true },
    { id: 'gen3-30', floor_number: 30, event_type: 'trap', target_floor: 27, description: '熔岩裂縫：滑落 3 層', is_active: true },
    { id: 'gen3-40', floor_number: 40, event_type: 'monster', description: '機關塔主：需要破甲角色', is_active: true },
    { id: 'gen3-50', floor_number: 50, event_type: 'egg', monster_id: 'water_spirit', description: '晶洞里程碑：水晶精靈怪獸蛋', is_active: true },
    { id: 'gen3-60', floor_number: 60, event_type: 'treasure', reward_stars: 80, description: '空島寶庫：戰備補強', is_active: true },
    { id: 'gen3-75', floor_number: 75, event_type: 'egg', monster_id: 'flame_bird', description: '熔岩里程碑：火焰鳥怪獸蛋', is_active: true },
    { id: 'gen3-90', floor_number: 90, event_type: 'monster', description: '最終前哨：壓力測試', is_active: true },
    { id: 'gen3-100', floor_number: 100, event_type: 'egg', monster_id: 'thunder_cloud', description: '雲巔里程碑：雷雲君怪獸蛋', is_active: true },
];

const GEN3_RISK_ROUTE_EVENTS: TowerEvent[] = [
    { id: 'gen3-risk-35', floor_number: 35, event_type: 'monster', description: '冒險路亂入：狂暴狩獵隊', is_active: true },
    { id: 'gen3-risk-55', floor_number: 55, event_type: 'trap', target_floor: 51, description: '冒險路陷阱：能量過載回退', is_active: true },
    { id: 'gen3-risk-85', floor_number: 85, event_type: 'treasure', reward_stars: 120, description: '冒險路獎勵：高壓寶庫', is_active: true },
];

const ROLE_BY_MONSTER: Partial<Record<MonsterId, TeamRole>> = {
    slime: 'guardian',
    mossy_golem: 'guardian',
    water_spirit: 'support',
    mystic_water: 'controller',
    flame_bird: 'striker',
    thunder_cloud: 'controller',
    cactus_boy: 'breaker',
    lucky_clover: 'support',
    rainbow_dragon: 'striker',
    nian_beast: 'striker',
};

const ROLE_META: Record<TeamRole, { label: string; icon: React.FC<{ size?: number; className?: string }>; color: string }> = {
    guardian: { label: '守護', icon: Shield, color: 'text-emerald-400' },
    striker: { label: '輸出', icon: Zap, color: 'text-amber-400' },
    controller: { label: '控場', icon: Crosshair, color: 'text-purple-400' },
    support: { label: '支援', icon: Heart, color: 'text-rose-400' },
    breaker: { label: '破甲', icon: Hammer, color: 'text-orange-400' },
};

function getMonsterRole(monsterId: MonsterId): TeamRole {
    return ROLE_BY_MONSTER[monsterId] ?? 'striker';
}

function getFloorTheme(floor: number): { name: string; bg: string; color: string; desc: string } {
    if (floor <= 20) return { name: '晨霧草原', bg: 'from-emerald-900/40 to-teal-950/60', color: '#34d399', desc: '綠草如茵，微風徐徐的冒險起點' };
    if (floor <= 40) return { name: '冰晶斷崖', bg: 'from-cyan-900/40 to-blue-950/60', color: '#22d3ee', desc: '晶瑩剔透的寒冰秘境' };
    if (floor <= 60) return { name: '熔岩工坊', bg: 'from-amber-900/40 to-orange-950/60', color: '#f59e0b', desc: '翻滾岩漿與灼熱鐵鉆的鍛造之所' };
    if (floor <= 80) return { name: '機械雲城', bg: 'from-indigo-900/40 to-slate-950/60', color: '#818cf8', desc: '漂浮在雲端的精密機關要塞' };
    return { name: '星穹神殿', bg: 'from-purple-900/40 to-rose-950/60', color: '#fb7185', desc: '群星璀璨的終極聖域' };
}

// 樓層座標計算（自下而上蛇行攀登）
function getTilePosition(floor: number): { x: number; y: number; row: number; col: number } {
    const row = Math.floor((floor - 1) / BOARD_COLS);
    const rawCol = (floor - 1) % BOARD_COLS;
    const col = row % 2 === 0 ? rawCol : BOARD_COLS - 1 - rawCol;
    const x = PAD_X + col * (TILE_CELL_W + TILE_GAP) + TILE_CELL_W / 2;
    const y = PAD_BOTTOM + row * ROW_H + TILE_CELL_H / 2;
    return { x, y, row, col };
}

// 五大區域的主題樣式與厚度色彩
const ZONES = [
    { from: 1, to: 20, name: '晨霧草原', glow: '#34d399', topColor: '#10b981', sideColor: '#064e3b', img: '/images/tower-v2/tile_grass.png' },
    { from: 21, to: 40, name: '冰晶斷崖', glow: '#22d3ee', topColor: '#06b6d4', sideColor: '#164e63', img: '/images/tower-v2/tile_mountain.png' },
    { from: 41, to: 60, name: '熔岩工坊', glow: '#f59e0b', topColor: '#d97706', sideColor: '#78350f', img: '/images/tower-v2/tile_cloud.png' },
    { from: 61, to: 80, name: '機械雲城', glow: '#818cf8', topColor: '#6366f1', sideColor: '#312e81', img: '/images/tower-v2/tile_starry.png' },
    { from: 81, to: 100, name: '星穹神殿', glow: '#fb7185', topColor: '#f43f5e', sideColor: '#881337', img: '/images/tower-v2/tile_castle.png' },
];
type Zone = typeof ZONES[0];
const getZone = (floor: number): Zone => ZONES.find((z) => floor >= z.from && floor <= z.to) || ZONES[0];

function getFactionByZone(zoneName?: string): string {
    if (!zoneName) return 'neutral';
    if (zoneName.includes('森林')) return 'forest';
    if (zoneName.includes('水晶')) return 'crystal';
    if (zoneName.includes('熔岩')) return 'magma';
    if (zoneName.includes('雲端')) return 'sky';
    if (zoneName.includes('太空')) return 'cosmos';
    if (zoneName.includes('塔頂')) return 'apex';
    return 'neutral';
}

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
            {/* 樓層編號 */}
            <span
                style={{
                    color: isPast ? '#94a3b8' : isCurrent ? '#fef08a' : 'rgba(255,255,255,0.95)',
                    zIndex: 12,
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: 800,
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
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
    const { data: progress, refetch } = useTowerProgress(userId);
    const rollDiceMutation = useRollDice();
    const addDiceMutation = useAddDice();

    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [isBagCollapsed, setIsBagCollapsed] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [lastDevNote, setLastDevNote] = useState('準備好了！點擊「擲骰子」開始攀登怪獸塔。');
    const [routeMode, setRouteMode] = useState<'safe' | 'risk'>('safe');
    const [teamSlots, setTeamSlots] = useState<MonsterId[]>([]);
    const [animatedFloor, setAnimatedFloor] = useState<number | null>(null);
    const [selectedTileFloor, setSelectedTileFloor] = useState<number | null>(null);
    const [teamPresets, setTeamPresets] = useState<TeamPreset[]>([
        { label: '小隊 A', slots: [] },
        { label: '小隊 B', slots: [] },
        { label: '小隊 C', slots: [] },
    ]);
    const boardRef = useRef<HTMLDivElement | null>(null);

    const { data: starBalance = 0 } = useStarBalance(userId);

    const currentFloor = progress?.current_floor ?? 1;
    const diceCount = progress?.dice_count ?? 0;

    // 解析孩子累積獲得的所有怪獸（包含先前版本獲得的怪獸）
    const ownedMonsterIds = useMemo(() => {
        const raw = progress?.monsters_collected ?? [];
        return raw.filter((id) => !id.startsWith('egg:')) as MonsterId[];
    }, [progress?.monsters_collected]);

    const uniqueOwnedMonsters = useMemo(() => {
        const list = Array.from(new Set(ownedMonsterIds)).filter((monsterId) => !!MONSTERS[monsterId]);
        // 若孩子剛開始玩尚未獲得怪獸，默認提供初號夥伴小綠球，確保背包有東西展示
        if (list.length === 0) return ['slime' as MonsterId];
        return list;
    }, [ownedMonsterIds]);

    // 預設將前 3 隻怪獸自動入隊
    useEffect(() => {
        if (teamSlots.length === 0 && uniqueOwnedMonsters.length > 0) {
            setTeamSlots(uniqueOwnedMonsters.slice(0, 3));
        }
    }, [uniqueOwnedMonsters, teamSlots.length]);

    const activeEvents = useMemo(() => {
        if (routeMode === 'safe') {
            return GEN3_EVENTS.filter((event) => event.event_type !== 'trap').sort((a, b) => a.floor_number - b.floor_number);
        }
        return [...GEN3_EVENTS, ...GEN3_RISK_ROUTE_EVENTS].sort((a, b) => a.floor_number - b.floor_number);
    }, [routeMode]);

    const eventMap = useMemo(() => new Map(activeEvents.map((event) => [event.floor_number, event])), [activeEvents]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(TEAM_PRESET_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as TeamPreset[];
            if (!Array.isArray(parsed) || parsed.length !== 3) return;
            const sanitized = parsed.map((preset, index) => ({
                label: typeof preset.label === 'string' && preset.label.trim() ? preset.label : `小隊 ${String.fromCharCode(65 + index)}`,
                slots: Array.isArray(preset.slots)
                    ? preset.slots.filter((id): id is MonsterId => typeof id === 'string' && !!MONSTERS[id as MonsterId]).slice(0, 3)
                    : [],
            }));
            setTeamPresets(sanitized);
        } catch {
            // 保留預設值
        }
    }, []);

    const persistPresets = (nextPresets: TeamPreset[]) => {
        setTeamPresets(nextPresets);
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(TEAM_PRESET_STORAGE_KEY, JSON.stringify(nextPresets));
        } catch {
            // 忽略儲存異常
        }
    };

    const teamPower = useMemo(() => {
        return teamSlots.reduce((acc, monsterId) => {
            const monster = MONSTERS[monsterId];
            if (!monster) return acc;
            const tierPower = Math.max(1, Math.ceil(monster.unlockFloor / 25));
            return acc + tierPower * 15;
        }, 0);
    }, [teamSlots]);

    const roleSummary = useMemo(() => {
        const countMap: Partial<Record<TeamRole, number>> = {};
        teamSlots.forEach((monsterId) => {
            const role = getMonsterRole(monsterId);
            countMap[role] = (countMap[role] ?? 0) + 1;
        });
        return countMap;
    }, [teamSlots]);

    const factionSummary = useMemo(() => {
        const countMap: Record<string, number> = {};
        teamSlots.forEach((monsterId) => {
            const faction = getFactionByZone(MONSTERS[monsterId]?.zone);
            countMap[faction] = (countMap[faction] ?? 0) + 1;
        });
        return countMap;
    }, [teamSlots]);

    const synergyBonuses = useMemo(() => {
        let bonusPercent = 0;
        const tags: string[] = [];

        if ((roleSummary.guardian ?? 0) >= 1 && (roleSummary.support ?? 0) >= 1) {
            bonusPercent += 10;
            tags.push('🛡️ 守護 + 支援：全隊生存 +10%');
        }

        if ((roleSummary.controller ?? 0) >= 1 && (roleSummary.striker ?? 0) >= 1) {
            bonusPercent += 15;
            tags.push('⚡ 控場 + 輸出：爆發連擊 +15%');
        }

        const hasDoubleFaction = Object.values(factionSummary).some((count) => count >= 2);
        if (hasDoubleFaction) {
            bonusPercent += 12;
            tags.push('🌟 同系羈絆：戰力加成 +12%');
        }

        return {
            bonusPercent,
            tags,
        };
    }, [factionSummary, roleSummary]);

    const finalTeamPower = useMemo(() => {
        return Math.round(teamPower * (1 + synergyBonuses.bonusPercent / 100));
    }, [synergyBonuses.bonusPercent, teamPower]);

    const displayFloor = animatedFloor ?? currentFloor;

    const scrollToFloor = useCallback((floor: number) => {
        if (!boardRef.current) return;
        const tile = getTilePosition(floor);
        const viewportHeight = boardRef.current.clientHeight;
        const target = BOARD_H - tile.y - viewportHeight / 2;
        boardRef.current.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const id = window.setTimeout(() => {
            scrollToFloor(displayFloor);
        }, 150);
        return () => window.clearTimeout(id);
    }, [displayFloor, isOpen, scrollToFloor]);

    const handleToggleTeam = (monsterId: MonsterId) => {
        setTeamSlots((prev) => {
            if (prev.includes(monsterId)) return prev.filter((id) => id !== monsterId);
            if (prev.length >= 3) {
                // 已滿 3 隻則替換最後一隻
                return [prev[0], prev[1], monsterId];
            }
            return [...prev, monsterId];
        });
    };

    const handleSavePreset = (index: number) => {
        if (index < 0 || index >= teamPresets.length) return;
        const next = teamPresets.map((preset, presetIndex) => {
            if (presetIndex !== index) return preset;
            return {
                ...preset,
                slots: teamSlots,
            };
        });
        persistPresets(next);
        setLastDevNote(`已儲存隊伍陣容到 ${next[index].label}！`);
    };

    const handleLoadPreset = (index: number) => {
        if (index < 0 || index >= teamPresets.length) return;
        const target = teamPresets[index];
        setTeamSlots(target.slots.slice(0, 3));
        setLastDevNote(`已載入 ${target.label} 編隊！`);
    };

    // 隊伍技能觸發判定輔助函式
    const evaluateTeamSkillImpact = (eventType: string): string => {
        const activeMonsters = teamSlots.map((id) => MONSTERS[id]).filter(Boolean);
        if (activeMonsters.length === 0) return '';

        if (eventType === 'monster') {
            const striker = activeMonsters.find((m) => getMonsterRole(m.id as MonsterId) === 'striker' || getMonsterRole(m.id as MonsterId) === 'breaker');
            if (striker) {
                return `【${striker.name}】發動必殺強襲！⚡ 全隊總戰力 ${finalTeamPower} 壓制過關！`;
            }
            return `全隊集結戰力 ${finalTeamPower} 協同迎戰！`;
        }

        if (eventType === 'trap') {
            const guardian = activeMonsters.find((m) => getMonsterRole(m.id as MonsterId) === 'guardian' || getMonsterRole(m.id as MonsterId) === 'support');
            if (guardian) {
                return `【${guardian.name}】展開神聖護盾 🛡️，全隊吸收衝擊穩定身形！`;
            }
            return '小心腳下熔岩！';
        }

        if (eventType === 'ladder') {
            const controller = activeMonsters.find((m) => getMonsterRole(m.id as MonsterId) === 'controller' || getMonsterRole(m.id as MonsterId) === 'support');
            if (controller) {
                return `【${controller.name}】引導氣流加速 🌀，迅速登梯攀升！`;
            }
            return '金色梯子直通上層！';
        }

        if (eventType === 'treasure' || eventType === 'egg') {
            if (synergyBonuses.bonusPercent > 0) {
                return `羈絆加成生效（+${synergyBonuses.bonusPercent}%），收穫更豐厚！✨`;
            }
        }

        return '';
    };

    const handleRoll = async () => {
        if (isRolling || isMoving || diceCount <= 0) return;
        setIsRolling(true);
        try {
            const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
            const startFloor = currentFloor;
            setAnimatedFloor(startFloor);

            const result = await rollDiceMutation.mutateAsync({
                userId,
                currentFloor: startFloor,
                clientEvents: activeEvents,
            });

            setIsMoving(true);
            const reachedFloor = result.progress.current_floor;
            const routeTag = routeMode === 'risk' ? '冒險路' : '安全路';

            const intermediateFloor = Math.min(startFloor + result.roll, GEN3_TOTAL_FLOORS);
            for (let floor = startFloor + 1; floor <= intermediateFloor; floor += 1) {
                setAnimatedFloor(floor);
                scrollToFloor(floor);
                await wait(160);
            }

            if (reachedFloor !== intermediateFloor) {
                const direction = reachedFloor > intermediateFloor ? 1 : -1;
                const event = eventMap.get(intermediateFloor);
                const skillNote = event ? evaluateTeamSkillImpact(event.event_type) : '';
                const eventDesc = event?.description ?? (direction > 0 ? '搭乘升降梯上升！' : '不小心掉入陷阱！');
                setLastDevNote(`擲出 🎲 ${result.roll} 點！到達 ${intermediateFloor} 層，${eventDesc} ${skillNote}`);
                await wait(280);

                for (let step = intermediateFloor + direction; direction > 0 ? step <= reachedFloor : step >= reachedFloor; step += direction) {
                    setAnimatedFloor(step);
                    scrollToFloor(step);
                    await wait(120);
                }
            }

            const finalEvent = eventMap.get(reachedFloor);
            const finalSkillNote = finalEvent ? evaluateTeamSkillImpact(finalEvent.event_type) : '';
            const eventText = finalEvent ? `，觸發事件：${finalEvent.description ?? finalEvent.event_type}` : '';
            setLastDevNote(`抵達第 ${reachedFloor} 層（${routeTag}）${eventText} ${finalSkillNote ? `✨ ${finalSkillNote}` : '🎉'}`);
            await refetch();
            setAnimatedFloor(null);
        } catch (error) {
            console.error('Gen3 roll failed', error);
            setLastDevNote('擲骰失敗，請稍候重試。');
            setAnimatedFloor(null);
        } finally {
            setIsRolling(false);
            setIsMoving(false);
        }
    };

    const handleAddDice = async (amount: number) => {
        await addDiceMutation.mutateAsync({ userId, amount });
        await refetch();
    };

    if (!isOpen) return null;

    const progressPercent = Math.round(((currentFloor - 1) / (GEN3_TOTAL_FLOORS - 1)) * 100);
    const floorTheme = getFloorTheme(currentFloor);
    const selectedFloorInfo = selectedTileFloor ? eventMap.get(selectedTileFloor) : null;
    const selectedFloorTheme = selectedTileFloor ? getFloorTheme(selectedTileFloor) : null;

    // 首席出戰怪獸（身旁的寵物跟班）
    const leaderMonster = teamSlots.length > 0 ? MONSTERS[teamSlots[0]] : null;

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

                {/* ── 主內容區域：立體棋盤 + 右側編隊與情報 ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 overflow-hidden">
                    
                    {/* 左側：2.5D 立體棋盤攀登區（支援寬螢幕全展） */}
                    <section className={`${isSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col border-r border-slate-800/80 overflow-hidden relative transition-all duration-300`}>
                        
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

                                {/* 右側隊伍面板展開/收合按鈕 */}
                                <button
                                    onClick={() => setIsSidebarOpen((prev) => !prev)}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                                        isSidebarOpen
                                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                                    }`}
                                    title={isSidebarOpen ? '收合側邊欄，擴大棋盤視野' : '展開側邊隊伍與情報欄'}
                                >
                                    {isSidebarOpen ? '收合隊伍欄 ❯' : '展開隊伍欄 ❮'}
                                </button>
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

                            <div className="relative mx-auto my-4" style={{ width: BOARD_W, height: BOARD_H }}>
                                
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
                                            style={{
                                                position: 'absolute',
                                                left: tile.x - TILE_CELL_W / 2,
                                                bottom: tile.y - TILE_CELL_H / 2,
                                                width: TILE_CELL_W,
                                                height: TILE_CELL_H,
                                                zIndex: tile.row + 3,
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
                                            className={`absolute pointer-events-none transition-all duration-300 ${isMoving ? 'animate-bounce' : ''}`}
                                            style={{
                                                left: playerPos.x - 28,
                                                bottom: playerPos.y + 4,
                                                zIndex: playerPos.row + 20,
                                            }}
                                        >
                                            {/* 角色腳下接地柔邊陰影 */}
                                            <div
                                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-3 bg-black/60 rounded-full blur-[2px] transition-transform"
                                                style={{ transform: isMoving ? 'translateX(-50%) scale(0.7)' : 'translateX(-50%) scale(1)' }}
                                            />

                                            {/* 主角立繪 */}
                                            <div className="relative w-14 h-14 flex items-center justify-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
                                                <img
                                                    src="/images/tower-v2/player.png"
                                                    alt="player"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        // 若無圖片則顯示可愛勇者頭像
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            </div>

                                            {/* 首席怪獸小跟班（浮動在身旁） */}
                                            {leaderMonster && (
                                                <div
                                                    className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-slate-900/80 border border-amber-400/80 shadow-lg flex items-center justify-center animate-bounce"
                                                    style={{ animationDuration: '2.5s' }}
                                                    title={`首發跟隨夥伴：${leaderMonster.name}`}
                                                >
                                                    <span className="text-base">{leaderMonster.emoji}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 回合操作快捷 Dock（擲骰按鈕與回饋說明） */}
                        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleRoll}
                                disabled={diceCount <= 0 || isRolling || isMoving}
                                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-black text-slate-950 shadow-lg flex items-center gap-2 text-base transition-all"
                            >
                                <Dices size={20} className={isRolling ? 'animate-spin' : ''} />
                                {isRolling || isMoving ? '前進中...' : `擲骰子 (${diceCount} 顆)`}
                            </button>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleAddDice(1)}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 border border-slate-700"
                                >
                                    <PlusCircle size={13} className="text-emerald-400" /> +1
                                </button>
                                <button
                                    onClick={() => handleAddDice(5)}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 border border-slate-700"
                                >
                                    <PlusCircle size={13} className="text-emerald-400" /> +5
                                </button>
                            </div>

                            <div className="flex-1 min-w-[200px] text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-400 shrink-0" />
                                <span className="truncate">{lastDevNote}</span>
                            </div>
                        </div>
                    </section>

                    {/* 右側：出戰編隊、陣營連攜與關卡情報（可折疊） */}
                    {isSidebarOpen && (
                        <aside className="lg:col-span-4 p-4 overflow-y-auto bg-slate-950/70 flex flex-col gap-4 border-l border-slate-800/80 animate-fadeIn">
                            
                            {/* 關卡選中情報卡片 */}
                            {selectedTileFloor && (
                                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 to-indigo-950/80 p-3.5 shadow-lg animate-fadeIn">
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

                            {/* 出戰陣容面板 (最多 3 隻主力) */}
                            <div className="rounded-2xl border border-cyan-800/40 bg-slate-900/90 p-4 shadow-md">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-black text-sm flex items-center gap-1.5 text-cyan-300">
                                            <Award size={16} /> 出戰冒險隊伍
                                        </h3>
                                        <p className="text-[11px] text-slate-400">路上遇敵或陷阱自動觸發技能</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400">隊伍總戰力</span>
                                        <p className="text-base font-black text-amber-300 leading-none">{finalTeamPower}</p>
                                    </div>
                                </div>

                                {/* 3 個出戰槽位 */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {[0, 1, 2].map((slotIdx) => {
                                        const monsterId = teamSlots[slotIdx];
                                        const monster = monsterId ? MONSTERS[monsterId] : null;
                                        const role = monsterId ? getMonsterRole(monsterId) : null;
                                        const RoleIcon = role ? ROLE_META[role].icon : null;

                                        return (
                                            <div
                                                key={slotIdx}
                                                className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center relative transition-all ${
                                                    monster
                                                        ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/40 to-slate-900 shadow'
                                                        : 'border-dashed border-slate-700 bg-slate-950/40'
                                                }`}
                                            >
                                                {monster ? (
                                                    <>
                                                        <span className="text-2xl mb-1">{monster.emoji}</span>
                                                        <p className="text-xs font-bold text-slate-200 truncate w-full">{monster.name}</p>
                                                        {RoleIcon && role && (
                                                            <span className={`text-[10px] flex items-center gap-0.5 mt-0.5 font-bold ${ROLE_META[role].color}`}>
                                                                <RoleIcon size={10} /> {ROLE_META[role].label}
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => handleToggleTeam(monsterId)}
                                                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] flex items-center justify-center"
                                                            title="卸下隊員"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="text-slate-500 text-xs flex flex-col items-center">
                                                        <span className="text-lg opacity-40">➕</span>
                                                        <span>空位</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 羈絆光環狀態 */}
                                {synergyBonuses.tags.length > 0 && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/20 text-[11px] text-amber-200 space-y-1">
                                        <div className="font-bold flex items-center gap-1 text-amber-300">
                                            <Sparkles size={12} /> 觸發隊伍羈絆加成：
                                        </div>
                                        {synergyBonuses.tags.map((tag) => (
                                            <div key={tag}>{tag}</div>
                                        ))}
                                    </div>
                                )}

                                {/* 快速預設隊伍切換與存檔 */}
                                <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-slate-400">隊伍預設:</span>
                                        <span className="text-[10px] text-slate-500">點名稱載入 / 點💾存檔</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {teamPresets.map((preset, idx) => (
                                            <div key={preset.label} className="flex items-center rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
                                                <button
                                                    onClick={() => handleLoadPreset(idx)}
                                                    className="flex-1 px-1.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-bold truncate text-center"
                                                    title={`載入 ${preset.label}`}
                                                >
                                                    {preset.label}
                                                </button>
                                                <button
                                                    onClick={() => handleSavePreset(idx)}
                                                    className="px-1.5 py-1 text-slate-400 hover:text-amber-300 hover:bg-slate-700 text-[10px] border-l border-slate-700"
                                                    title={`將目前隊伍儲存至 ${preset.label}`}
                                                >
                                                    💾
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 冒險百科指南 */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-400">
                                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                                    <Info size={14} className="text-amber-400" />
                                    隊伍功用說明
                                </h4>
                                <p className="leading-relaxed">
                                    • <strong>輸出/破甲</strong>：遭遇守門怪時發動攻擊，壓制通關並額外獲得星幣。<br />
                                    • <strong>守護/支援</strong>：踩到陷阱滑落時展開護盾，減免回退風險。<br />
                                    • <strong>控場/支援</strong>：遇升降梯直升，提升移動速度。
                                </p>
                            </div>
                        </aside>
                    )}
                </div>

                {/* ── 底部：怪獸背包 / 庇護所常駐 Dock (支援縮小/展開) ── */}
                {isBagCollapsed ? (
                    /* 縮小模式：極簡狀態列 */
                    <footer className="px-4 py-2 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-t border-amber-500/30 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-2 overflow-hidden text-xs">
                            <span className="text-base">🎒</span>
                            <span className="font-bold text-amber-300">怪獸庇護所 ({uniqueOwnedMonsters.length} 隻夥伴已保存)</span>
                            <span className="text-slate-600 hidden sm:inline">|</span>
                            <span className="text-slate-400 text-[11px] hidden sm:inline">出戰中:</span>
                            <div className="flex items-center gap-1.5">
                                {teamSlots.map((mId, idx) => {
                                    const m = MONSTERS[mId];
                                    return (
                                        <span key={mId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-200">
                                            #{idx + 1} {m?.emoji} {m?.name}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            onClick={() => setIsBagCollapsed(false)}
                            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                        >
                            <span>展開背包</span>
                            <span>▴</span>
                        </button>
                    </footer>
                ) : (
                    /* 展開模式：完整典藏卡片 */
                    <footer className="px-4 py-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-t-2 border-amber-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-base">🎒</span>
                                <h3 className="text-xs font-black tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
                                    怪獸庇護所 · 典藏背包 ({uniqueOwnedMonsters.length} 隻夥伴已保存)
                                </h3>
                                <span className="hidden sm:inline-block text-[11px] text-slate-400">
                                    — 點擊怪獸可指派加入出戰小隊
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsBagCollapsed(true)}
                                    className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1"
                                    title="縮小背包以放大棋盤可視範圍"
                                >
                                    <span>收合背包</span>
                                    <span>▾</span>
                                </button>
                            </div>
                        </div>

                        {/* 橫向滑動怪獸卡片列表（與概念圖呼應） */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-amber-500/20">
                            {uniqueOwnedMonsters.map((monsterId) => {
                                const monster = MONSTERS[monsterId];
                                if (!monster) return null;
                                const isSelected = teamSlots.includes(monsterId);
                                const slotNumber = teamSlots.indexOf(monsterId) + 1;
                                const role = getMonsterRole(monsterId);
                                const roleInfo = ROLE_META[role];
                                const RoleIcon = roleInfo.icon;
                                const stars = Math.min(3, Math.max(1, Math.ceil(monster.unlockFloor / 35)));

                                return (
                                    <button
                                        key={monsterId}
                                        onClick={() => handleToggleTeam(monsterId)}
                                        className={`relative shrink-0 w-24 sm:w-28 p-2.5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 group ${
                                            isSelected
                                                ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.35)] -translate-y-1'
                                                : 'border-slate-700/80 bg-slate-900/90 hover:border-slate-500 hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {/* 出戰順位徽章 */}
                                        {isSelected && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-amber-200">
                                                #{slotNumber}
                                            </div>
                                        )}

                                        {/* 怪獸頭像 / Emoji */}
                                        <div className="h-10 flex items-center justify-center text-3xl mb-1 group-hover:scale-110 transition-transform">
                                            {monster.emoji}
                                        </div>

                                        {/* 怪獸名稱 */}
                                        <p className="text-xs font-bold text-slate-100 truncate text-center">{monster.name}</p>

                                        {/* 星級與戰鬥定位 */}
                                        <div className="flex items-center justify-center gap-0.5 text-[10px] text-amber-300 mt-0.5">
                                            {Array.from({ length: stars }).map((_, i) => (
                                                <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-center gap-1 mt-1">
                                            <span className={`text-[10px] flex items-center gap-0.5 font-bold ${roleInfo.color}`}>
                                                <RoleIcon size={10} /> {roleInfo.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </footer>
                )}
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

