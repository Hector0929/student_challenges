import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { useFamilyBankSettings, DEFAULT_FAMILY_BANK_SETTINGS } from '../hooks/useFamilyShopSettings';
import { useWorldBanking } from '../hooks/useWorldBanking';
import { supabase } from '../lib/supabase';
import { ChildWorldBankPanel } from './ChildWorldBankPanel';

interface StarBankProps {
    userId: string;
    starBalance: number;
}

/** 星幣銀行：活存、定存與利息（從原本的世界商店街獨立出來） */
export const StarBank: React.FC<StarBankProps> = ({ userId, starBalance }) => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { data: familyBankSettings } = useFamilyBankSettings(user?.family_id);

    const [message, setMessage] = useState<string>('');

    const bankSettings = useMemo(
        () => ({
            demandDailyRate: familyBankSettings?.demand_daily_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.demand_daily_rate,
            timeDepositDailyRate: familyBankSettings?.time_deposit_daily_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.time_deposit_daily_rate,
            minTimeDepositDays: familyBankSettings?.min_time_deposit_days ?? DEFAULT_FAMILY_BANK_SETTINGS.min_time_deposit_days,
            earlyWithdrawPenaltyRate: familyBankSettings?.early_withdraw_penalty_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.early_withdraw_penalty_rate,
        }),
        [familyBankSettings],
    );

    const adjustStars = async (amount: number, description: string): Promise<boolean> => {
        try {
            const { error } = await supabase.from('star_transactions').insert({
                user_id: userId,
                amount,
                type: amount >= 0 ? 'earn' : 'spend',
                description,
                game_id: 'star-bank',
            });
            if (error) throw error;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['star_balance', userId] }),
                queryClient.invalidateQueries({ queryKey: ['star_transactions'] }),
            ]);
            return true;
        } catch (err) {
            console.error('Failed to adjust stars', err);
            return false;
        }
    };

    const {
        bankNowMs,
        demandDepositAccount,
        timeDeposits,
        settleDemandInterest,
        depositDemand,
        withdrawDemand,
        createTimeDeposit,
        claimTimeDeposit,
        cancelTimeDeposit,
        isLoading: isBankLoading,
    } = useWorldBanking({
        userId,
        starBalance,
        onAdjustStars: adjustStars,
        bankSettings,
        timeMode: 'realtime',
    });

    const setFlashMessage = (text: string) => {
        setMessage(text);
        window.setTimeout(() => setMessage(''), 2200);
    };

    if (isBankLoading) {
        return <div className="text-sm text-ink-soft py-6">銀行載入中…</div>;
    }

    return (
        <div className="space-y-4">
            {message && (
                <div role="status" aria-live="polite" className="px-3 py-2 rounded-control bg-white border-2 border-line text-sm font-heading shadow-soft">
                    {message}
                </div>
            )}

            <ChildWorldBankPanel
                starBalance={starBalance}
                bankNowIso={new Date(bankNowMs).toISOString()}
                bankSettings={bankSettings}
                demandDepositAccount={demandDepositAccount}
                timeDeposits={timeDeposits}
                onDepositDemand={async (amount) => {
                    const result = await depositDemand(amount);
                    setFlashMessage(result.ok ? '🏦 已存入活存' : `❌ ${result.error}`);
                }}
                onWithdrawDemand={async (amount) => {
                    const result = await withdrawDemand(amount);
                    setFlashMessage(result.ok ? '💸 已提領活存' : `❌ ${result.error}`);
                }}
                onSettleDemandInterest={async () => {
                    const result = await settleDemandInterest();
                    if (!result.ok) {
                        setFlashMessage(`❌ ${result.error}`);
                        return;
                    }
                    setFlashMessage(result.interestEarned && result.interestEarned > 0 ? `💹 活存結息 +${result.interestEarned} ⭐` : '💹 今天沒有新增利息');
                }}
                onCreateTimeDeposit={async (amount) => {
                    const result = await createTimeDeposit(amount);
                    setFlashMessage(result.ok ? '🔒 已建立定存' : `❌ ${result.error}`);
                }}
                onClaimTimeDeposit={async (index) => {
                    const result = await claimTimeDeposit(index);
                    setFlashMessage(result.ok ? `🎁 領取成功 +${result.payout ?? 0} ⭐` : `❌ ${result.error}`);
                }}
                onCancelTimeDeposit={async (index) => {
                    const result = await cancelTimeDeposit(index);
                    setFlashMessage(result.ok ? `⚠️ 已提前解約，返還 ${result.payout ?? 0} ⭐` : `❌ ${result.error}`);
                }}
            />
        </div>
    );
};
