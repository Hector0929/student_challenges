import React from 'react';
import type {
    AdventureClaimResult,
    AdventureMission,
    AdventureMissionType,
    AdventureStatus,
} from '../lib/world/adventure';
import type { ProductionRates } from '../lib/world/types';
import type { PlotDetail, PlotPreview, WorldBuildingKey, WorldLabState } from '../hooks/useWorldState';
import type { ExchangePriceTable, ExchangePreviewResult } from '../lib/world/exchangeShop';
import type { WorldResources } from '../lib/world/types';
import type { BankRateSettings, DemandDepositAccount, TimeDeposit } from '../lib/world/bank';
import type { WorldExchangeLogRow } from '../types/database';
import { World3D } from './World3D';
import { WorldAdventurePanel } from './WorldAdventurePanel';
import { WorldBankPanel } from './WorldBankPanel';
import { WorldExchangePanel } from './WorldExchangePanel';

interface WorldPlanChecklistItem {
    id: string;
    title: string;
    phase: string;
}

interface PersistenceStatus {
    isLoading: boolean;
    isSaving: boolean;
    error?: string | null;
}

interface WorldLabPanelProps {
    worldLab: WorldLabState;
    worldRates: ProductionRates;
    plotPreviews: PlotPreview[];
    selectedPlotKey: string;
    selectedPlot: PlotDetail;
    isPlotUnlocked: (plotType: string) => boolean;
    isSelectedPlotUnlocked: boolean;
    onSelectPlot: (plotKey: string) => void;
    onSetTimeOfDay: (timeOfDay: 'day' | 'dusk') => void;
    selectedMissionType: AdventureMissionType;
    onSelectMissionType: (missionType: AdventureMissionType) => void;
    activeAdventure: AdventureMission | null;
    activeAdventureStatus: AdventureStatus;
    activeAdventureRemainingMs: number;
    lastAdventureResult: AdventureClaimResult | null;
    formatDuration: (ms: number) => string;
    onStartAdventure: () => void;
    onFastForwardAdventure: () => void;
    onClaimAdventure: () => void;
    onApplyProduction: (hours: number) => void;
    onSyncProduction: () => void;
    exchangePriceTable: ExchangePriceTable;
    onPreviewExchange: (selectedResources: WorldResources) => ExchangePreviewResult;
    onExchangeResourcesToStars: (selectedResources: WorldResources) => void;
    starBalance: number;
    bankNowIso: string;
    bankSettings: BankRateSettings;
    demandDepositAccount: DemandDepositAccount;
    timeDeposits: TimeDeposit[];
    onDepositDemand: (amount: number) => void;
    onWithdrawDemand: (amount: number) => void;
    onSettleDemandInterest: () => void;
    onCreateTimeDeposit: (amount: number) => void;
    onClaimTimeDeposit: (index: number) => void;
    onCancelTimeDeposit: (index: number) => void;
    onAdvanceBankDays: (days: number) => void;
    onUpgradeBuilding: (key: WorldBuildingKey) => void;
    exchangeLogs?: WorldExchangeLogRow[];
    worldPlanChecklist: WorldPlanChecklistItem[];
    persistenceStatus?: PersistenceStatus;
}

const BUILDING_CARDS: Array<{ key: WorldBuildingKey; label: string; desc: string }> = [
    { key: 'forest', label: '伐木場', desc: '提升木材產量' },
    { key: 'mine', label: '採礦場', desc: '提升石材產量' },
    { key: 'academy', label: '訓練所', desc: '提升全域生產效率' },
    { key: 'market', label: '交易所', desc: '提升資源兌星倍率' },
];

