import React, { useState, useEffect } from 'react';
import { Save, Lock, Home, Coins, Plus, Minus, X } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { useAdjustStars, useStarBalance } from '../hooks/useQuests';
import { useQuery } from '@tanstack/react-query';
import { RPGDialog } from '../components/RPGDialog';

const ChildStarRow = ({ child, onAdjust }: { child: Profile; onAdjust: (child: Profile) => void }) => {
    const { data: balance, isLoading } = useStarBalance(child.id);

    return (
        <div className="flex items-center justify-between bg-white border-2 border-deep-black p-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
                <div className="text-2xl">{child.avatar_url || '👦'}</div>
                <div>
                    <div className="font-pixel text-sm">{child.name}</div>
                    <div className="text-xs text-yellow-600 font-bold flex items-center gap-1">
                        <Coins size={12} />
                        {isLoading ? '...' : balance} 星幣
                    </div>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onAdjust(child)}
                className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-deep-black border-2 border-deep-black font-pixel text-xs transition-colors"
            >
                調整
            </button>
        </div>
    );
};

export const ParentSettings: React.FC = () => {
    const { user, setUser } = useUser();
    const [familyName, setFamilyName] = useState('');
    const [userName, setUserName] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Star Adjustment State
    const [adjustChild, setAdjustChild] = useState<Profile | null>(null);
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
    const [adjustAmount, setAdjustAmount] = useState<number>(10);
    const [adjustReason, setAdjustReason] = useState<string>('');
    const adjustStarsMutation = useAdjustStars();

    // Fetch children
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

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.family_id) return;

            // Get Family Name
            const { data: family } = await supabase
                .from('families')
                .select('name')
                .eq('id', user.family_id)
                .single();

            if (family) setFamilyName(family.name);

            // Get current PIN and Name (from user profile)
            if (user.pin_code) setPin(user.pin_code);
            if (user.name) setUserName(user.name);
        };

        fetchData();
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // Update Family Name
            if (user?.family_id) {
                const { data: updatedDetails, error: familyError } = await supabase
                    .from('families')
                    .update({ name: familyName.trim() })
                    .eq('id', user.family_id)
                    .select('id');

                if (familyError) throw familyError;

                if (!updatedDetails || updatedDetails.length === 0) {
                    console.warn("Family update returned 0 rows. Possible RLS issue.");
                    throw new Error('無法更新家庭名稱 (權限不足：您可能不是家庭建立者)');
                }
            }

            // Update Profile (PIN and Name)
            const { data: updatedUser, error: profileError } = await supabase
                .from('profiles')
                .update({
                    pin_code: pin.trim(),
                    name: userName.trim()
                })
                .eq('id', user!.id)
                .select()
                .single();

            if (profileError) throw profileError;

            if (updatedUser) {
                setUser(updatedUser);
            }

            setMessage({ text: '設定已更新！', type: 'success' });
        } catch (error) {
            console.error('Update failed:', error);
            const msg = error instanceof Error ? error.message : '更新失敗';
            setMessage({ text: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdjust = (child: Profile) => {
        setAdjustChild(child);
        setAdjustType('add');
        setAdjustAmount(10);
        setAdjustReason('');
    };

    const handleAdjustSubmit = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        if (!adjustChild || !user) return;

        try {
            const finalAmount = adjustType === 'add' ? adjustAmount : -adjustAmount;
            const description = adjustReason || (adjustType === 'add' ? '家長獎勵' : '家長扣除');

            await adjustStarsMutation.mutateAsync({
                childId: adjustChild.id,
                amount: finalAmount,
                description: description,
                parentId: user.id
            });

            setAdjustChild(null);
        } catch (error) {
            console.error('Adjustment failed', error);
            alert('調整失敗，請稍後再試');
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="font-pixel text-2xl mb-6 flex items-center gap-2">
                <div className="bg-deep-black text-white p-2 rounded">⚙️</div>
                家長設定
            </h2>

            <div className="rpg-dialog animate-bounce-in">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* User Name Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-blue-100 p-1 rounded">👤</div>
                            家長暱稱
                        </h3>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                顯示在右上角的稱呼
                            </label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                                placeholder="例如：超級媽媽"
                                required
                            />
                        </div>
                    </div>

                    {/* Family Name Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <Home size={20} />
                            家庭名稱
                        </h3>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                為您的冒險公會取個響亮的名字
                            </label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                                placeholder="例如：陳家大冒險"
                                required
                            />
                        </div>
                    </div>

                    {/* Star Management Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-yellow-100 p-1 rounded text-yellow-600">
                                <Coins size={20} />
                            </div>
                            星幣管理
                        </h3>
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-2">
                                您可以直接調整孩子的星幣數量 (獎勵或懲罰)。
                            </p>
                            {children?.map(child => (
                                <ChildStarRow
                                    key={child.id}
                                    child={child}
                                    onAdjust={handleOpenAdjust}
                                />
                            ))}
                        </div>
                    </div>

                    {/* PIN Section */}
                    <div>
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <Lock size={20} />
                            PIN 碼設定
                        </h3>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                4位數 PIN 碼 (登入家長模式時使用)
                            </label>
                            <input
                                type="tel"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-3 py-2 border-2 border-deep-black text-sm tracking-widest text-lg font-pixel"
                                placeholder="未設定 (直接登入)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                若留空，則不需要輸入 PIN 碼即可切換到家長模式。
                            </p>
                        </div>
                    </div>

                    {/* Feedback Message */}
                    {message.text && (
                        <div className={`p-3 rounded text-sm font-bold text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {message.type === 'success' ? '✅ ' : '❌ '}
                            {message.text}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <RPGButton type="submit" disabled={loading}>
                            <div className="flex items-center gap-2">
                                <Save size={16} />
                                <span>{loading ? '儲存中...' : '儲存設定'}</span>
                            </div>
                        </RPGButton>
                    </div>
                </form>
            </div>

            {/* Adjustment Dialog */}
            <RPGDialog
                isOpen={!!adjustChild}
                onClose={() => setAdjustChild(null)}
                title="調整星幣"
                footer={
                    <div className="flex gap-3 justify-end">
                        <RPGButton variant="secondary" onClick={() => setAdjustChild(null)}>
                            <div className="flex items-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </RPGButton>
                        <RPGButton onClick={handleAdjustSubmit} disabled={adjustStarsMutation.isPending}>
                            <div className="flex items-center gap-2">
                                <Save size={16} />
                                <span>{adjustStarsMutation.isPending ? '處理中...' : '確認調整'}</span>
                            </div>
                        </RPGButton>
                    </div>
                }
            >
                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                    <div className="text-center mb-4">
                        <div className="text-4xl mb-2">{adjustChild?.avatar_url}</div>
                        <p className="font-pixel">
                            正在調整 <span className="text-blue-600">{adjustChild?.name}</span> 的錢包
                        </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <button
                            type="button"
                            onClick={() => setAdjustType('add')}
                            className={`flex-1 py-3 border-2 border-deep-black rounded-lg font-pixel transition-colors flex flex-col items-center gap-1 ${adjustType === 'add' ? 'bg-yellow-400' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            <Plus size={24} />
                            增加
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdjustType('remove')}
                            className={`flex-1 py-3 border-2 border-deep-black rounded-lg font-pixel transition-colors flex flex-col items-center gap-1 ${adjustType === 'remove' ? 'bg-red-400 text-white' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            <Minus size={24} />
                            刪除
                        </button>
                    </div>

                    <div>
                        <label className="block font-pixel text-xs mb-2">
                            數量
                        </label>
                        <input
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 border-2 border-deep-black text-center font-pixel text-xl"
                            min="1"
                        />
                    </div>

                    <div>
                        <label className="block font-pixel text-xs mb-2">
                            原因 (選填)
                        </label>
                        <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            placeholder={adjustType === 'add' ? "例如：幫忙做家事" : "例如：沒收玩具"}
                        />
                    </div>
                </form>
            </RPGDialog>
        </div>
    );
};
