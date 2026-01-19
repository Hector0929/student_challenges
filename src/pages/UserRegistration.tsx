import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';
import type { Profile } from '../types/database';

interface UserRegistrationProps {
    onRegister: (profile: Omit<Profile, 'id' | 'created_at'>) => Promise<void>;
}

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onRegister }) => {
    const [name, setName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [role, setRole] = useState<'child' | 'parent'>('child');

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('請輸入名字');
            return;
        }

        if (role === 'child' && !studentId.trim()) {
            alert('請輸入學號');
            return;
        }

        setIsLoading(true);
        try {
            await onRegister({
                role,
                name: name.trim(),
                student_id: role === 'child' ? studentId.trim() : undefined,
            });
        } catch (error) {
            console.error('Registration failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-off-white flex items-center justify-center p-4">
            <div className="rpg-dialog max-w-md w-full animate-bounce-in">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">👾</div>
                    <h1 className="font-pixel text-2xl mb-2">每日怪獸挑戰</h1>
                    <p className="text-xs text-gray-600">Daily QuestMon</p>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Role Selection */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">選擇身份 *</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setRole('child')}
                                className={`
                  px-4 py-3 font-pixel text-xs border-4 border-deep-black
                  transition-all
                  ${role === 'child'
                                        ? 'bg-pokeball-red text-white'
                                        : 'bg-white text-deep-black hover:bg-gray-100'
                                    }
                `}
                            >
                                🎮 玩家
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('parent')}
                                className={`
                  px-4 py-3 font-pixel text-xs border-4 border-deep-black
                  transition-all
                  ${role === 'parent'
                                        ? 'bg-pokeball-red text-white'
                                        : 'bg-white text-deep-black hover:bg-gray-100'
                                    }
                `}
                            >
                                🛡️ 家長
                            </button>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="block font-pixel text-xs mb-2">名字 *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border-4 border-deep-black text-sm"
                            placeholder="請輸入你的名字"
                            required
                        />
                    </div>

                    {/* Student ID Input (only for children) */}
                    {role === 'child' && (
                        <div>
                            <label className="block font-pixel text-xs mb-2">學號 *</label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="w-full px-3 py-2 border-4 border-deep-black text-sm"
                                placeholder="請輸入學號"
                                required
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <RPGButton type="submit" className="w-full" disabled={isLoading}>
                        <div className="flex items-center justify-center gap-2">
                            <UserPlus size={16} />
                            <span>{isLoading ? '處理中...' : '開始冒險！'}</span>
                        </div>
                    </RPGButton>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t-2 border-deep-black">
                    <p className="text-xs text-center text-gray-600">
                        {role === 'child'
                            ? '註冊後即可開始挑戰每日任務！'
                            : '家長可以管理任務並審核完成狀態'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};
