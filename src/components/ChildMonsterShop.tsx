import React, { useState } from 'react';
import { Store, Star } from 'lucide-react';
import { useChildMonsterShop, usePurchaseMonster } from '../hooks/useMonsterShop';
import { useUser } from '../contexts/UserContext';

interface ChildMonsterShopProps {
    userId: string;
    starBalance: number;
    inModal?: boolean;
}

export const ChildMonsterShop: React.FC<ChildMonsterShopProps> = ({ userId, starBalance, inModal = false }) => {
    const { user } = useUser();
    const familyId = user?.family_id;
    const { data: items = [], isLoading } = useChildMonsterShop(user?.family_id);
    const purchaseMutation = usePurchaseMonster();
    const [message, setMessage] = useState<string>('');

    if (!familyId) return null;

    const handleBuy = async (monsterId: string) => {
        try {
            const item = items.find((x) => x.monsterId === monsterId);
            if (!item) return;

            await purchaseMutation.mutateAsync({
                userId,
                familyId,
                monsterId: item.monsterId,
            });

            setMessage(`🎉 成功購買 ${item.name}！`);
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            const msg = error instanceof Error ? error.message : '購買失敗';
            setMessage(`❌ ${msg}`);
            setTimeout(() => setMessage(''), 2500);
        }
    };

    return (
        <div className={`clay-card ${inModal ? 'mt-0 p-4 sm:p-5' : 'mt-6 p-5 animate-bounce-in'}`} style={{ borderRadius: '20px' }}>
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--pastel-purple-bg)', border: '3px solid var(--pastel-purple-border)' }}
                >
                    <Store size={24} style={{ color: 'var(--pastel-purple-text)' }} />
                </div>
                <div>
                    <h2 className="font-heading text-xl font-bold text-ink">怪獸商店</h2>
                    <p className="font-body text-xs text-ink-soft">
                        家長上架的怪獸可以在這裡購買
                    </p>
                </div>
            </div>

            {message && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-white border-2 border-indigo-100 text-sm font-heading">
                    {message}
                </div>
            )}

            {isLoading ? (
                <p className="font-body text-sm text-gray-500">商店載入中...</p>
            ) : items.length === 0 ? (
                <div className="text-center py-6">
                    <div className="text-4xl mb-2">🛍️</div>
                    <p className="font-heading text-sm text-ink-soft">目前沒有上架商品</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {items.map((item) => {
                        const affordable = starBalance >= item.price;
                        return (
                            <div
                                key={item.monsterId}
                                className="relative p-3 rounded-2xl border-2 bg-white"
                                style={{ borderColor: 'var(--pastel-purple-border)' }}
                            >
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                                    <span className="text-[10px] font-bold text-amber-700">{item.price}</span>
                                </div>

                                <div className="w-14 h-14 mx-auto mt-2 mb-2 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center overflow-hidden">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-11 h-11 object-contain" />
                                    ) : (
                                        <span className="text-3xl">{item.emoji || '👾'}</span>
                                    )}
                                </div>

                                <h4 className="font-heading text-sm font-bold text-center mb-1 text-ink">
                                    {item.name}
                                </h4>
                                <p className="text-[11px] text-center text-gray-500 mb-2">{item.zone}</p>

                                <button
                                    type="button"
                                    onClick={() => handleBuy(item.monsterId)}
                                    disabled={!affordable || purchaseMutation.isPending}
                                    className={`w-full py-2 rounded-xl text-xs font-heading font-bold border-b-2 transition-all ${affordable
                                        ? 'bg-emerald-500 text-white border-emerald-700 hover:brightness-110 active:scale-95'
                                        : 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                                        }`}
                                >
                                    {affordable ? '購買' : '星幣不足'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
