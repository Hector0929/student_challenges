/**
 * 怪獸塔 V3/V4 共用的遊戲流程
 *
 * 擲骰、逐格移動、梯子/陷阱滑動、隊伍出手、怪獸蛋、守門怪挑戰、破頂重玩都在這裡，
 * 兩個版本只差在「畫面怎麼演」：每走一格呼叫 onStep，搭梯子/滑落時若有 onSlide
 * 就交給它一次演完（V4 沿著 3D 梯子/蛇身滑），沒有就逐格走（V3 的捲動盤面）。
 *
 * 進度全部存在 tower_progress（useTowerProgress / useRollDice），隨行夥伴沿用 V3 的
 * localStorage key，所以換版本不會遺失任何怪獸、怪獸蛋、樓層或骰子。
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    MONSTERS,
    generateRandomEvents,
    useRollDice,
    useTowerProgress,
    type ActiveTeamMember,
    type MonsterId,
    type TeamEffectDetail,
} from '../../hooks/useTowerProgress';
import { useStarBalance } from '../../hooks/useQuests';
import { GEN3_TOTAL_FLOORS, applyRouteMode, getMonsterRole, withEncounterTiles } from '../../lib/towerGen3Rules';
import { RETRIES_PER_MONSTERS } from './challenges/types';

export const COMPANION_STORAGE_KEY = 'monster_tower_gen3_companion_v1';

/** 一步的節奏；開啟減少動態時縮短，避免長時間晃動 */
const STEP_MS = 190;
const SLIDE_STEP_MS = 130;

export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface UseTowerGameOptions {
    userId: string;
    /** 每走到一格（含滑動途中的每一格）時呼叫，用來移動鏡頭 */
    onStep?: (floor: number) => void;
    /** 梯子/陷阱一次演完；回傳的 Promise 結束後才繼續 */
    onSlide?: (from: number, to: number) => Promise<void>;
    stepMs?: number;
}

