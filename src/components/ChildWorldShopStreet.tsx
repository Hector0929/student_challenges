import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { useFamilyBankSettings, useFamilyExchangeRates, DEFAULT_FAMILY_BANK_SETTINGS, DEFAULT_FAMILY_EXCHANGE_RATES } from '../hooks/useFamilyShopSettings';
import { useSaveWorldPersistence, useWorldPersistence } from '../hooks/useWorldPersistence';
import { useWorldBanking } from '../hooks/useWorldBanking';
import { useWorldExchange } from '../hooks/useWorldExchange';
import { supabase } from '../lib/supabase';
import { calculateExchangePreview, exchangeSelectedResources, type ExchangePriceTable } from '../lib/world/exchangeShop';
import { INITIAL_WORLD_LAB_STATE, type WorldLabState } from '../hooks/useWorldState';
import { ChildWorldBankPanel } from './ChildWorldBankPanel';
import { WorldExchangePanel } from './WorldExchangePanel';

interface ChildWorldShopStreetProps {
    userId: string;
    starBalance: number;
}

export const ChildWorldShopStreet: React.FC<ChildWorldShopStreetProps> = ({ userId, starBalance }) => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { data: familyExchangeRates } = useFamilyExchangeRates(user?.family_id);
    const { data: familyBankSettings } = useFamilyBankSettings(user?.family_id);
    const { data: persistedWorldSnapshot, isLoading: isWorldLoading } = useWorldPersistence(userId);
    const saveWorldPersistence = useSaveWorldPersistence(userId);
    const [worldLab, setWorldLab] = useState<WorldLabState>(INITIAL_WORLD_LAB_STATE);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        if (persistedWorldSnapshot?.worldLab) {
            setWorldLab(persistedWorldSnapshot.worldLab);
        }
    }, [persistedWorldSnapshot]);

    const bankSettings = useMemo(() => ({
        demandDailyRate: familyBankSettings?.demand_daily_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.demand_daily_rate,
        timeDepositDailyRate: familyBankSettings?.time_deposit_daily_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.time_deposit_daily_rate,
        minTimeDepositDays: familyBankSettings?.min_time_deposit_days ?? DEFAULT_FAMILY_BANK_SETTINGS.min_time_deposit_days,
        earlyWithdrawPenaltyRate: familyBankSettings?.early_withdraw_penalty_rate ?? DEFAULT_FAMILY_BANK_SETTINGS.early_withdraw_penalty_rate,
    }), [familyBankSettings]);

    const exchangePriceTable: ExchangePriceTable = useMemo(() => ({
        wood: familyExchangeRates?.wood_rate ?? DEFAULT_FAMILY_EXCHANGE_RATES.wood_rate,
        stone: familyExchangeRates?.stone_rate ?? DEFAULT_FAMILY_EXCHANGE_RATES.stone_rate,
        crystal: familyExchangeRates?.crystal_rate ?? DEFAULT_FAMILY_EXCHANGE_RATES.crystal_rate,
    }), [familyExchangeRates]);

    const bestSellingResource = useMemo(() => {
        const entries = [
            { key: 'wood', label: '木材', price: exchangePriceTable.wood },
            { key: 'stone', label: '石材', price: exchangePriceTable.stone },
            { key: 'crystal', label: '晶礦', price: exchangePriceTable.crystal },
        ];

        return entries.reduce((best, entry) => entry.price > best.price ? entry : best, entries[0]);
    }, [exchangePriceTable]);

    const demandRateLabel = `${(bankSettings.demandDailyRate * 100).toFixed(2)}%`;
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
        } catch (error) {
            console.error('Failed to adjust stars for child world shop street', error);
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

    const getExchangePreview = (selectedResources: { wood: number; stone: number; crystal: number; }) => {
        return calculateExchangePreview({
            currentResources: worldLab.resources,
            selectedResources,
            marketLevel: worldLab.buildings.market,
            basePrices: exchangePriceTable,
        });
    };

    const exchangeSelectedResourcesToStars = async (selectedResources: { wood: number; stone: number; crystal: number; }) => {
        let exchangeResult;

        try {
            exchangeResult = exchangeSelectedResources({
                currentResources: worldLab.resources,
                selectedResources,
                marketLevel: worldLab.buildings.market,
                basePrices: exchangePriceTable,
            });
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : '資源兌換失敗' };
        }

        if (exchangeResult.starsEarned <= 0) {
            return { ok: false, error: '請先輸入要賣出的資源數量' };
        }

        const ok = await adjustStars(exchangeResult.starsEarned, `世界商店街資源兌換（Market Lv.${worldLab.buildings.market}）`);
        if (!ok) {
            return { ok: false, error: '資源兌換失敗' };
        }

        const nextWorldLab: WorldLabState = {
            ...worldLab,
            heroLevel: worldLab.heroLevel + (exchangeResult.starsEarned >= 50 ? 1 : 0),
            heroPower: worldLab.heroPower + Math.floor(exchangeResult.starsEarned * 0.6),
            resources: exchangeResult.remainingResources,
        };

        setWorldLab(nextWorldLab);
        await saveWorldPersistence.mutateAsync({
            worldLab: nextWorldLab,
            activeAdventure: persistedWorldSnapshot?.activeAdventure ?? null,
            lastAdventureResult: persistedWorldSnapshot?.lastAdventureResult ?? null,
        });

        return { ok: true, starsEarned: exchangeResult.starsEarned };
    };

    const { exchangeLogs, exchangeResources } = useWorldExchange({
        userId,
        marketLevel: worldLab.buildings.market,
        getExchangePreview,
        exchangeSelectedResourcesToStars,
    });

    const setFlashMessage = (text: string) => {
        setMessage(text);
        window.setTimeout(() => setMessage(''), 2200);
    };

    if (isWorldLoading || isBankLoading) {
        return <div className="text-sm text-gray-500 py-6">商店街載入中...</div>;
    }

    return (
        <div className="space-y-4">
            {message && (
                <div role="status" aria-live="polite" className="px-3 py-2 rounded-xl bg-white border-2 border-indigo-100 text-sm font-heading shadow-sm">
                    {message}
                </div>
            )}

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl border border-emerald-200 bg-white p-3">
                        <div className="font-heading font-bold text-emerald-900">最划算資源</div>
                        <div className="mt-1 text-emerald-800">今天單價最高的是 {bestSellingResource.label}，每單位 {bestSellingResource.price.toFixed(3)} ⭐。</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-white p-3">
                        <div className="font-heading font-bold text-amber-900">銀行提醒</div>
                        <div className="mt-1 text-amber-800">活存目前有 {demandDepositAccount.balance} ⭐，想慢慢存就先放活存，想鎖定收益就開定存。</div>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-white p-3">
                        <div className="font-heading font-bold text-sky-900">今天進度</div>
                        <div className="mt-1 text-sky-800">{exchangeLogs.length === 0 ? '今天還沒有兌換紀錄，先試著賣出一點資源吧。' : `今天已完成 ${exchangeLogs.length} 筆兌換，可繼續調整資源配置。`}</div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">🌲 木材：{Math.floor(worldLab.resources.wood)}</div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">🪨 石材：{Math.floor(worldLab.resources.stone)}</div>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">💎 晶礦：{Math.floor(worldLab.resources.crystal)}</div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">🏪 商店倍率：x{(1 + worldLab.buildings.market * 0.08).toFixed(2)}</div>
                </div>
            </div>

            <WorldExchangePanel
                currentResources={worldLab.resources}
                basePrices={exchangePriceTable}
                marketMultiplier={1 + worldLab.buildings.market * 0.08}
                onPreviewExchange={getExchangePreview}
                onConfirmExchange={async (selectedResources) => {
                    const result = await exchangeResources(selectedResources);
                    if (!result.ok && result.error) {
                        setFlashMessage(`❌ ${result.error}`);
                        return;
                    }
                    if (typeof result.starsEarned === 'number') {
                        setFlashMessage(`🎉 兌換成功：+${result.starsEarned} ⭐`);
                    }
                }}
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <h4 className="font-pixel text-base">🧾 最近兌換紀錄</h4>
                        <p className="text-xs text-amber-700 mt-1">保留最近的資源兌換紀錄</p>
                    </div>
                </div>
                {exchangeLogs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-amber-300 bg-white p-4 text-sm text-amber-700">目前還沒有兌換紀錄</div>
                ) : (
                    <div className="space-y-2">
                        {exchangeLogs.map((log) => (
                            <div key={log.id ?? `${log.created_at}-${log.stars_earned}`} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <div className="font-heading font-bold text-amber-900">+{log.stars_earned} ⭐</div>
                                    <div className="text-xs text-amber-700">{log.created_at ? new Date(log.created_at).toLocaleString('zh-TW') : '剛剛'}</div>
                                </div>
                                <div className="text-xs text-gray-600">賣出：🌲 {log.sold_wood} / 🪨 {log.sold_stone} / 💎 {log.sold_crystal}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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