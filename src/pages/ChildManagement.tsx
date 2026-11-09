import React, { useState } from 'react';
import { Plus, Trash2, X, Save, Users } from 'lucide-react';
import { ClayDialog } from '../components/ClayDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { useUser } from '../contexts/UserContext';

export const ChildManagement: React.FC = () => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        avatar_url: '👦'
    });

    const commonEmojis = ['👦', '👧', '🧒', '👶', '🦸', '🦹', '🧙', '🧚', '🐱', '🐶', '🦁', '🐻', '🐼', '🦊'];

    // Fetch all children
    const { data: children, isLoading } = useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'child')
                .order('name');

            if (error) throw error;
            return data as Profile[];
        },
    });

    // Create child mutation
    const createChildMutation = useMutation({
        mutationFn: async (childData: { name: string; avatar_url: string }) => {
            if (!user?.family_id) throw new Error('無法取得家庭資訊');

            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    role: 'child',
                    name: childData.name,
                    avatar_url: childData.avatar_url,
                    family_id: user.family_id // Link to current family
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['children'] });
            setIsDialogOpen(false);
            setFormData({ name: '', avatar_url: '👦' });
        },
    });

    // Delete child mutation
    const deleteChildMutation = useMutation({
        mutationFn: async (childId: string) => {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', childId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['children'] });
            alert('刪除成功！');
        },
        onError: (error) => {
            console.error('刪除失敗:', error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`刪除失敗：${msg}\n\n請確認：\n1. 孩子是否有相關的任務紀錄\n2. 資料庫權限設定是否正確`);
        },
    });

    // 年級：概念題庫依年級出題（profiles.grade，透過 set_child_grade 設定）
    const setGradeMutation = useMutation({
        mutationFn: async ({ childId, grade }: { childId: string; grade: number | null }) => {
            const { error } = await supabase.rpc('set_child_grade', { p_child_id: childId, p_grade: grade });
            if (error) throw error;
        },
        onSuccess: (_, { childId }) => {
            queryClient.invalidateQueries({ queryKey: ['children'] });
            queryClient.invalidateQueries({ queryKey: ['child_grade', childId] });
        },
        onError: (error) => {
            const msg = error instanceof Error ? error.message : String(error);
            alert(`年級儲存失敗：${msg}\n\n如果是第一次使用，請先在 Supabase SQL Editor 執行 supabase/add_concept_progress.sql。`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createChildMutation.mutate(formData);
    };

    const handleDelete = (child: Profile) => {
        if (confirm(`確定要刪除 ${child.name} 的帳號嗎？\n\n注意：這將會刪除所有相關的任務紀錄。`)) {
            deleteChildMutation.mutate(child.id);
        }
    };

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

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl clay-card">
                        <Users className="text-primary-dark" size={28} />
                    </div>
                    <div>
                        <h2 className="font-heading text-3xl font-bold" style={{ color: 'var(--color-text)' }}>管理孩子帳號</h2>
                        <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>新增、查看與移除孩子帳號</p>
                    </div>
                </div>

                <button onClick={() => setIsDialogOpen(true)} className="clay-btn py-3 px-6 flex items-center justify-center gap-2 self-start md:self-auto">
                    <Plus size={20} />
                    <span>新增孩子</span>
                </button>
            </div>

            {/* Children Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {children && children.length > 0 ? (
                    children.map((child) => (
                        <div key={child.id} className="clay-card p-5 animate-bounce-in" style={{ borderRadius: '24px' }}>
                            <div className="flex items-start gap-4">
                                <div className="clay-icon-circle bg-white text-4xl shrink-0" style={{ width: '64px', height: '64px', borderRadius: '18px' }}>
                                    {child.avatar_url || '👦'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-heading font-bold text-2xl mb-1" style={{ color: 'var(--color-text)' }}>{child.name}</h3>
                                    <p className="font-body text-sm text-gray-500 mt-2">
                                        建立於: {new Date(child.created_at).toLocaleDateString('zh-TW')}
                                    </p>
                                    <label className="mt-3 flex items-center gap-2 font-body text-sm" style={{ color: 'var(--color-text)' }}>
                                        <span className="font-bold">年級</span>
                                        <select
                                            className="rounded-xl border-2 border-indigo-100 bg-white px-2 py-1"
                                            value={child.grade ?? ''}
                                            disabled={setGradeMutation.isPending}
                                            onChange={(e) => setGradeMutation.mutate({ childId: child.id, grade: e.target.value ? Number(e.target.value) : null })}
                                        >
                                            <option value="">未設定</option>
                                            {[2, 3, 4, 5, 6].map((g) => (
                                                <option key={g} value={g}>{g} 年級</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <button
                                    onClick={() => handleDelete(child)}
                                    className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border-2 border-rose-200"
                                    title="刪除"
                                >
                                    <Trash2 size={16} className="text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="clay-card text-center py-12 md:col-span-2 lg:col-span-3" style={{ borderRadius: '24px' }}>
                        <div className="text-6xl mb-4">👶</div>
                        <p className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>尚未新增孩子</p>
                        <p className="font-body text-sm text-gray-600">點擊「新增孩子」開始建立帳號</p>
                    </div>
                )}
            </div>

            {/* Add Child Dialog */}
            <ClayDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setFormData({ name: '', avatar_url: '👦' });
                }}
                title="新增孩子帳號"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={() => {
                                setIsDialogOpen(false);
                                setFormData({ name: '', avatar_url: '👦' });
                            }}
                            className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 text-gray-600 border-2 border-gray-300 font-heading font-bold hover:bg-gray-200 transition-colors"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </button>
                        <button type="submit" form="add-child-form" className="flex-1 py-3 px-4 rounded-2xl bg-indigo-500 text-white border-b-4 border-indigo-700 font-heading font-bold hover:brightness-110 active:scale-95 transition-all">
                            <div className="flex items-center justify-center gap-2">
                                <Save size={16} />
                                <span>儲存</span>
                            </div>
                        </button>
                    </div>
                }
            >
                <form id="add-child-form" onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-2" style={{ color: 'var(--color-text)' }}>孩子的名字 *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-3 border-2 border-indigo-100 rounded-2xl text-sm"
                            required
                            placeholder="例：小明"
                        />
                    </div>

                    {/* Avatar */}
                    <div>
                        <label className="block font-heading font-bold text-sm mb-2" style={{ color: 'var(--color-text)' }}>選擇頭像</label>
                        <div className="grid grid-cols-7 gap-2">
                            {commonEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, avatar_url: emoji })}
                                    className={`text-2xl p-2 border-2 rounded-xl hover:bg-gray-100 transition-colors ${formData.avatar_url === emoji ? 'bg-yellow-200 border-yellow-400' : 'bg-white border-indigo-100'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </form>
            </ClayDialog>
        </div>
    );
};
