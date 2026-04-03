import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdventureRewards } from '../lib/world/adventure';
import {
    calculateExchangePreview,
    createDefaultExchangePriceTable,
    exchangeSelectedResources,
    type ExchangePriceTable,
    type ExchangePreviewResult,
} from '../lib/world/exchangeShop';
import { exchangeAllResources, getMarketMultiplier } from '../lib/world/economy';
import { calculateProductionRates, getUnlockedPlotKeys } from '../lib/world/production';
import { applyOfflineProduction, getStorageCapacity } from '../lib/world/storage';
import type { WorldResources } from '../lib/world/types';

/** Atmosphere / background preset (lighting, sky color, particles) */
export type WorldTheme = 'normal' | 'night' | 'sakura' | 'rainbow_dragon' | 'star_fairy' | 'slime' | 'flame_bird';
/** Terrain surface color (grass top of floating island blocks) */
export type WorldTerrain = 'grassland' | 'desert' | 'snow';

export type WorldBuildingKey = 'forest' | 'mine' | 'academy' | 'market';

export interface WorldLabState {
    islandLevel: number;
    heroLevel: number;
    heroPower: number;
    monsterShards: number;
    timeOfDay: 'day' | 'dusk';
    worldTheme: WorldTheme;
    worldTerrain: WorldTerrain;
    buildings: Record<WorldBuildingKey, number>;
    resources: WorldResources;
    lastTickAt: number;
}

export interface PlotPreview {
    key: string;
    label: string;
    unlockAt: number;
    status: string;
}

export interface PlotDetail extends PlotPreview {
    description: string;
    workerCount: number;
    routeText: string;
    resourceText: string;
}

interface UseWorldStateOptions {
    active: boolean;
    starBalance: number;
    onAdjustStars: (amount: number, description: string) => Promise<boolean>;
    exchangePriceTable?: ExchangePriceTable;
}

interface WorldActionResult {
    ok: boolean;
    error?: string;
    starsEarned?: number;
}

export const INITIAL_WORLD_LAB_STATE: WorldLabState = {
    islandLevel: 1,
    heroLevel: 1,
    heroPower: 120,
    monsterShards: 0,
    timeOfDay: 'day',
    worldTheme: 'normal',
    worldTerrain: 'grassland',
    buildings: {
        forest: 1,
        mine: 1,
        academy: 1,
        market: 1,
    },
    resources: {
        wood: 0,
        stone: 0,
        crystal: 0,
    },
    lastTickAt: Date.now(),
};

function getRatesForState(state: WorldLabState) {
    return calculateProductionRates({
        islandLevel: state.islandLevel,
        buildingLevels: {
            forest: state.buildings.forest,
            mine: state.buildings.mine,
            academy: state.buildings.academy,
        },
    });
}

export function settleWorldState(state: WorldLabState, now: number): WorldLabState {
    const hours = Math.max(0, (now - state.lastTickAt) / 3600000);
    if (hours < 0.003) {
        return state;
    }

    const result = applyOfflineProduction({
        currentResources: state.resources,
        productionRates: getRatesForState(state),
        elapsedHours: hours,
        storageLevel: Math.max(1, state.islandLevel),
    });

    return {
        ...state,
        resources: result.resources,
        lastTickAt: now,
    };
}

