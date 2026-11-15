import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

/** 家長還在用預設 PIN（0000）或沒有 PIN 時，進家長模式前先強制設定新的 4 位數 PIN（判斷見 lib/pin.ts） */
export const ForcePinSetup: React.FC = () => {
    const { user, setUser, lockParent } = useUser();
    const [pin, setPin] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (pin.length !== 4) return setError('PIN 要是 4 位數字。');
        if (pin === '0000') return setError('請不要用 0000，換一組孩子猜不到的數字。');
        if (pin !== confirm) return setError('兩次輸入的 PIN 不一樣。');
        if (!user) return;
        setSaving(true);
        try {
            const { data, error } = await supabase.from('profiles').update({ pin_code: pin }).eq('id', user.id).select().single();
            if (error) throw error;
            if (data) setUser(data);
        } catch (err) {
            console.error('Failed to set PIN:', err);
            setError('儲存失敗，請再試一次。');
        } finally {
            setSaving(false);
        }
    };

    const input = (id: string, label: string, value: string, set: (v: string) => void, autoFocus = false) => (
        <div>
            <label htmlFor={id} className="block font-heading text-sm mb-2 text-ink">{label}</label>
            <input
                id={id}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => set(digits(e.target.value))}
                className="w-full px-4 py-3 text-2xl font-heading text-center tracking-[0.5em]"
                style={{ backgroundColor: 'var(--bg-card)', border: '3px solid var(--border-card)', borderRadius: '16px', color: 'var(--color-text)' }}
                placeholder="● ● ● ●"
                required
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true" aria-labelledby="force-pin-title">
            <form onSubmit={handleSubmit} className="clay-card w-full max-w-md p-6 space-y-4 rounded-card">
                <div className="text-center">
                    <ShieldCheck size={40} className="mx-auto mb-2 text-amber-500" />
                    <h2 id="force-pin-title" className="font-heading text-xl font-bold text-ink">先設定新的家長 PIN</h2>
                    <p className="font-body text-sm mt-2 text-ink-soft">
                        家長模式可以審核任務、調整星幣。設定一組孩子猜不到的 4 位數字，之後進家長模式都要輸入它。
                    </p>
                </div>
                {input('new-pin', '新的 PIN', pin, setPin, true)}
                {input('confirm-pin', '再輸入一次', confirm, setConfirm)}
                {error && <p role="alert" className="text-center font-body text-sm text-danger">{error}</p>}
                <div className="flex gap-3">
                    <button type="button" onClick={lockParent} className="flex-1 clay-btn-secondary py-3 font-heading cursor-pointer rounded-control">
                        離開家長模式
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 clay-btn py-3 font-heading cursor-pointer rounded-control">
                        {saving ? '儲存中...' : '儲存'}
                    </button>
                </div>
            </form>
        </div>
    );
};
