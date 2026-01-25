import React, { useState, useEffect } from 'react';
import { Save, Lock, Home } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { useUser } from '../contexts/UserContext';
import { useLine } from '../hooks/useLine';
import { supabase } from '../lib/supabase';

export const ParentSettings: React.FC = () => {
    const { user, setUser } = useUser();
    const { bindLineAccount } = useLine(); // Correct top-level hook usage (requires import)
    const [familyName, setFamilyName] = useState('');
    const [userName, setUserName] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

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
                    .select('id'); // Just select ID to verify update

                if (familyError) throw familyError;

                // CRITICAL: Check if row was actually updated
                // If RLS blocks update, it returns success but empty data array
                if (!updatedDetails || updatedDetails.length === 0) {
                    console.warn("Family update returned 0 rows. Possible RLS issue.");
                    throw new Error('無法更新家庭名稱 (權限不足：您可能不是家庭建立者)');
                }
            }

            // Update Profile (PIN and Name)
            const { data: updatedUser, error: profileError } = await supabase
                .from('profiles')
                .update({
                    pin_code: pin.trim(), // Ensure no whitespace
                    name: userName.trim()
                })
                .eq('id', user!.id)
                .select()
                .single();

            if (profileError) throw profileError;

            // Update local context immediately to reflect changes in header
            if (updatedUser) {
                // Keep line_user_id if it exists locally but wasn't returned/modified
                // Actually updatedUser should have it.
                setUser(updatedUser);
            }

            setMessage({ text: '設定已更新！', type: 'success' });
        } catch (error: any) {
            console.error('Update failed:', error);
            setMessage({ text: error.message || '更新失敗', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Handler for Line Binding
    const handleBindLine = async () => {
        if (!user) return;
        const success = await bindLineAccount(user.id);
        if (success) {
            // Refresh user to get the new line_user_id
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) setUser(data);
        }
    };

    // Handler for Unbind
    const handleUnbindLine = async () => {
        if (!user) return;
        if (confirm('確定要解除 Line 綁定嗎？')) {
            const { error } = await supabase.from('profiles').update({ line_user_id: null }).eq('id', user.id);
            if (!error) {
                setUser({ ...user, line_user_id: undefined });
                alert('已解除綁定');
            } else {
                alert('解除失敗');
            }
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

                    {/* Line Integration Section (Postponed) */}
                    {/* 
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-green-100 p-1 rounded text-green-600">💬</div>
                            Line 通知設定
                        </h3>
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                綁定 Line 帳號後，當孩子完成任務時，您會直接在 Line 收到通知並進行審核。
                            </p>
                            
                            {user?.line_user_id ? (
                                <div className="bg-green-50 border border-green-200 p-3 rounded flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                                        <span>✅ 已綁定 Line 帳號</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleUnbindLine}
                                        className="text-xs text-red-500 underline"
                                    >
                                        解除綁定
                                    </button>
                                </div>
                            ) : (
                                <RPGButton 
                                    type="button" 
                                    variant="secondary"
                                    className="w-full bg-[#06C755] text-white hover:bg-[#05b34c] border-deep-black"
                                    onClick={handleBindLine}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span>🔗 連結 Line 帳號</span>
                                    </div>
                                </RPGButton>
                            )}
                        </div>
                    </div> 
                    */}

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
            </div >
        </div >
    );
};
