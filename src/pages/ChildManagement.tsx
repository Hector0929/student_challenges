import React, { useState } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { RPGDialog } from '../components/RPGDialog';
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
                    <p className="font-pixel text-sm">載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-pixel text-2xl">管理孩子帳號</h2>
                <RPGButton onClick={() => setIsDialogOpen(true)}>
                    <div className="flex items-center gap-2">
                        <Plus size={16} />
                        <span>新增孩子</span>
                    </div>
                </RPGButton>
            </div>

            {/* Children Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {children && children.length > 0 ? (
                    children.map((child) => (
                        <div key={child.id} className="rpg-dialog animate-bounce-in">
                            <div className="flex items-start gap-4">
                                <div className="text-5xl flex-shrink-0">{child.avatar_url || '👦'}</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-pixel text-lg mb-1">{child.name}</h3>
                                    <p className="text-xs text-gray-500 mt-2">
                                        建立於: {new Date(child.created_at).toLocaleDateString('zh-TW')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(child)}
                                    className="p-2 hover:bg-red-100 border-2 border-deep-black transition-colors flex-shrink-0"
                                    title="刪除"
                                >
                                    <Trash2 size={16} className="text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rpg-dialog text-center py-12 md:col-span-2 lg:col-span-3">
                        <div className="text-6xl mb-4">👶</div>
                        <p className="font-pixel text-sm mb-2">尚未新增孩子</p>
                        <p className="text-xs text-gray-600">點擊「新增孩子」開始建立帳號</p>
                    </div>
                )}
            </div>

            {/* Add Child Dialog */}
            <RPGDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setFormData({ name: '', avatar_url: '👦' });
                }}
                title="新增孩子帳號"
                footer={
                    <div className="flex gap-3 justify-end">
                        <RPGButton
                            variant="secondary"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setFormData({ name: '', avatar_url: '👦' });
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </RPGButton>
                        <RPGButton type="submit" form="add-child-form">
                            <div className="flex items-center gap-2">
                                <Save size={16} />
                                <span>儲存</span>
                            </div>
                        </RPGButton>
                    </div>
                }
            >
                <form id="add-child-form" onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">孩子的名字 *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            required
                            placeholder="例：小明"
                        />
                    </div>

                    {/* Avatar */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">選擇頭像</label>
                        <div className="grid grid-cols-7 gap-2">
                            {commonEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, avatar_url: emoji })}
                                    className={`text-2xl p-2 border-2 border-deep-black hover:bg-gray-100 transition-colors ${formData.avatar_url === emoji ? 'bg-yellow-200' : 'bg-white'
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