export function useWorldState({ active, starBalance, onAdjustStars, exchangePriceTable: exchangePriceTableOverride }: UseWorldStateOptions) {
    const [selectedPlotKey, setSelectedPlotKey] = useState('forest-0');
    const [worldLab, setWorldLab] = useState<WorldLabState>(INITIAL_WORLD_LAB_STATE);

    const worldRates = useMemo(() => getRatesForState(worldLab), [worldLab]);
    const storageLevel = Math.max(1, worldLab.islandLevel);
    const storageCapacity = useMemo(() => getStorageCapacity(storageLevel), [storageLevel]);
    const unlockedPlotKeys = useMemo(() => getUnlockedPlotKeys(worldLab.islandLevel), [worldLab.islandLevel]);
    const unlockedPlotSet = useMemo(() => new Set(unlockedPlotKeys), [unlockedPlotKeys]);
    const marketMultiplier = useMemo(() => getMarketMultiplier(worldLab.buildings.market), [worldLab.buildings.market]);
    const exchangePriceTable = useMemo(
        () => exchangePriceTableOverride ?? createDefaultExchangePriceTable(),
        [exchangePriceTableOverride]
    );

    const plotPreviews = useMemo<PlotPreview[]>(() => ([
        { key: 'forest', label: '森林地塊', unlockAt: 2, status: `伐木 Lv.${worldLab.buildings.forest}` },
        { key: 'mine', label: '礦山地塊', unlockAt: 3, status: `採礦 Lv.${worldLab.buildings.mine}` },
        { key: 'market', label: '商業地塊', unlockAt: 4, status: `交易 Lv.${worldLab.buildings.market}` },
        { key: 'academy', label: '訓練地塊', unlockAt: 5, status: `學院 Lv.${worldLab.buildings.academy}` },
        { key: 'storage', label: '倉儲地塊', unlockAt: 6, status: `容量 ${storageCapacity.woodCap}/${storageCapacity.stoneCap}/${storageCapacity.crystalCap}` },
        { key: 'adventure', label: '冒險地塊', unlockAt: 7, status: `角色 Lv.${worldLab.heroLevel} 可派遣` },
    ]), [storageCapacity.crystalCap, storageCapacity.stoneCap, storageCapacity.woodCap, worldLab.buildings.academy, worldLab.buildings.forest, worldLab.buildings.market, worldLab.buildings.mine, worldLab.heroLevel]);

    const plotDetails = useMemo<PlotDetail[]>(() => ([
        {
            key: 'forest-0',
            label: '森林地塊',
            unlockAt: 2,
            status: `伐木 Lv.${worldLab.buildings.forest}`,
            description: '提供木材主產出，升級後工人變多，木材運送頻率更高。',
            workerCount: Math.min(3, 1 + Math.floor(Math.max(0, worldLab.buildings.forest - 1) / 2)),
            routeText: '森林地塊 → 主島工坊',
            resourceText: `木材 +${worldRates.woodPerHour.toFixed(1)}/h`,
        },
        {
            key: 'mine-1',
            label: '礦山地塊',
            unlockAt: 3,
            status: `採礦 Lv.${worldLab.buildings.mine}`,
            description: '提供石材與晶礦感，後續可延伸成稀有礦脈系統。',
            workerCount: Math.min(3, 1 + Math.floor(Math.max(0, worldLab.buildings.mine - 1) / 2)),
            routeText: '礦山地塊 → 主島鍛造區',
            resourceText: `石材 +${worldRates.stonePerHour.toFixed(1)}/h`,
        },
        {
            key: 'market-2',
            label: '商業地塊',
            unlockAt: 4,
            status: `交易 Lv.${worldLab.buildings.market}`,
            description: '負責資源整理與售出，等級越高兌換倍率越高。',
            workerCount: Math.min(3, 1 + Math.floor(Math.max(0, worldLab.buildings.market - 1) / 2)),
            routeText: '商業地塊 → 主島市集',
            resourceText: `商店倍率 x${marketMultiplier.toFixed(2)}`,
        },
        {
            key: 'academy-3',
            label: '訓練地塊',
            unlockAt: 5,
            status: `學院 Lv.${worldLab.buildings.academy}`,
            description: '提升全域生產效率，未來可解鎖角色技能與派遣 buff。',
            workerCount: Math.min(3, 1 + Math.floor(Math.max(0, worldLab.buildings.academy - 1) / 2)),
            routeText: '訓練地塊 → 主塔研究環',
            resourceText: `效率加成 x${(1 + worldLab.buildings.academy * 0.08).toFixed(2)}`,
        },
        {
            key: 'storage-4',
            label: '倉儲地塊',
            unlockAt: 6,
            status: '集中資源與加速配送',
            description: '收納各地資源，未來可擴成離線收益上限與加速倉儲。',
            workerCount: Math.min(3, Math.max(1, Math.floor(worldLab.islandLevel / 2))),
            routeText: '各地塊 → 倉儲地塊 → 主島',
            resourceText: `上限 ${storageCapacity.woodCap}/${storageCapacity.stoneCap}/${storageCapacity.crystalCap}，離線 ${storageCapacity.offlineHoursCap}h`,
        },
        {
            key: 'adventure-5',
            label: '冒險地塊',
            unlockAt: 7,
            status: `角色 Lv.${worldLab.heroLevel} 可派遣`,
            description: '預留派遣與探索玩法，之後可連動怪獸塔與資源遠征。',
            workerCount: Math.min(3, Math.max(1, Math.floor(worldLab.heroLevel / 2))),
            routeText: '冒險地塊 → 外部世界 / 遠征回收',
            resourceText: `角色戰力 ${worldLab.heroPower}`,
        },
    ]), [marketMultiplier, storageCapacity.crystalCap, storageCapacity.offlineHoursCap, storageCapacity.stoneCap, storageCapacity.woodCap, worldLab.buildings.academy, worldLab.buildings.forest, worldLab.buildings.market, worldLab.buildings.mine, worldLab.heroLevel, worldLab.heroPower, worldLab.islandLevel, worldRates.stonePerHour, worldRates.woodPerHour]);

    const selectedPlot = plotDetails.find((plot) => plot.key === selectedPlotKey) ?? plotDetails[0];
    const selectedPlotType = selectedPlot.key.split('-')[0];
    const isSelectedPlotUnlocked = unlockedPlotSet.has(selectedPlotType as typeof unlockedPlotKeys[number]);

    useEffect(() => {
        if (!selectedPlot) return;
        if (!isSelectedPlotUnlocked) {
            const fallback = plotDetails.find((plot) => unlockedPlotSet.has(plot.key.split('-')[0] as typeof unlockedPlotKeys[number])) ?? plotDetails[0];
            setSelectedPlotKey(fallback.key);
        }
    }, [isSelectedPlotUnlocked, plotDetails, selectedPlot, unlockedPlotSet, unlockedPlotKeys]);

    const syncWorldProduction = useCallback(() => {
        setWorldLab((prev) => settleWorldState(prev, Date.now()));
    }, []);

    const applyProduction = useCallback((hours: number) => {
        if (hours <= 0) return;
        setWorldLab((prev) => {
            const now = Date.now();
            const settled = settleWorldState(prev, now);
            const result = applyOfflineProduction({
                currentResources: settled.resources,
                productionRates: getRatesForState(settled),
                elapsedHours: hours,
                storageLevel: Math.max(1, settled.islandLevel),
            });

            return {
                ...settled,
                resources: result.resources,
                lastTickAt: now,
            };
        });
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (active) {
                syncWorldProduction();
            }
        }, 10000);

        return () => window.clearInterval(timer);
    }, [active, syncWorldProduction]);

    const setTimeOfDay = useCallback((timeOfDay: WorldLabState['timeOfDay']) => {
        setWorldLab((prev) => ({ ...prev, timeOfDay }));
    }, []);

    const upgradeBuilding = useCallback(async (key: WorldBuildingKey): Promise<WorldActionResult> => {
        const currentLv = worldLab.buildings[key];
        const cost = Math.floor(30 * Math.pow(currentLv + 1, 1.35));
        if (starBalance < cost) {
            return { ok: false, error: `星幣不足，需要 ${cost} ⭐` };
        }

        const ok = await onAdjustStars(-cost, `WorldLab 升級建築: ${key}`);
        if (!ok) {
            return { ok: false, error: '建築升級失敗' };
        }

        setWorldLab((prev) => {
            const settled = settleWorldState(prev, Date.now());
            const nextBuildings = { ...settled.buildings, [key]: settled.buildings[key] + 1 };
            const totalLv = nextBuildings.forest + nextBuildings.mine + nextBuildings.academy + nextBuildings.market;
            const nextIslandLv = Math.max(settled.islandLevel, 1 + Math.floor(totalLv / 6));

            return {
                ...settled,
                buildings: nextBuildings,
                islandLevel: nextIslandLv,
            };
        });

        return { ok: true };
    }, [onAdjustStars, starBalance, worldLab.buildings]);

    const exchangeResourcesToStars = useCallback(async (): Promise<WorldActionResult> => {
        const settled = settleWorldState(worldLab, Date.now());
        const exchangeResult = exchangeAllResources(settled.resources, settled.buildings.market);
        if (exchangeResult.starsEarned <= 0) {
            return { ok: false, error: '目前沒有可兌換資源' };
        }

        const ok = await onAdjustStars(exchangeResult.starsEarned, `WorldLab 資源兌換（Market Lv.${settled.buildings.market}）`);
        if (!ok) {
            return { ok: false, error: '資源兌換失敗' };
        }

        setWorldLab((prev) => {
            const current = settleWorldState(prev, Date.now());
            const currentExchange = exchangeAllResources(current.resources, current.buildings.market);

            return {
                ...current,
                heroLevel: current.heroLevel + (currentExchange.starsEarned >= 50 ? 1 : 0),
                heroPower: current.heroPower + Math.floor(currentExchange.starsEarned * 0.6),
                resources: currentExchange.remainingResources,
            };
        });

        return { ok: true, starsEarned: exchangeResult.starsEarned };
    }, [onAdjustStars, worldLab]);

    const getExchangePreview = useCallback((selectedResources: WorldResources): ExchangePreviewResult => {
        return calculateExchangePreview({
            currentResources: worldLab.resources,
            selectedResources,
            marketLevel: worldLab.buildings.market,
            basePrices: exchangePriceTable,
        });
    }, [exchangePriceTable, worldLab.buildings.market, worldLab.resources]);

    const exchangeSelectedResourcesToStars = useCallback(async (selectedResources: WorldResources): Promise<WorldActionResult> => {
        const settled = settleWorldState(worldLab, Date.now());
        let exchangeResult: ExchangePreviewResult;

        try {
            exchangeResult = exchangeSelectedResources({
                currentResources: settled.resources,
                selectedResources,
                marketLevel: settled.buildings.market,
                basePrices: exchangePriceTable,
            });
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : '資源兌換失敗',
            };
        }

        if (exchangeResult.starsEarned <= 0) {
            return { ok: false, error: '請先輸入要賣出的資源數量' };
        }

        const ok = await onAdjustStars(exchangeResult.starsEarned, `WorldLab 手動資源兌換（Market Lv.${settled.buildings.market}）`);
        if (!ok) {
            return { ok: false, error: '資源兌換失敗' };
        }

        setWorldLab((prev) => {
            const current = settleWorldState(prev, Date.now());
            const currentExchange = exchangeSelectedResources({
                currentResources: current.resources,
                selectedResources,
                marketLevel: current.buildings.market,
                basePrices: exchangePriceTable,
            });

            return {
                ...current,
                heroLevel: current.heroLevel + (currentExchange.starsEarned >= 50 ? 1 : 0),
                heroPower: current.heroPower + Math.floor(currentExchange.starsEarned * 0.6),
                resources: currentExchange.remainingResources,
            };
        });

        return { ok: true, starsEarned: exchangeResult.starsEarned };
    }, [exchangePriceTable, onAdjustStars, worldLab]);

    const applyAdventureRewards = useCallback((rewards: AdventureRewards) => {
        setWorldLab((prev) => ({
            ...prev,
            resources: {
                wood: prev.resources.wood + rewards.wood,
                stone: prev.resources.stone + rewards.stone,
                crystal: prev.resources.crystal + rewards.crystal,
            },
            monsterShards: prev.monsterShards + rewards.monsterShards,
            heroPower: prev.heroPower + rewards.monsterShards * 4 + Math.floor((rewards.wood + rewards.stone + rewards.crystal) * 0.12),
        }));
    }, []);

    return {
        worldLab,
        setWorldLab,
        selectedPlotKey,
        setSelectedPlotKey,
        worldRates,
        storageCapacity,
        unlockedPlotKeys,
        unlockedPlotSet,
        marketMultiplier,
        exchangePriceTable,
        plotPreviews,
        plotDetails,
        selectedPlot,
        isSelectedPlotUnlocked,
        applyProduction,
        syncWorldProduction,
        setTimeOfDay,
        upgradeBuilding,
        exchangeResourcesToStars,
        getExchangePreview,
        exchangeSelectedResourcesToStars,
        applyAdventureRewards,
    };
}