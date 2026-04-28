import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, Briefcase, Sparkles, Filter } from 'lucide-react';
import { ClayDialog } from '../components/ClayDialog';
import { useQuests, usePendingQuests, useCreateQuest, useUpdateQuest, useDeleteQuest, useUpdateQuestAssignments } from '../hooks/useQuests';
import type { Quest, Profile } from '../types/database';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { COMMON_EMOJIS } from '../lib/constants';
import { useUser } from '../contexts/UserContext';

export const ParentControl: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
    const { user } = useUser();

    // Fetch both active and pending quests
    const { data: activeQuests, isLoading: activeLoading } = useQuests('active');
    const { data: pendingQuests, isLoading: pendingLoading } = usePendingQuests();

    const quests = activeTab === 'active' ? activeQuests : pendingQuests;
    const isLoading = activeTab === 'active' ? activeLoading : pendingLoading;

    const createQuestMutation = useCreateQuest();
    const updateQuestMutation = useUpdateQuest();
    const deleteQuestMutation = useDeleteQuest();
    const updateAssignmentsMutation = useUpdateQuestAssignments();

    // Fetch all children for assignment
    const { data: children } = useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            let query = supabase
                .from('profiles')
                .select('*')
                .eq('role', 'child');

            if (user?.family_id) {
                query = query.eq('family_id', user.family_id);
            }

            const { data } = await query.order('name');
            return data as Profile[];
        },
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        icon: string;
        reward_points: number | string;
        is_active: boolean;
        status: 'active' | 'pending' | 'archived';
    }>({
        title: '',
        description: '',
        icon: '👾',
        reward_points: 10,
        is_active: true,
        status: 'active',
    });

    const handleOpenDialog = (quest?: Quest) => {
        if (quest) {
            setEditingQuest(quest);
            setFormData({
                title: quest.title,
                description: quest.description || '',
                icon: quest.icon,
                reward_points: quest.reward_points,
                is_active: quest.is_active,
                status: quest.status,
            });
            // Pre-select assigned children
            if (quest.quest_assignments && quest.quest_assignments.length > 0) {
                setSelectedChildren(quest.quest_assignments.map(qa => qa.child_id));
            } else {
                setSelectedChildren([]); // Empty means Global (all)
            }
        } else {
            setEditingQuest(null);
            setFormData({
                title: '',
                description: '',
                icon: '👾',
                reward_points: 10,
                is_active: true,
                status: 'active' as 'active' | 'pending' | 'archived',
            });
            setSelectedChildren([]); // Default to Global
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingQuest(null);
        setSelectedChildren([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let questId = '';

        // Ensure reward_points is a number before mutation
        const rewardPoints = typeof formData.reward_points === 'string'
            ? (parseInt(formData.reward_points, 10) || 0)
            : formData.reward_points;

        if (editingQuest) {
            questId = editingQuest.id;
            await updateQuestMutation.mutateAsync({
                id: questId,
                ...formData,
                reward_points: rewardPoints,
            });
        } else {
            const newQuest = await createQuestMutation.mutateAsync({
                ...formData,
                reward_points: rewardPoints,
                status: 'active',
                created_by: user?.id
            });
            questId = newQuest.id;
        }

        // Update assignments
        await updateAssignmentsMutation.mutateAsync({
            questId,
            childIds: selectedChildren
        });

        handleCloseDialog();
    };

    const handleDelete = async (questId: string) => {
        if (confirm('確定要刪除這個任務嗎？')) {
            await deleteQuestMutation.mutateAsync(questId);
        }
    };

    const handleApprove = async (questId: string) => {
        await updateQuestMutation.mutateAsync({
            id: questId,
            status: 'active',
            is_active: true
        });

        // Wish tasks should already be assigned to the child at creation time.
        // If assignments are missing, ONLY fallback to creator when creator is actually a child.
        // Never assign to a parent ID, otherwise child page won't show the task.
        const quest = quests?.find(q => q.id === questId);
        const hasAssignedChild = (quest?.quest_assignments ?? []).some((qa) =>
            (children ?? []).some((child) => child.id === qa.child_id)
        );

        if (!hasAssignedChild && quest?.created_by) {
            const { data: creatorProfile } = await supabase
                .from('profiles')
                .select('id, role, family_id')
                .eq('id', quest.created_by)
                .maybeSingle();

            if (creatorProfile?.role === 'child' && (!user?.family_id || creatorProfile.family_id === user.family_id)) {
                await updateAssignmentsMutation.mutateAsync({
                    questId,
                    childIds: [creatorProfile.id]
                });
            }
        }

        if (!hasAssignedChild && !quest?.created_by) {
            await updateAssignmentsMutation.mutateAsync({
                questId,
                childIds: []
            });
        }
    };

    const handleReject = async (questId: string) => {
        if (confirm('確定要拒絕並刪除這個許願嗎？')) {
            await deleteQuestMutation.mutateAsync(questId);
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

    return (
        <div className="max-w-6xl mx-auto relative px-2">
            {/* PIN Warning Banner */}
            {user?.pin_code === '0000' && (
                <div className="clay-card mb-6 p-4 border-yellow-400 bg-yellow-50 flex justify-between items-center animate-bounce-in" style={{ borderRadius: '16px' }}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="font-heading font-bold text-yellow-800">安全提醒</p>
                            <p className="text-sm text-yellow-700">您目前使用的是預設 PIN 碼 (0000)。為了帳號安全，請前往「⚙️ 設定」修改您的 PIN 碼。</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Decoration */}
            <div className="absolute -right-4 top-20 hidden lg:block pointer-events-none opacity-40">
                <img src="/commander.png" alt="Commander" className="w-48 h-48 object-contain" />
            </div>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl clay-card">
                        <Briefcase className="text-primary-dark" size={28} />
                    </div>
                    <div>
                        <h2 className="font-heading text-3xl font-bold" style={{ color: 'var(--color-text)' }}>任務管理</h2>
                        <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>建立與指派您的家庭冒險任務</p>
                    </div>
                </div>
            </div>

            {/* Filter & Add Area */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
                <div className="clay-tab-switch w-full sm:w-auto p-1">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={activeTab === 'active' ? 'active' : ''}
                    >
                        <Filter size={16} />
                        現有任務
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={activeTab === 'pending' ? 'active' : ''}
                    >
                        <Sparkles size={16} />
                        審核許願
                        {pendingQuests && pendingQuests.length > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem]">
                                {pendingQuests.length}
                            </span>
                        )}
                    </button>
                </div>

                <button
                    onClick={() => handleOpenDialog()}
                    className="clay-btn py-3 px-6 flex items-center justify-center gap-2"
                >
                    <Plus size={20} />
                    <span>新增任務</span>
                </button>
            </div>

            {/* Quest List Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {quests && quests.length > 0 ? (
                    quests.map((quest) => (
                        <div key={quest.id} className="clay-card p-5 animate-bounce-in relative group overflow-hidden border-2" style={{ borderRadius: '24px' }}>
                            <div className="flex items-start gap-5 relative z-10">
                                <div className="clay-icon-circle bg-white text-4xl shrink-0" style={{ width: '64px', height: '64px', borderRadius: '18px' }}>
                                    {quest.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-heading font-bold text-lg mb-1 break-words leading-tight" style={{ color: 'var(--color-text)' }}>
                                        {quest.title}
                                    </h3>
                                    {quest.description && (
                                        <p className="font-body text-sm text-gray-600 mb-4 line-clamp-2">
                                            {quest.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="clay-star bg-amber-400">
                                            <span>⭐</span>
                                            <span>{quest.reward_points} 獎勵</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${quest.is_active
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-gray-100 border-gray-200 text-gray-500'
                                            }`}>
                                            {quest.is_active ? '啟用中' : '已停用'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {activeTab === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleApprove(quest.id)}
                                                className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs font-bold border-b-4 border-emerald-700"
                                            >
                                                核准
                                            </button>
                                            <button
                                                onClick={() => handleReject(quest.id)}
                                                className="p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs font-bold border-b-4 border-rose-700"
                                            >
                                                拒絕
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleOpenDialog(quest)}
                                                className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border-2 border-blue-200"
                                                title="編輯"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(quest.id)}
                                                className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border-2 border-rose-200"
                                                title="刪除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="clay-card text-center py-16 md:col-span-2 border-dashed border-4" style={{ borderRadius: '32px' }}>
                        <div className="text-7xl mb-6">📝</div>
                        <h3 className="font-heading text-xl font-bold mb-2">尚未建立任務</h3>
                        <p className="font-body text-gray-500">點擊右上方「新增任務」按鈕開始您的家庭冒險</p>
                    </div>
                )}
            </div>

            {/* Quest Form Dialog */}
            <ClayDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                title={editingQuest ? '編輯任務項目' : '建立全新任務'}
                footer={
                    <div className="flex gap-4">
                        <button
                            onClick={handleCloseDialog}
                            className="flex-1 py-4 font-heading font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            form="parent-quest-form"
                            className="flex-[2] clay-btn py-4"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <Save size={20} />
                                <span>儲存任務變更</span>
                            </div>
                        </button>
                    </div>
                }
            >
                <form id="parent-quest-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-2 px-1" style={{ color: 'var(--color-text)' }}>任務名稱 *</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="clay-input"
                                style={{ paddingLeft: '3rem' }}
                                required
                                placeholder="例：刷牙怪獸"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-2 px-1" style={{ color: 'var(--color-text)' }}>任務詳細說明</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="clay-input resize-none"
                            style={{ paddingLeft: '1rem', minHeight: '100px' }}
                            rows={3}
                            placeholder="描述孩子需要如何完成這項任務..."
                        />
                    </div>

                    {/* Icon Selector */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-2 px-1" style={{ color: 'var(--color-text)' }}>選擇任務圖示 *</label>
                        <div className="bg-white/50 p-4 rounded-3xl border-2 border-dashed border-gray-200 mb-3">
                            <div className="grid grid-cols-7 gap-3 mb-4">
                                {COMMON_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, icon: emoji })}
                                        className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-all ${formData.icon === emoji
                                            ? 'bg-amber-400 scale-110 shadow-lg ring-2 ring-white'
                                            : 'bg-white hover:bg-amber-50 gray-scale hover:grayscale-0'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">💡</span>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="clay-input text-base"
                                    style={{ paddingLeft: '3rem', paddingBottom: '12px', paddingTop: '12px' }}
                                    placeholder="或輸入自訂表情符號"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Reward Points */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-2 px-1" style={{ color: 'var(--color-text)' }}>完成獎勵 (星幣) *</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">⭐</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formData.reward_points}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || /^\d+$/.test(value)) {
                                        setFormData({ ...formData, reward_points: value === '' ? '' : parseInt(value, 10) });
                                    }
                                }}
                                className="clay-input"
                                style={{ paddingLeft: '3rem' }}
                                placeholder="數量"
                                required
                            />
                        </div>
                    </div>

                    {/* Assignments */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-3 px-1" style={{ color: 'var(--color-text)' }}>任務指派給誰？</label>
                        <div className="flex flex-wrap gap-3 p-1">
                            <button
                                type="button"
                                onClick={() => setSelectedChildren([])}
                                className={`px-4 py-2 rounded-2xl font-heading font-bold text-sm border-2 transition-all ${selectedChildren.length === 0
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                                    }`}
                            >
                                ✨ 全體任務
                            </button>
                            {children?.map((child) => (
                                <button
                                    key={child.id}
                                    type="button"
                                    onClick={() => {
                                        if (selectedChildren.includes(child.id)) {
                                            setSelectedChildren(selectedChildren.filter(id => id !== child.id));
                                        } else {
                                            setSelectedChildren([...selectedChildren, child.id]);
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-2xl font-heading font-bold text-sm border-2 transition-all flex items-center gap-2 ${selectedChildren.includes(child.id)
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <span>{child.avatar_url || '👦'}</span>
                                    <span>{child.name}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 px-1">如果您沒有選擇任何人，這個任務將顯示給所有冒險家。</p>
                    </div>
                </form>
            </ClayDialog>
        </div >
    );
};
