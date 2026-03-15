import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { useFamilyBankSettings, useFamilyExchangeRates, DEFAULT_FAMILY_BANK_SETTINGS, DEFAULT_FAMILY_EXCHANGE_RATES } from '../hooks/useFamilyShopSettings';
import { useSaveWorldPersistence, useWorldPersistence } from '../hooks/useWorldPersistence';
import { useWorldBanking } from '../hooks/useWorldBanking';
import { useWorldExchange } from '../hooks/useWorldExchange';
import { supabase } from '../lib/supabase';
import { calculateExchangePreview, exchangeSelectedResources, type ExchangePriceTable } from '../lib/world/exchangeShop';
import { INITIAL_WORLD_LAB_STATE, settleWorldState, type WorldLabState, type WorldBuildingKey } from '../hooks/useWorldState';
import { ChildWorldBankPanel } from './ChildWorldBankPanel';
import { World3D } from './World3D';
import { WorldExchangePanel } from './WorldExchangePanel';

const BUILDING_UPGRADE_CARDS: Array<{
    key: WorldBuildingKey;
    title: string;
    emoji: string;
    description: string;
    unlockHint: string;
}> = [
    {
        key: 'forest',
        title: '伐木場',
        emoji: '🌲',
        description: '提升木材自動產量，也會讓森林地塊看起來更完整。',
        unlockHint: '島 Lv.2 會正式解鎖森林地塊外圈。',
    },
    {
        key: 'mine',
        title: '採礦場',
        emoji: '⛏️',
        description: '提升石材產量，後續也會帶動晶礦取得。',
        unlockHint: '島 Lv.3 解鎖礦山地塊。',
    },
    {
        key: 'market',
        title: '交易所',
        emoji: '🏪',
        description: '提高資源兌換倍率，讓賣資源更划算。',
        unlockHint: '島 Lv.4 解鎖商業地塊。',
    },
    {
        key: 'academy',
        title: '訓練所',
        emoji: '🧙',
        description: '提升整體發展效率，後續也會支援角色成長。',
        unlockHint: '島 Lv.5 解鎖訓練地塊。',
    },
];

const PLOT_PROGRESS_STEPS = [
    { level: 2, label: '森林地塊', emoji: '🌲' },
    { level: 3, label: '礦山地塊', emoji: '⛰️' },
    { level: 4, label: '商業地塊', emoji: '🏪' },
    { level: 5, label: '訓練地塊', emoji: '🏛️' },
    { level: 6, label: '倉儲地塊', emoji: '📦' },
    { level: 7, label: '冒險地塊', emoji: '🗺️' },
] as const;

const PLOT_DETAILS = {
    'forest-0': {
        label: '森林地塊',
        description: '升級伐木場後，木材工人會變多，森林外圈也會更完整。',
    },
    'mine-1': {
        label: '礦山地塊',
        description: '升級採礦場後，石材與礦脈節點會逐步成形。',
    },
    'market-2': {
        label: '商業地塊',
        description: '升級交易所後，兌換倍率更高，商店街攤位也會擴張。',
    },
    'academy-3': {
        label: '訓練地塊',
        description: '升級訓練所後，主塔會長高，後續角色養成也會接在這裡。',
    },
    'storage-4': {
        label: '倉儲地塊',
        description: '島嶼等級夠高後會解鎖倉儲地塊，資源配送也會更完整。',
    },
    'adventure-5': {
        label: '冒險地塊',
        description: '高等級懸空島會開啟冒險地塊，讓角色可以外出探索。',
    },
} as const;

const OUTER_ISLAND_CARDS: Array<{
    plotKey: keyof typeof PLOT_DETAILS;
    level: number;
    emoji: string;
    title: string;
    summary: string;
    linkedBuilding?: WorldBuildingKey;
}> = [
    {
        plotKey: 'forest-0',
        level: 2,
        emoji: '🌲',
        title: '森林外島',
        summary: '解鎖後可以穩定產木材，適合最先擴建。',
        linkedBuilding: 'forest',
    },
    {
        plotKey: 'mine-1',
        level: 3,
        emoji: '⛰️',
        title: '礦山外島',
        summary: '石材與晶礦來源，後續建設都會更順。',
        linkedBuilding: 'mine',
    },
    {
        plotKey: 'market-2',
        level: 4,
        emoji: '🏪',
        title: '商業外島',
        summary: '提高賣資源的倍率，星幣成長更快。',
        linkedBuilding: 'market',
    },
    {
        plotKey: 'academy-3',
        level: 5,
        emoji: '🏛️',
        title: '訓練外島',
        summary: '帶動整體發展效率，也讓主塔更有成長感。',
        linkedBuilding: 'academy',
    },
    {
        plotKey: 'storage-4',
        level: 6,
        emoji: '📦',
        title: '倉儲外島',
        summary: '提升資源配送與儲量，適合中期擴張。',
    },
    {
        plotKey: 'adventure-5',
        level: 7,
        emoji: '🗺️',
        title: '冒險外島',
        summary: '高等級後能派角色外出探索，拿更多獎勵。',
    },
];

