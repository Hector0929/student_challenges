import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { useUser } from '../contexts/UserContext';

interface RoleSelectionProps {
    onChildSelected: (child: Profile) => void;
    onParentAuthenticated: () => void;
}

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
                        <div className="text-6xl mb-4 animate-float">👋</div>
                        <h1 className="font-heading text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                            選擇你的角色
                        </h1>
                        <p className="font-body" style={{ color: 'var(--color-text-light)' }}>
                            點擊你的名字開始今天的任務
                        </p>
                    </div>

                    {/* Children Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {children && children.length > 0 ? (
                            children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => onChildSelected(child)}
                                    className="clay-card hover:scale-105 transition-transform cursor-pointer p-5 flex items-center gap-4"
                                    style={{ borderRadius: '16px' }}
                                >
                                    <div className="text-4xl flex-shrink-0">
                                        {child.avatar_url || '👦'}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-heading font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                                            {child.name}
                                        </div>
                                        {child.student_id && (
                                            <div className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>
                                                學號：{child.student_id}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
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
