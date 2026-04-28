import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { useFamilyExchangeRates, DEFAULT_FAMILY_EXCHANGE_RATES } from '../hooks/useFamilyShopSettings';
import { useSaveWorldPersistence, useWorldPersistence } from '../hooks/useWorldPersistence';
import { useWorldExchange } from '../hooks/useWorldExchange';
import { supabase } from '../lib/supabase';
import { calculateExchangePreview, exchangeSelectedResources, type ExchangePriceTable } from '../lib/world/exchangeShop';
import { INITIAL_WORLD_LAB_STATE, settleWorldState, type WorldLabState, type WorldBuildingKey } from '../hooks/useWorldState';
import { calculateProductionRates } from '../lib/world/production';
import { getStorageCapacity } from '../lib/world/storage';
import { DECORATION_CATALOG, countPlaced, findNextFreeSlot, type PlacedDecoration } from '../lib/world/decorations';
import { WorldExchangePanel } from './WorldExchangePanel';

// ── Constants ──────────────────────────────────────────────────────────────

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
        description: '提升石材產量，供應鍛造與建設。',
        unlockHint: '島 Lv.3 解鎖礦山地塊。',
    },
    {
        key: 'crystal',
        title: '水晶礦場',
        emoji: '💎',
        description: '獨立提升晶礦產量，與石材礦場分開升級。',
        unlockHint: '島 Lv.4 解鎖水晶礦場。',
    },
    {
        key: 'storage',
        title: '倉庫',
        emoji: '📦',
        description: '提升各資源容量上限與離線可結算時數，避免太快滿倉。',
        unlockHint: '島 Lv.6 解鎖倉儲地塊。',
    },
];