export const WorldLabPanel: React.FC<WorldLabPanelProps> = ({
    worldLab,
    worldRates,
    plotPreviews,
    selectedPlotKey,
    selectedPlot,
    isPlotUnlocked,
    isSelectedPlotUnlocked,
    onSelectPlot,
    onSetTimeOfDay,
    selectedMissionType,
    onSelectMissionType,
    activeAdventure,
    activeAdventureStatus,
    activeAdventureRemainingMs,
    lastAdventureResult,
    formatDuration,
    onStartAdventure,
    onFastForwardAdventure,
    onClaimAdventure,
    onApplyProduction,
    onSyncProduction,
    exchangePriceTable,
    onPreviewExchange,
    onExchangeResourcesToStars,
    starBalance,
    bankNowIso,
    bankSettings,
    demandDepositAccount,
    timeDeposits,
    onDepositDemand,
    onWithdrawDemand,
    onSettleDemandInterest,
    onCreateTimeDeposit,
    onClaimTimeDeposit,
    onCancelTimeDeposit,
    onAdvanceBankDays,
    onUpgradeBuilding,
    exchangeLogs = [],
    worldPlanChecklist,
    persistenceStatus,
}) => {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="font-pixel text-lg">🌍 可擴建懸空島（3D 視覺原型）</h3>
                        <p className="text-sm text-gray-600 mt-1">這裡是孩子的世界主視圖。下一步會把建築等級、地塊擴建、角色成長直接反映到 3D 場景。</p>
                    </div>
                    {persistenceStatus && (
                        <div className="text-xs rounded-lg border px-3 py-2 bg-slate-50 border-slate-200 text-slate-600">
                            {persistenceStatus.error
                                ? `雲端同步失敗：${persistenceStatus.error}`
                                : persistenceStatus.isLoading
                                    ? '雲端載入中...'
                                    : persistenceStatus.isSaving
                                        ? '雲端儲存中...'
                                        : '雲端已同步'}
                        </div>
                    )}
                </div>
                <div className="mb-3 flex items-center gap-2">
                    <button
                        onClick={() => onSetTimeOfDay('day')}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${worldLab.timeOfDay === 'day'
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-white border-gray-300 text-gray-600'
                            }`}
                    >
                        ☀️ 白天
                    </button>
                    <button
                        onClick={() => onSetTimeOfDay('dusk')}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${worldLab.timeOfDay === 'dusk'
                            ? 'bg-violet-100 border-violet-300 text-violet-800'
                            : 'bg-white border-gray-300 text-gray-600'
                            }`}
                    >
                        🌇 黃昏
                    </button>
                    <span className="text-xs text-gray-500">用來驗證場景氛圍與建築發光效果</span>
                </div>
                <World3D
                    islandLevel={worldLab.islandLevel}
                    timeOfDay={worldLab.timeOfDay}
                    selectedPlotKey={selectedPlotKey}
                    onPlotSelect={onSelectPlot}
                    buildings={worldLab.buildings}
                />
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h3 className="font-pixel text-lg mb-3">🏝️ 懸空島 + 角色發展（Debug Prototype）</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                        <p className="text-xs text-sky-700">島嶼等級</p>
                        <p className="font-pixel text-2xl text-sky-900">Lv.{worldLab.islandLevel}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-xs text-purple-700">角色等級</p>
                        <p className="font-pixel text-2xl text-purple-900">Lv.{worldLab.heroLevel}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700">角色戰力</p>
                        <p className="font-pixel text-2xl text-amber-900">{worldLab.heroPower}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-xs text-emerald-700">商店倍率</p>
                        <p className="font-pixel text-2xl text-emerald-900">x{(1 + worldLab.buildings.market * 0.08).toFixed(2)}</p>
                    </div>
                    <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-3 col-span-2 md:col-span-1">
                        <p className="text-xs text-fuchsia-700">怪獸碎片</p>
                        <p className="font-pixel text-2xl text-fuchsia-900">{worldLab.monsterShards}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-pixel text-lg mb-3">🧩 小島功能地塊</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {plotPreviews.map((plot, index) => {
                            const unlocked = isPlotUnlocked(plot.key);
                            const plotKey = `${plot.key}-${index}`;
                            return (
                                <div
                                    key={plot.key}
                                    onClick={() => unlocked && onSelectPlot(plotKey)}
                                    className={`rounded-lg border p-3 transition-all ${unlocked ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:shadow-sm' : 'bg-slate-50 border-slate-200'} ${selectedPlotKey === plotKey ? 'ring-2 ring-amber-300' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-heading font-bold">{plot.label}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded ${unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {unlocked ? '已解鎖' : `Lv.${plot.unlockAt}`}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600">{plot.status}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h3 className="font-pixel text-lg mb-3">🔎 地塊詳細資訊</h3>
                    <div className={`rounded-lg border p-4 ${isSelectedPlotUnlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-heading font-bold text-lg">{selectedPlot.label}</p>
                            <span className={`text-xs px-2 py-1 rounded ${isSelectedPlotUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                {isSelectedPlotUnlocked ? '已啟用' : `島 Lv.${selectedPlot.unlockAt} 解鎖`}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{selectedPlot.description}</p>
                        <div className="space-y-2 text-sm text-gray-700">
                            <div>• 狀態：{selectedPlot.status}</div>
                            <div>• 工人 / 精靈數：{selectedPlot.workerCount}</div>
                            <div>• 資源 / 效果：{selectedPlot.resourceText}</div>
                            <div>• 搬運路線：{selectedPlot.routeText}</div>
                        </div>

                        {selectedPlot.key === 'adventure-5' && isSelectedPlotUnlocked && (
                            <WorldAdventurePanel
                                selectedMissionType={selectedMissionType}
                                onSelectMissionType={onSelectMissionType}
                                activeAdventure={activeAdventure}
                                activeAdventureStatus={activeAdventureStatus}
                                activeAdventureRemainingMs={activeAdventureRemainingMs}
                                lastAdventureResult={lastAdventureResult}
                                formatDuration={formatDuration}
                                onStartAdventure={onStartAdventure}
                                onFastForwardAdventure={onFastForwardAdventure}
                                onClaimAdventure={onClaimAdventure}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h3 className="font-pixel text-lg mb-3">⚙️ 生產與兌換</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        🌲 木材：{Math.floor(worldLab.resources.wood)}（{worldRates.woodPerHour.toFixed(1)}/h）
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        🪨 石材：{Math.floor(worldLab.resources.stone)}（{worldRates.stonePerHour.toFixed(1)}/h）
                    </div>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                        💎 晶礦：{Math.floor(worldLab.resources.crystal)}（{worldRates.crystalPerHour.toFixed(1)}/h）
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        onClick={() => onApplyProduction(8)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg border border-blue-300 hover:bg-blue-200"
                    >
                        ⏱️ 模擬離線 8 小時
                    </button>
                    <button
                        onClick={onSyncProduction}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200"
                    >
                        🔄 同步即時產出
                    </button>
                </div>

                <WorldExchangePanel
                    currentResources={worldLab.resources}
                    basePrices={exchangePriceTable}
                    marketMultiplier={1 + worldLab.buildings.market * 0.08}
                    onPreviewExchange={onPreviewExchange}
                    onConfirmExchange={onExchangeResourcesToStars}
                />

                <WorldBankPanel
                    starBalance={starBalance}
                    bankNowIso={bankNowIso}
                    bankSettings={bankSettings}
                    demandDepositAccount={demandDepositAccount}
                    timeDeposits={timeDeposits}
                    onDepositDemand={onDepositDemand}
                    onWithdrawDemand={onWithdrawDemand}
                    onSettleDemandInterest={onSettleDemandInterest}
                    onCreateTimeDeposit={onCreateTimeDeposit}
                    onClaimTimeDeposit={onClaimTimeDeposit}
                    onCancelTimeDeposit={onCancelTimeDeposit}
                    onAdvanceDays={onAdvanceBankDays}
                />

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                            <h4 className="font-pixel text-base">🧾 最近兌換紀錄</h4>
                            <p className="text-xs text-amber-700 mt-1">正式資料表會保留最近的世界資源兌換紀錄</p>
                        </div>
                    </div>
                    {exchangeLogs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-amber-300 bg-white p-4 text-sm text-amber-700">
                            目前還沒有兌換紀錄
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {exchangeLogs.map((log) => (
                                <div key={log.id ?? `${log.created_at}-${log.stars_earned}`} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                        <div className="font-heading font-bold text-amber-900">+{log.stars_earned} ⭐</div>
                                        <div className="text-xs text-amber-700">
                                            {log.created_at ? new Date(log.created_at).toLocaleString('zh-TW') : '剛剛'}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        賣出：🌲 {log.sold_wood} / 🪨 {log.sold_stone} / 💎 {log.sold_crystal}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        基準價：{log.base_wood_rate.toFixed(3)} / {log.base_stone_rate.toFixed(3)} / {log.base_crystal_rate.toFixed(3)} ｜ 商店倍率 x{log.market_multiplier.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h3 className="font-pixel text-lg mb-3">🏗️ 建築升級（消耗星幣）</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {BUILDING_CARDS.map((building) => {
                        const lv = worldLab.buildings[building.key];
                        const cost = Math.floor(30 * Math.pow(lv + 1, 1.35));
                        return (
                            <div key={building.key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-heading font-bold">{building.label} Lv.{lv}</p>
                                        <p className="text-xs text-gray-500">{building.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => onUpgradeBuilding(building.key)}
                                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm"
                                    >
                                        升級（{cost}⭐）
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h3 className="font-pixel text-lg mb-3">🗺️ 實作計劃清單（Debug 先行）</h3>
                <div className="space-y-2">
                    {worldPlanChecklist.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 bg-gray-50">
                            <input type="checkbox" readOnly className="mt-1" />
                            <div>
                                <p className="font-heading text-sm">[{item.phase}] {item.title}</p>
                                <p className="text-xs text-gray-500">Task ID: {item.id}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};