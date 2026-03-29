import React, { useState, useEffect } from 'react';
import { ParentsMessageCard, ExchangeRateCard } from '../components/ChildDashboardWidgets';
import { ExchangeRequestDialog } from '../components/ExchangeRequestDialog';
import { MonsterTowerV2, TowerV2Preview } from '../components/MonsterTowerV2';

import { Star, X, Save, ChevronDown, ChevronUp, RefreshCw, Trash2, Check, Store } from 'lucide-react';
import { QuestCard } from '../components/QuestCard';
import { ProgressBar } from '../components/ProgressBar';
import { RPGDialog } from '../components/RPGDialog';
import { RPGButton } from '../components/RPGButton';
import { RewardTime } from '../components/RewardTime';
import { LearningArea } from '../components/LearningArea';
import { ShopModal } from '../components/ShopModal';
import { useQuests, useDailyLogs, useDailyProgress, useCompleteQuest, useCreateQuest, useStarBalance } from '../hooks/useQuests';
import { useFamilySettings } from '../hooks/useFamilySettings';
import { WorldPreviewCard } from '../components/WorldPreviewCard';
import { WorldFullScreen } from '../components/WorldFullScreen';
import { useWorldPersistence } from '../hooks/useWorldPersistence';

import { COMMON_EMOJIS, DAILY_QUEST_TARGET } from '../lib/constants';

import { useUser } from '../contexts/UserContext';

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
        return quest.quest_assignments.some(qa => qa.child_id === userId);
    });
    const { data: logs, isLoading: logsLoading } = useDailyLogs(userId);
    const progress = useDailyProgress(userId);
    const { data: starBalance } = useStarBalance(userId);
    const completeQuestMutation = useCompleteQuest();
    const createQuestMutation = useCreateQuest();
    const { data: familySettings } = useFamilySettings();
    const { data: persistedWorld } = useWorldPersistence(userId);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isQuestSectionCollapsed, setIsQuestSectionCollapsed] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        icon: '👾',
    });
    const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
    const [isTowerOpen, setIsTowerOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isWorldOpen, setIsWorldOpen] = useState(false);
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

    const handleOpenDialog = () => {
        setFormData({ title: '', icon: '👾' });
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => setIsDialogOpen(false);

    const { user, session } = useUser();


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('📝 handleSubmit triggered!', formData);

        try {
            console.log('🚀 Sending quest mutation...');

            // Critical Fix: Use session.user.id (Parent Auth ID) to satisfy RLS
            // Logic: The "Quest" is technically created by the Account Owner (Parent)
            // but we note the Child's name in the description.
            const creatorId = session?.user?.id || userId;
            const childName = user?.name || '孩子';

            await createQuestMutation.mutateAsync({
                title: formData.title,
                description: `由 ${childName} 建立的願望任務`,
                icon: formData.icon,
                reward_points: 10,
                is_active: true, // Required by TS
                status: 'pending',
                created_by: creatorId,
            });
            console.log('✅ Quest created successfully');
            alert('✅ 任務已送出審核！\n\n請等待爸爸媽媽核准。');
            handleCloseDialog();
        } catch (error) {
            console.error('Failed to create quest', error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`❌ 建立失敗\n\n錯誤：${msg}\n\n請告訴爸爸媽媽這個錯誤訊息`);
        }
    };

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

            {/* Monster Tower Preview */}
            <div className="mb-6">
                <TowerV2Preview userId={userId} onClick={() => setIsTowerOpen(true)} />
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
            <RPGDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                title="許願新任務 For Parents"
                footer={
                    <div className="flex gap-3 justify-end">
                        <RPGButton variant="secondary" onClick={handleCloseDialog}>
                            <div className="flex items-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </RPGButton>
                        <RPGButton
                            type="button"
                            onClick={() => {
                                console.log('🖱️ Button clicked, attempting to submit form...');
                                const form = document.getElementById('create-quest-form') as HTMLFormElement;
                                if (form) {
                                    form.requestSubmit();
                                } else {
                                    console.error('❌ Form element not found!');
                                    alert('程式錯誤：找不到表單，請重新整理網頁');
                                }
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Save size={16} />
                                <span>送出許願</span>
                            </div>
                        </RPGButton>
                    </div>
                }
            >
                <form id="create-quest-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block font-pixel text-xs mb-2">我想做什麼...</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            placeholder="例：幫忙摺衣服"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-pixel text-xs mb-2">選個圖案</label>
                        <div className="grid grid-cols-6 gap-2">
                            {COMMON_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon: emoji })}
                                    className={`text-xl p-2 border-2 border-deep-black hover:bg-gray-100 transition-colors ${formData.icon === emoji ? 'bg-yellow-200' : 'bg-white'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </form>
            </RPGDialog>

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

            {/* Monster Tower Modal */}
            <MonsterTowerV2
                userId={userId}
                isOpen={isTowerOpen}
                onClose={() => setIsTowerOpen(false)}
            />

            {/* Monster Shop Modal */}
            <ShopModal
                isOpen={isShopOpen}
                onClose={() => setIsShopOpen(false)}
                onGoHome={onGoHome}
                userId={userId}
                starBalance={starBalance || 0}
                initialTab={shopInitialTab}
            />

            {/* World Full Screen Modal */}
            <WorldFullScreen
                isOpen={isWorldOpen}
                onClose={() => setIsWorldOpen(false)}
                onGoHome={onGoHome}
                starBalance={starBalance || 0}
                islandLevel={persistedWorld?.worldLab?.islandLevel}
                heroLevel={persistedWorld?.worldLab?.heroLevel}
                timeOfDay={persistedWorld?.worldLab?.timeOfDay}
                buildings={persistedWorld?.worldLab?.buildings}
            />
        </div >
    );
};
