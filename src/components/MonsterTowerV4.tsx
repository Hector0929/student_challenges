import React, { useEffect, useRef, useState } from 'react';
import { Compass, Dices, FolderOpen, ShoppingCart, X } from 'lucide-react';
import { MONSTERS, useTowerProgress, type MonsterId } from '../hooks/useTowerProgress';
import { GEN3_TOTAL_FLOORS } from '../lib/towerGen3Rules';
import { getZoneIndex } from '../lib/towerSpiralLayout';
import { DicePurchaseModal } from './tower/DicePurchaseModal';
import { TowerCollectionPanel } from './tower/TowerCollectionPanel';
import { TowerVictoryFlow } from './tower/TowerVictoryFlow';
import { TowerChallengeOverlay } from './tower/TowerChallengeOverlay';
import { CompanionPicker, EggReveal, TeamEffectBurst } from './tower/TowerGameOverlays';
import { ROLE_META } from './tower/roleMeta';
import { prefersReducedMotion, useTowerGame } from './tower/useTowerGame';
import { TowerScene, ZONE_STYLES } from './tower/v4/TowerScene';

const STEP_MS = 230;
const ZONE_ICONS = ['🌿', '❄️', '🌋', '⚙️', '✨'];
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

interface MonsterTowerV4Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const MonsterTowerV4: React.FC<MonsterTowerV4Props> = ({ userId, isOpen, onClose }) => {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<TowerScene | null>(null);
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
    const [showPurchase, setShowPurchase] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showCompanionPicker, setShowCompanionPicker] = useState(false);
    const [diceShown, setDiceShown] = useState<{ value: number; id: number } | null>(null);

    // 規則與存檔跟 V3 完全相同：同一份 useTowerGame、同一張 tower_progress
    const game = useTowerGame({
        userId,
        stepMs: STEP_MS,
        onStep: (floor) => sceneRef.current?.hopTo(floor, STEP_MS * 0.85),
        onSlide: (from, to) => sceneRef.current?.slideTo(from, to) ?? Promise.resolve(),
    });
    const { currentFloor, displayFloor, diceCount, starBalance, eggs, ownedMonsterIds, ownedUniqueMonsters, companion, companionRole, activeEvents, eventMap, isRolling, isMoving, lastRoll } = game;
    const busy = isRolling || isMoving || game.challengeFloor !== null;

    // 建立 / 釋放 3D 場景
    useEffect(() => {
        const el = stageRef.current;
        if (!isOpen || !el) return;
        const scene = new TowerScene(el, {
            totalFloors: GEN3_TOTAL_FLOORS,
            reducedMotion: prefersReducedMotion(),
            onTileClick: (floor) => setSelectedFloor((f) => (f === floor ? null : floor)),
        });
        sceneRef.current = scene;
        return () => {
            scene.dispose();
            sceneRef.current = null;
        };
    }, [isOpen]);

    useEffect(() => {
        sceneRef.current?.setEvents(activeEvents);
    }, [activeEvents, isOpen]);
    useEffect(() => {
        sceneRef.current?.setCompanion(companion?.image, companion?.emoji);
    }, [companion, isOpen]);
    useEffect(() => {
        sceneRef.current?.setSelected(selectedFloor);
    }, [selectedFloor, isOpen]);
    // 沒有在演出時，主角位置跟著存檔（開局、重新開始、外部更新）
    useEffect(() => {
        if (!isMoving) sceneRef.current?.setPlayerFloor(displayFloor);
    }, [displayFloor, isMoving, isOpen]);

    // 擲骰結果大骰子，1.2 秒後收起
    useEffect(() => {
        if (!lastRoll) return;
        const show = window.setTimeout(() => setDiceShown(lastRoll), 0);
        const hide = window.setTimeout(() => setDiceShown(null), 1200);
        return () => {
            window.clearTimeout(show);
            window.clearTimeout(hide);
        };
    }, [lastRoll]);

    if (!isOpen) return null;

    const zoneIdx = getZoneIndex(displayFloor);
    const zone = ZONE_STYLES[zoneIdx];
    const progressPct = ((currentFloor - 1) / (GEN3_TOTAL_FLOORS - 1)) * 100;
    const displayPct = ((displayFloor - 1) / (GEN3_TOTAL_FLOORS - 1)) * 100;
    const selectedEvent = selectedFloor ? eventMap.get(selectedFloor) : undefined;
    const RoleIcon = companionRole ? ROLE_META[companionRole].icon : null;

    const describe = (floor: number) => {
        const ev = eventMap.get(floor);
        if (!ev) return { icon: '⬜', title: '普通格子', text: '安全的一格，休息一下吧。' };
        if (ev.event_type === 'ladder') return { icon: '🪜', title: `梯子 → 第 ${ev.target_floor} 層`, text: ev.description ?? '順著梯子往上爬！' };
        if (ev.event_type === 'trap') return { icon: '🐍', title: `蛇 → 滑到第 ${ev.target_floor} 層`, text: ev.description ?? '小心，會滑下去！' };
        if (ev.event_type === 'monster') return { icon: '👾', title: '守門怪獸', text: `${ev.description ?? ''} 踩到會進入挑戰關卡。` };
        if (ev.event_type === 'egg') return { icon: '🥚', title: `怪獸蛋：${MONSTERS[ev.monster_id as MonsterId]?.name ?? '神秘怪獸'}`, text: ev.description ?? '撿到就能拿去孵化！' };
        return { icon: '⭐', title: ev.event_type, text: ev.description ?? '' };
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden select-none" style={{ background: `#${zone.sky.toString(16).padStart(6, '0')}` }}>
            <div ref={stageRef} className="absolute inset-0" data-testid="tower-v4-stage" />

            {/* ── 頂部 ── */}
            <header className="absolute top-0 inset-x-0 z-10 p-3 sm:p-4 flex items-start justify-between gap-2 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-white/90 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 transition"
                        aria-label="離開怪獸塔"
                    >
                        <X size={20} />
                    </button>
                    <div className="px-3 py-1.5 rounded-2xl bg-white/90 shadow-lg">
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800 text-sm sm:text-base">怪獸塔 V4</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black">3D</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-bold">
                            {ZONE_ICONS[zoneIdx]} {zone.name} · 第 <span className="text-slate-800 tabular-nums">{displayFloor}</span> 層 / {GEN3_TOTAL_FLOORS}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                    <span className="px-3 py-2 rounded-2xl bg-white/90 shadow-lg text-sm font-black text-amber-600 tabular-nums">⭐ {starBalance}</span>
                    <span className="px-3 py-2 rounded-2xl bg-white/90 shadow-lg text-sm font-black text-sky-600 tabular-nums" data-testid="v4-dice-count">
                        🎲 {diceCount}
                    </span>
                </div>
            </header>

            {/* ── 右側：五區進度軌 ── */}
            <div className="absolute right-3 sm:right-4 top-24 bottom-48 z-10 w-3 rounded-full bg-white/60 shadow-inner pointer-events-none" aria-hidden>
                {ZONE_STYLES.map((z, i) => (
                    <div
                        key={z.name}
                        className="absolute inset-x-0 rounded-full"
                        style={{ bottom: `${i * 20}%`, height: '20%', background: `#${z.tile[1].toString(16).padStart(6, '0')}`, opacity: i <= zoneIdx ? 1 : 0.45 }}
                    />
                ))}
                {[25, 50, 75, 100].map((f) => (
                    <span key={f} className="absolute -left-2 text-[11px]" style={{ bottom: `calc(${((f - 1) / 99) * 100}% - 7px)` }}>
                        🥚
                    </span>
                ))}
                <span
                    className="absolute -left-2.5 w-8 h-8 -mb-4 rounded-full bg-white border-2 border-rose-500 shadow-lg flex items-center justify-center text-[11px] font-black text-rose-600 transition-all duration-200"
                    style={{ bottom: `${displayPct}%` }}
                >
                    {displayFloor}
                </span>
                <span className="absolute -left-1 w-5 h-1 rounded bg-slate-700/50" style={{ bottom: `${progressPct}%` }} />
            </div>

            {/* ── 點格子的說明 ── */}
            {selectedFloor && (
                <div className="absolute left-3 sm:left-4 top-24 z-20 w-64 rounded-2xl bg-white/95 shadow-xl p-3 gen3-effect-burst" data-testid="v4-tile-info">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500">
                                第 {selectedFloor} 層 · {ZONE_STYLES[getZoneIndex(selectedFloor)].name}
                            </p>
                            <p className="font-black text-slate-800">
                                {describe(selectedFloor).icon} {describe(selectedFloor).title}
                            </p>
                        </div>
                        <button onClick={() => setSelectedFloor(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0" aria-label="關閉">
                            <X size={14} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{describe(selectedFloor).text}</p>
                    {selectedEvent && selectedFloor > currentFloor && selectedFloor - currentFloor <= 6 && (
                        <p className="text-[11px] font-bold text-sky-600 mt-1.5">再擲出 {selectedFloor - currentFloor} 點就會踩到！</p>
                    )}
                </div>
            )}

            {/* ── 擲骰結果 ── */}
            {diceShown && (
                <div key={diceShown.id} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="gen3-effect-burst w-28 h-28 rounded-3xl bg-white shadow-2xl border-4 border-rose-400 flex flex-col items-center justify-center">
                        <span className="text-6xl leading-none text-rose-500">{DICE_FACES[diceShown.value]}</span>
                        <span className="text-lg font-black text-slate-700 mt-1">{diceShown.value} 點</span>
                    </div>
                </div>
            )}

            {/* ── 底部操作 ── */}
            <div className="absolute bottom-0 inset-x-0 z-10 p-3 sm:p-4 pointer-events-none">
                <div className="mx-auto max-w-xl rounded-3xl bg-white/92 backdrop-blur shadow-2xl p-3 pointer-events-auto">
                    <p className="text-xs text-slate-600 font-bold truncate mb-2 px-1">{game.note}</p>
                    <div className="flex items-stretch gap-2">
                        <button
                            onClick={game.roll}
                            disabled={busy || diceCount <= 0}
                            data-testid="v4-roll-btn"
                            className="flex-1 min-h-[56px] rounded-2xl bg-gradient-to-b from-rose-400 to-rose-600 text-white font-black text-lg shadow-[0_5px_0_#9f1239] active:translate-y-1 active:shadow-[0_1px_0_#9f1239] disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-[0_5px_0_#64748b] transition flex items-center justify-center gap-2"
                        >
                            <Dices size={24} className={isRolling ? 'animate-spin' : ''} />
                            {diceCount > 0 ? (busy ? '前進中…' : '擲骰子') : '沒有骰子了'}
                        </button>
                        <button
                            onClick={() => setShowPurchase(true)}
                            className="w-14 rounded-2xl bg-sky-100 text-sky-700 flex flex-col items-center justify-center text-[10px] font-black hover:bg-sky-200"
                            data-testid="v4-purchase-btn"
                        >
                            <ShoppingCart size={18} />
                            買骰子
                        </button>
                        <button
                            onClick={() => setShowCollection(true)}
                            className="relative w-14 rounded-2xl bg-amber-100 text-amber-700 flex flex-col items-center justify-center text-[10px] font-black hover:bg-amber-200"
                            data-testid="v4-collection-btn"
                        >
                            <FolderOpen size={18} />
                            收藏
                            {eggs.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{eggs.length}</span>
                            )}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={() => setShowCompanionPicker(true)}
                            className="flex-1 min-w-0 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 px-2 flex items-center gap-2 text-left"
                            data-testid="v4-companion-btn"
                        >
                            <span className="text-xl shrink-0">{companion?.emoji ?? '🥚'}</span>
                            <span className="min-w-0">
                                <span className="block text-[11px] font-black text-slate-700 truncate">{companion ? companion.name : '還沒有夥伴'}</span>
                                {companionRole && RoleIcon && (
                                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${ROLE_META[companionRole].color.replace('-400', '-600')}`}>
                                        <RoleIcon size={10} /> {ROLE_META[companionRole].label}
                                    </span>
                                )}
                            </span>
                        </button>
                        <div className="flex h-10 rounded-xl bg-slate-100 p-1 text-[11px] font-black" role="group" aria-label="路線">
                            {(['safe', 'risk'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => game.setRouteMode(m)}
                                    disabled={busy}
                                    className={`px-2.5 rounded-lg transition ${game.routeMode === m ? (m === 'safe' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white') : 'text-slate-500'}`}
                                    title={m === 'safe' ? '安全路：蛇照原本長度' : '冒險路：蛇會讓你滑得更遠'}
                                >
                                    {m === 'safe' ? '安全路' : '冒險路'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => sceneRef.current?.recenter()}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                            title="鏡頭回到我"
                            aria-label="鏡頭回到我"
                        >
                            <Compass size={18} />
                        </button>
                    </div>
                    {diceCount <= 0 && !busy && <p className="text-[11px] text-slate-500 mt-2 px-1">完成每日任務可以拿到骰子，也可以用星幣買。</p>}
                </div>
            </div>

            {/* ── 共用彈窗（與 V3 相同） ── */}
            {game.challengeFloor !== null && (
                <TowerChallengeOverlay
                    key={game.challengeRunId}
                    userId={userId}
                    floor={game.challengeFloor}
                    collectionCount={game.challengeRetryCredit}
                    companionName={companion?.name}
                    onFinish={game.finishChallenge}
                />
            )}
            {showCompanionPicker && (
                <CompanionPicker
                    monsters={ownedUniqueMonsters}
                    currentId={companion?.id}
                    onChoose={(id) => {
                        game.chooseCompanion(id);
                        setShowCompanionPicker(false);
                    }}
                    onClose={() => setShowCompanionPicker(false)}
                />
            )}
            {game.eggReveal && (
                <EggReveal
                    monsterId={game.eggReveal}
                    onHatch={() => {
                        game.dismissEgg();
                        setShowCollection(true);
                    }}
                    onClose={game.dismissEgg}
                />
            )}
            {game.teamEffectPopup && <TeamEffectBurst effect={game.teamEffectPopup} />}
            <TowerVictoryFlow
                userId={userId}
                open={game.showVictory}
                onRestart={() => {
                    game.restart();
                    setSelectedFloor(null);
                }}
            />
            {showPurchase && <DicePurchaseModal userId={userId} onClose={() => setShowPurchase(false)} />}
            <TowerCollectionPanel userId={userId} isOpen={showCollection} onClose={() => setShowCollection(false)} eggs={eggs} monsters={ownedMonsterIds} />
        </div>
    );
};

export const TowerV4Preview: React.FC<{ userId: string; onClick: () => void }> = ({ userId, onClick }) => {
    const { data: progress } = useTowerProgress(userId);
    const currentFloor = progress?.current_floor ?? 1;
    const diceCount = progress?.dice_count ?? 0;
    const ownedMonsters = (progress?.monsters_collected ?? []).filter((id) => !id.startsWith('egg:')).length;
    const eggCount = (progress?.monsters_collected ?? []).filter((id) => id.startsWith('egg:')).length;
    const zoneIdx = getZoneIndex(currentFloor);

    return (
        <button
            onClick={onClick}
            className="w-full text-left clay-card p-4 hover:scale-[1.01] transition-transform border border-emerald-300 bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 shadow-xl"
            data-testid="monster-tower-v4-open"
        >
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-300 to-emerald-600 text-3xl flex items-center justify-center shadow-lg border-2 border-white">🗼</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-heading text-lg font-bold text-slate-800">怪獸塔 V4 · 螺旋石塔</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">3D</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                        {ZONE_ICONS[zoneIdx]} {ZONE_STYLES[zoneIdx].name} · 第 {currentFloor} 層 · 🎲 {diceCount} · 👾 {ownedMonsters} 隻夥伴{eggCount > 0 ? ` · 🥚 ${eggCount}` : ''}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white overflow-hidden flex">
                        {ZONE_STYLES.map((z, i) => (
                            <div
                                key={z.name}
                                className="h-full"
                                style={{
                                    width: '20%',
                                    background: `#${z.tile[1].toString(16).padStart(6, '0')}`,
                                    opacity: currentFloor > i * 20 ? 1 : 0.25,
                                    clipPath: currentFloor > i * 20 && currentFloor <= (i + 1) * 20 ? `inset(0 ${100 - ((currentFloor - i * 20) / 20) * 100}% 0 0)` : undefined,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MonsterTowerV4;
