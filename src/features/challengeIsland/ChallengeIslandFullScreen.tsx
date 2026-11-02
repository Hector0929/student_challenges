import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, Globe, Home, LayoutGrid, Link2, Megaphone, Pause, Play, RotateCcw, ScrollText, Search, Star, Tag, X } from 'lucide-react';
import { useGameWindowController } from '../../hooks/useGameWindowController';
import { useCompleteQuest } from '../../hooks/useQuests';
import { GameModal } from '../../components/GameModal';
import { LEARNING_ITEMS } from '../learning/config/learningItems';
import type { LearningItem } from '../learning/types/learning';
import { toLearningModalPayload } from '../learning/utils/learningAdapters';
import { getLearningEmbeddedContent } from '../learning/components/reactLearningRegistry';
import { usePracticeReward } from '../learning/hooks/usePracticeReward';
import { useRewardGamePlay } from '../../hooks/useRewardGamePlay';
import { FUN_GAMES, type FunGame } from '../../lib/gameConfig';
import { GAME_COST } from '../../lib/constants';
import { IslandScene, type IslandSceneCallbacks, type Selection } from './engine/IslandScene';
import { GAME_ISLAND_ID, QUEST_ISLAND_ID, hhmm, structureKey, toTaipei, tourEnd, type FeatureDef, type IslandChallenge, type IslandDef, type TodayEvent } from './model';
import { useChallengeIslandModel } from './useChallengeIsland';
import './challengeIsland.css';

interface ChallengeIslandFullScreenProps {
    isOpen: boolean;
    onClose: () => void;
    onGoHome?: () => void;
    userId: string;
    starBalance: number;
}

export const ChallengeIslandFullScreen: React.FC<ChallengeIslandFullScreenProps> = (props) => {
    const { isOpen, onClose, onGoHome } = props;
    const { handleEndGame, handleGoHome } = useGameWindowController({ isOpen, isImmersivePhase: isOpen, onClose, onGoHome });

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        document.body.dataset.gameModalOpen = 'true';
        return () => {
            document.body.style.overflow = 'unset';
            delete document.body.dataset.gameModalOpen;
        };
    }, [isOpen]);

    if (!isOpen) return null;
    const view = (
        <IslandView
            mode="modal"
            userId={props.userId}
            starBalance={props.starBalance}
            onBack={handleEndGame}
            backLabel="返回"
            onHome={onGoHome ? handleGoHome : undefined}
        />
    );
    return typeof document !== 'undefined' ? createPortal(view, document.body) : view;
};

interface ChallengeIslandHomeProps {
    userId: string;
    starBalance: number;
    /** 冒險港上的功能建築 */
    features: FeatureDef[];
    onOpenFeature: (featureId: string) => void;
    onSwitchProfile: () => void;
    /** 切到經典版儀表板 */
    onClassic: () => void;
    parentMessage?: string | null;
}

/** 小孩登入後的首頁：自己的學習挑戰群島 */
export const ChallengeIslandHome: React.FC<ChallengeIslandHomeProps> = (props) => (
    <IslandView
        mode="home"
        userId={props.userId}
        starBalance={props.starBalance}
        features={props.features}
        onOpenFeature={props.onOpenFeature}
        onBack={props.onSwitchProfile}
        backLabel="切換角色"
        onClassic={props.onClassic}
        parentMessage={props.parentMessage}
    />
);

// ---------------------------------------------------------------------------

type Mode = 'overview' | 'list' | 'time';
interface LogEntry {
    key: string;
    minute: number;
    seq: number;
    icon: string;
    content: React.ReactNode;
    tone?: 'me' | 'plan';
}
interface TourUI {
    steps: TodayEvent[];
    real: boolean;
    idx: number;
    playing: boolean;
    ended: boolean;
    text: string;
}

const TOUR_START = 360;
const PRESETS: Array<[number, string, string]> = [
    [360, '清晨', '🌅'],
    [720, '白天', '☀️'],
    [1080, '黃昏', '🌇'],
    [1260, '夜晚', '🌙'],
];
const INTRO: Array<[string, string]> = [
    ['每座島是一個主題', '最上方的「每日任務廣場」是今天的每日任務，其他島是學習挑戰和獎勵遊戲。點島或建築看細節，也可以用右側清單搜尋。'],
    ['屋頂會告訴你今天的進度', '🪙 金幣代表今天完成了，⏳ 沙漏代表任務已送出、等家長確認。整座島都完成，就會插上旗子。'],
    ['看看今天做了什麼', '按上方「時間」播放今日回顧，鏡頭會依時間飛到你完成的每一件事。島上的小夥伴也一直在挑戰，打開「日誌」看他們的動態。'],
];

const readIntroSeen = () => {
    try {
        return localStorage.getItem('ci-intro') === '1';
    } catch {
        return false;
    }
};
const writeIntroSeen = () => {
    try {
        localStorage.setItem('ci-intro', '1');
    } catch {
        /* 無法儲存就下次再顯示 */
    }
};
const COLLAPSED_KEY = 'ci-collapsed-islands';
const readCollapsed = (): string[] => {
    try {
        const v: unknown = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]');
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
};
const writeCollapsed = (ids: string[]) => {
    try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids));
    } catch {
        /* 無法儲存就只在這次有效 */
    }
};
const isNarrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pickQuality = () => (isNarrow() || /Mobi|Android/i.test(navigator.userAgent) ? 'medium' : 'high');

