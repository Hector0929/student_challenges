import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { useUser } from '../contexts/UserContext';

interface RoleSelectionProps {
    /** 點頭像 → 儀表板；點「進入我的群島」→ 群島 */
    onChildSelected: (child: Profile, destination: 'dashboard' | 'island') => void;
    onParentAuthenticated: () => void;
}

// 每個小孩的小島配色：[地面, 海]
const ISLAND_COLORS: Array<[string, string]> = [
    ['#a6d96a', '#d6f0fa'],
    ['#f5b860', '#fde9d2'],
    ['#b9bdf6', '#e4e6fc'],
    ['#ebc9f7', '#f7e9fc'],
    ['#8fd3ea', '#dff3fa'],
    ['#f2a7a7', '#fbe3e3'],
];

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onChildSelected, onParentAuthenticated }) => {
    const { loginAsParent, familyName, logout } = useUser();
    const [showParentDialog, setShowParentDialog] = useState(false);
    const [parentPassword, setParentPassword] = useState('');
    const [error, setError] = useState('');

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

    const handleParentClick = () => {
        const isParentAuth = sessionStorage.getItem('parent-auth') === 'verified';
        if (isParentAuth) {
            onParentAuthenticated();
        } else {
            setShowParentDialog(true);
        }
    };

    const handleParentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await loginAsParent(parentPassword);
            sessionStorage.setItem('parent-auth', 'verified');
            setShowParentDialog(false);
            onParentAuthenticated();
        } catch {
            setParentPassword('');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-sky flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-float">👋</div>
                    <p className="font-heading text-lg" style={{ color: 'var(--color-text)' }}>載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen p-4"
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

            {/* Header Bar */}
            <div className="max-w-4xl mx-auto mb-8 relative z-10">
                <div
                    className="clay-card flex justify-between items-center p-3"
                    style={{ borderRadius: '16px' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🏠</span>
                        <span className="font-heading font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                            {familyName || 'HA family'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleParentClick}
                            className="flex items-center gap-2 px-4 py-2 rounded-full font-heading text-sm transition-all cursor-pointer hover:opacity-80"
                            style={{
                                backgroundColor: 'var(--color-cta)',
                                color: 'white',
                                border: '2px solid #E09000',
                            }}
                        >
                            👨‍👩‍👧 家長模式
                        </button>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 px-4 py-2 rounded-full font-heading text-sm transition-all cursor-pointer hover:opacity-80"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--color-text)',
                                border: '2px solid var(--border-soft)',
                            }}
                        >
                            登出系統
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Selection Card */}
            <div className="flex flex-col items-center justify-center relative z-10">
                <div
                    className="clay-card max-w-2xl w-full animate-bounce-in p-8"
                    style={{ borderRadius: '32px' }}
                >
                    <div className="text-center mb-8">
                        <div className="text-6xl mb-4 animate-float">🏝️</div>
                        <h1 className="font-heading text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                            選擇你的群島
                        </h1>
                        <p className="font-body" style={{ color: 'var(--color-text-light)' }}>
                            點頭像看個人頁面，點「進入我的群島」直接到你的學習挑戰群島！
                        </p>
                    </div>

                    {/* Children Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                        {children && children.length > 0 ? (
                            children.map((child, i) => {
                                const [ground, sea] = ISLAND_COLORS[i % ISLAND_COLORS.length];
                                return (
                                    <div
                                        key={child.id}
                                        className="clay-card p-4 flex flex-col items-center gap-2 min-w-0"
                                        style={{ borderRadius: '20px', background: `linear-gradient(180deg, #ffffff 0%, ${sea} 100%)` }}
                                    >
                                        {/* 點頭像／名字 → 原本的儀表板 */}
                                        <button
                                            type="button"
                                            onClick={() => onChildSelected(child, 'dashboard')}
                                            className="group flex flex-col items-center gap-2 min-w-0 max-w-full cursor-pointer hover:-translate-y-1 transition-transform"
                                            title={`${child.name} 的個人頁面`}
                                            data-testid={`child-dashboard-${child.id}`}
                                        >
                                            {/* 小島：六角形地面 + 頭像 */}
                                            <div className="relative w-24 h-24 flex items-center justify-center">
                                                <div
                                                    className="absolute inset-0 shadow-lg group-hover:scale-105 transition-transform"
                                                    style={{ background: ground, clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}
                                                />
                                                <div
                                                    className="absolute inset-2"
                                                    style={{ background: 'rgba(255,255,255,0.35)', clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}
                                                />
                                                <span className="relative text-5xl drop-shadow">{child.avatar_url || '👦'}</span>
                                            </div>
                                            <span
                                                className="font-heading font-bold text-base sm:text-lg leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
                                                style={{ color: 'var(--color-text)' }}
                                            >
                                                {child.name}
                                            </span>
                                        </button>
                                        {/* 直接進群島 */}
                                        <button
                                            type="button"
                                            onClick={() => onChildSelected(child, 'island')}
                                            className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline underline-offset-2 px-2 py-1 rounded-lg hover:bg-white/60 cursor-pointer"
                                            data-testid={`child-island-${child.id}`}
                                        >
                                            進入我的群島 →
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                                <p className="font-heading text-lg">尚無註冊的孩子</p>
                                <p className="font-body text-sm mt-2">請家長先建立孩子帳號</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Parent Password Dialog */}
            {showParentDialog && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 animate-popup-in"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
                >
                    <div
                        className="clay-card w-full max-w-md p-6"
                        style={{ borderRadius: '24px' }}
                    >
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">🔐</div>
                            <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                                家長驗證
                            </h2>
                        </div>

                        <form onSubmit={handleParentLogin} className="space-y-4">
                            <p className="font-body text-center" style={{ color: 'var(--color-text-light)' }}>
                                請輸入家長密碼以進入管理介面
                                <span className="block text-sm mt-1 opacity-60">(預設 0000)</span>
                            </p>

                            <div className="relative">
                                <Lock
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2"
                                    size={20}
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    type="tel"
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={parentPassword}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setParentPassword(val);
                                        setError('');
                                    }}
                                    className="w-full pl-12 pr-4 py-4 text-2xl font-heading text-center tracking-widest"
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        border: '3px solid var(--border-card)',
                                        borderRadius: '16px',
                                        color: 'var(--color-text)',
                                    }}
                                    placeholder="● ● ● ●"
                                    autoFocus
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-center font-heading" style={{ color: 'var(--color-danger)' }}>
                                    ❌ {error}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowParentDialog(false);
                                        setParentPassword('');
                                        setError('');
                                    }}
                                    className="flex-1 clay-btn-secondary py-3 font-heading cursor-pointer"
                                    style={{ borderRadius: '12px' }}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 clay-btn py-3 font-heading cursor-pointer"
                                    style={{ borderRadius: '12px' }}
                                >
                                    確認
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
