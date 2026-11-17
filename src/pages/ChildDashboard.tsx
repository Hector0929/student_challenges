import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ExchangeRequestDialog } from '../components/ExchangeRequestDialog';
import { QuestCard } from '../components/QuestCard';
import { RPGDialog } from '../components/RPGDialog';
import { RPGButton } from '../components/RPGButton';
import { RewardTime } from '../components/RewardTime';
import { WishQuestDialog } from '../components/WishQuestDialog';
import { LearningArea } from '../components/LearningArea';
import { TodayProgressCard } from '../components/TodayProgressCard';
import { useQuests, useDailyLogs, useDailyProgress, useCompleteQuest, useStarBalance, isQuestVisibleToChild } from '../hooks/useQuests';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';
import { useUser } from '../contexts/UserContext';
import type { Quest } from '../types/database';
import { computeTodayProgress } from '../lib/todayProgress';
import { useMountOnFirstOpen } from '../hooks/useMountOnFirstOpen';

// 怪獸塔、世界島、商店、3D 群島都是第一次打開時才下載（見 useMountOnFirstOpen）
const MonsterTowerV4 = lazy(() =>
    import('../components/MonsterTowerV4').then((m) => ({
        default: m.MonsterTowerV4,
    })),
);
const ShopModal = lazy(() => import('../components/ShopModal').then((m) => ({ default: m.ShopModal })));
const ChallengeIslandFullScreen = lazy(() =>
    import('../features/challengeIsland/ChallengeIslandFullScreen').then((m) => ({
        default: m.ChallengeIslandFullScreen,
    })),
);

interface ChildDashboardProps {
    userId: string;
    onGoHome?: () => void;
}

/** 未完成的任務預設只顯示幾個，其餘收起來 */
const VISIBLE_TODO = 3;

const greetingByHour = () => {
    const h = new Date().getHours();
    if (h < 11) return '早安';
    if (h < 14) return '午安';
    if (h < 18) return '下午好';
    return '晚安';
};

/**
 * 孩子首頁（主首頁）：越靠近「今天要做的事」越往上放。
 * 手機單欄：問候 → 今日進度 → 未完成任務 → 今天推薦的學習 → 遊戲入口 → 全部學習。
 * 平板以上兩欄：左欄任務、右欄學習與入口；全部學習橫跨兩欄。
 */
