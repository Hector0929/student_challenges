import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { useDailyLogs, useApproveQuest, useRejectQuest } from '../hooks/useQuests';
import { formatDate } from '../lib/supabase';
import type { DailyLog, Quest } from '../types/database';

interface DailyLogWithDetails extends DailyLog {
    quest?: Quest;
    profile?: { name: string; student_id?: string };
}

export const ParentApproval: React.FC = () => {
    // Fetch ALL completed logs waiting for approval (history included) by passing null as date
    const { data: pendingLogs, isLoading } = useDailyLogs('all', null, 'completed');
    const approveQuest = useApproveQuest();
    const rejectQuest = useRejectQuest();

    const handleApprove = async (logId: string) => {
        try {
            console.log('Approving quest:', logId);
            await approveQuest.mutateAsync(logId);
            console.log('Quest approved successfully');
        } catch (error) {
            console.error('Failed to approve quest:', error);
            alert('審核失敗，請重試');
        }
    };

    const handleReject = async (logId: string) => {
        if (confirm('確定要拒絕這個任務嗎？玩家需要重新完成。')) {
            try {
                console.log('Rejecting quest:', logId);
                await rejectQuest.mutateAsync(logId);
                console.log('Quest rejected successfully');
            } catch (error) {
                console.error('Failed to reject quest:', error);
                alert('操作失敗，請重試');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">⚙️</div>
                    <p className="font-pixel text-sm">載入中...</p>
                </div>
            </div>
        );
    }

    const logs = (pendingLogs || []) as DailyLogWithDetails[];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-pixel text-2xl mb-2">任務審核</h2>
                    <p className="text-xs text-gray-600">
                        {logs.length} 個任務等待審核
                    </p>
                </div>
            </div>

            {/* Pending Approvals List */}
            {logs.length > 0 ? (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="rpg-dialog animate-bounce-in">
                            <div className="flex items-start gap-4">
                                {/* Quest Icon */}
                                <div className="text-5xl flex-shrink-0">
                                    {log.quest?.icon || '👾'}
                                </div>

                                {/* Quest Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <h3 className="font-pixel text-sm mb-1 leading-relaxed">
                                                {log.quest?.title || '未知任務'}
                                            </h3>
                                            <p className="text-xs text-gray-600 mb-2">
                                                {log.quest?.description}
                                            </p>
                                        </div>
                                        <div className="bg-yellow-400 border-2 border-deep-black px-3 py-2 text-center flex-shrink-0">
                                            <div className="text-xs font-pixel">⭐</div>
                                            <div className="text-xs font-pixel">{log.quest?.reward_points || 0}</div>
                                        </div>
                                    </div>

                                    {/* Player Info */}
                                    <div className="flex items-center gap-4 text-xs mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500">玩家:</span>
                                            <span className="font-pixel">{log.profile?.name || '未知'}</span>
                                            {log.profile?.student_id && (
                                                <span className="text-gray-500">({log.profile.student_id})</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} className="text-gray-500" />
                                            <span className="text-gray-500">
                                                {log.completed_at ? formatDate(log.completed_at) : '未知時間'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="inline-flex items-center gap-2 bg-orange-100 border-2 border-deep-black px-3 py-1 mb-3">
                                        <Clock size={14} className="text-orange-600" />
                                        <span className="font-pixel text-xs text-orange-600">等待審核</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <RPGButton
                                            onClick={() => handleApprove(log.id)}
                                            disabled={approveQuest.isPending}
                                            className="flex-1"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <CheckCircle size={16} />
                                                <span>✓ 通過</span>
                                            </div>
                                        </RPGButton>
                                        <RPGButton
                                            variant="secondary"
                                            onClick={() => handleReject(log.id)}
                                            disabled={rejectQuest.isPending}
                                            className="flex-1"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <XCircle size={16} />
                                                <span>✗ 拒絕</span>
                                            </div>
                                        </RPGButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rpg-dialog text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <p className="font-pixel text-sm mb-2">沒有待審核的任務</p>
                    <p className="text-xs text-gray-600">所有任務都已經審核完成了！</p>
                </div>
            )}
        </div>
    );
};
