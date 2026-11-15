import React, { useState } from 'react';
import { Home, LogIn, UserPlus, Lock, Mail, ArrowRight, User, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrors';

type Mode = 'login' | 'register' | 'forgot';

const HIGHLIGHTS = [
    { icon: '🎯', text: '家長出任務，孩子完成後回報，家長審核' },
    { icon: '📚', text: '國語、英語、數學、自然、社會五科題庫與小遊戲' },
    { icon: '⭐', text: '完成任務解鎖遊戲時間，星幣還能換零用錢' },
];

export const FamilyOnboarding: React.FC = () => {
    const [mode, setMode] = useState<Mode>('login');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [parentName, setParentName] = useState('');
    const [error, setError] = useState('');
    // 畫面內的成功提示（取代原本的 alert）
    const [notice, setNotice] = useState('');

    const switchMode = (next: Mode) => {
        setMode(next);
        setError('');
        setNotice('');
    };

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const handleRegister = async () => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    // 伺服器端 trigger 依這兩個欄位建立家長 profile 與家庭
                    name: parentName.trim() || '家長',
                    family_name: familyName,
                },
            },
        });
        if (error) throw error;
        if (data.user && !data.session) {
            // 需要 Email 驗證：留在卡片上提示，切回登入
            setMode('login');
            setNotice(`驗證信已寄到 ${email}，請到信箱點驗證連結，再回來登入。`);
        } else if (!data.user) {
            throw new Error('註冊失敗，請重試');
        }
        // 有 session 代表直接登入，UserContext 會接手
    };

    const handleForgot = async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
        setNotice(`重設密碼的信已寄到 ${email}。點信裡的連結就能設定新密碼。`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setNotice('');
        try {
            if (mode === 'login') await handleLogin();
            else if (mode === 'register') await handleRegister();
            else await handleForgot();
        } catch (err) {
            console.error('Auth error:', err);
            setError(authErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const subtitle = mode === 'login' ? '登入家庭帳號' : mode === 'register' ? '建立你的家庭冒險團' : '忘記密碼';
    const submitLabel = mode === 'login' ? '登入' : mode === 'register' ? '建立家庭' : '寄重設密碼信';

    return (
        <div
            className="min-h-screen p-4 sm:p-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #B8E0F6 0%, #E8F4FC 100%)' }}
        >
            {/* Floating Cloud Decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                <div className="absolute top-[10%] left-[5%] w-24 h-12 bg-white/60 rounded-full blur-sm"></div>
                <div className="absolute top-[8%] right-[10%] w-32 h-16 bg-white/60 rounded-full blur-sm"></div>
                <div className="absolute bottom-[20%] left-[15%] w-28 h-14 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-[25%] right-[20%] w-24 h-12 bg-white/40 rounded-full blur-sm"></div>
            </div>

            {/* 手機：單欄（一行標語 + 登入卡）；平板以上：左邊產品介紹、右邊登入卡 */}
            <div className="relative z-10 w-full max-w-md md:max-w-4xl grid md:grid-cols-[1.1fr_1fr] gap-6 md:gap-10 items-center">
                {/* 產品介紹 */}
                <section className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-3 md:mb-5">
                        <img
                            src="/mascot.webp"
                            alt="Daily QuestMon 吉祥物"
                            className="w-16 h-16 md:w-24 md:h-24 drop-shadow-lg"
                        />
                        <h1 className="font-heading text-2xl md:text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                            Daily QuestMon
                        </h1>
                    </div>
                    <p className="font-body text-base md:text-xl leading-relaxed" style={{ color: 'var(--color-text)' }}>
                        每天完成任務、學習闖關，換星幣的家庭冒險。
                    </p>
                    <ul className="hidden md:grid gap-3 mt-6">
                        {HIGHLIGHTS.map((h) => (
                            <li key={h.text} className="flex items-center gap-3 font-body" style={{ color: 'var(--color-text)' }}>
                                <span className="w-10 h-10 shrink-0 rounded-2xl bg-white/70 flex items-center justify-center text-xl shadow-sm">{h.icon}</span>
                                <span>{h.text}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 登入卡 */}
                <div className="clay-card animate-bounce-in p-6 sm:p-8" style={{ borderRadius: '32px' }}>
                    <h2 className="font-heading text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>{subtitle}</h2>

                    {mode !== 'forgot' && (
                        <div className="clay-tab-switch mb-6">
                            <button onClick={() => switchMode('login')} className={mode === 'login' ? 'active' : ''} type="button">
                                <LogIn size={16} /> 登入
                            </button>
                            <button onClick={() => switchMode('register')} className={mode === 'register' ? 'active' : ''} type="button">
                                <UserPlus size={16} /> 註冊
                            </button>
                        </div>
                    )}

                    {mode === 'forgot' && (
                        <p className="font-body text-sm mb-4" style={{ color: 'var(--color-text-light)' }}>
                            輸入註冊時的 Email，我們會寄一封信，讓你設定新密碼。
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <Field id="familyName" label="家庭名稱" icon={<Home size={18} />}>
                                    <input id="familyName" type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="clay-input" placeholder="例如：陳家大冒險" required />
                                </Field>
                                <Field id="parentName" label="孩子怎麼稱呼你" icon={<User size={18} />}>
                                    <input id="parentName" type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="clay-input" placeholder="例如：媽媽、爸爸" />
                                </Field>
                            </>
                        )}

                        <Field id="email" label="Email" icon={<Mail size={18} />}>
                            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="clay-input" placeholder="parent@example.com" required />
                        </Field>

                        {mode !== 'forgot' && (
                            <Field id="password" label={mode === 'login' ? '密碼' : '設定密碼（至少 6 個字元）'} icon={<Lock size={18} />}>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="clay-input"
                                    placeholder="••••••••"
                                    minLength={6}
                                    required
                                />
                            </Field>
                        )}

                        {error && (
                            <div role="alert" className="font-body text-sm p-3 rounded-xl" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)', border: '2px solid var(--color-danger)' }}>
                                {error}
                            </div>
                        )}
                        {notice && (
                            <div role="status" className="font-body text-sm p-3 rounded-xl flex gap-2 items-start" style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '2px solid #86EFAC' }}>
                                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                                <span>{notice}</span>
                            </div>
                        )}

                        <button type="submit" className="clay-btn w-full py-4 font-heading text-base cursor-pointer" style={{ borderRadius: '16px' }} disabled={loading}>
                            <div className="flex items-center justify-center gap-2">
                                {loading ? <span>處理中...</span> : <><span>{submitLabel}</span>{mode === 'forgot' ? <KeyRound size={18} /> : <ArrowRight size={18} />}</>}
                            </div>
                        </button>
                    </form>

                    <div className="mt-4 text-center font-body text-sm">
                        {mode === 'login' && (
                            <button type="button" onClick={() => switchMode('forgot')} className="text-sky-700 hover:underline underline-offset-2 cursor-pointer">
                                忘記密碼？
                            </button>
                        )}
                        {mode === 'forgot' && (
                            <button type="button" onClick={() => switchMode('login')} className="text-sky-700 hover:underline underline-offset-2 cursor-pointer">
                                ← 回到登入
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function Field({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="block font-heading text-sm mb-2" style={{ color: 'var(--color-text)' }}>
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    {icon}
                </span>
                {children}
            </div>
        </div>
    );
}
