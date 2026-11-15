import React, { useState } from 'react';
import { Lock, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrors';

interface ResetPasswordProps {
    /** 設定完成（或取消）後回到一般流程 */
    onDone: () => void;
}

/** 從「重設密碼」信件連結回來時顯示：設定新密碼 */
export const ResetPassword: React.FC<ResetPasswordProps> = ({ onDone }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('兩次輸入的密碼不一樣，請再確認一次。');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setDone(true);
        } catch (err) {
            setError(authErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #B8E0F6 0%, #E8F4FC 100%)' }}>
            <div className="clay-card w-full max-w-md p-6 sm:p-8" style={{ borderRadius: '32px' }}>
                <div className="text-center mb-6">
                    <img src="/mascot.webp" alt="" className="w-20 h-20 mx-auto mb-2 drop-shadow-lg" />
                    <h1 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>設定新密碼</h1>
                </div>

                {done ? (
                    <div className="space-y-4 text-center">
                        <p className="font-body" style={{ color: 'var(--color-text)' }}>密碼已更新，之後請用新密碼登入。</p>
                        <button type="button" onClick={onDone} className="clay-btn w-full py-3 font-heading cursor-pointer" style={{ borderRadius: '16px' }}>
                            繼續
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {[
                            { id: 'new-password', label: '新密碼（至少 6 個字元）', value: password, set: setPassword },
                            { id: 'confirm-password', label: '再輸入一次', value: confirm, set: setConfirm },
                        ].map((f) => (
                            <div key={f.id}>
                                <label htmlFor={f.id} className="block font-heading text-sm mb-2" style={{ color: 'var(--color-text)' }}>{f.label}</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    <input id={f.id} type="password" autoComplete="new-password" minLength={6} required value={f.value} onChange={(e) => f.set(e.target.value)} className="clay-input" placeholder="••••••••" />
                                </div>
                            </div>
                        ))}
                        {error && (
                            <div role="alert" className="font-body text-sm p-3 rounded-xl" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-danger)', border: '2px solid var(--color-danger)' }}>
                                {error}
                            </div>
                        )}
                        <button type="submit" disabled={loading} className="clay-btn w-full py-4 font-heading cursor-pointer flex items-center justify-center gap-2" style={{ borderRadius: '16px' }}>
                            {loading ? '處理中...' : <>更新密碼 <KeyRound size={18} /></>}
                        </button>
                        <button type="button" onClick={onDone} className="w-full text-sm font-body text-sky-700 hover:underline cursor-pointer">
                            先不要，回到首頁
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
