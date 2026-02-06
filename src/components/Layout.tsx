import React from 'react';
import { User } from 'lucide-react';
import type { Profile } from '../types/database';

interface LayoutProps {
    children: React.ReactNode;
    currentRole: 'child' | 'parent';
    onRoleChange: (role: 'child' | 'parent') => void;
    user?: Profile;
    onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
    children,
    currentRole,
    onRoleChange,
    user,
    onLogout,
}) => {
    return (
        <div className="min-h-screen confetti-bg" style={{ backgroundColor: 'var(--bg-main)' }}>
            {/* Header */}
            <header className="clay-card mx-4 mt-4 p-4" style={{ borderRadius: '16px' }}>
                <div className="flex items-center justify-between">
                    {/* Logo / Title */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏠</span>
                        <h1 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                            HA family
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* User Info (Desktop) */}
                        {user && (
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full"
                                style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-soft)' }}>
                                <User size={16} style={{ color: 'var(--color-text-light)' }} />
                                <span className="font-body font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                                    {user.name}
                                    {user.student_id && ` (${user.student_id})`}
                                </span>
                            </div>
                        )}

                        {/* Role Switcher */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onRoleChange('parent')}
                                className={`
                                    px-4 py-2 font-heading text-sm rounded-full
                                    transition-all flex items-center gap-2 cursor-pointer
                                    ${currentRole === 'parent'
                                        ? 'text-white'
                                        : 'hover:opacity-80'
                                    }
                                `}
                                style={{
                                    backgroundColor: currentRole === 'parent' ? 'var(--color-cta)' : 'var(--bg-card)',
                                    color: currentRole === 'parent' ? 'white' : 'var(--color-text)',
                                    border: `2px solid ${currentRole === 'parent' ? '#E09000' : 'var(--border-soft)'}`,
                                }}
                            >
                                👨‍👩‍👧 家長模式
                            </button>
                        </div>

                        {/* Logout Button */}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 font-heading text-sm rounded-full transition-all cursor-pointer hover:opacity-80"
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    color: 'var(--color-text)',
                                    border: '2px solid var(--border-soft)',
                                }}
                                title="登出系統"
                            >
                                登出系統
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto p-4 md:p-6">
                {children}
            </main>
        </div>
    );
};
