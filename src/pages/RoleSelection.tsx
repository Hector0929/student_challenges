import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import { RPGDialog } from '../components/RPGDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface RoleSelectionProps {
    onChildSelected: (child: Profile) => void;
    onParentAuthenticated: () => void;
}

import { useUser } from '../contexts/UserContext';

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onChildSelected, onParentAuthenticated }) => {
    const { loginAsParent } = useUser();
    const [showParentDialog, setShowParentDialog] = useState(false);
    const [parentPassword, setParentPassword] = useState('');
    const [error, setError] = useState('');

    // Fetch all children from database
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
        // Check if parent is already authenticated in this session
        const isParentAuth = sessionStorage.getItem('parent-auth') === 'verified';

        if (isParentAuth) {
            // Already authenticated, skip password dialog
            onParentAuthenticated();
        } else {
            // Not authenticated, show password dialog
            setShowParentDialog(true);
        }
    };

    const handleParentLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await loginAsParent(parentPassword); // Using parentPassword state for PIN input
            // Set parent auth flag in sessionStorage if successful
            sessionStorage.setItem('parent-auth', 'verified');
            setShowParentDialog(false);
            onParentAuthenticated();
        } catch (err) {
            // Error handling is done in UserContext, but we can clear input here
            setParentPassword('');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">⚙️</div>
                    <p className="font-pixel text-sm">載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 flex items-center justify-center p-4">
            <div className="rpg-dialog max-w-2xl w-full animate-bounce-in">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">👋</div>
                    <h1 className="font-pixel text-2xl mb-2">選擇你的角色</h1>
                    <p className="text-sm text-gray-600">點擊你的名字開始今天的任務</p>
                </div>

                {/* Children Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {children && children.length > 0 ? (
                        children.map((child) => (
                            <button
                                key={child.id}
                                onClick={() => onChildSelected(child)}
                                className="rpg-dialog hover:scale-105 transition-transform cursor-pointer p-6 text-center"
                            >
                                <div className="text-4xl mb-2">
                                    {child.avatar_url || '👦'}
                                </div>
                                <div className="font-pixel text-sm">{child.name}</div>
                                {child.student_id && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        學號: {child.student_id}
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8 text-gray-500">
                            <p className="font-pixel text-sm">尚無註冊的孩子</p>
                            <p className="text-xs mt-2">請家長先建立孩子帳號</p>
                        </div>
                    )}
                </div>

                {/* Parent Button */}
                <div className="border-t-2 border-deep-black pt-6">
                    <RPGButton
                        onClick={handleParentClick}
                        className="w-full"
                        variant="secondary"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <User size={20} />
                            <span>🔐 我是家長</span>
                        </div>
                    </RPGButton>
                </div>
            </div>

            {/* Parent Password Dialog */}
            <RPGDialog
                isOpen={showParentDialog}
                onClose={() => {
                    setShowParentDialog(false);
                    setParentPassword('');
                    setError('');
                }}
                title="家長驗證"
            >
                <form onSubmit={handleParentLogin} className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                        請輸入家長密碼以進入管理介面
                    </p>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="tel"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                maxLength={4}
                                value={parentPassword}
                                onChange={(e) => {
                                    // Only allow numbers
                                    const val = e.target.value.replace(/\D/g, '');
                                    setParentPassword(val);
                                    setError('');
                                }}
                                className="w-full pl-12 pr-4 py-3 border-2 border-deep-black text-sm tracking-widest text-center text-2xl font-pixel"
                                placeholder="請輸入4位數 PIN 碼"
                                autoFocus
                                required
                            />
                        </div>
                        {error && (
                            <p className="mt-2 text-sm text-red-600 font-pixel">❌ {error}</p>
                        )}
                    </div>

                    <RPGButton type="submit" className="w-full">
                        <span>確認</span>
                    </RPGButton>
                </form>
            </RPGDialog>
        </div>
    );
};
