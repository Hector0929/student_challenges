import React, { useState, useEffect } from 'react';
import { Save, Lock, Home } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';

export const ParentSettings: React.FC = () => {
    const { user } = useUser();
    const [familyName, setFamilyName] = useState('');
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

            // Get current PIN (from user profile)
            if (user.pin_code) setPin(user.pin_code);
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
                const { error: familyError } = await supabase
                    .from('families')
                    .update({ name: familyName })
                    .eq('id', user.family_id);

                if (familyError) throw familyError;
            }

            // Update PIN
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ pin_code: pin })
                .eq('id', user!.id);

            if (profileError) throw profileError;

            setMessage({ text: '設定已更新！', type: 'success' });
        } catch (error: any) {
            console.error('Update failed:', error);
            setMessage({ text: error.message || '更新失敗', type: 'error' });
        } finally {
            setLoading(false);
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
        </div>
    );
};