export function useTowerGame({ userId, onStep, onSlide, stepMs = STEP_MS }: UseTowerGameOptions) {
    const { data: progress, refetch } = useTowerProgress(userId);
    const rollDiceMutation = useRollDice();
    const { data: starBalance = 0 } = useStarBalance(userId);

    // 每局重新種一次亂數種子，梯子/陷阱位置每次破頂重玩都會洗牌，避免玩家把棋盤背下來
    const [eventSeed, setEventSeed] = useState(() => Date.now());
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [note, setNote] = useState('準備好了！點擊「擲骰子」開始攀登怪獸塔。');
    const [routeMode, setRouteMode] = useState<'safe' | 'risk'>('safe');
    const [animatedFloor, setAnimatedFloor] = useState<number | null>(null);
    const [lastRoll, setLastRoll] = useState<{ value: number; id: number } | null>(null);
    const [showVictory, setShowVictory] = useState(false);
    const [teamEffectPopup, setTeamEffectPopup] = useState<TeamEffectDetail | null>(null);
    // 踩到守門怪獸格時要打的挑戰關卡樓層（null = 沒有挑戰進行中）
    const [challengeFloor, setChallengeFloor] = useState<number | null>(null);
    // 每開一場挑戰 +1，用來強制重新掛載挑戰元件（同一層再次觸發也要是全新一場）
    const [challengeRunId, setChallengeRunId] = useState(0);
    const [eggReveal, setEggReveal] = useState<string | null>(null);
    // 玩家自己挑的隨行夥伴（null = 交給系統自動挑最稀有的那隻）
    const [chosenCompanionId, setChosenCompanionId] = useState<MonsterId | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = window.localStorage.getItem(`${COMPANION_STORAGE_KEY}:${userId}`);
            return saved && MONSTERS[saved as MonsterId] ? (saved as MonsterId) : null;
        } catch {
            return null; // 忽略讀取異常，改用自動挑選
        }
    });
    // 每跳一格 +1，用來重新觸發跳躍動畫
    const [hopTick, setHopTick] = useState(0);

    // 演出回呼用 ref 轉接，擲骰流程進行中換了 callback 也會用到最新的
    const callbacks = useRef({ onStep, onSlide });
    useLayoutEffect(() => {
        callbacks.current = { onStep, onSlide };
    });

    const currentFloor = progress?.current_floor ?? 1;
    const diceCount = progress?.dice_count ?? 0;

    // 孩子累積獲得的所有怪獸（包含先前版本獲得的怪獸）
    const ownedMonsterIds = useMemo(() => {
        const raw = progress?.monsters_collected ?? [];
        return raw.filter((id) => !id.startsWith('egg:')) as MonsterId[];
    }, [progress?.monsters_collected]);

    // 未孵化的怪獸蛋，餵給共用的收藏／孵蛋面板
    const eggs = useMemo(() => {
        const raw = progress?.monsters_collected ?? [];
        return raw.filter((id) => id.startsWith('egg:')).map((id, index) => ({ eggIndex: index, monsterId: id.replace('egg:', '') }));
    }, [progress?.monsters_collected]);

    // 梯子/陷阱每局隨機（沿用 V1/V2 既有的 generateRandomEvents），里程碑怪獸蛋固定在 25/50/75/100 層
    const baseEvents = useMemo(() => withEncounterTiles(generateRandomEvents(eventSeed), eventSeed), [eventSeed]);
    const activeEvents = useMemo(() => applyRouteMode(baseEvents, routeMode), [baseEvents, routeMode]);
    const eventMap = useMemo(() => new Map(activeEvents.map((event) => [event.floor_number, event])), [activeEvents]);

    const ownedUniqueMonsters = useMemo(
        () => Array.from(new Set(ownedMonsterIds)).filter((monsterId) => !!MONSTERS[monsterId]),
        [ownedMonsterIds],
    );

    // 隨行夥伴：沒挑過就自動挑收藏中最稀有的一隻（進化形態優先，其次解鎖樓層高者）
    const companion = useMemo(() => {
        const owned = ownedUniqueMonsters;
        if (owned.length === 0) return null;
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
    const companionRole = companion ? getMonsterRole(companion.id as MonsterId) : null;

    // 擲骰規則只需要知道「隨行夥伴是誰、會什麼」
    const activeTeam = useMemo<ActiveTeamMember[]>(() => {
        if (!companion) return [];
        return [{ id: companion.id, name: companion.name, emoji: companion.emoji, role: getMonsterRole(companion.id as MonsterId) }];
    }, [companion]);

    // 挑戰重試次數：收藏怪獸數，帶「輸出／破甲」夥伴再多一次
    const challengeRetryCredit = useMemo(() => {
        const strikerBonus = companionRole === 'striker' || companionRole === 'breaker' ? RETRIES_PER_MONSTERS : 0;
        return ownedMonsterIds.length + strikerBonus;
    }, [companionRole, ownedMonsterIds.length]);

    const chooseCompanion = useCallback(
        (monsterId: MonsterId) => {
            setChosenCompanionId(monsterId);
            setNote(`${MONSTERS[monsterId]?.name} 開始跟著你一起爬塔！`);
            try {
                window.localStorage.setItem(`${COMPANION_STORAGE_KEY}:${userId}`, monsterId);
            } catch {
                // 忽略儲存異常
            }
        },
        [userId],
    );

    const roll = async () => {
        if (isRolling || isMoving || diceCount <= 0 || challengeFloor !== null) return;
        setIsRolling(true);
        const step = (floor: number) => {
            setAnimatedFloor(floor);
            setHopTick((tick) => tick + 1);
            callbacks.current.onStep?.(floor);
        };
        try {
            const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
            const startFloor = currentFloor;
            setAnimatedFloor(startFloor);

            const result = await rollDiceMutation.mutateAsync({ userId, currentFloor: startFloor, clientEvents: activeEvents, activeTeam });

            setIsMoving(true);
            setLastRoll({ value: result.roll, id: Date.now() });
            const reachedFloor = result.progress.current_floor;
            const routeTag = routeMode === 'risk' ? '冒險路' : '安全路';
            const reduced = prefersReducedMotion();
            const walkMs = reduced ? 60 : stepMs;
            const slideMs = reduced ? 50 : SLIDE_STEP_MS;

            const intermediateFloor = Math.min(startFloor + result.roll, GEN3_TOTAL_FLOORS);
            for (let floor = startFloor + 1; floor <= intermediateFloor; floor += 1) {
                step(floor);
                await wait(walkMs);
            }

            if (reachedFloor !== intermediateFloor) {
                const direction = reachedFloor > intermediateFloor ? 1 : -1;
                const event = eventMap.get(intermediateFloor);
                const eventDesc = event?.description ?? (direction > 0 ? '搭乘升降梯上升！' : '不小心掉入陷阱！');
                setNote(`擲出 🎲 ${result.roll} 點！到達 ${intermediateFloor} 層，${eventDesc}`);
                await wait(280);

                // 隊伍出手時，先把「是誰幫了忙、少滑幾層」演出來
                if (result.teamEffect) {
                    setTeamEffectPopup(result.teamEffect);
                    await wait(900);
                }

                const slide = callbacks.current.onSlide;
                if (slide) {
                    setAnimatedFloor(reachedFloor);
                    await slide(intermediateFloor, reachedFloor);
                    callbacks.current.onStep?.(reachedFloor);
                } else {
                    for (let floor = intermediateFloor + direction; direction > 0 ? floor <= reachedFloor : floor >= reachedFloor; floor += direction) {
                        step(floor);
                        await wait(slideMs);
                    }
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
            setNote(`抵達第 ${reachedFloor} 層（${routeTag}）${eventText} ${result.teamEffect ? `✨ ${result.teamEffect.message}` : '🎉'}`);
            await refetch();
            setAnimatedFloor(null);

            // 撿到怪獸蛋 → 先演出拿到蛋的畫面
            if (finalEvent?.event_type === 'egg' && finalEvent.monster_id) setEggReveal(finalEvent.monster_id);

            // 踩到守門怪獸格 → 跳出塔內挑戰關卡
            if (finalEvent?.event_type === 'monster') {
                setChallengeRunId((id) => id + 1);
                setChallengeFloor(reachedFloor);
            } else if (result.reachedTop) {
                window.setTimeout(() => setShowVictory(true), 400);
            }
        } catch (error) {
            console.error('Tower roll failed', error);
            setNote('擲骰失敗，請稍候重試。');
            setAnimatedFloor(null);
        } finally {
            setIsRolling(false);
            setIsMoving(false);
        }
    };

    /** 破頂重玩：梯子/陷阱重新洗牌 */
    const restart = useCallback(() => {
        setShowVictory(false);
        setEventSeed(Date.now());
    }, []);

    return {
        progress,
        currentFloor,
        displayFloor: animatedFloor ?? currentFloor,
        animatedFloor,
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
        chooseCompanion,
        challengeRetryCredit,
        isRolling,
        isMoving,
        hopTick,
        lastRoll,
        note,
        teamEffectPopup,
        challengeFloor,
        challengeRunId,
        finishChallenge: () => setChallengeFloor(null),
        eggReveal,
        dismissEgg: () => setEggReveal(null),
        showVictory,
        restart,
        roll,
    };
}
