import React, { useState } from 'react';
import {
    getTimeDepositStatus,
    type BankRateSettings,
    type DemandDepositAccount,
    type TimeDeposit,
} from '../lib/world/bank';

interface WorldBankPanelProps {
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
    onAdvanceDays: (days: number) => void;
}

export const WorldBankPanel: React.FC<WorldBankPanelProps> = ({
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
    onAdvanceDays,
}) => {
    const [demandAmount, setDemandAmount] = useState('');
    const [timeDepositAmount, setTimeDepositAmount] = useState('');

    const commitDemandDeposit = () => {
        const amount = Math.max(0, Math.floor(Number(demandAmount) || 0));
        if (amount <= 0) return;
        onDepositDemand(amount);
        setDemandAmount('');
    };

    const commitDemandWithdraw = () => {
        const amount = Math.max(0, Math.floor(Number(demandAmount) || 0));
        if (amount <= 0) return;
        onWithdrawDemand(amount);
        setDemandAmount('');
    };

    const commitTimeDeposit = () => {
        const amount = Math.max(0, Math.floor(Number(timeDepositAmount) || 0));
        if (amount <= 0) return;
        onCreateTimeDeposit(amount);
        setTimeDepositAmount('');
    };

    return (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                    <h4 className="font-pixel text-base">🏦 銀行</h4>
                    <p className="text-xs text-sky-700 mt-1">提供活存與定存，並可用 Debug 快轉模擬到期與結息</p>
                </div>
                <div className="text-xs rounded-lg border border-sky-200 bg-white px-3 py-2 text-sky-800">
                    目前星幣 {starBalance} ⭐ ｜ 銀行時間 {new Date(bankNowIso).toLocaleDateString('zh-TW')}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-lg border border-sky-200 bg-white p-3">
                    <div className="font-heading font-bold mb-1">活存</div>
                    <div>餘額：{demandDepositAccount.balance} ⭐</div>
                    <div>日利率：{(bankSettings.demandDailyRate * 100).toFixed(2)}%</div>
                    <div>上次結息：{new Date(demandDepositAccount.lastInterestAt).toLocaleDateString('zh-TW')}</div>
                </div>
                <div className="rounded-lg border border-sky-200 bg-white p-3">
                    <div className="font-heading font-bold mb-1">定存</div>
                    <div>最低天數：{bankSettings.minTimeDepositDays} 天</div>
                    <div>日利率：{(bankSettings.timeDepositDailyRate * 100).toFixed(2)}%</div>
                    <div>提前解約違約金：{(bankSettings.earlyWithdrawPenaltyRate * 100).toFixed(2)}%</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-sky-200 bg-white p-4 space-y-3">
                    <div className="font-heading font-bold">活存操作</div>
                    <input
                        aria-label="活存金額"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={demandAmount}
                        onChange={(event) => setDemandAmount(event.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="輸入活存金額"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button onClick={commitDemandDeposit} className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">🏦 存入活存</button>
                        <button onClick={commitDemandWithdraw} className="px-4 py-2 bg-white text-sky-700 rounded-lg border border-sky-300 hover:bg-sky-50">💸 提領活存</button>
                        <button onClick={onSettleDemandInterest} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-300 hover:bg-indigo-200">💹 活存結息</button>
                    </div>
                </div>

                <div className="rounded-lg border border-sky-200 bg-white p-4 space-y-3">
                    <div className="font-heading font-bold">定存操作</div>
                    <input
                        aria-label="定存金額"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={timeDepositAmount}
                        onChange={(event) => setTimeDepositAmount(event.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder={`至少 ${bankSettings.minTimeDepositDays} 天的定存本金`}
                    />
                    <div className="flex flex-wrap gap-2">
                        <button onClick={commitTimeDeposit} className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600">🔒 建立定存</button>
                        <button onClick={() => onAdvanceDays(1)} className="px-4 py-2 bg-white text-violet-700 rounded-lg border border-violet-300 hover:bg-violet-50">⏩ 快轉 1 天</button>
                        <button onClick={() => onAdvanceDays(bankSettings.minTimeDepositDays)} className="px-4 py-2 bg-white text-violet-700 rounded-lg border border-violet-300 hover:bg-violet-50">⏩ 快轉 {bankSettings.minTimeDepositDays} 天</button>
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                <div className="font-heading font-bold text-sm">定存清單</div>
                {timeDeposits.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-sky-300 bg-white p-4 text-sm text-sky-700">
                        目前沒有定存單
                    </div>
                ) : (
                    timeDeposits.map((deposit, index) => {
                        const status = getTimeDepositStatus(deposit, bankNowIso);
                        const expectedInterest = Math.floor(deposit.principal * deposit.dailyRate * deposit.termDays);
                        return (
                            <div key={`${deposit.startAt}-${index}`} className="rounded-lg border border-sky-200 bg-white p-4 text-sm space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-heading font-bold">定存 #{index + 1}</div>
                                    <div className="text-xs rounded-full px-2 py-1 bg-sky-100 text-sky-700">{status}</div>
                                </div>
                                <div>本金：{deposit.principal} ⭐</div>
                                <div>到期日：{new Date(deposit.maturesAt).toLocaleDateString('zh-TW')}</div>
                                <div>預估收益：+{expectedInterest} ⭐</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => onClaimTimeDeposit(index)}
                                        disabled={status !== 'matured'}
                                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        🎁 領取定存
                                    </button>
                                    <button
                                        onClick={() => onCancelTimeDeposit(index)}
                                        disabled={status !== 'active'}
                                        className="px-3 py-1.5 bg-white text-rose-700 rounded-lg border border-rose-300 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ⚠️ 提前解約
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};