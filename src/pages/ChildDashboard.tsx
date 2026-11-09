import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ParentsMessageCard, ExchangeRateCard } from '../components/ChildDashboardWidgets';
import { ExchangeRequestDialog } from '../components/ExchangeRequestDialog';
import { TowerV4Preview } from '../components/TowerV4Preview';

import { Star, ChevronDown, ChevronUp, RefreshCw, Trash2, Check, Store } from 'lucide-react';
import { QuestCard } from '../components/QuestCard';
import { ProgressBar } from '../components/ProgressBar';
import { RPGDialog } from '../components/RPGDialog';
import { RPGButton } from '../components/RPGButton';
import { RewardTime } from '../components/RewardTime';
import { WishQuestDialog } from '../components/WishQuestDialog';
import { LearningArea } from '../components/LearningArea';
import { useQuests, useDailyLogs, useDailyProgress, useCompleteQuest, useStarBalance } from '../hooks/useQuests';
import { useFamilySettings } from '../hooks/useFamilySettings';
import { WorldPreviewCard } from '../components/WorldPreviewCard';
import { useWorldPersistence } from '../hooks/useWorldPersistence';
import { ChallengeIslandPreviewCard } from '../features/challengeIsland/ChallengeIslandPreviewCard';
import type { WorldTheme } from '../hooks/useWorldState';

import { DAILY_QUEST_TARGET } from '../lib/constants';
import { useMountOnFirstOpen } from '../hooks/useMountOnFirstOpen';

// 怪獸塔、世界島、商店都是第一次打開時才下載（見 useMountOnFirstOpen）
const MonsterTowerV4 = lazy(() => import('../components/MonsterTowerV4').then((m) => ({ default: m.MonsterTowerV4 })));
const WorldFullScreen = lazy(() => import('../components/WorldFullScreen').then((m) => ({ default: m.WorldFullScreen })));
const ShopModal = lazy(() => import('../components/ShopModal').then((m) => ({ default: m.ShopModal })));


// 3D 群島第一次打開時才下載
const ChallengeIslandFullScreen = lazy(() =>
    import('../features/challengeIsland/ChallengeIslandFullScreen').then((m) => ({ default: m.ChallengeIslandFullScreen })),
);

interface ChildDashboardProps {
    userId: string;
    onGoHome?: () => void;
}


