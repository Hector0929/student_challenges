import React, { useState } from 'react';
import { Home, LogIn, UserPlus, Lock, Mail, ArrowRight } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { supabase } from '../lib/supabase';


export const FamilyOnboarding: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Register State
    const [familyName, setFamilyName] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
        } catch (err) {
            const message = err instanceof Error ? err.message : '登入失敗';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Sign Up User (Parent/Family Admin)
            // Pass family_name and name in metadata to trigger Profile/Family creation on server
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: '家長 (Admin)', // Default name or could add input for it
                        family_name: familyName
                    }
                }
            });

            if (authError) throw authError;

            // Check if email confirmation is required (session might be null)
            if (authData.user && !authData.session) {
                alert('註冊成功！請檢查您的 Email 信箱並點擊驗證連結。');
                setMode('login'); // Switch to login mode
            } else if (authData.user && authData.session) {
                // Auto logged in
                // The trigger ensures profile is created.
                // Re-fetch session to ensure context updates might be needed? 
                // Context listens to onAuthStateChange so it should auto-update.
            } else {
                throw new Error('註冊失敗，請重試');
            }

        } catch (err) {
            console.error('Registration error:', err);
            const message = err instanceof Error ? err.message : '註冊失敗';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 flex items-center justify-center p-4">
            <div className="rpg-dialog max-w-md w-full animate-bounce-in">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🏠</div>
                    <h1 className="font-pixel text-2xl mb-2">Daily QuestMon</h1>
                    <p className="text-sm text-gray-600">
                        {mode === 'login' ? '歡迎回來！請登入家庭帳號' : '建立您的家庭冒險團'}
                    </p>
                </div>

                {/* Mode Switch */}
                <div className="flex bg-gray-100 p-1 mb-6 rounded-lg pointer-events-auto">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${mode === 'login' ? 'bg-white shadow text-pokeball-red' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        type="button"
                    >
                        <LogIn size={16} /> 登入
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${mode === 'register' ? 'bg-white shadow text-pokeball-red' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        type="button"
                    >
                        <UserPlus size={16} /> 註冊
                    </button>
                </div>

                <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block font-pixel text-xs mb-1">家庭名稱</label>
                            <div className="relative">
                                <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={familyName}
                                    onChange={(e) => setFamilyName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border-2 border-deep-black text-sm"
                                    placeholder="例如：陳家大冒險"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block font-pixel text-xs mb-1">Email (帳號)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border-2 border-deep-black text-sm"
                                placeholder="parent@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-pixel text-xs mb-1">
                            {mode === 'login' ? '密碼' : '設定密碼'}
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border-2 border-deep-black text-sm"
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs text-center font-bold bg-red-50 p-2 rounded">
                            ⚠️ {error}
                        </p>
                    )}

                    <RPGButton type="submit" className="w-full" disabled={loading}>
                        <div className="flex items-center justify-center gap-2">
                            {loading ? (
                                <span>處理中...</span>
                            ) : mode === 'login' ? (
                                <><span>登入家庭</span> <ArrowRight size={16} /></>
                            ) : (
                                <><span>建立家庭</span> <UserPlus size={16} /></>
                            )}
                        </div>
                    </RPGButton>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Daily QuestMon v0.1
                </div>
            </div>
        </div>
    );
};
