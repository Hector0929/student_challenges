import React, { useMemo, useState } from 'react';
import type { ExchangePriceTable, ExchangePreviewResult } from '../lib/world/exchangeShop';
import type { WorldResources } from '../lib/world/types';

interface WorldExchangePanelProps {
    currentResources: WorldResources;
    basePrices: ExchangePriceTable;
    marketMultiplier: number;
    onPreviewExchange: (selectedResources: WorldResources) => ExchangePreviewResult;
    onConfirmExchange: (selectedResources: WorldResources) => void | Promise<void>;
}

const RESOURCE_CONFIG: Array<{ key: keyof WorldResources; label: string; emoji: string }> = [
    { key: 'wood', label: '木材', emoji: '🌲' },
    { key: 'stone', label: '石材', emoji: '🪨' },
    { key: 'crystal', label: '晶礦', emoji: '💎' },
];

export const WorldExchangePanel: React.FC<WorldExchangePanelProps> = ({
    currentResources,
    basePrices,
    marketMultiplier,
    onPreviewExchange,
    onConfirmExchange,
}) => {
    const [selectedResources, setSelectedResources] = useState<WorldResources>({ wood: 0, stone: 0, crystal: 0 });

    const preview = useMemo(() => onPreviewExchange(selectedResources), [onPreviewExchange, selectedResources]);

    const handleQuantityChange = (resourceKey: keyof WorldResources, value: string) => {
        const parsedValue = value === '' ? 0 : Math.max(0, Math.floor(Number(value) || 0));
        const nextValue = Math.min(parsedValue, Math.floor(currentResources[resourceKey]));

        setSelectedResources((prev) => ({
            ...prev,
            [resourceKey]: nextValue,
        }));
    };

    const applyQuickQuantity = (resourceKey: keyof WorldResources, mode: 'half' | 'max' | 'clear') => {
        const maxAmount = Math.floor(currentResources[resourceKey]);
        const nextValue = mode === 'clear'
            ? 0
            : mode === 'half'
                ? Math.floor(maxAmount / 2)
                : maxAmount;

        setSelectedResources((prev) => ({
            ...prev,
            [resourceKey]: nextValue,
        }));
    };

    const resetSelection = () => {
        setSelectedResources({ wood: 0, stone: 0, crystal: 0 });
    };

    return (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                    <h4 className="font-pixel text-base">🏪 兌換店</h4>
                    <p className="text-xs text-emerald-700 mt-1">可自行選擇要賣出的數量，且不得超過目前持有量</p>
                </div>
                <div className="text-xs text-emerald-800 rounded-lg bg-white border border-emerald-200 px-3 py-2">
                    商店倍率 x{marketMultiplier.toFixed(2)}
                </div>
            </div>

            <div className="space-y-3">
                {RESOURCE_CONFIG.map((resource) => (
                    <div key={resource.key} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center rounded-lg bg-white border border-emerald-100 p-3">
                        <div>
                            <div className="font-heading font-bold">{resource.emoji} {resource.label}</div>
                            <div className="text-xs text-gray-600">
                                持有 {Math.floor(currentResources[resource.key])} ｜單價 {basePrices[resource.key].toFixed(3)} ⭐
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => applyQuickQuantity(resource.key, 'half')}
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-heading text-emerald-800 hover:bg-emerald-100"
                                    aria-label={`${resource.label}賣一半`}
                                >
                                    半量
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyQuickQuantity(resource.key, 'max')}
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-heading text-emerald-800 hover:bg-emerald-100"
                                    aria-label={`${resource.label}全部賣出`}
                                >
                                    全賣
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyQuickQuantity(resource.key, 'clear')}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-heading text-slate-700 hover:bg-slate-100"
                                    aria-label={`${resource.label}清空賣出數量`}
                                >
                                    清空
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-gray-600">倍率後 {preview.finalUnitPrices[resource.key].toFixed(3)}</div>
                        <input
                            aria-label={`${resource.label}賣出數量`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={selectedResources[resource.key] === 0 ? '' : selectedResources[resource.key]}
                            onChange={(event) => handleQuantityChange(resource.key, event.target.value)}
                            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            placeholder="0"
                        />
                        <div className="text-xs text-gray-500">剩餘 {preview.remainingResources[resource.key]}</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    預計賣出：{preview.soldResources.wood + preview.soldResources.stone + preview.soldResources.crystal} 單位
                </div>
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                    預估星幣：{preview.starsEarned} ⭐
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    售價公式：基準價 × 商店倍率
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    onClick={async () => {
                        await onConfirmExchange(selectedResources);
                        resetSelection();
                    }}
                    disabled={preview.starsEarned <= 0}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    💰 確認賣出資源
                </button>
                <button
                    type="button"
                    onClick={resetSelection}
                    className="px-4 py-2 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                    ↺ 清空全部
                </button>
            </div>
        </div>
    );
};