function statusText(c: IslandChallenge) {
    if (c.kind === 'feature') return '進入 →';
    if (c.kind === 'quest') return c.status === 'done' ? '✓ 已完成' : c.status === 'submitted' ? '⏳ 等確認' : '';
    return c.todayCount ? `今日 ${c.todayCount} 次` : '';
}

function highlight(text: string, q: string) {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return text;
    return (
        <>
            {text.slice(0, i)}
            <mark>{text.slice(i, i + q.length)}</mark>
            {text.slice(i + q.length)}
        </>
    );
}

interface IslandViewProps {
    mode: 'home' | 'modal';
    userId: string;
    starBalance: number;
    onBack: () => void;
    backLabel: string;
    onHome?: () => void;
    features?: FeatureDef[];
    onOpenFeature?: (featureId: string) => void;
    onClassic?: () => void;
    parentMessage?: string | null;
}

const IslandView: React.FC<IslandViewProps> = ({ mode: viewMode, userId, starBalance, onBack, backLabel, onHome, features, onOpenFeature, onClassic, parentMessage }) => {
    const { model, isLoading } = useChallengeIslandModel(userId, features);
    const rewardUnlocked = model.stats.gamesUnlocked;
    const remainingQuests = Math.max(0, model.stats.questTarget - model.stats.questsDone);
    const [playGame, setPlayGame] = useState<FunGame | null>(null);
    const rewardPlay = useRewardGamePlay(userId, playGame);
    const [messageOpen, setMessageOpen] = useState(true);
    const stageRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<IslandScene | null>(null);
    const skey = structureKey(model);

    const [mode, setMode] = useState<Mode>(() => (isNarrow() ? 'overview' : 'list'));
    const [panelOpen, setPanelOpen] = useState(() => !isNarrow());
    const [tab, setTab] = useState<'list' | 'log'>('list');
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);
    const [names, setNames] = useState(true);
    const [flowsOn, setFlowsOn] = useState(true);
    const [paused, setPaused] = useState(false);
    const [preset, setPreset] = useState<number | null>(null);
    const [minute, setMinute] = useState(() => toTaipei(Date.now()).minute);
    const [selected, setSelected] = useState<Selection | null>(null);
    const [tour, setTour] = useState<TourUI | null>(null);
    const [introStep, setIntroStep] = useState<number | null>(() => (readIntroSeen() ? null : 0));
    const [, setTick] = useState(0);
    const [confirmQuest, setConfirmQuest] = useState<string | null>(null);
    const [questError, setQuestError] = useState<string | null>(null);
    const [practiceItem, setPracticeItem] = useState<LearningItem | null>(null);
    const completeQuest = useCompleteQuest();
    const grantPracticeReward = usePracticeReward(userId);

    const tourRef = useRef<TourUI | null>(null);

    const challenges = useMemo(() => new Map(model.islands.flatMap((i) => i.challenges.map((c) => [c.id, { c, island: i }] as const))), [model]);
    const islandsById = useMemo(() => new Map(model.islands.map((i) => [i.id, i])), [model]);

    // ---------- 選取 ----------
    const flowsFor = useCallback(
        (sel: Selection | null): Set<string> | null => {
            if (!sel) return null;
            if (sel.type === 'flow') return new Set([sel.id]);
            const ids = sel.type === 'building' ? new Set([sel.id]) : sel.type === 'island' ? new Set(islandsById.get(sel.id)?.challenges.map((c) => c.id)) : null;
            if (!ids) return null;
            return new Set(model.flows.filter((f) => ids.has(f.from) || ids.has(f.to)).map((f) => f.id));
        },
        [islandsById, model.flows],
    );

    const select = useCallback(
        (sel: Selection | null, fly = true) => {
            setSelected(sel);
            setConfirmQuest(null);
            setQuestError(null);
            const engine = engineRef.current;
            if (!engine) return;
            engine.select(sel, { fly: fly && sel?.type !== 'flow', focusFlows: flowsFor(sel) });
            if (sel?.type === 'flow') {
                const f = model.flows.find((x) => x.id === sel.id);
                if (f) engine.lookBetween(f.from, f.to);
            }
            if (sel && isNarrow()) setPanelOpen(false);
        },
        [flowsFor, model.flows],
    );

    const Ref: React.FC<{ id: string }> = useCallback(
        ({ id }: { id: string }) => {
            const hit = challenges.get(id);
            if (!hit) return null;
            return (
                <button type="button" className="ci-ref" onClick={() => select({ type: 'building', id })}>
                    {hit.c.icon} {hit.c.name}
                </button>
            );
        },
        [challenges, select],
    );
    const IslandRef: React.FC<{ id: string }> = useCallback(
        ({ id }: { id: string }) => (
            <button type="button" className="ci-ref" onClick={() => select({ type: 'island', id })}>
                {islandsById.get(id)?.name ?? id}
            </button>
        ),
        [islandsById, select],
    );

    // ---------- 今日回顧 ----------
    const startTour = useCallback(() => {
        const realSteps = model.events.filter((e) => challenges.has(e.challengeId));
        const real = realSteps.length > 0;
        const steps = real ? realSteps : model.suggested;
        const next: TourUI = { steps, real, idx: 0, playing: true, ended: false, text: real ? '回顧今天做過的事。' : '今天還沒有紀錄，先看看建議的學習行程。' };
        tourRef.current = next;
        setTour(next);
        setPaused(false);
        select(null, false);
        engineRef.current?.setPaused(false);
        engineRef.current?.startTour(steps.map((s) => ({ minute: s.minute, challengeId: s.challengeId })), TOUR_START);
        if (isNarrow()) setPanelOpen(false);
        else setTab('log');
    }, [challenges, model.events, model.suggested, select]);

    const stopTour = useCallback(() => {
        tourRef.current = null;
        setTour(null);
        engineRef.current?.stopTour();
        if (preset != null) engineRef.current?.setMinute(preset);
    }, [preset]);

    const pauseTour = useCallback((p: boolean) => {
        engineRef.current?.pauseTour(p);
        setTour((t) => (t ? (tourRef.current = { ...t, playing: !p }) : t));
    }, []);

    const changeMode = useCallback(
        (m: Mode) => {
            if (m !== 'time' && tourRef.current) stopTour();
            setMode(m);
            if (m === 'overview') {
                setPanelOpen(false);
                select(null, false);
                engineRef.current?.home();
            } else if (m === 'list') {
                setPanelOpen(true);
                setTab('list');
            } else startTour();
        },
        [select, startTour, stopTour],
    );

    // ---------- 引擎事件（以 ref 轉接，引擎只建立一次） ----------
    const handlers = useRef<IslandSceneCallbacks>({
        onPick: () => {},
        onWalkerEvent: () => {},
        onMinute: () => {},
        onTourStep: () => {},
        onTourEnd: () => {},
    });
    useLayoutEffect(() => {
        handlers.current = {
            onPick: (sel) => {
                if (tourRef.current?.playing && sel.type !== 'walker') pauseTour(true);
                select(sel);
            },
            // 島民只是背景動畫，不是真的玩家，所以不寫進日誌
            onWalkerEvent: () => {},
            onMinute: (m) => setMinute(m),
            onTourStep: (i) => {
                const t = tourRef.current;
                const step = t?.steps[i];
                if (!t || !step) return;
                select({ type: 'building', id: step.challengeId });
                const next = { ...t, idx: i + 1, text: step.text };
                tourRef.current = next;
                setTour(next);
            },
            onTourEnd: () => {
                const t = tourRef.current;
                if (!t) return;
                const next = { ...t, playing: false, ended: true, text: t.real ? '今天的回顧結束，明天繼續加油 🌙' : '建議行程結束，晚安 🌙' };
                tourRef.current = next;
                setTour(next);
            },
        };
    });

    // 建立 / 重建引擎（島與建築組成改變時才重建）
    useEffect(() => {
        const el = stageRef.current;
        if (!el || isLoading) return;
        const engine = new IslandScene(
            el,
            model,
            {
                onPick: (s) => handlers.current.onPick(s),
                onWalkerEvent: (e) => handlers.current.onWalkerEvent(e),
                onMinute: (m) => handlers.current.onMinute(m),
                onTourStep: (i) => handlers.current.onTourStep(i),
                onTourEnd: () => handlers.current.onTourEnd(),
            },
            { quality: pickQuality(), reducedMotion: prefersReduced() },
        );
        engineRef.current = engine;
        return () => {
            engine.dispose();
            engineRef.current = null;
        };
        // model 只在建立時讀一次；之後的狀態變化由下面的 setStatuses 處理
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skey, isLoading]);

    // 場景重建（例如遊戲島剛開放）後，把玩家選的時間與選取狀態接回去
    useEffect(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.setMinute(preset);
        if (selected) engine.select(selected, { fly: false, focusFlows: flowsFor(selected) });
        // 只在重建時接回；平常的變化由各自的操作直接通知引擎
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skey, isLoading]);

    useEffect(() => {
        engineRef.current?.setStatuses(model);
    }, [model]);
    useEffect(() => {
        engineRef.current?.setNames(names);
    }, [names, skey, isLoading]);
    useEffect(() => {
        engineRef.current?.setFlowsVisible(flowsOn);
    }, [flowsOn, skey, isLoading]);
    useEffect(() => {
        engineRef.current?.setPaused(paused);
    }, [paused, skey, isLoading]);

    // 跟隨小人時，卡片每半秒更新一次
    useEffect(() => {
        if (selected?.type !== 'walker' && selected?.type !== 'building') return;
        const t = window.setInterval(() => setTick((n) => n + 1), 500);
        return () => window.clearInterval(t);
    }, [selected]);

    // 快捷鍵
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('input, textarea') || introStep != null || practiceItem || playGame) return;
            const k = e.key.toLowerCase();
            if (k === 'escape') {
                if (selected) select(null, false);
                else if (tourRef.current) changeMode(isNarrow() ? 'overview' : 'list');
            } else if (k === 'n') setNames((v) => !v);
            else if (k === 'l') setFlowsOn((v) => !v);
            else if (k === 'h') {
                select(null, false);
                engineRef.current?.home();
            } else if (k === ' ') {
                e.preventDefault();
                if (tourRef.current) pauseTour(tourRef.current.playing);
                else setPaused((v) => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [changeMode, introStep, pauseTour, playGame, practiceItem, select, selected]);

    // ---------- 日誌：只放今天真的發生的事（任務、練習、遊戲、怪獸塔、開島），資料更新就自動出現 ----------
    const logEntries = useMemo(() => {
        const real: LogEntry[] = model.events.map((ev, i) => ({
            key: `ev-${ev.challengeId}-${ev.minute}-${i}`,
            minute: ev.minute,
            seq: -1000 + i,
            icon: ev.kind === 'quest' ? '🎯' : ev.kind === 'learning' ? '📗' : ev.kind === 'feature' ? '🗼' : '🎮',
            content: (() => {
                const status = challenges.get(ev.challengeId)?.c.status;
                if (ev.kind === 'feature')
                    return (
                        <>
                            {ev.text} {challenges.has(ev.challengeId) && <Ref id={ev.challengeId} />}
                        </>
                    );
                if (ev.kind === 'quest')
                    return (
                        <>
                            你完成了 <Ref id={ev.challengeId} />，{status === 'done' ? '家長確認了 ✓' : '等家長確認'}
                        </>
                    );
                if (ev.kind === 'learning')
                    return (
                        <>
                            你練習了 <Ref id={ev.challengeId} />，拿到星幣
                        </>
                    );
                return (
                    <>
                        你玩了一場 <Ref id={ev.challengeId} />
                    </>
                );
            })(),
            tone: 'me',
        }));
        // 第 N 項任務完成的那一刻，遊戲島開放
        const questEvents = model.events.filter((e) => e.kind === 'quest');
        const unlockAt = model.stats.gamesUnlocked ? questEvents[model.stats.questTarget - 1] : undefined;
        if (unlockAt)
            real.push({
                key: 'unlock-games',
                minute: unlockAt.minute,
                seq: 999,
                icon: '🔓',
                content: (
                    <>
                        完成 {model.stats.questTarget} 項每日任務，<IslandRef id={GAME_ISLAND_ID} /> 開放了！
                    </>
                ),
                tone: 'me',
            });
        return real.sort((a, b) => b.minute - a.minute || b.seq - a.seq);
    }, [model.events, model.stats, Ref, IslandRef, challenges]);

    // ---------- 動作 ----------
    const submitQuest = async (c: IslandChallenge) => {
        if (c.status !== 'todo' || completeQuest.isPending) return;
        if (confirmQuest !== c.id) {
            setConfirmQuest(c.id);
            return;
        }
        try {
            await completeQuest.mutateAsync({ userId, questId: c.sourceId, isParentApproved: false });
            setConfirmQuest(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const code = (error as { code?: string })?.code;
            if (msg.includes('409') || code === '23505') setConfirmQuest(null);
            else setQuestError(`送出失敗：${msg}`);
        }
    };

    const practiceModal = practiceItem ? toLearningModalPayload(practiceItem) : null;
    const tourSteps = tour?.steps ?? [];

    // ---------- 卡片 ----------
    let card: React.ReactNode = null;
    if (selected?.type === 'building') {
        const hit = challenges.get(selected.id);
        if (hit) card = renderChallengeCard(hit.c, hit.island);
    } else if (selected?.type === 'island') {
        const isl = islandsById.get(selected.id);
        if (isl) card = renderIslandCard(isl);
    } else if (selected?.type === 'walker') {
        const w = engineRef.current?.getWalker(Number(selected.id));
        if (w)
            card = (
                <>
                    <p className="ci-kicker">島民 · 背景角色</p>
                    <h3>
                        <span className="ci-big">🧒</span>
                        {w.name}
                    </h3>
                    <p>
                        {w.busy ? (
                            <>
                                在 <Ref id={w.busy} /> 門口逛逛。
                            </>
                        ) : (
                            <>
                                正在 <IslandRef id={w.island} /> 散步。
                            </>
                        )}
                    </p>
                    <p className="ci-note">島民是群島上的背景小角色，會到處逛，但不是真的玩家，也不會出現在群島日誌裡。</p>
                    <div className="ci-actions">
                        <button type="button" className="ci-ghost" onClick={() => select(null, false)}>
                            停止跟隨
                        </button>
                    </div>
                </>
            );
    } else if (selected?.type === 'flow') {
        const f = model.flows.find((x) => x.id === selected.id);
        const a = f && challenges.get(f.from),
            b = f && challenges.get(f.to);
        if (f && a && b)
            card = (
                <>
                    <p className="ci-kicker">知識連結</p>
                    <h3>{f.label}</h3>
                    <p>{f.note}</p>
                    <div className="ci-rel">
                        <button type="button" onClick={() => select({ type: 'building', id: a.c.id })}>
                            <span>{a.c.icon}</span>
                            <span>{a.c.name}</span>
                            <small>{a.island.name}</small>
                        </button>
                        <button type="button" onClick={() => select({ type: 'building', id: b.c.id })}>
                            <span>{b.c.icon}</span>
                            <span>→ {b.c.name}</span>
                            <small>{b.island.name}</small>
                        </button>
                    </div>
                </>
            );
    }

    function renderChallengeCard(c: IslandChallenge, isl: IslandDef) {
        const rel = model.flows.filter((f) => f.from === c.id || f.to === c.id);
        return (
            <>
                <p className="ci-kicker">
                    {isl.icon} {isl.name} · {isl.en.toUpperCase()}
                </p>
                <h3>
                    <span className="ci-big">{c.icon}</span>
                    {c.name}
                </h3>
                <p>{c.desc}</p>
                <div className="ci-pills">
                    {c.kind === 'quest' && (
                        <>
                            {c.status === 'done' && <span className="ci-pill is-good">✓ 今天完成了</span>}
                            {c.status === 'submitted' && <span className="ci-pill is-wait">⏳ 等家長確認</span>}
                            {c.status === 'todo' && <span className="ci-pill">今天還沒完成</span>}
                            {c.rewardPoints != null && <span className="ci-pill">⭐ {c.rewardPoints}</span>}
                        </>
                    )}
                    {c.kind === 'feature' &&
                        c.tags.map((t) => (
                            <span key={t} className="ci-pill">
                                {t}
                            </span>
                        ))}
                    {(c.kind === 'learning' || c.kind === 'game') && (
                        <>
                            {c.kind === 'game' && !rewardUnlocked && <span className="ci-pill is-wait">🔒 遊戲島未開放</span>}
                            <span className={`ci-pill ${c.todayCount ? 'is-good' : ''}`}>
                                今日 {c.todayCount} 次{c.kind === 'learning' ? '練習' : '遊玩'}
                            </span>
                            <span className="ci-pill">累計 {c.totalCount} 次</span>
                            {c.tags.map((t) => (
                                <span key={t} className="ci-pill">
                                    {t}
                                </span>
                            ))}
                        </>
                    )}
                </div>
                {rel.length > 0 && (
                    <>
                        <p className="ci-sub">知識連結 · {rel.length}</p>
                        <div className="ci-rel">
                            {rel.map((f) => {
                                const other = challenges.get(f.from === c.id ? f.to : f.from)?.c;
                                if (!other) return null;
                                return (
                                    <button key={f.id} type="button" title={f.note} onClick={() => select({ type: 'building', id: other.id })}>
                                        <span>{other.icon}</span>
                                        <span>
                                            {f.from === c.id ? '→' : '←'} {other.name}
                                        </span>
                                        <small>{f.label}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                <div className="ci-actions">
                    {c.kind === 'quest' && (
                        <button
                            type="button"
                            className={`ci-primary ${confirmQuest === c.id ? 'is-confirm' : ''}`}
                            disabled={c.status !== 'todo' || completeQuest.isPending}
                            onClick={() => submitQuest(c)}
                        >
                            {c.status === 'done' ? '已完成 ✓' : c.status === 'submitted' ? '已送出' : completeQuest.isPending ? '送出中…' : confirmQuest === c.id ? '確定完成了！' : '我完成了！'}
                        </button>
                    )}
                    {c.kind === 'learning' && (
                        <button
                            type="button"
                            className="ci-primary"
                            onClick={() => {
                                const item = LEARNING_ITEMS.find((i) => i.id === c.sourceId);
                                if (item) setPracticeItem(item);
                            }}
                        >
                            開始練習 <ArrowRight size={18} />
                        </button>
                    )}
                    {c.kind === 'game' && (
                        <button
                            type="button"
                            className="ci-primary"
                            disabled={!rewardUnlocked}
                            onClick={() => {
                                const game = FUN_GAMES.find((g) => g.id === c.sourceId);
                                if (game) setPlayGame(game);
                            }}
                        >
                            {rewardUnlocked ? (
                                <>
                                    開始玩 ⭐{GAME_COST} <ArrowRight size={18} />
                                </>
                            ) : (
                                `🔒 再完成 ${remainingQuests} 項任務`
                            )}
                        </button>
                    )}
                    {c.kind === 'feature' && onOpenFeature && (
                        <button type="button" className="ci-primary" onClick={() => onOpenFeature(c.sourceId)}>
                            進入{c.name} <ArrowRight size={18} />
                        </button>
                    )}
                </div>
                {c.kind === 'quest' && confirmQuest === c.id && <p className="ci-note">真的做完了嗎？再按一次送出給家長確認。</p>}
                {c.kind === 'learning' && <p className="ci-note">練習滿 3 分鐘可以拿到星幣，屋頂也會出現金幣。</p>}
                {c.kind === 'game' && !rewardUnlocked && (
                    <p className="ci-note">
                        遊戲島要完成 {model.stats.questTarget} 項每日任務才會開放（已完成 {model.stats.questsDone} 項）。到「每日任務廣場」把任務做完吧！
                    </p>
                )}
                {c.kind === 'game' && rewardUnlocked && <p className="ci-note">每玩一次花 {GAME_COST} 星幣，玩完會依成績結算。</p>}
                {questError && <p className="ci-error">{questError}</p>}
            </>
        );
    }

    function renderIslandCard(isl: IslandDef) {
        const n = isl.challenges.length,
            k = isl.challenges.filter((c) => c.status !== 'todo').length;
        const idx = model.islands.findIndex((d) => d.id === isl.id) + 1;
        return (
            <>
                <p className="ci-kicker">
                    ISLAND {String(idx).padStart(2, '0')} · {isl.en.toUpperCase()}
                </p>
                <h3>
                    <span className="ci-big">{isl.icon}</span>
                    {isl.name}
                </h3>
                <p>{isl.summary}</p>
                {isl.locked ? (
                    <>
                        <p className="ci-sub">
                            🔒 開島條件 · 每日任務 {model.stats.questsDone} / {model.stats.questTarget}
                        </p>
                        <div className="ci-progress">
                            <div style={{ width: `${(Math.min(model.stats.questsDone, model.stats.questTarget) / model.stats.questTarget) * 100}%` }} />
                        </div>
                        <div className="ci-actions" style={{ marginBottom: 10 }}>
                            <button type="button" className="ci-ghost" onClick={() => select({ type: 'island', id: QUEST_ISLAND_ID })}>
                                去每日任務廣場 <ArrowRight size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    !isl.hub && (
                        <>
                            <p className="ci-sub">
                                今日進度 · {k} / {n}
                            </p>
                            <div className="ci-progress">
                                <div style={{ width: `${n ? (k / n) * 100 : 0}%` }} />
                            </div>
                        </>
                    )
                )}
                {n === 0 && isl.id === QUEST_ISLAND_ID && <p className="ci-note">今天沒有每日任務，請家長新增。</p>}
                <div className="ci-rel">
                    {isl.challenges.map((c) => (
                        <button key={c.id} type="button" onClick={() => select({ type: 'building', id: c.id })}>
                            <span>{c.icon}</span>
                            <span>{c.name}</span>
                            <small>{statusText(c) || c.tags[0]}</small>
                        </button>
                    ))}
                </div>
            </>
        );
    }

    // ---------- 清單 ----------
    const q = query.trim().toLowerCase();
    const list = model.islands
        .map((isl, i) => {
            const islandHit = !q || [isl.name, isl.en, isl.summary].join(' ').toLowerCase().includes(q);
            const chs = isl.challenges.filter((c) => islandHit || [c.name, c.desc, ...c.tags].join(' ').toLowerCase().includes(q));
            return { isl, i, chs, show: chs.length > 0 || (islandHit && !q) };
        })
        .filter((x) => x.show);
    // 搜尋時、或地圖上選到該島的建築時，一律展開
    const selectedIslandId = selected?.type === 'building' ? challenges.get(selected.id)?.island.id : undefined;
    const isOpen = (id: string) => !!q || id === selectedIslandId || !collapsed.includes(id);
    const allOpen = list.every(({ isl }) => isOpen(isl.id));
    const updateCollapsed = (next: string[]) => {
        setCollapsed(next);
        writeCollapsed(next);
    };
    const toggleIsland = (id: string) => updateCollapsed(collapsed.includes(id) ? collapsed.filter((x) => x !== id) : [...collapsed, id]);

    const stats = model.stats;
    const rootClass = ['ci-root', panelOpen ? 'panel-open' : '', tour ? 'touring' : '', viewMode === 'home' ? 'is-home' : ''].join(' ');
    const TOUR_END = tourEnd(tourSteps);
    const tourPct = Math.min(100, Math.max(0, ((minute - TOUR_START) / (TOUR_END - TOUR_START)) * 100));

    return (
        <div className={rootClass}>
            <main className="ci-stage" ref={stageRef} aria-label="3D 學習挑戰群島" />

            <header className="ci-brand">
                <div className="ci-logo">
                    <button type="button" className="ci-back" onClick={onBack} aria-label={backLabel} title={backLabel}>
                        <ArrowLeft size={18} />
                    </button>
                    <span className="ci-logo-text">
                        <b>學習挑戰群島</b>
                        <small>DAILY QUESTMON</small>
                    </span>
                </div>
                <div className="ci-seg" role="tablist" aria-label="檢視模式">
                    {(
                        [
                            ['overview', '全景'],
                            ['list', '清單'],
                            ['time', '時間'],
                        ] as const
                    ).map(([m, label]) => (
                        <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => changeMode(m)}>
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            {parentMessage && messageOpen && (
                <div className="ci-message" role="note">
                    <Megaphone size={16} />
                    <span>
                        <b>爸媽的話</b>
                        {parentMessage}
                    </span>
                    <button type="button" aria-label="收起" onClick={() => setMessageOpen(false)}>
                        <X size={14} />
                    </button>
                </div>
            )}

            <nav className="ci-toolbar" aria-label="地圖工具">
                <button type="button" className={`ci-tg ${names ? 'is-on' : ''}`} title="名牌：顯示島嶼與建築名稱 (N)" onClick={() => setNames((v) => !v)}>
                    <Tag size={18} />
                    <span>名牌</span>
                </button>
                <button type="button" className={`ci-tg ${flowsOn ? 'is-on' : ''}`} title="連結線 (L)" onClick={() => setFlowsOn((v) => !v)}>
                    <Link2 size={18} />
                    <span>連結線</span>
                </button>
                <button type="button" className={`ci-tg ${paused ? 'is-active' : ''}`} title="暫停 (空白鍵)" onClick={() => setPaused((v) => !v)}>
                    {paused ? <Play size={18} /> : <Pause size={18} />}
                    <span>{paused ? '繼續' : '暫停'}</span>
                </button>
                <button
                    type="button"
                    className="ci-tg"
                    title="鳥瞰 (H)"
                    onClick={() => {
                        select(null, false);
                        engineRef.current?.home();
                    }}
                >
                    <Globe size={18} />
                    <span>鳥瞰</span>
                </button>
                <button
                    type="button"
                    className="ci-tg"
                    title="日誌"
                    onClick={() => {
                        setPanelOpen(true);
                        setTab('log');
                        if (mode === 'overview') setMode('list');
                    }}
                >
                    <ScrollText size={18} />
                    <span>日誌</span>
                </button>
                <span className="ci-sep" />
                <div className="ci-clock">
                    <b>{hhmm(minute)}</b>
                    <div className="ci-presets">
                        {PRESETS.map(([m, label, emoji]) => (
                            <button
                                key={m}
                                type="button"
                                title={preset === m ? `${label}（再按一次回到現在）` : label}
                                className={preset === m ? 'is-on' : ''}
                                onClick={() => {
                                    if (tourRef.current) stopTour();
                                    const next = preset === m ? null : m;
                                    setPreset(next);
                                    engineRef.current?.setMinute(next);
                                    if (mode === 'time') setMode(isNarrow() ? 'overview' : 'list');
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
                {onClassic && (
                    <>
                        <span className="ci-sep" />
                        <button type="button" className="ci-tg" title="切換到經典版面" onClick={onClassic}>
                            <LayoutGrid size={18} />
                            <span>經典版</span>
                        </button>
                    </>
                )}
                {onHome && (
                    <>
                        <span className="ci-sep" />
                        <button type="button" className="ci-tg" title="回首頁" onClick={onHome}>
                            <Home size={18} />
                            <span>首頁</span>
                        </button>
                    </>
                )}
            </nav>

            <aside className="ci-panel" aria-label="挑戰清單">
                <button type="button" className="ci-sheet-handle" aria-label="展開或收合清單" onClick={() => setPanelOpen((v) => !v)} />
                <button
                    type="button"
                    className="ci-panel-tab"
                    aria-expanded={panelOpen}
                    aria-label={panelOpen ? '收合右側清單' : '展開右側清單'}
                    title={panelOpen ? '收合清單，看大地圖' : '展開清單'}
                    onClick={() => setPanelOpen((v) => !v)}
                >
                    {panelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    <span>{panelOpen ? '收合' : '清單'}</span>
                </button>
                <div className="ci-panel-head">
                    <p className="ci-kicker">CHALLENGE ARCHIPELAGO</p>
                    <h1>一格挑戰，一座相連的群島</h1>
                    <p className="ci-lede">每日任務、學習與遊戲都在這片群島上，今天做過的事會亮起來。</p>
                    <div className="ci-stats">
                        <div className={`ci-stat ${stats.questsTotal > 0 && stats.questsDone >= stats.questsTotal ? 'is-good' : 'is-hl'}`}>
                            <b>
                                {stats.questsDone}/{stats.questsTotal}
                            </b>
                            <span>今日任務</span>
                        </div>
                        <div className="ci-stat">
                            <b>
                                <Star size={13} fill="currentColor" style={{ display: 'inline', color: '#e0a23a', marginRight: 2 }} />
                                {starBalance}
                            </b>
                            <span>星幣</span>
                        </div>
                        <div className="ci-stat">
                            <b>{stats.practicedToday}</b>
                            <span>今日練習</span>
                        </div>
                        <button
                            type="button"
                            className={`ci-stat ${stats.gamesUnlocked ? 'is-good' : ''}`}
                            style={{ textAlign: 'left' }}
                            onClick={() => model.islands.some((i) => i.id === GAME_ISLAND_ID) && select({ type: 'island', id: GAME_ISLAND_ID })}
                        >
                            <b>{stats.gamesUnlocked ? '開放' : `🔒${Math.min(stats.questsDone, stats.questTarget)}/${stats.questTarget}`}</b>
                            <span>遊戲島</span>
                        </button>
                    </div>
                </div>
                <label className="ci-search">
                    <Search size={18} />
                    <input
                        type="search"
                        placeholder="搜尋任務、挑戰、關鍵字…"
                        autoComplete="off"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setTab('list');
                        }}
                    />
                </label>
                <div className="ci-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>
                        清單
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'log'} onClick={() => setTab('log')}>
                        群島日誌 <em className="ci-live">LIVE</em>
                    </button>
                </div>
                <div className="ci-panel-body">
                    {tab === 'list' && (
                        <div role="tabpanel">
                            {list.length === 0 && <p className="ci-empty">找不到「{query}」相關的挑戰。</p>}
                            {list.length > 0 && !q && (
                                <div className="ci-list-tools">
                                    <button type="button" onClick={() => updateCollapsed(allOpen ? list.map(({ isl }) => isl.id) : [])}>
                                        {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
                                        {allOpen ? '全部收合' : '全部展開'}
                                    </button>
                                </div>
                            )}
                            {list.map(({ isl, i, chs }) => {
                                const k = isl.challenges.filter((c) => c.status !== 'todo').length;
                                const open = isOpen(isl.id);
                                return (
                                    <div key={isl.id} className={`ci-isl ${open ? '' : 'is-collapsed'}`}>
                                        <div className="ci-isl-row">
                                            <button
                                                type="button"
                                                className={`ci-isl-head ${selected?.type === 'island' && selected.id === isl.id ? 'is-sel' : ''}`}
                                                onClick={() => select({ type: 'island', id: isl.id })}
                                            >
                                                <span className="ci-isl-no">{String(i + 1).padStart(2, '0')}</span>
                                                <span className="ci-dot" style={{ background: isl.accent }} />
                                                <span className="ci-isl-name">
                                                    {isl.icon} {highlight(isl.name, q)}
                                                </span>
                                                {!isl.hub && (
                                                    <span className="ci-isl-prog">
                                                        {isl.locked ? `🔒 ${Math.min(stats.questsDone, stats.questTarget)}/${stats.questTarget}` : `${k}/${isl.challenges.length}`}
                                                    </span>
                                                )}
                                            </button>
                                            {chs.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="ci-isl-fold"
                                                    aria-expanded={open}
                                                    aria-label={`${open ? '收合' : '展開'}${isl.name}`}
                                                    disabled={!!q}
                                                    onClick={() => toggleIsland(isl.id)}
                                                >
                                                    <ChevronDown size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="ci-chs" hidden={!open}>
                                            {chs.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    className={`ci-ch ${selected?.type === 'building' && selected.id === c.id ? 'is-sel' : ''}`}
                                                    onClick={() => select({ type: 'building', id: c.id })}
                                                >
                                                    <span className="ci-ch-ico">{c.icon}</span>
                                                    <span className="ci-ch-name">{highlight(c.name, q)}</span>
                                                    <span className={`ci-ch-state ${c.status === 'done' || c.todayCount ? 'done' : c.status === 'submitted' ? 'wait' : ''}`}>{statusText(c)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {tab === 'log' && (
                        <ol className="ci-log" role="tabpanel">
                            {logEntries.length === 0 && <li className="ci-log-empty">今天還沒有紀錄。完成每日任務、練習學習項目或玩遊戲後，會自動出現在這裡。</li>}
                            {logEntries.map((e) => (
                                <li key={e.key} className={e.tone ? `is-${e.tone}` : ''}>
                                    <time>{hhmm(e.minute)}</time>
                                    <span>{e.icon}</span>
                                    <span>{e.content}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
                <p className="ci-foot">金幣與沙漏依今天的任務紀錄與星幣紀錄自動更新；連結線依各單元的先備知識整理。</p>
            </aside>

            {card && (
                <section className="ci-card" aria-live="polite">
                    <button type="button" className="ci-close" aria-label="關閉" onClick={() => select(null, false)}>
                        <X size={18} />
                    </button>
                    {card}
                </section>
            )}

            {tour && (
                <div className="ci-timeline">
                    <div className="ci-tl-top">
                        <span className="ci-tl-time">{hhmm(minute)}</span>
                        <span className="ci-tl-text">{tour.text}</span>
                        <span className="ci-tl-count">
                            {String(tour.idx).padStart(2, '0')} / {String(tourSteps.length).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="ci-tl-bar">
                        <div className="ci-tl-fill" style={{ width: `${tourPct}%` }} />
                        {tourSteps.map((s, i) => (
                            <i
                                key={`${s.challengeId}-${i}`}
                                className={`ci-tl-tick ${i < tour.idx ? 'is-past' : ''}`}
                                style={{ left: `${Math.min(100, ((Math.max(TOUR_START, s.minute) - TOUR_START) / (TOUR_END - TOUR_START)) * 100)}%` }}
                                title={`${hhmm(s.minute)} ${s.text}`}
                            />
                        ))}
                    </div>
                    <div className="ci-tl-btns">
                        <button type="button" onClick={() => (tour.ended ? startTour() : pauseTour(tour.playing))}>
                            {tour.playing ? <Pause size={16} /> : <Play size={16} />}
                            <span>{tour.playing ? '暫停' : '繼續'}</span>
                        </button>
                        <button type="button" onClick={startTour}>
                            <RotateCcw size={16} />
                            <span>重播</span>
                        </button>
                        <button type="button" onClick={() => changeMode(isNarrow() ? 'overview' : 'list')}>
                            <X size={16} />
                            <span>離開</span>
                        </button>
                    </div>
                </div>
            )}

            {introStep != null && (
                <div className="ci-intro" role="dialog" aria-modal="true" aria-labelledby="ci-intro-title">
                    <div className="ci-intro-card">
                        <p className="ci-kicker">HELLO, LEARNER / {String(introStep + 1).padStart(2, '0')}</p>
                        <h2 id="ci-intro-title">{INTRO[introStep][0]}</h2>
                        <p>{INTRO[introStep][1]}</p>
                        <div className="ci-intro-btns">
                            <button
                                type="button"
                                className="ci-ghost"
                                onClick={() => {
                                    writeIntroSeen();
                                    setIntroStep(null);
                                }}
                            >
                                略過
                            </button>
                            <button
                                type="button"
                                className="ci-primary"
                                autoFocus
                                onClick={() => {
                                    if (introStep < INTRO.length - 1) setIntroStep(introStep + 1);
                                    else {
                                        writeIntroSeen();
                                        setIntroStep(null);
                                    }
                                }}
                            >
                                {introStep === INTRO.length - 1 ? '開始探索' : '下一步 →'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="ci-loading">
                    <span className="ci-spinner" />
                    正在組合挑戰群島…
                </div>
            )}

            {playGame && (
                <GameModal
                    isOpen
                    onClose={() => setPlayGame(null)}
                    onGoHome={onHome}
                    gameUrl={playGame.url}
                    gameName={playGame.name}
                    gameId={playGame.id}
                    userId={userId}
                    starBalance={rewardPlay.starBalance}
                    onSpendStars={rewardPlay.spendStars}
                    onRefreshBalance={() => rewardPlay.refetchBalance()}
                    onEarnStars={rewardPlay.earnStars}
                />
            )}

            {practiceItem && practiceModal && (
                <GameModal
                    isOpen
                    onClose={() => setPracticeItem(null)}
                    gameUrl={practiceModal.gameUrl}
                    gameName={practiceModal.gameName}
                    gameId={practiceModal.gameId}
                    userId={userId}
                    starBalance={0}
                    onSpendStars={async () => true}
                    onRefreshBalance={() => {}}
                    mode="practice"
                    practiceRewardStars={10}
                    onPracticeComplete={(stars) => grantPracticeReward(practiceItem, stars)}
                    embeddedContent={getLearningEmbeddedContent(practiceItem, userId)}
                />
            )}
        </div>
    );
};