const RESOURCE_SUPPLY_CATALOG = [
    { resourceKey: 'wood'    as const, title: '木材補給', emoji: '🪵', quantity: 40, accentClassName: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
    { resourceKey: 'stone'   as const, title: '石材補給', emoji: '🪨', quantity: 24, accentClassName: 'border-slate-200 bg-slate-50 text-slate-900' },
    { resourceKey: 'crystal' as const, title: '晶礦補給', emoji: '💎', quantity: 10, accentClassName: 'border-indigo-200 bg-indigo-50 text-indigo-900' },
] as const;

type TabKey = 'upgrade' | 'supply' | 'deco' | 'exchange';

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
    { key: 'upgrade',  label: '建築升級', emoji: '🏗️' },
    { key: 'supply',   label: '資源補給', emoji: '🪵' },
    { key: 'deco',     label: '島嶼裝飾', emoji: '🎨' },
    { key: 'exchange', label: '資源兌換', emoji: '💱' },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface WorldIslandShopDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    starBalance: number;
    /** Called after any world state change so parent can refresh 3D view */
    onWorldLabChange?: (updated: WorldLabState) => void;
    /** Called after decoration changes so parent can refresh 3D view */
    onDecorationsChange?: (updated: PlacedDecoration[]) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export const WorldIslandShopDrawer: React.FC<WorldIslandShopDrawerProps> = ({
    isOpen,
    onClose,
    userId,
    starBalance,
    onWorldLabChange,
    onDecorationsChange,
}) => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { data: familyExchangeRates } = useFamilyExchangeRates(user?.family_id);
    const { data: persistedWorldSnapshot } = useWorldPersistence(userId);
    const saveWorldPersistence = useSaveWorldPersistence(userId);

    const [worldLab, setWorldLab] = useState<WorldLabState>(INITIAL_WORLD_LAB_STATE);
    const [tab, setTab] = useState<TabKey>('upgrade');
    const [message, setMessage] = useState('');

    // Decorations: persisted in localStorage as PlacedDecoration[]
    const decoStorageKey = `world-decorations-${userId}`;
    const [placedDecos, setPlacedDecos] = useState<PlacedDecoration[]>(() => {
        try {
            const raw = localStorage.getItem(`world-decorations-${userId}`);
            return raw ? (JSON.parse(raw) as PlacedDecoration[]) : [];
        } catch { return []; }
    });
    const [decoTab, setDecoTab] = useState<'wood' | 'stone' | 'crystal'>('wood');

    // Load world state from persistence
    useEffect(() => {
        if (persistedWorldSnapshot?.worldLab) {
            const settled = settleWorldState(persistedWorldSnapshot.worldLab, Date.now());
            setWorldLab(settled);
        }
    }, [persistedWorldSnapshot]);

    // Tick: settle resources every 10s while drawer is open
    useEffect(() => {
        if (!isOpen) return;
        const timer = window.setInterval(() => {
            setWorldLab((prev) => settleWorldState(prev, Date.now()));
        }, 10000);
        return () => window.clearInterval(timer);
    }, [isOpen]);

    const exchangePriceTable: ExchangePriceTable = useMemo(() => ({
        wood:    familyExchangeRates?.wood_rate    ?? DEFAULT_FAMILY_EXCHANGE_RATES.wood_rate,
        stone:   familyExchangeRates?.stone_rate   ?? DEFAULT_FAMILY_EXCHANGE_RATES.stone_rate,
        crystal: familyExchangeRates?.crystal_rate ?? DEFAULT_FAMILY_EXCHANGE_RATES.crystal_rate,
    }), [familyExchangeRates]);

    const productionRates = useMemo(() => calculateProductionRates({
        islandLevel: worldLab.islandLevel,
        buildingLevels: {
            forest: worldLab.buildings.forest,
            mine: worldLab.buildings.mine,
            crystal: worldLab.buildings.crystal,
            academy: worldLab.buildings.academy,
        },
    }), [worldLab.buildings.academy, worldLab.buildings.crystal, worldLab.buildings.forest, worldLab.buildings.mine, worldLab.islandLevel]);

    const storageLevel = Math.max(1, worldLab.buildings.storage ?? 1);
    const storageCapacity = useMemo(() => getStorageCapacity(storageLevel), [storageLevel]);

    const estimateHoursToCap = (current: number, ratePerHour: number, cap: number): string => {
        if (current >= cap) return '已滿倉';
        if (ratePerHour <= 0) return '未產出';
        const hours = Math.max(0, (cap - current) / ratePerHour);
        if (hours < 1) return `${Math.ceil(hours * 60)} 分鐘`;
        return `${hours.toFixed(1)} 小時`;
    };

    const resourceSupplyCatalog = useMemo(() => RESOURCE_SUPPLY_CATALOG.map((item) => {
        const unitPrice = exchangePriceTable[item.resourceKey];
        const price = Math.max(1, Math.ceil(unitPrice * item.quantity * 10));
        return { ...item, unitPrice, price };
    }), [exchangePriceTable]);

    // ── Flash message ──────────────────────────────────────────────────────
    const flash = (text: string) => {
        setMessage(text);
        window.setTimeout(() => setMessage(''), 2400);
    };

    // ── Stars helper ──────────────────────────────────────────────────────
    const adjustStars = async (amount: number, description: string): Promise<boolean> => {
        try {
            const { error } = await supabase.from('star_transactions').insert({
                user_id: userId,
                amount,
                type: amount >= 0 ? 'earn' : 'spend',
                description,
                game_id: 'world-island-shop',
            });
            if (error) throw error;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['star_balance', userId] }),
                queryClient.invalidateQueries({ queryKey: ['star_transactions'] }),
            ]);
            return true;
        } catch (err) {
            console.error('adjustStars failed', err);
            return false;
        }
    };

    // ── Save helper ───────────────────────────────────────────────────────
    const saveWorld = async (next: WorldLabState) => {
        setWorldLab(next);
        onWorldLabChange?.(next);
        await saveWorldPersistence.mutateAsync({
            worldLab: next,
            activeAdventure: persistedWorldSnapshot?.activeAdventure ?? null,
            lastAdventureResult: persistedWorldSnapshot?.lastAdventureResult ?? null,
        });
    };

    // ── Handlers ──────────────────────────────────────────────────────────
    const getBuildingUpgradeCost = (key: WorldBuildingKey) =>
        Math.floor(30 * Math.pow(worldLab.buildings[key] + 1, 1.35));

    const upgradeBuilding = async (buildingKey: WorldBuildingKey, title: string) => {
        const cost = getBuildingUpgradeCost(buildingKey);
        if (starBalance < cost) { flash(`❌ 星幣不足，需要 ${cost} ⭐`); return; }
        const ok = await adjustStars(-cost, `升級${title}`);
        if (!ok) { flash('❌ 升級失敗'); return; }

        const nextBuildings = { ...worldLab.buildings, [buildingKey]: worldLab.buildings[buildingKey] + 1 };
        const nextTotal = Object.values(nextBuildings).reduce((sum, lv) => sum + lv, 0);
        const nextIslandLevel = Math.max(worldLab.islandLevel, 1 + Math.floor(nextTotal / 6));
        await saveWorld({ ...worldLab, buildings: nextBuildings, islandLevel: nextIslandLevel });
        flash(`🏗️ ${title} 升到 Lv.${worldLab.buildings[buildingKey] + 1}`);
    };

    const buyResourceSupply = async (
        resourceKey: 'wood' | 'stone' | 'crystal',
        quantity: number,
        price: number,
        title: string,
    ) => {
        if (starBalance < price) { flash(`❌ 星幣不足，需要 ${price} ⭐`); return; }
        const ok = await adjustStars(-price, `購買${title}`);
        if (!ok) { flash('❌ 購買失敗'); return; }
        await saveWorld({
            ...worldLab,
            resources: { ...worldLab.resources, [resourceKey]: worldLab.resources[resourceKey] + quantity },
        });
        flash(`🛒 已購入 +${quantity} ${title}`);
    };

    const buyDecoration = async (entry: typeof DECORATION_CATALOG[number]) => {
        const placed = countPlaced(placedDecos, entry.id);
        if (entry.maxCount !== -1 && placed >= entry.maxCount) {
            flash(`❌ ${entry.name} 已達放置上限 (${entry.maxCount})`); return;
        }
        const slotIndex = findNextFreeSlot(placedDecos);
        if (slotIndex === -1) { flash('❌ 島上已沒有空位了！'); return; }
        // Check resource costs
        const { wood = 0, stone = 0, crystal = 0 } = entry.cost;
        if (worldLab.resources.wood < wood)    { flash(`❌ 木材不足，需要 ${wood} 🌲`);   return; }
        if (worldLab.resources.stone < stone)  { flash(`❌ 石材不足，需要 ${stone} 🪨`);  return; }
        if (worldLab.resources.crystal < crystal) { flash(`❌ 晶礦不足，需要 ${crystal} 💎`); return; }
        // Deduct resources and save
        const nextResources = {
            wood:    worldLab.resources.wood    - wood,
            stone:   worldLab.resources.stone   - stone,
            crystal: worldLab.resources.crystal - crystal,
        };
        try {
            await saveWorld({ ...worldLab, resources: nextResources });
            const next: PlacedDecoration[] = [...placedDecos, { id: entry.id, slotIndex }];
            setPlacedDecos(next);
            onDecorationsChange?.(next);
            try { localStorage.setItem(decoStorageKey, JSON.stringify(next)); } catch { /* ignore */ }
            flash(`🎉 ${entry.emoji} ${entry.name} 已放到你的島上！`);
        } catch (err) {
            flash(`❌ 儲存失敗，請重試（${err instanceof Error ? err.message : '未知錯誤'}）`);
        }
    };

    const removeDecoration = (entry: typeof DECORATION_CATALOG[number]) => {
        const targetIndex = placedDecos.reduce<number>((last, d, i) => d.id === entry.id ? i : last, -1);
        if (targetIndex === -1) return;
        const next = placedDecos.filter((_, i) => i !== targetIndex);
        setPlacedDecos(next);
        onDecorationsChange?.(next);
        try { localStorage.setItem(decoStorageKey, JSON.stringify(next)); } catch { /* ignore */ }
        flash(`🗑️ ${entry.emoji} ${entry.name} 已移除`);
    };

    // ── Exchange ───────────────────────────────────────────────────────────
    const getExchangePreview = (sel: { wood: number; stone: number; crystal: number }) =>
        calculateExchangePreview({
            currentResources: worldLab.resources,
            selectedResources: sel,
            marketLevel: 1,
            basePrices: exchangePriceTable,
        });

    const exchangeSelectedResourcesToStars = async (sel: { wood: number; stone: number; crystal: number }) => {
        let result;
        try {
            result = exchangeSelectedResources({
                currentResources: worldLab.resources,
                selectedResources: sel,
                marketLevel: 1,
                basePrices: exchangePriceTable,
            });
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : '兌換失敗' };
        }
        if (result.starsEarned <= 0) return { ok: false, error: '請輸入要賣出的資源數量' };
        const ok = await adjustStars(result.starsEarned, '資源兌換為星星');
        if (!ok) return { ok: false, error: '兌換失敗' };
        try {
            await saveWorld({
                ...worldLab,
                lastTickAt: Date.now(),  // update tick so re-load doesn't re-accumulate already-counted production
                heroLevel:  worldLab.heroLevel  + (result.starsEarned >= 50 ? 1 : 0),
                heroPower:  worldLab.heroPower  + Math.floor(result.starsEarned * 0.6),
                resources:  result.remainingResources,
            });
        } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : '資源儲存失敗，請重試' };
        }
        return { ok: true, starsEarned: result.starsEarned };
    };

    const { exchangeLogs, exchangeResources } = useWorldExchange({
        userId,
        marketLevel: 1,
        getExchangePreview,
        exchangeSelectedResourcesToStars,
    });

    // ── Render ─────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    const panel = (
        <div className="fixed inset-0 z-[130] flex flex-col justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative pointer-events-auto flex flex-col bg-gray-950/95 backdrop-blur-xl rounded-t-3xl border-t border-white/15 shadow-2xl"
                style={{ maxHeight: '78vh' }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-white/25" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏝️</span>
                        <span className="font-pixel text-white text-sm tracking-wide">島嶼管理</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Resource summary */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/80">
                            🌲 {Math.floor(worldLab.resources.wood)}
                            <span className="opacity-40 mx-0.5">·</span>
                            🪨 {Math.floor(worldLab.resources.stone)}
                            <span className="opacity-40 mx-0.5">·</span>
                            💎 {Math.floor(worldLab.resources.crystal)}
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-xs font-bold text-amber-300">
                            <Star size={10} fill="currentColor" />
                            {starBalance}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                            aria-label="關閉"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Flash message */}
                {message && (
                    <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-sm text-white text-center flex-shrink-0">
                        {message}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 px-3 pb-2 flex-shrink-0 overflow-x-auto">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-pixel whitespace-nowrap transition-all ${
                                tab === t.key
                                    ? 'bg-white/20 text-white border border-white/30 shadow'
                                    : 'bg-white/8 text-white/55 hover:bg-white/14 hover:text-white/80 border border-transparent'
                            }`}
                        >
                            <span>{t.emoji}</span>
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab content — scrollable */}
                <div className="overflow-y-auto flex-1 px-3 pb-6 space-y-3">

                    {/* ── 建築升級 ─────────────────────────────────────── */}
                    {tab === 'upgrade' && (
                        <div className="space-y-3">
                            <div className="text-xs text-white/50 px-1 pt-1">
                                升級建築可提升資源產量，建築總等級每累積 6 級，島嶼就會升一級。
                            </div>
                            <div className="rounded-xl bg-white/8 border border-white/12 px-3 py-2 text-xs text-white/60">
                                島 Lv.{worldLab.islandLevel} ／ 建築總等 {Object.values(worldLab.buildings).reduce((sum, lv) => sum + lv, 0)}
                            </div>
                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-300/30 px-3 py-3 text-xs text-emerald-100 space-y-1.5">
                                <div className="font-pixel text-[11px] text-emerald-200">⏱️ 每小時產量（分開顯示）</div>
                                <div>🌲 木材：+{productionRates.woodPerHour.toFixed(1)} /h（上限 {storageCapacity.woodCap}，約 {estimateHoursToCap(worldLab.resources.wood, productionRates.woodPerHour, storageCapacity.woodCap)} 滿倉）</div>
                                <div>🪨 石材：+{productionRates.stonePerHour.toFixed(1)} /h（上限 {storageCapacity.stoneCap}，約 {estimateHoursToCap(worldLab.resources.stone, productionRates.stonePerHour, storageCapacity.stoneCap)} 滿倉）</div>
                                <div>💎 晶礦：+{productionRates.crystalPerHour.toFixed(1)} /h（上限 {storageCapacity.crystalCap}，約 {estimateHoursToCap(worldLab.resources.crystal, productionRates.crystalPerHour, storageCapacity.crystalCap)} 滿倉）</div>
                                <div className="text-[10px] text-emerald-200/80">離線最多只結算 {storageCapacity.offlineHoursCap} 小時，所以太久沒開會被上限截斷。</div>
                            </div>
                            {BUILDING_UPGRADE_CARDS.map((building) => {
                                const level = worldLab.buildings[building.key];
                                const cost = getBuildingUpgradeCost(building.key);
                                return (
                                    <div key={building.key} className="rounded-2xl bg-white/8 border border-white/12 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="font-pixel text-white text-sm">{building.emoji} {building.title} <span className="text-amber-300">Lv.{level}</span></div>
                                                <div className="mt-1 text-xs text-white/60">{building.description}</div>
                                                <div className="mt-1.5 text-xs text-white/40">{building.unlockHint}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void upgradeBuilding(building.key, building.title)}
                                                disabled={starBalance < cost || saveWorldPersistence.isPending}
                                                className="shrink-0 rounded-xl px-3 py-2 text-xs font-pixel bg-amber-500/80 text-amber-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow"
                                            >
                                                升級 {cost}⭐
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── 資源補給 ─────────────────────────────────────── */}
                    {tab === 'supply' && (
                        <div className="space-y-3">
                            <div className="text-xs text-white/50 px-1 pt-1">
                                直接購買資源，省去等待時間。補給價格約為兌換單價的 10 倍。
                            </div>
                            {resourceSupplyCatalog.map((item) => (
                                <div key={item.resourceKey} className="rounded-2xl bg-white/8 border border-white/12 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-pixel text-white text-sm">{item.emoji} {item.title}</div>
                                            <div className="mt-1 text-xs text-white/60">一次補給 {item.quantity} 單位</div>
                                            <div className="mt-0.5 text-xs text-white/40">單價 {item.unitPrice.toFixed(3)} ⭐</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void buyResourceSupply(item.resourceKey, item.quantity, item.price, item.title)}
                                            disabled={starBalance < item.price}
                                            className="shrink-0 rounded-xl px-3 py-2 text-xs font-pixel bg-sky-500/80 text-sky-950 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow"
                                        >
                                            {item.price}⭐ 購買
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── 島嶼裝飾 ─────────────────────────────────────── */}
                    {tab === 'deco' && (
                        <div className="space-y-3">
                            {/* Summary bar */}
                            <div className="flex items-center justify-between px-1 pt-1">
                                <span className="text-xs text-white/50">消耗材料購買，可重複放置，共 {placedDecos.length}/24 個槽位</span>
                            </div>

                            {/* Category tabs */}
                            <div className="flex gap-1.5">
                                {(['wood', 'stone', 'crystal'] as const).map((cat) => {
                                    const labels = { wood: '🌲 木材', stone: '🪨 石材', crystal: '💎 晶礦' };
                                    const active = decoTab === cat;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setDecoTab(cat)}
                                            className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-pixel transition-all ${
                                                active
                                                    ? 'bg-white/20 text-white border border-white/30 shadow'
                                                    : 'bg-white/8 text-white/50 hover:bg-white/14 border border-transparent'
                                            }`}
                                        >
                                            {labels[cat]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Decoration grid */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {DECORATION_CATALOG.filter((e) => e.category === decoTab).map((entry) => {
                                    const placedCount = countPlaced(placedDecos, entry.id);
                                    const atMax = entry.maxCount !== -1 && placedCount >= entry.maxCount;
                                    const noSlots = findNextFreeSlot(placedDecos) === -1;
                                    const { wood = 0, stone = 0, crystal = 0 } = entry.cost;
                                    const canAfford =
                                        worldLab.resources.wood    >= wood &&
                                        worldLab.resources.stone   >= stone &&
                                        worldLab.resources.crystal >= crystal;

                                    return (
                                        <div
                                            key={entry.id}
                                            className={`rounded-2xl border p-3 flex flex-col gap-1.5 ${
                                                placedCount > 0
                                                    ? 'bg-emerald-500/10 border-emerald-400/30'
                                                    : 'bg-white/6 border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{entry.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-pixel text-white text-xs leading-tight">{entry.name}</div>
                                                    {placedCount > 0 && (
                                                        <div className="text-[10px] text-emerald-400 mt-0.5">
                                                            已放 {placedCount}/{entry.maxCount === -1 ? '∞' : entry.maxCount}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-white/45 leading-snug">{entry.description}</div>

                                            {/* Cost display */}
                                            <div className="flex gap-1.5 flex-wrap">
                                                {wood    > 0 && <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${worldLab.resources.wood    >= wood    ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>🌲 {wood}</span>}
                                                {stone   > 0 && <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${worldLab.resources.stone   >= stone   ? 'bg-slate-400/20 text-slate-300'   : 'bg-red-500/20 text-red-300'}`}>🪨 {stone}</span>}
                                                {crystal > 0 && <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${worldLab.resources.crystal >= crystal ? 'bg-cyan-500/20 text-cyan-300'     : 'bg-red-500/20 text-red-300'}`}>💎 {crystal}</span>}
                                            </div>

                                            <div className="flex gap-1.5 mt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => void buyDecoration(entry)}
                                                    disabled={atMax || noSlots || !canAfford || saveWorldPersistence.isPending}
                                                    className="flex-1 rounded-lg bg-purple-500/70 px-2 py-1.5 text-xs font-pixel text-purple-100 hover:bg-purple-400/70 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {atMax ? '已滿' : noSlots ? '無空位' : '＋放置'}
                                                </button>
                                                {placedCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDecoration(entry)}
                                                        className="rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white/50 hover:bg-red-500/30 hover:text-red-300 transition-colors"
                                                        title="移除一個"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── 資源兌換 ─────────────────────────────────────── */}
                    {tab === 'exchange' && (
                        <div className="space-y-3">
                            {/* WorldExchangePanel has its own background, wrap it */}
                            <div className="rounded-2xl overflow-hidden">
                                <WorldExchangePanel
                                    currentResources={worldLab.resources}
                                    basePrices={exchangePriceTable}
                                    marketMultiplier={1.0}
                                    onPreviewExchange={getExchangePreview}
                                    onConfirmExchange={async (sel) => {
                                        const result = await exchangeResources(sel);
                                        if (!result.ok && result.error) { flash(`❌ ${result.error}`); return; }
                                        if (typeof result.starsEarned === 'number') {
                                            flash(`🎉 兌換成功：+${result.starsEarned} ⭐`);
                                        }
                                    }}
                                />
                            </div>

                            {/* Recent logs */}
                            <div className="rounded-2xl bg-white/8 border border-white/12 p-3">
                                <div className="font-pixel text-white/70 text-xs mb-2">🧾 最近兌換紀錄</div>
                                {exchangeLogs.length === 0 ? (
                                    <div className="text-xs text-white/40 py-2 text-center">還沒有兌換紀錄</div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {exchangeLogs.slice(0, 5).map((log) => (
                                            <div key={log.id ?? `${log.created_at}-${log.stars_earned}`}
                                                className="flex items-center justify-between text-xs text-white/60 bg-white/6 rounded-lg px-2.5 py-1.5">
                                                <span>🌲 {log.sold_wood} · 🪨 {log.sold_stone} · 💎 {log.sold_crystal}</span>
                                                <span className="font-bold text-amber-300">+{log.stars_earned}⭐</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(panel, document.body) : panel;
};