export const ChildDashboard: React.FC<ChildDashboardProps> = ({ userId, onGoHome }) => {
    const { user } = useUser();
    const { data: allQuests, isLoading: questsLoading } = useQuests();
    const quests = allQuests?.filter((quest) => isQuestVisibleToChild(quest, userId)) ?? [];
    const { data: logs, isLoading: logsLoading } = useDailyLogs(userId);
    const progress = useDailyProgress(userId);
    const { data: starBalance } = useStarBalance(userId);
    const completeQuestMutation = useCompleteQuest();
    const { data: familySettings } = useFamilySettings();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
    const [isTowerOpen, setIsTowerOpen] = useState(false);
    const [shopMode, setShopMode] = useState<'monster' | 'bank' | null>(null);
    const [isIslandOpen, setIsIslandOpen] = useState(false);
    const towerMounted = useMountOnFirstOpen(isTowerOpen);
    const shopMounted = useMountOnFirstOpen(shopMode !== null);
    const islandMounted = useMountOnFirstOpen(isIslandOpen);
    const [showAllTodo, setShowAllTodo] = useState(false);
    const [showDone, setShowDone] = useState(false);
    const [questError, setQuestError] = useState<string | null>(null);
    const [lockedHint, setLockedHint] = useState(false);
    const [celebrate, setCelebrate] = useState<string | null>(null);
    const rewardRef = useRef<HTMLDivElement>(null);

    const today = computeTodayProgress(progress.completed_quests, progress.total_quests);
    const funGamesEnabled = familySettings?.fun_games_enabled ?? DEFAULT_FAMILY_SETTINGS.fun_games_enabled;
    const exchangeEnabled = !!familySettings?.exchange_rate_enabled;
    const parentMessage = familySettings?.parent_message_enabled ? familySettings.parent_message || DEFAULT_FAMILY_SETTINGS.parent_message : null;

    // 慶祝只在「這次打開期間」剛解鎖／剛全部完成時出現一次（取代原本一直漂浮的背景文字）
    // 在 render 時比對上一次的狀態（第一次載入不算），提示 4 秒後自動消失
    const dataReady = !questsLoading && !logsLoading;
    const [seen, setSeen] = useState<{
        unlocked: boolean;
        allDone: boolean;
    } | null>(null);
    if (dataReady && (!seen || seen.unlocked !== today.unlocked || seen.allDone !== today.allDone)) {
        if (seen) {
            if (today.allDone && !seen.allDone) setCelebrate('今天的任務全部完成！🎉');
            else if (today.unlocked && !seen.unlocked) setCelebrate('遊戲時間解鎖了！🎮');
        }
        setSeen({ unlocked: today.unlocked, allDone: today.allDone });
    }
    useEffect(() => {
        if (!celebrate) return;
        const t = setTimeout(() => setCelebrate(null), 4000);
        return () => clearTimeout(t);
    }, [celebrate]);

    const getQuestStatus = (questId: string): 'pending' | 'completed' | 'verified' => {
        const log = logs?.find((l) => l.quest_id === questId);
        return log?.status || 'pending';
    };
    const isQuestCompleted = (questId: string) => getQuestStatus(questId) !== 'pending';

    const handleQuestClick = (questId: string) => {
        if (isQuestCompleted(questId)) return;
        setSelectedQuestId(questId);
        setConfirmDialogOpen(true);
    };

    const closeConfirm = () => {
        setConfirmDialogOpen(false);
        setSelectedQuestId(null);
    };

    const handleConfirmComplete = async () => {
        if (!selectedQuestId || completeQuestMutation.isPending) return;
        if (isQuestCompleted(selectedQuestId)) return closeConfirm();
        try {
            await completeQuestMutation.mutateAsync({
                userId,
                questId: selectedQuestId,
                isParentApproved: false,
            });
            setQuestError(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const code = (error as { code?: string })?.code;
            // 409／23505：今天已經完成過，當作成功
            if (!(msg.includes('409') || code === '23505')) {
                console.error('Failed to complete quest:', error);
                setQuestError(
                    msg.includes('任務不存在') ? '這個任務已經被爸爸媽媽拿掉了，畫面會重新整理。' : '沒有送出成功，請再按一次「確定完成」。如果一直失敗，請找爸爸媽媽幫忙。',
                );
                if (msg.includes('任務不存在')) setTimeout(() => window.location.reload(), 2500);
            }
        }
        // 等快取更新再關閉，避免對話框關掉時任務還沒變成「已完成」
        await new Promise((resolve) => setTimeout(resolve, 150));
        closeConfirm();
    };

    const openGames = () => {
        if (!today.unlocked) {
            setLockedHint(true);
            setTimeout(() => setLockedHint(false), 3000);
            return;
        }
        rewardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (questsLoading || logsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-float">👾</div>
                    <p className="font-heading text-ink">載入中...</p>
                </div>
            </div>
        );
    }

    const todo = quests.filter((q) => getQuestStatus(q.id) === 'pending');
    const done = quests
        .filter((q) => getQuestStatus(q.id) !== 'pending')
        // 等爸媽確認的放前面，已核准的放後面
        .sort((a, b) => (getQuestStatus(a.id) === 'completed' ? 0 : 1) - (getQuestStatus(b.id) === 'completed' ? 0 : 1));
    const visibleTodo = showAllTodo ? todo : todo.slice(0, VISIBLE_TODO);
    const hiddenTodo = todo.length - visibleTodo.length;

    const renderQuest = (quest: Quest) => (
        <QuestCard
            key={quest.id}
            quest={quest}
            isCompleted={isQuestCompleted(quest.id)}
            status={getQuestStatus(quest.id)}
            onComplete={handleQuestClick}
            disabled={completeQuestMutation.isPending}
        />
    );

    const entries = (
        <section aria-label="遊戲入口" className="clay-card p-4 rounded-card">
            <div className={`grid gap-2 ${funGamesEnabled ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-4'}`}>
                <EntryTile icon="🏝️" label="群島" onClick={() => setIsIslandOpen(true)} />
                <EntryTile icon="🗼" label="怪獸塔" onClick={() => setIsTowerOpen(true)} />
                <EntryTile icon="🏦" label="銀行" onClick={() => setShopMode('bank')} />
                <EntryTile icon="🏪" label="商店街" onClick={() => setShopMode('monster')} />
                {funGamesEnabled && (
                    <EntryTile
                        icon={today.unlocked ? '🎮' : '🔒'}
                        label="遊戲"
                        sub={today.unlocked ? '已解鎖' : `還差 ${today.left} 個`}
                        locked={!today.unlocked}
                        onClick={openGames}
                    />
                )}
            </div>
            {lockedHint && (
                <p role="status" className="font-body text-sm mt-3 text-center text-ink-soft">
                    再完成 {today.left} 個任務，遊戲時間就會解鎖喔！
                </p>
            )}
        </section>
    );

    return (
        <LearningArea userId={userId} onGoHome={onGoHome}>
            {({ recommended, all }) => (
                <div className="max-w-5xl mx-auto grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
                    {/* 手機單欄：問候 → 進度 → 任務 → 推薦 → 入口 → 全部學習（用 order 排）；
                桌機兩欄各自往下長，不會互相撐出空隙 */}
                    <div className="contents lg:flex lg:flex-col lg:gap-5">
                        {/* 問候＋父母的叮嚀 */}
                        <section aria-label="問候" className="clay-card p-5 flex items-start gap-4 rounded-card order-1 lg:order-none">
                            <span className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-3xl bg-surface border-2 border-line">
                                {user?.avatar_url || '👦'}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h1 className="font-heading text-xl font-bold text-ink">
                                    {greetingByHour()}，{user?.name || '冒險家'}！
                                </h1>
                                {parentMessage ? (
                                    <p className="font-body text-sm mt-1 leading-relaxed text-ink-soft">
                                        <span aria-hidden="true">💬 </span>
                                        <span className="sr-only">父母的叮嚀：</span>
                                        {parentMessage}
                                    </p>
                                ) : (
                                    <p className="font-body text-sm mt-1 text-ink-soft">今天也一起加油吧！</p>
                                )}
                                {exchangeEnabled && (
                                    <p className="font-body text-xs mt-2 text-ink-muted">
                                        1 ⭐ = {familySettings?.star_to_twd_rate ?? DEFAULT_FAMILY_SETTINGS.star_to_twd_rate} 元
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* 今日任務：未完成在前，已完成收起來 */}
                        <section aria-label="今日任務" className="clay-card p-5 rounded-card order-3 lg:order-none">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <h2 className="font-heading text-lg font-bold text-ink">
                                    🎯 今日任務
                                    {todo.length > 0 && <span className="font-body text-sm font-normal ml-2 text-ink-soft">還有 {todo.length} 個</span>}
                                </h2>
                                <button type="button" onClick={() => setIsDialogOpen(true)} className="clay-btn py-2 px-3 text-sm cursor-pointer whitespace-nowrap rounded-control">
                                    ✨ 想要新任務
                                </button>
                            </div>

                            {questError && (
                                <div role="alert" className="mb-4 p-3 rounded-control font-body text-sm flex items-start gap-2 bg-red-50 text-danger-dark border-2 border-red-200">
                                    <span className="flex-1">{questError}</span>
                                    <button type="button" onClick={() => setQuestError(null)} className="font-bold cursor-pointer" aria-label="關閉提示">
                                        ✕
                                    </button>
                                </div>
                            )}

                            {quests.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="text-5xl mb-3">😴</div>
                                    <p className="font-heading text-ink">目前沒有任務</p>
                                    <p className="font-body text-sm mt-1 text-ink-soft">請爸爸媽媽新增每日任務</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todo.length === 0 && <p className="font-body text-center py-3 text-primary-dark">今天的任務都做完了，好棒！</p>}
                                    {visibleTodo.map(renderQuest)}
                                    {hiddenTodo > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllTodo(true)}
                                            className="w-full py-2 rounded-control font-body text-sm cursor-pointer flex items-center justify-center gap-1 bg-surface border-2 border-dashed border-line text-ink-soft"
                                        >
                                            還有 {hiddenTodo} 個 <ChevronDown size={16} />
                                        </button>
                                    )}
                                    {done.length > 0 && (
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowDone((v) => !v)}
                                                aria-expanded={showDone}
                                                className="w-full flex items-center justify-between font-body text-sm cursor-pointer py-1 text-ink-soft"
                                            >
                                                <span>已完成 {done.length} 個（送給爸爸媽媽確認）</span>
                                                {showDone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            {showDone && <div className="space-y-3 mt-2">{done.map(renderQuest)}</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                    <div className="contents lg:flex lg:flex-col lg:gap-5">
                        <TodayProgressCard
                            className="order-2 lg:order-none"
                            done={progress.completed_quests}
                            total={progress.total_quests}
                            starBalance={starBalance || 0}
                            onExchange={exchangeEnabled ? () => setIsExchangeDialogOpen(true) : undefined}
                        />

                        {recommended && <div className="order-4 lg:order-none">{recommended}</div>}
                        <div className="order-5 lg:order-none">{entries}</div>
                    </div>
                    {all && <div className="order-6 lg:order-none lg:col-span-2">{all}</div>}

                    {funGamesEnabled && today.unlocked && (
                        <div ref={rewardRef} className="order-7 lg:order-none lg:col-span-2 scroll-mt-24">
                            <RewardTime isUnlocked remainingQuests={today.left} totalQuests={today.goal} userId={userId} onGoHome={onGoHome} />
                        </div>
                    )}

                    {celebrate && (
                        <div
                            role="status"
                            className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] px-6 py-3 rounded-full shadow-soft-hover font-heading text-lg animate-bounce-in bg-accent text-white"
                        >
                            {celebrate}
                        </div>
                    )}

                    <WishQuestDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} userId={userId} />

                    <RPGDialog
                        isOpen={confirmDialogOpen}
                        onClose={closeConfirm}
                        title="確定完成了嗎？"
                        footer={
                            <div className="flex gap-3 justify-end">
                                <RPGButton onClick={closeConfirm} variant="secondary">
                                    取消
                                </RPGButton>
                                <RPGButton onClick={handleConfirmComplete} disabled={completeQuestMutation.isPending}>
                                    {completeQuestMutation.isPending ? '送出中...' : '確定完成！'}
                                </RPGButton>
                            </div>
                        }
                    >
                        <p className="text-sm text-ink-soft">完成後將送出給爸爸媽媽審核喔！</p>
                    </RPGDialog>

                    <ExchangeRequestDialog isOpen={isExchangeDialogOpen} onClose={() => setIsExchangeDialogOpen(false)} />

                    {towerMounted && (
                        <Suspense fallback={null}>
                            <MonsterTowerV4 userId={userId} isOpen={isTowerOpen} onClose={() => setIsTowerOpen(false)} />
                        </Suspense>
                    )}
                    {shopMounted && (
                        <Suspense fallback={null}>
                            <ShopModal
                                isOpen={shopMode !== null}
                                onClose={() => setShopMode(null)}
                                onGoHome={onGoHome}
                                userId={userId}
                                starBalance={starBalance || 0}
                                mode={shopMode ?? 'monster'}
                            />
                        </Suspense>
                    )}
                    {islandMounted && (
                        <Suspense fallback={null}>
                            <ChallengeIslandFullScreen
                                isOpen={isIslandOpen}
                                onClose={() => setIsIslandOpen(false)}
                                onGoHome={onGoHome}
                                userId={userId}
                                starBalance={starBalance || 0}
                            />
                        </Suspense>
                    )}
                </div>
            )}
        </LearningArea>
    );
};

function EntryTile({ icon, label, sub, locked, onClick }: { icon: string; label: string; sub?: string; locked?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`flex flex-col items-center justify-center gap-1 rounded-control py-3 px-1 border-2 border-line cursor-pointer transition hover:-translate-y-0.5 hover:shadow-soft min-w-0 ${locked ? 'bg-[#EFE7E2] opacity-90' : 'bg-white'}`}
        >
            <span className="text-2xl leading-none" aria-hidden="true">
                {icon}
            </span>
            <span className="font-heading text-sm font-bold truncate max-w-full text-ink">{label}</span>
            {sub && <span className="font-body text-[11px] truncate max-w-full text-ink-soft">{sub}</span>}
        </button>
    );
}
