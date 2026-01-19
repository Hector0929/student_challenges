import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { RPGButton } from '../components/RPGButton';

interface FamilyPasswordGuardProps {
    onAuthenticated: () => void;
}

export const FamilyPasswordGuard: React.FC<FamilyPasswordGuardProps> = ({ onAuthenticated }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const correctPassword = import.meta.env.VITE_FAMILY_PASSWORD;

        if (!correctPassword) {
            setError('系統未設定家庭密碼，請聯絡管理員');
            return;
        }

        if (password === correctPassword) {
            // Store verification in sessionStorage (clears when browser closes)
            sessionStorage.setItem('family-auth', 'verified');
            onAuthenticated();
        } else {
            setError('密碼錯誤，請重試');
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-pokeball-red to-pink-100 flex items-center justify-center p-4">
            <div className="rpg-dialog max-w-md w-full animate-bounce-in">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">🏠</div>
                    <h1 className="font-pixel text-2xl mb-2">歡迎回家</h1>
                    <p className="text-sm text-gray-600">請輸入家庭密碼</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                className="w-full pl-12 pr-4 py-3 border-2 border-deep-black text-sm"
                                placeholder="輸入家庭密碼"
                                autoFocus
                                required
                            />
                        </div>
                        {error && (
                            <p className="mt-2 text-sm text-red-600 font-pixel">❌ {error}</p>
                        )}
                    </div>

                    <RPGButton type="submit" className="w-full">
                        <span>進入</span>
                    </RPGButton>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        忘記密碼？請詢問爸爸媽媽 👨‍👩‍👧‍👦
                    </p>
                </div>
            </div>
        </div>
    );
};
