import React from 'react';
import { Swords, Shield, LogOut, User } from 'lucide-react';
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
        <div className="min-h-screen bg-off-white">
            {/* Header */}
            <header className="bg-pokeball-red border-b-4 border-deep-black p-4">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between">
                        <h1 className="text-white font-pixel text-lg md:text-xl">
                            每日怪獸挑戰
                        </h1>

                        <div className="flex items-center gap-4">
                            {/* User Info */}
                            {user && (
                                <div className="hidden md:flex items-center gap-2 bg-white/20 px-3 py-2 border-2 border-white/30">
                                    <User size={16} className="text-white" />
                                    <span className="text-white font-pixel text-xs">
                                        {user.name}
                                        {user.student_id && ` (${user.student_id})`}
                                    </span>
                                </div>
                            )}

                            {/* Role Switcher */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onRoleChange('child')}
                                    className={`
                  px-4 py-2 font-pixel text-xs border-2 border-deep-black
                  transition-all flex items-center gap-2
                  ${currentRole === 'child'
                                            ? 'bg-white text-deep-black'
                                            : 'bg-pokeball-red text-white hover:bg-red-600'
                                        }
                `}
                                >
                                    <Swords size={16} />
                                    <span className="hidden sm:inline">玩家</span>
                                </button>
                                <button
                                    onClick={() => onRoleChange('parent')}
                                    className={`
                  px-4 py-2 font-pixel text-xs border-2 border-deep-black
                  transition-all flex items-center gap-2
                  ${currentRole === 'parent'
                                            ? 'bg-white text-deep-black'
                                            : 'bg-pokeball-red text-white hover:bg-red-600'
                                        }
                `}
                                >
                                    <Shield size={16} />
                                    <span className="hidden sm:inline">家長</span>
                                </button>
                            </div>

                            {/* Logout Button */}
                            {onLogout && (
                                <button
                                    onClick={onLogout}
                                    className="px-3 py-2 bg-white/20 border-2 border-white/30 text-white hover:bg-white/30 transition-colors"
                                    title="登出"
                                >
                                    <LogOut size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto p-4 md:p-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-deep-black text-white p-4 mt-8">
                <div className="container mx-auto text-center">
                    <p className="font-pixel text-xs">
                        Daily QuestMon © 2026 | 讓每日任務變得有趣！
                    </p>
                </div>
            </footer>
        </div>
    );
};
