import React, { useState, useEffect } from 'react';
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

    const [starAmount, setStarAmount] = useState(10);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const exchangeRate = settings?.star_to_twd_rate || 1;
    const twdAmount = starAmount * exchangeRate;
    const isValidAmount = starAmount > 0 && starAmount <= balance;

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setStarAmount(Math.min(10, balance));
            setError('');
            setSuccess(false);
        }
    }, [isOpen, balance]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (starAmount <= 0) {
            setError('請輸入有效的星幣數量');
            return;
        }

        if (starAmount > balance) {
            setError('星幣餘額不足');
            return;
        }

        try {
            await createExchangeMutation.mutateAsync({
                starAmount,
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
                    <div className="bg-yellow-100 border-2 border-deep-black p-3 inline-block">
                        <p className="font-pixel">
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
                <div className="bg-gray-100 border-2 border-deep-black p-3 flex items-center justify-between">
                    <span className="font-pixel text-sm">目前餘額</span>
                    <span className="font-pixel text-lg flex items-center gap-1">
                        <Coins size={16} className="text-yellow-500" />
                        {balance} 星幣
                    </span>
                </div>

                {/* Exchange Rate Info */}
                <div className="bg-yellow-50 border-2 border-yellow-400 p-3 text-center">
                    <span className="font-pixel text-sm">
                        目前匯率：⭐ 1 星 = 💰 {exchangeRate} 元
                    </span>
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block font-pixel text-sm mb-2">
                        想兌換多少星幣？
                    </label>
                    <input
                        type="number"
                        value={starAmount}
                        onChange={(e) => setStarAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border-2 border-deep-black text-center text-2xl font-pixel"
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
                                className={`flex-1 py-2 border-2 border-deep-black font-pixel text-sm transition-colors ${starAmount === value
                                    ? 'bg-yellow-400'
                                    : 'bg-white hover:bg-gray-100'
                                    }`}
                            >
                                {value} 星
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setStarAmount(balance)}
                            className={`flex-1 py-2 border-2 border-deep-black font-pixel text-sm transition-colors ${starAmount === balance
                                ? 'bg-yellow-400'
                                : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            全部
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="bg-white border-2 border-deep-black p-4 flex items-center justify-center gap-4">
                    <div className="text-center">
                        <div className="text-2xl">⭐</div>
                        <div className="font-pixel text-xl">{starAmount}</div>
                        <div className="text-xs text-gray-500">星幣</div>
                    </div>
                    <ArrowRight size={24} className="text-gray-400" />
                    <div className="text-center">
                        <div className="text-2xl">💰</div>
                        <div className="font-pixel text-xl">{twdAmount.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">元</div>
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
