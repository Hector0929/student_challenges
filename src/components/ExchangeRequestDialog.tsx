import React, { useState } from 'react';
import { ArrowRight, Coins, AlertCircle } from 'lucide-react';
import { RPGDialog } from './RPGDialog';
import { RPGButton } from './RPGButton';
import { useFamilySettings } from '../hooks/useFamilySettings';
import { useCreateExchangeRequest } from '../hooks/useExchangeRequests';
import { useStarBalance } from '../hooks/useQuests';
import { useUser } from '../contexts/UserContext';

interface ExchangeRequestDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExchangeRequestDialog: React.FC<ExchangeRequestDialogProps> = ({
    isOpen,
    onClose,
}) => {
    const { user } = useUser();
    const { data: settings } = useFamilySettings();
    const { data: balance = 0 } = useStarBalance(user?.id || '');
    const createExchangeMutation = useCreateExchangeRequest();

    const [starAmount, setStarAmount] = useState<number | string>(10);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const exchangeRate = settings?.star_to_twd_rate || 1;
    const numericStarAmount = Number(starAmount) || 0;
    const twdAmount = numericStarAmount * exchangeRate;
    const isValidAmount = numericStarAmount > 0 && numericStarAmount <= balance;

    // Reset state when dialog opens
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setStarAmount(Math.min(10, balance));
            setError('');
            setSuccess(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (numericStarAmount <= 0) {
            setError('請輸入有效的星幣數量');
            return;
        }

        if (numericStarAmount > balance) {
            setError('星幣餘額不足');
            return;
        }

        try {
            await createExchangeMutation.mutateAsync({
                starAmount: numericStarAmount,
                twdAmount,
                exchangeRate,
            });
            setSuccess(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : '提交失敗';
            setError(message);
        }
    };

    const handleClose = () => {
        setSuccess(false);
        setError('');
        onClose();
    };

    // Success state
    if (success) {
        return (
            <RPGDialog isOpen={isOpen} onClose={handleClose} title="🎉 申請已送出">
                <div className="text-center py-4">
                    <div className="text-6xl mb-4 animate-bounce">📨</div>
                    <p className="font-pixel text-lg mb-2">兌換申請已送出！</p>
                    <p className="text-sm text-gray-600 mb-4">
                        等待爸爸媽媽審核後，星幣就會扣除囉～
                    </p>
                    <div className="bg-yellow-50 border-4 border-yellow-200 rounded-2xl p-4 inline-block shadow-inner">
                        <p className="font-pixel" style={{ color: 'var(--color-cta)' }}>
                            ⭐ {starAmount} 星 → 💰 {twdAmount.toFixed(0)} 元
                        </p>
                    </div>
                </div>
                <div className="mt-6">
                    <RPGButton onClick={handleClose} className="w-full">
                        知道了！
                    </RPGButton>
                </div>
            </RPGDialog>
        );
    }

    return (
        <RPGDialog isOpen={isOpen} onClose={handleClose} title="💱 兌換星幣">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Balance */}
                <div className="bg-white/80 border-2 border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-clay">
                    <span className="font-pixel text-xs" style={{ color: 'var(--color-text-muted)' }}>目前餘額</span>
                    <span className="font-pixel text-lg flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
                        <Coins size={16} className="text-yellow-500" />
                        {balance} 星幣
                    </span>
                </div>

                {/* Exchange Rate Info */}
                <div className="bg-yellow-50 border-4 border-dashed border-yellow-200 rounded-2xl p-3 text-center">
                    <span className="font-pixel text-xs" style={{ color: 'var(--color-cta)' }}>
                        目前匯率：⭐ 1 星 = 💰 {exchangeRate} 元
                    </span>
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block font-pixel text-sm mb-2">
                        想兌換多少星幣？
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={starAmount}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d+$/.test(v)) {
                                setStarAmount(v === '' ? '' : parseInt(v, 10));
                            }
                        }}
                        onBlur={() => {
                            if (starAmount === '' || Number(starAmount) <= 0) {
                                setStarAmount(1);
                            }
                        }}
                        className="w-full px-4 py-3 border-4 border-indigo-100 rounded-2xl text-center text-2xl font-pixel outline-none focus:border-indigo-300 transition-colors shadow-inner"
                        min={1}
                        max={balance}
                    />
                    {/* Quick select buttons */}
                    <div className="flex gap-2 mt-2">
                        {[10, 50, 100].filter(v => v <= balance).map(value => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStarAmount(value)}
                                className={`flex-1 py-2 border-4 rounded-xl font-pixel text-xs transition-all active:scale-95 ${starAmount === value
                                    ? 'bg-yellow-400 border-yellow-500 text-white'
                                    : 'bg-white border-indigo-50 text-indigo-400 hover:bg-indigo-50'
                                    }`}
                            >
                                {value} 星
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setStarAmount(balance)}
                            className={`flex-1 py-2 border-4 rounded-xl font-pixel text-xs transition-all active:scale-95 ${starAmount === balance
                                ? 'bg-yellow-400 border-yellow-500 text-white'
                                : 'bg-white border-indigo-50 text-indigo-400 hover:bg-indigo-50'
                                }`}
                        >
                            全部
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="bg-white/80 border-4 border-indigo-50 rounded-3xl p-6 flex items-center justify-center gap-6 shadow-inner">
                    <div className="text-center">
                        <div className="text-3xl mb-1">⭐</div>
                        <div className="font-pixel text-xl" style={{ color: 'var(--color-text)' }}>{starAmount}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>星幣</div>
                    </div>
                    <ArrowRight size={24} className="text-indigo-200" />
                    <div className="text-center">
                        <div className="text-3xl mb-1">💰</div>
                        <div className="font-pixel text-xl" style={{ color: 'var(--color-primary)' }}>{twdAmount.toFixed(0)}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>元</div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border-2 border-red-400 p-3 flex items-center gap-2 text-red-600">
                        <AlertCircle size={16} />
                        <span className="font-pixel text-sm">{error}</span>
                    </div>
                )}

                {/* Submit Button */}
                <RPGButton
                    type="submit"
                    className="w-full"
                    disabled={!isValidAmount || createExchangeMutation.isPending}
                >
                    {createExchangeMutation.isPending ? '送出中...' : '🚀 送出申請'}
                </RPGButton>

                <p className="text-xs text-gray-500 text-center">
                    送出後需要爸爸媽媽同意才會扣款喔！
                </p>
            </form>
        </RPGDialog>
    );
};