const RESOURCE_SUPPLY_CATALOG = [
    {
        resourceKey: 'wood',
        title: '木材補給',
        emoji: '🪵',
        quantity: 40,
        accentClassName: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    {
        resourceKey: 'stone',
        title: '石材補給',
        emoji: '🪨',
        quantity: 24,
        accentClassName: 'border-slate-200 bg-slate-50 text-slate-900',
    },
    {
        resourceKey: 'crystal',
        title: '晶礦補給',
        emoji: '💎',
        quantity: 10,
        accentClassName: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    },
] as const;

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
    const [selectedPlotKey, setSelectedPlotKey] = useState<keyof typeof PLOT_DETAILS>('forest-0');

    useEffect(() => {
        if (persistedWorldSnapshot?.worldLab) {
            const settled = settleWorldState(persistedWorldSnapshot.worldLab, Date.now());
            setWorldLab(settled);
        }
    }, [persistedWorldSnapshot]);

    // Production tick: accumulate resources every 10 seconds
    useEffect(() => {
        const timer = window.setInterval(() => {
            setWorldLab((prev) => settleWorldState(prev, Date.now()));
        }, 10000);
        return () => window.clearInterval(timer);
    }, []);

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
    const totalBuildingLevel = worldLab.buildings.forest + worldLab.buildings.mine + worldLab.buildings.market + worldLab.buildings.academy;
    const nextIslandLevel = worldLab.islandLevel + 1;
    const nextIslandTargetTotal = Math.max(6, (nextIslandLevel - 1) * 6);
    const levelsNeededForNextIsland = Math.max(0, nextIslandTargetTotal - totalBuildingLevel);
    const selectedPlotInfo = PLOT_DETAILS[selectedPlotKey] ?? PLOT_DETAILS['forest-0'];
    const selectedPlotUnlockLevel = OUTER_ISLAND_CARDS.find((item) => item.plotKey === selectedPlotKey)?.level ?? 2;
    const getBuildingUpgradeCost = (buildingKey: WorldBuildingKey) => Math.floor(30 * Math.pow(worldLab.buildings[buildingKey] + 1, 1.35));
    const recommendedExpansionBuilding = useMemo(() => {
        return BUILDING_UPGRADE_CARDS.reduce((best, candidate) => {
            return worldLab.buildings[candidate.key] < worldLab.buildings[best.key] ? candidate : best;
        }, BUILDING_UPGRADE_CARDS[0]);
    }, [worldLab.buildings]);

    const resourceSupplyCatalog = useMemo(() => {
        return RESOURCE_SUPPLY_CATALOG.map((item) => {
            const unitPrice = exchangePriceTable[item.resourceKey];
            const price = Math.max(1, Math.ceil(unitPrice * item.quantity * 10));

            return {
                ...item,
                unitPrice,
                price,
            };
        });
    }, [exchangePriceTable]);

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

    const upgradeBuilding = async (buildingKey: WorldBuildingKey, title: string) => {
        const currentLevel = worldLab.buildings[buildingKey];
        const cost = getBuildingUpgradeCost(buildingKey);

        if (starBalance < cost) {
            setFlashMessage(`❌ 星幣不足，需要 ${cost} ⭐`);
            return;
        }

        const ok = await adjustStars(-cost, `世界商店街升級${title}`);
        if (!ok) {
            setFlashMessage('❌ 建築升級失敗');
            return;
        }

        const nextBuildings = {
            ...worldLab.buildings,
            [buildingKey]: currentLevel + 1,
        };
        const nextTotalBuildingLevel = nextBuildings.forest + nextBuildings.mine + nextBuildings.market + nextBuildings.academy;
        const nextIslandLevelValue = Math.max(worldLab.islandLevel, 1 + Math.floor(nextTotalBuildingLevel / 6));
        const nextWorldLab: WorldLabState = {
            ...worldLab,
            buildings: nextBuildings,
            islandLevel: nextIslandLevelValue,
        };

        setWorldLab(nextWorldLab);
        await saveWorldPersistence.mutateAsync({
            worldLab: nextWorldLab,
            activeAdventure: persistedWorldSnapshot?.activeAdventure ?? null,
            lastAdventureResult: persistedWorldSnapshot?.lastAdventureResult ?? null,
        });

        const unlockedStep = PLOT_PROGRESS_STEPS.find((step) => step.level === nextIslandLevelValue && step.level > worldLab.islandLevel);
        setFlashMessage(unlockedStep
            ? `🎉 ${title}升到 Lv.${currentLevel + 1}，並解鎖${unlockedStep.label}`
            : `🏗️ ${title}升到 Lv.${currentLevel + 1}`);
    };

    const handleOuterIslandCardAction = async (plotKey: keyof typeof PLOT_DETAILS) => {
        const card = OUTER_ISLAND_CARDS.find((item) => item.plotKey === plotKey);
        if (!card) return;

        if (worldLab.islandLevel >= card.level) {
            setSelectedPlotKey(plotKey);
            setFlashMessage(`🧭 已切換到${card.title}`);
            return;
        }

        if (card.linkedBuilding) {
            const linkedBuilding = BUILDING_UPGRADE_CARDS.find((item) => item.key === card.linkedBuilding);
            if (linkedBuilding) {
                await upgradeBuilding(linkedBuilding.key, linkedBuilding.title);
            }
            return;
        }

        await upgradeBuilding(recommendedExpansionBuilding.key, recommendedExpansionBuilding.title);
    };

    const buyResourceSupply = async (resourceKey: 'wood' | 'stone' | 'crystal', quantity: number, price: number, title: string) => {
        if (price <= 0) {
            setFlashMessage('❌ 補給價格異常');
            return;
        }

        if (starBalance < price) {
            setFlashMessage(`❌ 星幣不足，需要 ${price} ⭐`);
            return;
        }

        const ok = await adjustStars(-price, `世界商店街購買${title}`);
        if (!ok) {
            setFlashMessage('❌ 購買補給失敗');
            return;
        }

        const nextWorldLab: WorldLabState = {
            ...worldLab,
            resources: {
                ...worldLab.resources,
                [resourceKey]: worldLab.resources[resourceKey] + quantity,
            },
        };

        setWorldLab(nextWorldLab);
        await saveWorldPersistence.mutateAsync({
            worldLab: nextWorldLab,
            activeAdventure: persistedWorldSnapshot?.activeAdventure ?? null,
            lastAdventureResult: persistedWorldSnapshot?.lastAdventureResult ?? null,
        });

        setFlashMessage(`🛒 已購買${title}，+${quantity} ${resourceKey === 'wood' ? '木材' : resourceKey === 'stone' ? '石材' : '晶礦'}`);
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

            <div className="rounded-2xl border-2 border-sky-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                        <h3 className="font-heading text-lg font-bold text-sky-900">🏝️ 懸空島擴建</h3>
                        <p className="text-sm text-sky-700 mt-1">你要找的樹木區塊入口在這裡：先升級建築，島嶼等級到了就會自動擴出對應地塊。</p>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                        島 Lv.{worldLab.islandLevel} ／ 建築總等級 {totalBuildingLevel}
                    </div>
                </div>

                <World3D
                    islandLevel={worldLab.islandLevel}
                    heroLevel={worldLab.heroLevel}
                    timeOfDay={worldLab.timeOfDay}
                    selectedPlotKey={selectedPlotKey}
                    onPlotSelect={(plotKey) => setSelectedPlotKey(plotKey as keyof typeof PLOT_DETAILS)}
                    buildings={worldLab.buildings}
                />

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="font-heading font-bold text-sky-900">目前選取：{selectedPlotInfo.label}</div>
                            <div className="text-xs text-sky-700">
                                {worldLab.islandLevel >= selectedPlotUnlockLevel ? '已解鎖' : `島 Lv.${selectedPlotUnlockLevel} 解鎖`}
                            </div>
                        </div>
                        <p className="text-sm text-sky-800">{selectedPlotInfo.description}</p>
                        <div className="mt-3 rounded-lg border border-dashed border-sky-300 bg-white px-3 py-2 text-xs text-sky-700">
                            提示：想要看到樹木區塊，先升級下方的「伐木場」。當建築總等級累積到 6 時，懸空島會升到 Lv.2，森林地塊就會正式解鎖。
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="font-heading font-bold text-emerald-900">下一階段擴建進度</div>
                        <div className="mt-1 text-sm text-emerald-800">
                            {levelsNeededForNextIsland === 0
                                ? `已達成下一次擴島門檻，繼續升級就能朝更高等島嶼前進。`
                                : `再升 ${levelsNeededForNextIsland} 級建築，就能往島 Lv.${nextIslandLevel} 前進。`}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                            {OUTER_ISLAND_CARDS.map((card) => {
                                const unlocked = worldLab.islandLevel >= card.level;
                                const linkedBuilding = card.linkedBuilding
                                    ? BUILDING_UPGRADE_CARDS.find((item) => item.key === card.linkedBuilding)
                                    : null;
                                const actionCost = linkedBuilding
                                    ? getBuildingUpgradeCost(linkedBuilding.key)
                                    : getBuildingUpgradeCost(recommendedExpansionBuilding.key);
                                const actionLabel = unlocked
                                    ? '查看小島'
                                    : linkedBuilding
                                        ? `升級${linkedBuilding.title}（${actionCost}⭐）`
                                        : `推進擴島（${actionCost}⭐）`;

                                return (
                                    <div
                                        key={card.plotKey}
                                        className={`rounded-xl border p-3 ${selectedPlotKey === card.plotKey ? 'border-amber-300 bg-amber-50' : unlocked ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-white/80'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-heading font-bold text-slate-900">{card.emoji} {card.title}</div>
                                                <div className="mt-1 text-xs text-slate-600">{card.summary}</div>
                                                <div className="mt-2 text-xs font-medium text-slate-500">
                                                    {unlocked ? `已解鎖 · 島 Lv.${card.level}` : `島 Lv.${card.level} 解鎖`}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleOuterIslandCardAction(card.plotKey)}
                                                disabled={(!unlocked && starBalance < actionCost) || saveWorldPersistence.isPending}
                                                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-heading ${unlocked ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200'} disabled:cursor-not-allowed disabled:opacity-50`}
                                            >
                                                {actionLabel}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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

            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <h4 className="font-pixel text-base">🪵 建材補給站</h4>
                        <p className="text-xs text-orange-700 mt-1">孩子可以直接買木材、石材、晶礦，不用先去別的地方找入口。</p>
                    </div>
                    <div className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs text-orange-800">
                        目前可用 {starBalance} ⭐
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {resourceSupplyCatalog.map((item) => (
                        <div key={item.resourceKey} className={`rounded-xl border p-3 ${item.accentClassName}`}>
                            <div className="font-heading font-bold">{item.emoji} {item.title}</div>
                            <div className="mt-1 text-sm">一次補給 {item.quantity} 單位</div>
                            <div className="mt-1 text-xs opacity-80">基準單價 {item.unitPrice.toFixed(3)} ⭐，補給價 {item.price} ⭐</div>
                            <button
                                type="button"
                                onClick={() => buyResourceSupply(item.resourceKey, item.quantity, item.price, item.title)}
                                disabled={starBalance < item.price}
                                className="mt-3 w-full rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm font-heading text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                購買 {item.title}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <h4 className="font-pixel text-base">🏗️ 建築升級站</h4>
                        <p className="text-xs text-amber-700 mt-1">以前 Debug 版的擴建入口現在搬到這裡，可以直接買伐木場、採礦場、交易所、訓練所升級。</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800">
                        可用 {starBalance} ⭐
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {BUILDING_UPGRADE_CARDS.map((building) => {
                        const level = worldLab.buildings[building.key];
                        const cost = Math.floor(30 * Math.pow(level + 1, 1.35));

                        return (
                            <div key={building.key} className="rounded-xl border border-amber-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-heading font-bold text-amber-900">{building.emoji} {building.title} Lv.{level}</div>
                                        <div className="mt-1 text-sm text-slate-700">{building.description}</div>
                                        <div className="mt-2 text-xs text-amber-700">{building.unlockHint}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => upgradeBuilding(building.key, building.title)}
                                        disabled={starBalance < cost || saveWorldPersistence.isPending}
                                        className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-heading text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        升級（{cost}⭐）
                                    </button>
                                </div>
                            </div>
                        );
                    })}
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