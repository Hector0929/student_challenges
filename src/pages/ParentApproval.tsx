import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, ArrowRightLeft, Coins } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { useDailyLogs, useApproveQuest, useRejectQuest } from '../hooks/useQuests';
import { usePendingExchangeRequests, useApproveExchangeRequest, useRejectExchangeRequest } from '../hooks/useExchangeRequests';
import { formatDate } from '../lib/supabase';
import type { DailyLog, Quest } from '../types/database';

interface DailyLogWithDetails extends DailyLog {
    quest?: Quest;
    profile?: { name: string; student_id?: string };
}

type TabType = 'quests' | 'exchange';

export const ParentApproval: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('quests');

    // Quest Approval
    const { data: pendingLogs, isLoading: logsLoading } = useDailyLogs('all', null, 'completed');
    const approveQuest = useApproveQuest();
    const rejectQuest = useRejectQuest();

    // Exchange Approval
    const { data: pendingExchanges, isLoading: exchangeLoading } = usePendingExchangeRequests();
    const approveExchange = useApproveExchangeRequest();
    const rejectExchange = useRejectExchangeRequest();

    const handleApproveQuest = async (logId: string) => {
        try {
            console.log('Approving quest:', logId);
            await approveQuest.mutateAsync(logId);
            console.log('Quest approved successfully');
        } catch (error) {
            console.error('Failed to approve quest:', error);
            alert('審核失敗，請重試');
        }
    };

    const handleRejectQuest = async (logId: string) => {
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

    const handleApproveExchange = async (requestId: string) => {
        try {
            await approveExchange.mutateAsync(requestId);
            alert('✅ 兌換已核准，星幣已扣除！');
        } catch (error) {
            console.error('Failed to approve exchange:', error);
            const msg = error instanceof Error ? error.message : '審核失敗';
            alert(`❌ ${msg}`);
        }
    };

    const handleRejectExchange = async (requestId: string) => {
        const reason = prompt('請輸入拒絕原因 (可選)');
        try {
            await rejectExchange.mutateAsync({ requestId, reason: reason || undefined });
            alert('已拒絕兌換申請');
        } catch (error) {
            console.error('Failed to reject exchange:', error);
            alert('操作失敗，請重試');
        }
    };

    const isLoading = logsLoading || exchangeLoading;

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
    const exchanges = pendingExchanges || [];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-pixel text-2xl mb-2">審核中心</h2>
                    <p className="text-xs text-gray-600">
                        {logs.length} 個任務 · {exchanges.length} 個兌換申請
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-2 border-deep-black p-1 w-fit mb-6">
                <button
                    onClick={() => setActiveTab('quests')}
                    className={`px-4 py-2 font-pixel text-sm transition-colors flex items-center gap-2 ${activeTab === 'quests'
                        ? 'bg-pokeball-red text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <CheckCircle size={14} />
                    任務審核
                    {logs.length > 0 && (
                        <span className="bg-yellow-400 text-deep-black px-2 py-0.5 text-xs rounded-full">
                            {logs.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('exchange')}
                    className={`px-4 py-2 font-pixel text-sm transition-colors flex items-center gap-2 ${activeTab === 'exchange'
                        ? 'bg-pokeball-red text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <ArrowRightLeft size={14} />
                    兌換審核
                    {exchanges.length > 0 && (
                        <span className="bg-yellow-400 text-deep-black px-2 py-0.5 text-xs rounded-full">
                            {exchanges.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Quest Approval Tab */}
            {activeTab === 'quests' && (
                <>
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
                                                    onClick={() => handleApproveQuest(log.id)}
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
                                                    onClick={() => handleRejectQuest(log.id)}
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
                </>
            )}

            {/* Exchange Approval Tab */}
            {activeTab === 'exchange' && (
                <>
                    {exchanges.length > 0 ? (
                        <div className="space-y-4">
                            {exchanges.map((request) => (
                                <div key={request.id} className="rpg-dialog animate-bounce-in">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="text-5xl flex-shrink-0">
                                            {request.profiles?.avatar_url || '👦'}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div>
                                                    <h3 className="font-pixel text-sm mb-1">
                                                        {request.profiles?.name || '未知孩子'} 申請兌換
                                                    </h3>
                                                    <p className="text-xs text-gray-600">
                                                        匯率: 1 星 = {request.exchange_rate} 元
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Exchange Preview */}
                                            <div className="flex items-center gap-4 bg-yellow-50 border-2 border-yellow-400 p-3 mb-3">
                                                <div className="text-center flex-1">
                                                    <Coins size={20} className="mx-auto text-yellow-600 mb-1" />
                                                    <div className="font-pixel text-lg">{request.star_amount}</div>
                                                    <div className="text-xs text-gray-500">星幣</div>
                                                </div>
                                                <ArrowRightLeft size={20} className="text-gray-400" />
                                                <div className="text-center flex-1">
                                                    <span className="text-2xl">💰</span>
                                                    <div className="font-pixel text-lg">{request.twd_amount}</div>
                                                    <div className="text-xs text-gray-500">TWD</div>
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                                <Clock size={12} />
                                                <span>{formatDate(request.created_at)}</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-3">
                                                <RPGButton
                                                    onClick={() => handleApproveExchange(request.id)}
                                                    disabled={approveExchange.isPending}
                                                    className="flex-1"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <CheckCircle size={16} />
                                                        <span>✓ 核准扣款</span>
                                                    </div>
                                                </RPGButton>
                                                <RPGButton
                                                    variant="secondary"
                                                    onClick={() => handleRejectExchange(request.id)}
                                                    disabled={rejectExchange.isPending}
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
                            <div className="text-6xl mb-4">💱</div>
                            <p className="font-pixel text-sm mb-2">沒有待審核的兌換申請</p>
                            <p className="text-xs text-gray-600">當孩子提交兌換申請時會顯示在這裡</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
