import React, { useState } from 'react';
import { Home, LogIn, UserPlus, Lock, Mail, ArrowRight } from 'lucide-react';
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
        <div
            className="min-h-screen p-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #B8E0F6 0%, #E8F4FC 100%)' }}
        >
            {/* Floating Cloud Decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                <div className="absolute top-[10%] left-[5%] w-24 h-12 bg-white/60 rounded-full blur-sm"></div>
                <div className="absolute top-[15%] left-[8%] w-16 h-8 bg-white/50 rounded-full blur-sm"></div>
                <div className="absolute top-[8%] right-[10%] w-32 h-16 bg-white/60 rounded-full blur-sm"></div>
                <div className="absolute top-[12%] right-[15%] w-20 h-10 bg-white/50 rounded-full blur-sm"></div>
                <div className="absolute bottom-[20%] left-[15%] w-28 h-14 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-[25%] right-[20%] w-24 h-12 bg-white/40 rounded-full blur-sm"></div>
            </div>

            {/* Main Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div
                    className="clay-card animate-bounce-in p-8"
                    style={{ borderRadius: '32px' }}
                >
                    {/* Mascot & Header */}
                    <div className="text-center mb-6">
                        <img
                            src="/mascot.png"
                            alt="QuestMon Mascot"
                            className="w-28 h-28 mx-auto mb-4 drop-shadow-lg"
                        />
                        <h1 className="font-heading text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                            Daily QuestMon
                        </h1>
                        <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>
                            {mode === 'login' ? '歡迎回來！請登入家庭帳號' : '建立您的家庭冒險團'}
                        </p>
                    </div>

                    {/* Mode Switch */}
                    <div className="clay-tab-switch mb-6">
                        <button
                            onClick={() => setMode('login')}
                            className={mode === 'login' ? 'active' : ''}
                            type="button"
                        >
                            <LogIn size={16} /> 登入
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={mode === 'register' ? 'active' : ''}
                            type="button"
                        >
                            <UserPlus size={16} /> 註冊
                        </button>
                    </div>

                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                        {mode === 'register' && (
                            <div>
                                <label
                                    htmlFor="familyName"
                                    className="block font-heading text-sm mb-2"
                                    style={{ color: 'var(--color-text)' }}
                                >
                                    家庭名稱
                                </label>
                                <div className="relative">
                                    <Home
                                        className="absolute left-4 top-1/2 -translate-y-1/2"
                                        size={18}
                                        style={{ color: 'var(--color-text-muted)' }}
                                    />
                                    <input
                                        id="familyName"
                                        type="text"
                                        value={familyName}
                                        onChange={(e) => setFamilyName(e.target.value)}
                                        className="clay-input"
                                        placeholder="例如：陳家大冒險"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block font-heading text-sm mb-2"
                                style={{ color: 'var(--color-text)' }}
                            >
                                Email (帳號)
                            </label>
                            <div className="relative">
                                <Mail
                                    className="absolute left-4 top-1/2 -translate-y-1/2"
                                    size={18}
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="clay-input"
                                    placeholder="parent@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block font-heading text-sm mb-2"
                                style={{ color: 'var(--color-text)' }}
                            >
                                {mode === 'login' ? '密碼' : '設定密碼'}
                            </label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-4 top-1/2 -translate-y-1/2"
                                    size={18}
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="clay-input"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div
                                className="font-body text-sm text-center p-3 rounded-xl"
                                style={{
                                    backgroundColor: '#FEF2F2',
                                    color: 'var(--color-danger)',
                                    border: '2px solid var(--color-danger)',
                                }}
                            >
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="clay-btn w-full py-4 font-heading text-base cursor-pointer"
                            style={{ borderRadius: '16px' }}
                            disabled={loading}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {loading ? (
                                    <span>處理中...</span>
                                ) : mode === 'login' ? (
                                    <><span>登入家庭</span> <ArrowRight size={18} /></>
                                ) : (
                                    <><span>建立家庭</span> <UserPlus size={18} /></>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="font-body text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            Daily QuestMon v0.1
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