export const ChildDashboard: React.FC<ChildDashboardProps> = ({ userId, onGoHome }) => {
    // Log current user ID for debugging cross-browser issues
    useEffect(() => {
        console.log('👤 ChildDashboard mounted with userId:', userId);
        console.log('📅 Today Date:', new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }));
    }, [userId]);

    const { data: allQuests, isLoading: questsLoading } = useQuests();

    // Filter quests: Show if (Global/No assignments) OR (Assigned to current user)
    const quests = allQuests?.filter(quest => {
        // If undefined or empty array, it's global
        if (!quest.quest_assignments || quest.quest_assignments.length === 0) {
            return true;
        }
        // Check if assigned to this user
        if (quest.quest_assignments.some(qa => qa.child_id === userId)) {
            return true;
        }

        // Backward compatibility:
        // some legacy approved wishes were mistakenly assigned only to created_by.
        // If every assignment equals created_by, treat as global so child can still see it.
        const assignedOnlyToCreator = !!quest.created_by
            && quest.quest_assignments.every((qa) => qa.child_id === quest.created_by);
        return assignedOnlyToCreator;
    });
    const { data: logs, isLoading: logsLoading } = useDailyLogs(userId);
    const progress = useDailyProgress(userId);
    const { data: starBalance } = useStarBalance(userId);
    const completeQuestMutation = useCompleteQuest();
    const { data: familySettings } = useFamilySettings();
    const { data: persistedWorld } = useWorldPersistence(userId);

    // Local state for immediate UI feedback — synced from DB on load
    const [localTheme, setLocalTheme] = useState<WorldTheme>('normal');
    useEffect(() => {
        if (persistedWorld?.worldLab?.worldTheme) setLocalTheme(persistedWorld.worldLab.worldTheme);
    }, [persistedWorld?.worldLab?.worldTheme]);

    const handleThemeChange = (theme: WorldTheme) => {
        // Just update local state. The actual Supabase save is done inside
        // WorldFullScreen using its fresh local worldLab, which avoids
        // overwriting resource inventory with stale server-cache data.
        setLocalTheme(theme);
    };

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isQuestSectionCollapsed, setIsQuestSectionCollapsed] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
    const [isTowerOpen, setIsTowerOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isWorldOpen, setIsWorldOpen] = useState(false);
    const towerMounted = useMountOnFirstOpen(isTowerOpen);
    const shopMounted = useMountOnFirstOpen(isShopOpen);
    const worldMounted = useMountOnFirstOpen(isWorldOpen);
    const [isIslandOpen, setIsIslandOpen] = useState(false);
    const [islandRequested, setIslandRequested] = useState(false);
    const [shopInitialTab, setShopInitialTab] = useState<'monster' | 'world'>('monster');

    const questTarget = Math.max(0, progress.total_quests > 0 ? Math.min(progress.total_quests, DAILY_QUEST_TARGET) : DAILY_QUEST_TARGET);
    const isUnlocked = progress.completed_quests >= questTarget && progress.total_quests > 0;
    const remainingQuests = Math.max(0, questTarget - progress.completed_quests);
    const isAllQuestsCompleted = progress.completed_quests === progress.total_quests && progress.total_quests > 0;

    const handleRefreshData = () => {
        console.log('🔄 Manually refreshing data...');
        window.location.reload();
    };

    const handleClearAllCache = async () => {
        if (!confirm('⚠️ 這將清除所有快取資料和登入狀態，需要重新登入。\n\n確定要繼續嗎？')) {
            return;
        }

        console.log('🗑️ Clearing all caches...');

        try {
            // 1. Clear localStorage
            localStorage.clear();
            console.log('✅ localStorage cleared');

            // 2. Clear sessionStorage
            sessionStorage.clear();
            console.log('✅ sessionStorage cleared');

            // 3. Clear Service Worker caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ Service Worker caches cleared');
            }

            // 4. Unregister Service Worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('✅ Service Worker unregistered');
            }

            alert('✅ 所有快取已清除！\n\n頁面將重新載入。');
            window.location.href = '/';
        } catch (error) {
            console.error('❌ Error clearing cache:', error);
            alert('清除快取時發生錯誤，請手動重新整理頁面');
        }
    };

    const handleOpenDialog = () => setIsDialogOpen(true);

    const handleCloseDialog = () => setIsDialogOpen(false);


    const handleCompleteQuest = async (questId: string) => {
        // Prevent double submission - check if already completed
        if (isQuestCompleted(questId)) {
            console.log('Quest already marked as completed in UI');
            return;
        }

        // Only auto-approve if the user is CURRENTLY a parent
        // Note: Children completing quests should always go to 'completed' status
        // Parent approval should only happen through the ParentApproval page
        const isParentApproved = false; // Children always need parent approval

        try {
            await completeQuestMutation.mutateAsync({
                userId,
                questId,
                isParentApproved,
            });
        } catch (error) {
            // 409 means already completed - this shouldn't happen due to UI check above
            // but handle it gracefully just in case
            const msg = error instanceof Error ? error.message : '';
            const code = (error as { code?: string })?.code;

            if (msg.includes('409') || code === '23505') {
                console.log('Quest already completed today (409 conflict)');
                return;
            }
            console.error('Failed to complete quest:', error);
        }
    };

    const handleQuestClick = (questId: string) => {
        // Double check the quest is not already completed before opening dialog
        if (isQuestCompleted(questId)) {
            console.log('⚠️ Quest already completed, blocking dialog:', questId.substring(0, 8));
            return;
        }

        console.log('🎯 Opening confirmation dialog for quest:', questId.substring(0, 8));
        setSelectedQuestId(questId);
        setConfirmDialogOpen(true);
    };

    const handleConfirmComplete = async () => {
        if (!selectedQuestId) return;

        // Prevent duplicate clicks while mutation is in progress
        if (completeQuestMutation.isPending) {
            console.log('⏳ Mutation already in progress, ignoring click');
            return;
        }

        // Final check before submitting
        if (isQuestCompleted(selectedQuestId)) {
            console.log('⚠️ Quest already completed, closing dialog:', selectedQuestId.substring(0, 8));
            setConfirmDialogOpen(false);
            setSelectedQuestId(null);
            return;
        }

        console.log('🚀 Submitting quest completion:', selectedQuestId.substring(0, 8));

        try {
            await handleCompleteQuest(selectedQuestId);
            // Small delay to allow cache invalidation and refetch to complete
            await new Promise(resolve => setTimeout(resolve, 150));
            setConfirmDialogOpen(false);
            setSelectedQuestId(null);
        } catch (error) {
            console.error('❌ Failed to complete quest:', error);
            setConfirmDialogOpen(false);
            setSelectedQuestId(null);

            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('任務不存在')) {
                alert('❌ 任務不存在\n\n資料庫中找不到這個任務，可能已被刪除。\n請重新整理頁面（按 F5）。');
                // Force reload after user dismisses alert
                setTimeout(() => window.location.reload(), 500);
            } else {
                alert(`❌ 完成任務失敗\n\n${errorMessage}\n\n請重試或聯絡管理員`);
            }
        }
    };

    const isQuestCompleted = (questId: string): boolean => {
        const completed = logs?.some(
            log => log.quest_id === questId && (log.status === 'completed' || log.status === 'verified')
        ) || false;

        if (completed) {
            console.log(`✅ Quest ${questId.substring(0, 8)}... is completed/verified`);
        }

        return completed;
    };

    const getQuestStatus = (questId: string): 'pending' | 'completed' | 'verified' => {
        const log = logs?.find(log => log.quest_id === questId);
        const status = log?.status || 'pending';
        return status;
    };

    if (questsLoading || logsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-float">👾</div>
                    <p className="font-heading" style={{ color: 'var(--color-text)' }}>載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Widgets Section */}
            <div className="grid gap-4 mb-6 md:grid-cols-[2fr_1fr_160px] items-stretch">
                <ParentsMessageCard />
                <ExchangeRateCard />
                <button
                    type="button"
                    onClick={() => {
                        setShopInitialTab('monster');
                        setIsShopOpen(true);
                    }}
                    className="bg-white border-4 border-deep-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] transition-all flex flex-col items-center justify-center gap-2 min-h-[96px]"
                >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-100 border-2 border-purple-300">
                        <Store size={24} className="text-purple-700" />
                    </div>
                    <span className="font-pixel text-sm text-deep-black">商店街</span>
                </button>
            </div>

            {/* 學習挑戰群島 — 每日任務與學習進度的 3D 地圖 */}
            <div className="mb-6">
                <ChallengeIslandPreviewCard
                    completedQuests={progress.completed_quests}
                    totalQuests={progress.total_quests}
                    onClick={() => {
                        setIslandRequested(true);
                        setIsIslandOpen(true);
                    }}
                />
            </div>

            {/* Monster Tower Preview — 3D 螺旋怪獸塔 V4（V3 仍可從 DebugPage 開啟） */}
            <div className="mb-6">
                <TowerV4Preview userId={userId} onClick={() => setIsTowerOpen(true)} />
            </div>

            {/* 3D World Preview Card */}
            <div className="mb-6">
                <WorldPreviewCard
                    islandLevel={persistedWorld?.worldLab?.islandLevel}
                    heroLevel={persistedWorld?.worldLab?.heroLevel}
                    timeOfDay={persistedWorld?.worldLab?.timeOfDay}
                    unlockedPlots={Math.max(0, Math.min(6, (persistedWorld?.worldLab?.islandLevel ?? 1) - 1))}
                    totalPlots={6}
                    onClick={() => setIsWorldOpen(true)}
                />
            </div>

            {/* Header Section */}
            <div className="clay-card mb-6 p-5 animate-bounce-in" style={{ borderRadius: '20px' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🎯</span>
                        <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>今日挑戰</h2>
                        {isUnlocked && <div className="clay-check"><Check size={14} strokeWidth={3} /></div>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefreshData}
                            className="p-2 rounded-full transition-all cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-soft)' }}
                            title="重新整理"
                        >
                            <RefreshCw size={18} style={{ color: 'var(--color-text-light)' }} />
                        </button>
                        <button
                            onClick={handleClearAllCache}
                            className="p-2 rounded-full transition-all cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: '#FFF3E0', border: '2px solid #FFB74D' }}
                            title="清除快取"
                        >
                            <Trash2 size={18} style={{ color: '#E65100' }} />
                        </button>
                        {!isAllQuestsCompleted && (
                            <button
                                onClick={handleOpenDialog}
                                className="clay-btn py-2 px-4 text-sm cursor-pointer flex items-center gap-1"
                                style={{ borderRadius: '12px' }}
                            >
                                ✨ 想要新任務
                            </button>
                        )}
                        {isAllQuestsCompleted && (
                            <button
                                onClick={() => setIsQuestSectionCollapsed(!isQuestSectionCollapsed)}
                                className="p-2 rounded-full transition-all cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-soft)' }}
                            >
                                {isQuestSectionCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                        )}
                    </div>
                </div>

                {!isQuestSectionCollapsed && (
                    <>
                        {/* Progress Section */}
                        <div className="mb-4">
                            <ProgressBar
                                current={progress.completed_quests}
                                total={questTarget}
                                label={`每日目標`}
                            />
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="clay-card p-4 text-center" style={{ borderRadius: '16px' }}>
                                <div className="text-3xl mb-2">🎯</div>
                                <div className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>已完成</div>
                                <div className="font-heading text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                                    {progress.completed_quests}/{progress.total_quests}
                                </div>
                            </div>
                            <div className="clay-card p-4 text-center" style={{ borderRadius: '16px' }}>
                                <div className="text-3xl mb-2">⭐</div>
                                <div className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>可用星幣</div>
                                <div className="font-heading text-2xl font-bold" style={{ color: 'var(--color-cta)' }}>
                                    {starBalance || 0}
                                </div>
                                {familySettings?.exchange_rate_enabled && (starBalance || 0) > 0 && (
                                    <button
                                        onClick={() => setIsExchangeDialogOpen(true)}
                                        className="mt-2 clay-btn w-full py-2 text-sm cursor-pointer"
                                        style={{ borderRadius: '12px' }}
                                    >
                                        兌換
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Quest List */}
            {!isQuestSectionCollapsed && (
                <div className="space-y-4 mb-6">
                    {quests && quests.length > 0 ? (
                        quests.map((quest) => (
                            <div key={quest.id} className="animate-bounce-in">
                                <QuestCard
                                    quest={quest}
                                    isCompleted={isQuestCompleted(quest.id)}
                                    status={getQuestStatus(quest.id)}
                                    onComplete={handleQuestClick}
                                    disabled={completeQuestMutation.isPending}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="clay-card text-center py-8" style={{ borderRadius: '20px' }}>
                            <div className="text-6xl mb-4">😴</div>
                            <p className="font-heading text-lg" style={{ color: 'var(--color-text)' }}>目前沒有任務</p>
                            <p className="font-body text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>請家長新增每日任務</p>
                        </div>
                    )}
                </div>
            )}

            {/* Learning Area Section (Always Visible) */}
            <LearningArea userId={userId} onGoHome={onGoHome} />

            {/* Reward Time Section */}
            <RewardTime
                isUnlocked={isUnlocked}
                remainingQuests={remainingQuests}
                totalQuests={questTarget}
                userId={userId}
                onGoHome={onGoHome}
            />

            {/* Completion Message */}
            {
                progress.completed_quests === progress.total_quests && progress.total_quests > 0 && !isQuestSectionCollapsed && (
                    <div
                        className="clay-card mt-6 text-center py-8 animate-bounce-in"
                        style={{ borderRadius: '20px', backgroundColor: '#FFF9E8' }}
                    >
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="font-heading text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                            太棒了！
                        </h3>
                        <p className="font-body" style={{ color: 'var(--color-text-light)' }}>
                            你已經完成今天所有的任務！
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <Star style={{ color: 'var(--color-cta)' }} fill="currentColor" />
                            <span className="font-heading text-2xl font-bold" style={{ color: 'var(--color-cta)' }}>
                                +{progress.earned_points}
                            </span>
                            <Star style={{ color: 'var(--color-cta)' }} fill="currentColor" />
                        </div>
                    </div>
                )
            }
            {/* Create Quest Dialog */}
            <WishQuestDialog isOpen={isDialogOpen} onClose={handleCloseDialog} userId={userId} />

            {/* Confirmation Dialog */}
            <RPGDialog
                isOpen={confirmDialogOpen}
                onClose={() => {
                    setConfirmDialogOpen(false);
                    setSelectedQuestId(null); // 清除选中的任务ID
                }}
                title="確定完成了嗎？"
                footer={
                    <div className="flex gap-3 justify-end">
                        <RPGButton
                            onClick={() => {
                                setConfirmDialogOpen(false);
                                setSelectedQuestId(null); // 清除选中的任务ID
                            }}
                            variant="secondary"
                        >
                            取消
                        </RPGButton>
                        <RPGButton
                            onClick={handleConfirmComplete}
                            disabled={completeQuestMutation.isPending}
                        >
                            {completeQuestMutation.isPending ? '送出中...' : '確定完成！'}
                        </RPGButton>
                    </div>
                }
            >
                <p className="text-sm text-gray-700">
                    完成後將送出給爸爸媽媽審核喔！
                </p>
            </RPGDialog>

            {/* Exchange Request Dialog */}
            <ExchangeRequestDialog
                isOpen={isExchangeDialogOpen}
                onClose={() => setIsExchangeDialogOpen(false)}
            />

            {/* Monster Tower Gen3 Modal (2.5D 新版) */}
            {towerMounted && (
                <Suspense fallback={null}>
                    <MonsterTowerV4
                        userId={userId}
                        isOpen={isTowerOpen}
                        onClose={() => setIsTowerOpen(false)}
                    />
                </Suspense>
            )}

            {/* Monster Shop Modal */}
            {shopMounted && (
                <Suspense fallback={null}>
                    <ShopModal
                        isOpen={isShopOpen}
                        onClose={() => setIsShopOpen(false)}
                        onGoHome={onGoHome}
                        userId={userId}
                        starBalance={starBalance || 0}
                        initialTab={shopInitialTab}
                    />
                </Suspense>
            )}

            {/* 學習挑戰群島 Full Screen */}
            {islandRequested && (
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

            {/* World Full Screen Modal */}
            {worldMounted && (
                <Suspense fallback={null}>
                    <WorldFullScreen
                        isOpen={isWorldOpen}
                        onClose={() => setIsWorldOpen(false)}
                        onGoHome={onGoHome}
                        userId={userId}
                        starBalance={starBalance || 0}
                        worldTheme={localTheme}
                        onThemeChange={handleThemeChange}
                    />
                </Suspense>
            )}
        </div >
    );
};
