import React from 'react';
import { Trophy, Star } from 'lucide-react';
import { QuestCard } from '../components/QuestCard';
import { ProgressBar } from '../components/ProgressBar';
import { useQuests, useDailyLogs, useDailyProgress, useCompleteQuest } from '../hooks/useQuests';

interface ChildDashboardProps {
    userId: string;
}

export const ChildDashboard: React.FC<ChildDashboardProps> = ({ userId }) => {
    const { data: quests, isLoading: questsLoading } = useQuests();
    const { data: logs, isLoading: logsLoading } = useDailyLogs(userId);
    const progress = useDailyProgress(userId);
    const completeQuestMutation = useCompleteQuest();

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
                <div className="flex items-center gap-3 mb-4">
                    <Trophy className="text-pokeball-red" size={32} />
                    <h2 className="font-pixel text-xl">今日挑戰</h2>
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
        </div>
    );
};
