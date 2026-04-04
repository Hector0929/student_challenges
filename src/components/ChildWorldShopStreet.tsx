import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { useFamilyBankSettings, useFamilyExchangeRates, DEFAULT_FAMILY_BANK_SETTINGS, DEFAULT_FAMILY_EXCHANGE_RATES } from '../hooks/useFamilyShopSettings';
import { useWorldBanking } from '../hooks/useWorldBanking';
import { supabase } from '../lib/supabase';
import { ChildWorldBankPanel } from './ChildWorldBankPanel';

interface ChildWorldShopStreetProps {
    userId: string;
    starBalance: number;
}

export const ChildWorldShopStreet: React.FC<ChildWorldShopStreetProps> = ({ userId, starBalance }) => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { data: familyExchangeRates } = useFamilyExchangeRates(user?.family_id);
    const { data: familyBankSettings } = useFamilyBankSettings(user?.family_id);

    const [message, setMessage] = useState<string>('');

    const bankSettings = useMemo(() => ({
        demandDailyRate:         familyBankSettings?.demand_daily_rate          ?? DEFAULT_FAMILY_BANK_SETTINGS.demand_daily_rate,
        timeDepositDailyRate:    familyBankSettings?.time_deposit_daily_rate    ?? DEFAULT_FAMILY_BANK_SETTINGS.time_deposit_daily_rate,
        minTimeDepositDays:      familyBankSettings?.min_time_deposit_days      ?? DEFAULT_FAMILY_BANK_SETTINGS.min_time_deposit_days,
        earlyWithdrawPenaltyRate:familyBankSettings?.early_withdraw_penalty_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.early_withdraw_penalty_rate,
    }), [familyBankSettings]);

    const exchangePriceTable = useMemo(() => ({
        wood:    familyExchangeRates?.wood_rate    ?? DEFAULT_FAMILY_EXCHANGE_RATES.wood_rate,
        stone:   familyExchangeRates?.stone_rate   ?? DEFAULT_FAMILY_EXCHANGE_RATES.stone_rate,
        crystal: familyExchangeRates?.crystal_rate ?? DEFAULT_FAMILY_EXCHANGE_RATES.crystal_rate,
    }), [familyExchangeRates]);

    const bestSellingResource = useMemo(() => {
        const entries = [
            { key: 'wood',    label: '木材', price: exchangePriceTable.wood    },
            { key: 'stone',   label: '石材', price: exchangePriceTable.stone   },
            { key: 'crystal', label: '晶礦', price: exchangePriceTable.crystal },
        ];
        return entries.reduce((best, e) => e.price > best.price ? e : best, entries[0]);
    }, [exchangePriceTable]);

    const demandRateLabel      = `${(bankSettings.demandDailyRate * 100).toFixed(2)}%`;
    const timeDepositRateLabel = `${(bankSettings.timeDepositDailyRate * 100).toFixed(2)}%`;

    const adjustStars = async (amount: number, description: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('star_transactions')
                .insert({
                    user_id: userId,
                    amount,
                    type: amount >= 0 ? 'earn' : 'spend',
                    description,
                    game_id: 'world-shop-street',
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
        return <div className="text-sm text-gray-500 py-6">商店街載入中...</div>;
    }

    return (
        <div className="space-y-4">
            {message && (
                <div role="status" aria-live="polite" className="px-3 py-2 rounded-xl bg-white border-2 border-indigo-100 text-sm font-heading shadow-sm">
                    {message}
                </div>
            )}

            {/* 今日商店街攻略 */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                        <h3 className="font-heading text-lg font-bold text-emerald-900">🧭 今日商店街攻略</h3>
                        <p className="text-sm text-emerald-700 mt-1">先看賣價、再決定要不要存進銀行，孩子更容易理解今天該做什麼。</p>
                    </div>
                    <div className="rounded-xl border border-white bg-white/80 px-3 py-2 text-xs text-slate-700 shadow-sm">
                        活存 {demandRateLabel} ／ 定存 {timeDepositRateLabel}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-emerald-200 bg-white p-3">
                        <div className="font-heading font-bold text-emerald-900">最划算資源</div>
                        <div className="mt-1 text-emerald-800">
                            今天單價最高的是 {bestSellingResource.label}，每單位 {bestSellingResource.price.toFixed(3)} ⭐。
                        </div>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-white p-3">
                        <div className="font-heading font-bold text-sky-900">💡 島嶼管理</div>
                        <div className="mt-1 text-sky-800">
                            在 3D 世界右上角點「🛍️」可升級建築、補給資源、佈置裝飾和兌換星星。
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank panel */}
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
                    if (!result.ok) { setFlashMessage(`❌ ${result.error}`); return; }
                    setFlashMessage(result.interestEarned && result.interestEarned > 0
                        ? `💹 活存結息 +${result.interestEarned} ⭐`
                        : '💹 今天沒有新增利息');
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
