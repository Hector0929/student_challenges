import React from 'react';
import { Coins, Landmark, Pickaxe, Trees } from 'lucide-react';
import { useWorldPersistence } from '../hooks/useWorldPersistence';

interface ChildWorldSummaryCardProps {
    userId: string;
    onOpenShopStreet: () => void;
}

export const ChildWorldSummaryCard: React.FC<ChildWorldSummaryCardProps> = ({ userId, onOpenShopStreet }) => {
    const { data: worldSnapshot, isLoading } = useWorldPersistence(userId);

    if (isLoading) {
        return (
            <div className="clay-card mb-6 p-5" style={{ borderRadius: '20px' }}>
                <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>世界經濟載入中...</p>
            </div>
        );
    }

    const worldLab = worldSnapshot?.worldLab;
    const bankBalance = worldSnapshot?.demandDepositAccount.balance ?? 0;
    const depositCount = worldSnapshot?.timeDeposits.length ?? 0;

    return (
        <div className="clay-card mb-6 p-5 animate-bounce-in" style={{ borderRadius: '20px' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>🏬 世界經濟</h3>
                    <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>
                        你的資源、銀行與世界商店街都在這裡。
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onOpenShopStreet}
                    className="clay-btn py-2 px-4 text-sm"
                    style={{ borderRadius: '12px' }}
                >
                    前往商店街
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-emerald-700 mb-1"><Trees size={16} />木材</div>
                    <div className="font-heading text-lg font-bold text-emerald-900">{Math.floor(worldLab?.resources.wood ?? 0)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-700 mb-1"><Pickaxe size={16} />石材 / 晶礦</div>
                    <div className="font-heading text-lg font-bold text-slate-900">{Math.floor(worldLab?.resources.stone ?? 0)} / {Math.floor(worldLab?.resources.crystal ?? 0)}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-amber-700 mb-1"><Coins size={16} />活存餘額</div>
                    <div className="font-heading text-lg font-bold text-amber-900">{bankBalance} ⭐</div>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-sky-700 mb-1"><Landmark size={16} />島嶼 / 定存</div>
                    <div className="font-heading text-lg font-bold text-sky-900">Lv.{worldLab?.islandLevel ?? 1} / {depositCount} 張</div>
                </div>
            </div>
        </div>
    );
};