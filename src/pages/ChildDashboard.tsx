import React, { useState } from 'react';
import { Trophy, Star, Plus, X, Save } from 'lucide-react';
import { QuestCard } from '../components/QuestCard';
import { ProgressBar } from '../components/ProgressBar';
import { RPGDialog } from '../components/RPGDialog';
import { RPGButton } from '../components/RPGButton';
import { useQuests, useDailyLogs, useDailyProgress, useCompleteQuest, useCreateQuest } from '../hooks/useQuests';

interface ChildDashboardProps {
    userId: string;
}

export const ChildDashboard: React.FC<ChildDashboardProps> = ({ userId }) => {
    const { data: quests, isLoading: questsLoading } = useQuests();
    const { data: logs, isLoading: logsLoading } = useDailyLogs(userId);
    const progress = useDailyProgress(userId);
    const completeQuestMutation = useCompleteQuest();
    const createQuestMutation = useCreateQuest();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        icon: '👾',
    });

    const commonEmojis = ['👾', '🦷', '🛏️', '📚', '🧸', '🧹', '📖', '⚽', '🎨', '🎮', '🎵', '🌟'];

    const handleOpenDialog = () => {
        setFormData({ title: '', icon: '👾' });
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => setIsDialogOpen(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('📝 handleSubmit triggered!', formData);

        try {
            console.log('🚀 Sending quest mutation...');
            await createQuestMutation.mutateAsync({
                title: formData.title,
                description: '由孩子建立的任務',
                icon: formData.icon,
                reward_points: 10,
                is_active: true, // Legacy support
                status: 'pending',
                created_by: userId,
            });
            console.log('✅ Quest created successfully');
            alert('✅ 任務已送出審核！\n\n請等待爸爸媽媽核准。');
            handleCloseDialog();
        } catch (error: any) {
            console.error('Failed to create quest', error);
            alert(`❌ 建立失敗\n\n錯誤：${error.message || error}\n\n請告訴爸爸媽媽這個錯誤訊息`);
        }
    };

    const handleCompleteQuest = (questId: string) => {
        completeQuestMutation.mutate({ userId, questId });
    };

    const isQuestCompleted = (questId: string): boolean => {
        return logs?.some(
            log => log.quest_id === questId && (log.status === 'completed' || log.status === 'verified')
        ) || false;
    };

    if (questsLoading || logsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">👾</div>
                    <p className="font-pixel text-sm">載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="rpg-dialog mb-6 animate-bounce-in">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Trophy className="text-pokeball-red" size={32} />
                        <h2 className="font-pixel text-xl">今日挑戰</h2>
                    </div>
                    <RPGButton onClick={handleOpenDialog} className="text-xs">
                        <div className="flex items-center gap-1">
                            <Plus size={14} />
                            <span>想要新任務</span>
                        </div>
                    </RPGButton>
                </div>

                {/* Progress Section */}
                <div className="bg-off-white p-4 border-2 border-deep-black mb-4">
                    <ProgressBar
                        current={progress.completed_quests}
                        total={progress.total_quests}
                        label="完成進度"
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border-2 border-deep-black p-3 text-center">
                        <div className="text-2xl mb-1">🎯</div>
                        <div className="font-pixel text-xs text-gray-600">已完成</div>
                        <div className="font-pixel text-lg text-hp-green">
                            {progress.completed_quests}/{progress.total_quests}
                        </div>
                    </div>
                    <div className="bg-white border-2 border-deep-black p-3 text-center">
                        <div className="text-2xl mb-1">⭐</div>
                        <div className="font-pixel text-xs text-gray-600">獲得點數</div>
                        <div className="font-pixel text-lg text-yellow-600">
                            {progress.earned_points}/{progress.total_points}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quest List */}
            <div className="space-y-4">
                {quests && quests.length > 0 ? (
                    quests.map((quest) => (
                        <div key={quest.id} className="animate-bounce-in">
                            <QuestCard
                                quest={quest}
                                isCompleted={isQuestCompleted(quest.id)}
                                onComplete={handleCompleteQuest}
                                disabled={completeQuestMutation.isPending}
                            />
                        </div>
                    ))
                ) : (
                    <div className="rpg-dialog text-center py-8">
                        <div className="text-6xl mb-4">😴</div>
                        <p className="font-pixel text-sm">目前沒有任務</p>
                        <p className="text-xs text-gray-600 mt-2">請家長新增每日任務</p>
                    </div>
                )}
            </div>

            {/* Completion Message */}
            {progress.completed_quests === progress.total_quests && progress.total_quests > 0 && (
                <div className="rpg-dialog mt-6 bg-yellow-50 text-center py-6 animate-bounce-in">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="font-pixel text-lg mb-2">太棒了！</h3>
                    <p className="text-sm text-gray-700">
                        你已經完成今天所有的任務！
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <Star className="text-yellow-500" fill="currentColor" />
                        <span className="font-pixel text-xl text-yellow-600">
                            +{progress.earned_points}
                        </span>
                        <Star className="text-yellow-500" fill="currentColor" />
                    </div>
                </div>
            )}
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
                            {commonEmojis.map((emoji) => (
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
        </div>
    );
};
