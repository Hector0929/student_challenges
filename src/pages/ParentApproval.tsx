import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, ArrowRightLeft, Coins, ClipboardCheck } from 'lucide-react';
import { useDailyLogs, useApproveQuest, useRejectQuest, usePendingQuests, useUpdateQuest, useDeleteQuest } from '../hooks/useQuests';
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
    const { data: pendingWishQuests, isLoading: pendingWishLoading } = usePendingQuests();
    const approveQuest = useApproveQuest();
    const rejectQuest = useRejectQuest();
    const approveWishQuest = useUpdateQuest();
    const rejectWishQuest = useDeleteQuest();

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

    const handleApproveWish = async (questId: string) => {
        try {
            await approveWishQuest.mutateAsync({
                id: questId,
                status: 'active',
                is_active: true,
            });
        } catch (error) {
            console.error('Failed to approve wish quest:', error);
            alert('核准許願失敗，請重試');
        }
    };

    const handleRejectWish = async (questId: string) => {
        if (!confirm('確定要拒絕並刪除這個許願嗎？')) return;
        try {
            await rejectWishQuest.mutateAsync(questId);
        } catch (error) {
            console.error('Failed to reject wish quest:', error);
            alert('拒絕許願失敗，請重試');
        }
    };

    const isLoading = logsLoading || exchangeLoading || pendingWishLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">⚙️</div>
                    <p className="font-heading text-sm" style={{ color: 'var(--color-text-light)' }}>載入中...</p>
                </div>
            </div>
        );
    }

    const logs = (pendingLogs || []) as DailyLogWithDetails[];
    const exchanges = pendingExchanges || [];
    const wishes = pendingWishQuests || [];
    const questPendingCount = logs.length + wishes.length;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl clay-card">
                        <ClipboardCheck className="text-primary-dark" size={28} />
                    </div>
                    <div>
                        <h2 className="font-heading text-3xl font-bold" style={{ color: 'var(--color-text)' }}>審核中心</h2>
                        <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>
                            任務與兌換申請審核
                        </p>
                    </div>
                </div>
                <div className="clay-star bg-amber-400 self-start md:self-auto">
                    <span>📋</span>
                    <span>{questPendingCount + exchanges.length} 待處理</span>
                </div>
            </div>

            <p className="font-body text-sm mb-4" style={{ color: 'var(--color-text-light)' }}>
                        {questPendingCount} 個任務 · {exchanges.length} 個兌換申請
            </p>

            {/* Tabs */}
            <div className="clay-tab-switch w-fit p-1 mb-8">
                <button
                    onClick={() => setActiveTab('quests')}
                    className={activeTab === 'quests' ? 'active' : ''}
                >
                    <CheckCircle size={14} />
                    任務審核
                    {questPendingCount > 0 && (
                        <span className="bg-yellow-400 text-deep-black px-2 py-0.5 text-xs rounded-full">
                            {questPendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('exchange')}
                    className={activeTab === 'exchange' ? 'active' : ''}
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
                    {questPendingCount > 0 ? (
                        <div className="space-y-6">
                            {wishes.map((quest) => (
                                <div key={`wish-${quest.id}`} className="clay-card p-5 animate-bounce-in relative overflow-hidden border-2 border-yellow-300" style={{ borderRadius: '24px' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="clay-icon-circle bg-white text-4xl shrink-0" style={{ width: '64px', height: '64px', borderRadius: '18px' }}>
                                            {quest.icon || '🎯'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div>
                                                    <h3 className="font-heading font-bold text-xl mb-1 leading-relaxed" style={{ color: 'var(--color-text)' }}>
                                                        {quest.title}
                                                    </h3>
                                                    <p className="font-body text-sm text-gray-600 mb-2">{quest.description || '孩子提交的許願任務'}</p>
                                                </div>
                                                <div className="clay-star bg-amber-400 shrink-0">
                                                    <span>⭐</span>
                                                    <span>{quest.reward_points || 0}</span>
                                                </div>
                                            </div>

                                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border-2 bg-yellow-50 border-yellow-300 text-yellow-700">
                                                <Clock size={14} className="text-orange-600" />
                                                <span className="font-heading text-xs">等待核准（許願任務）</span>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleApproveWish(quest.id)}
                                                    disabled={approveWishQuest.isPending}
                                                    className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 text-white border-b-4 border-emerald-700 font-heading font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <CheckCircle size={16} />
                                                        <span>✓ 核准許願</span>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => handleRejectWish(quest.id)}
                                                    disabled={rejectWishQuest.isPending}
                                                    className="flex-1 py-3 px-4 rounded-2xl bg-white text-gray-600 border-2 border-gray-300 font-heading font-bold hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-60"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <XCircle size={16} />
                                                        <span>✗ 拒絕許願</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {logs.map((log) => (
                                <div key={log.id} className="clay-card p-5 animate-bounce-in relative overflow-hidden" style={{ borderRadius: '24px' }}>
                                    <div className="flex items-start gap-4">
                                        {/* Quest Icon */}
                                        <div className="clay-icon-circle bg-white text-4xl shrink-0" style={{ width: '64px', height: '64px', borderRadius: '18px' }}>
                                            {log.quest?.icon || '👾'}
                                        </div>

                                        {/* Quest Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div>
                                                    <h3 className="font-heading font-bold text-xl mb-1 leading-relaxed" style={{ color: 'var(--color-text)' }}>
                                                        {log.quest?.title || '未知任務'}
                                                    </h3>
                                                    <p className="font-body text-sm text-gray-600 mb-2">
                                                        {log.quest?.description}
                                                    </p>
                                                </div>
                                                <div className="clay-star bg-amber-400 shrink-0">
                                                    <span>⭐</span>
                                                    <span>{log.quest?.reward_points || 0}</span>
                                                </div>
                                            </div>

                                            {/* Player Info */}
                                            <div className="flex flex-wrap items-center gap-4 text-xs mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">玩家:</span>
                                                    <span className="font-heading font-bold">{log.profile?.name || '未知'}</span>
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
                                            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full border-2 bg-amber-50 border-amber-200 text-amber-700">
                                                <Clock size={14} className="text-orange-600" />
                                                <span className="font-heading text-xs">等待審核</span>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleApproveQuest(log.id)}
                                                    disabled={approveQuest.isPending}
                                                    className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 text-white border-b-4 border-emerald-700 font-heading font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <CheckCircle size={16} />
                                                        <span>✓ 通過</span>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => handleRejectQuest(log.id)}
                                                    disabled={rejectQuest.isPending}
                                                    className="flex-1 py-3 px-4 rounded-2xl bg-white text-gray-600 border-2 border-gray-300 font-heading font-bold hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-60"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <XCircle size={16} />
                                                        <span>✗ 拒絕</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="clay-card text-center py-12" style={{ borderRadius: '24px' }}>
                            <div className="text-6xl mb-4">✅</div>
                            <p className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>沒有待審核的任務</p>
                            <p className="font-body text-sm text-gray-600">所有任務都已經審核完成了！</p>
                        </div>
                    )}
                </>
            )}

            {/* Exchange Approval Tab */}
            {activeTab === 'exchange' && (
                <>
                    {exchanges.length > 0 ? (
                        <div className="space-y-6">
                            {exchanges.map((request) => (
                                <div key={request.id} className="clay-card p-5 animate-bounce-in" style={{ borderRadius: '24px' }}>
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="clay-icon-circle bg-white text-4xl shrink-0" style={{ width: '64px', height: '64px', borderRadius: '18px' }}>
                                            {request.profiles?.avatar_url || '👦'}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div>
                                                    <h3 className="font-heading font-bold text-xl mb-1" style={{ color: 'var(--color-text)' }}>
                                                        {request.profiles?.name || '未知孩子'} 申請兌換
                                                    </h3>
                                                    <p className="font-body text-sm text-gray-600">
                                                        匯率: 1 星 = {request.exchange_rate} 元
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Exchange Preview */}
                                            <div className="flex items-center gap-4 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-3 mb-3">
                                                <div className="text-center flex-1">
                                                    <Coins size={20} className="mx-auto text-yellow-600 mb-1" />
                                                    <div className="font-heading font-bold text-lg">{request.star_amount}</div>
                                                    <div className="text-xs text-gray-500">星幣</div>
                                                </div>
                                                <ArrowRightLeft size={20} className="text-gray-400" />
                                                <div className="text-center flex-1">
                                                    <span className="text-2xl">💰</span>
                                                    <div className="font-heading font-bold text-lg">{request.twd_amount}</div>
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
                                                <button
                                                    onClick={() => handleApproveExchange(request.id)}
                                                    disabled={approveExchange.isPending}
                                                    className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 text-white border-b-4 border-emerald-700 font-heading font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <CheckCircle size={16} />
                                                        <span>✓ 核准扣款</span>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => handleRejectExchange(request.id)}
                                                    disabled={rejectExchange.isPending}
                                                    className="flex-1 py-3 px-4 rounded-2xl bg-white text-gray-600 border-2 border-gray-300 font-heading font-bold hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-60"
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        <XCircle size={16} />
                                                        <span>✗ 拒絕</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="clay-card text-center py-12" style={{ borderRadius: '24px' }}>
                            <div className="text-6xl mb-4">💱</div>
                            <p className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>沒有待審核的兌換申請</p>
                            <p className="font-body text-sm text-gray-600">當孩子提交兌換申請時會顯示在這裡</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
