import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { RPGButton as _RPGButton } from '../components/RPGButton';
const RPGButton = _RPGButton as any;
import { RPGDialog } from '../components/RPGDialog';
import { useQuests, usePendingQuests, useCreateQuest, useUpdateQuest, useDeleteQuest, useUpdateQuestAssignments } from '../hooks/useQuests';
import type { Quest, Profile } from '../types/database';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

export const ParentControl: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

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
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'child')
                .order('name');
            return data as Profile[];
        },
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        icon: '👾',
        reward_points: 10,
        is_active: true,
        status: 'active' as 'active' | 'pending' | 'archived',
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

        if (editingQuest) {
            questId = editingQuest.id;
            await updateQuestMutation.mutateAsync({
                id: questId,
                ...formData,
            });
        } else {
            const newQuest = await createQuestMutation.mutateAsync({
                ...formData,
                status: 'active'
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

        // Auto-assign to creator if it exists
        const quest = quests?.find(q => q.id === questId);
        if (quest?.created_by) {
            await updateAssignmentsMutation.mutateAsync({
                questId,
                childIds: [quest.created_by]
            });
        }
    };

    const handleReject = async (questId: string) => {
        if (confirm('確定要拒絕並刪除這個許願嗎？')) {
            await deleteQuestMutation.mutateAsync(questId);
        }
    };

    const commonEmojis = ['👾', '🦷', '🛏️', '📚', '🧸', '🧹', '📖', '⚽', '🎨', '🎮', '🍎', '💪', '🎵', '🌟'];

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
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="font-pixel text-2xl">任務管理</h2>
                    <div className="flex bg-off-white border-2 border-deep-black p-1">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-3 py-1 font-pixel text-xs transition-colors ${activeTab === 'active'
                                ? 'bg-deep-black text-white'
                                : 'text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            現有任務
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-3 py-1 font-pixel text-xs transition-colors flex items-center gap-2 ${activeTab === 'pending'
                                ? 'bg-deep-black text-white'
                                : 'text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <span>審核許願</span>
                            {pendingQuests && pendingQuests.length > 0 && (
                                <span className="bg-pokeball-red text-white text-[10px] px-1.5 rounded-full animate-pulse">
                                    {pendingQuests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <RPGButton onClick={() => handleOpenDialog()}>
                    <div className="flex items-center gap-2">
                        <Plus size={16} />
                        <span>新增任務</span>
                    </div>
                </RPGButton>
            </div>

            {/* Quest List */}
            <div className="grid gap-4 md:grid-cols-2">
                {quests && quests.length > 0 ? (
                    quests.map((quest) => (
                        <div key={quest.id} className="rpg-dialog animate-bounce-in">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl flex-shrink-0">{quest.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-pixel text-sm mb-2 leading-relaxed break-words">
                                        {quest.title}
                                    </h3>
                                    {quest.description && (
                                        <p className="text-xs text-gray-600 mb-2 leading-relaxed break-words">
                                            {quest.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="bg-yellow-400 border border-deep-black px-2 py-1">
                                            ⭐ {quest.reward_points}
                                        </span>
                                        <span className={`px-2 py-1 border border-deep-black ${quest.is_active ? 'bg-hp-green text-white' : 'bg-gray-400 text-white'
                                            }`}>
                                            {quest.is_active ? '啟用' : '停用'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    {activeTab === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleApprove(quest.id)}
                                                className="p-2 bg-hp-green text-white border-2 border-deep-black hover:brightness-110 transition-all font-pixel text-xs"
                                                title="核准"
                                            >
                                                核准
                                            </button>
                                            <button
                                                onClick={() => handleReject(quest.id)}
                                                className="p-2 bg-red-500 text-white border-2 border-deep-black hover:brightness-110 transition-all font-pixel text-xs"
                                                title="拒絕"
                                            >
                                                拒絕
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleOpenDialog(quest)}
                                                className="p-2 hover:bg-gray-100 border-2 border-deep-black transition-colors"
                                                title="編輯"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(quest.id)}
                                                className="p-2 hover:bg-red-100 border-2 border-deep-black transition-colors"
                                                title="刪除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rpg-dialog text-center py-8 md:col-span-2">
                        <div className="text-6xl mb-4">📝</div>
                        <p className="font-pixel text-sm">尚未建立任務</p>
                        <p className="text-xs text-gray-600 mt-2">點擊「新增任務」開始建立</p>
                    </div>
                )}
            </div>

            {/* Quest Form Dialog */}
            <RPGDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                title={editingQuest ? '編輯任務' : '新增任務'}
                footer={
                    <div className="flex gap-3 justify-end">
                        <RPGButton variant="secondary" onClick={handleCloseDialog}>
                            <div className="flex items-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </RPGButton>
                        <RPGButton onClick={handleSubmit}>
                            <div className="flex items-center gap-2">
                                <Save size={16} />
                                <span>儲存</span>
                            </div>
                        </RPGButton>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">任務名稱 *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            required
                            placeholder="例：刷牙怪獸"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">說明</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm resize-none"
                            rows={3}
                            placeholder="任務的詳細說明..."
                        />
                    </div>

                    {/* Icon */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">圖示 *</label>
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {commonEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon: emoji })}
                                    className={`text-2xl p-2 border-2 border-deep-black hover:bg-gray-100 transition-colors ${formData.icon === emoji ? 'bg-yellow-200' : 'bg-white'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            placeholder="或輸入自訂 emoji"
                        />
                    </div>

                    {/* Reward Points */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">獎勵點數 *</label>
                        <input
                            type="number"
                            value={formData.reward_points}
                            onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            min="0"
                            required
                        />
                    </div>

                    {/* Assignments */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">指派給... (未勾選 = 全體任務)</label>
                        <div className="flex flex-wrap gap-2">
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
                                    className={`px-3 py-1 text-sm border-2 border-deep-black transition-colors flex items-center gap-2 ${selectedChildren.includes(child.id)
                                        ? 'bg-deep-black text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>{child.avatar_url || '👦'}</span>
                                    <span>{child.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-5 h-5 border-2 border-deep-black"
                        />
                        <label htmlFor="is_active" className="font-pixel text-xs cursor-pointer">
                            啟用此任務
                        </label>
                    </div>
                </form>
            </RPGDialog>
        </div >
    );
};
