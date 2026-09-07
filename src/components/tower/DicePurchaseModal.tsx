import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { usePurchaseDice } from '../../hooks/useTowerProgress';
import { useStarBalance } from '../../hooks/useQuests';

/** Purchase dice modal — shared between Monster Tower V2 and Gen3 */
export const DicePurchaseModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
    const [packs, setPacks] = useState(1); // 1 pack = 2 dice
    const purchaseDiceMutation = usePurchaseDice();
    const { data: starBalance = 0 } = useStarBalance(userId);
    const pricePerPack = 5;
    const totalCost = packs * pricePerPack;
    const diceCount = packs * 2;
    const canAfford = starBalance >= totalCost;
    const handlePurchase = async () => { try { await purchaseDiceMutation.mutateAsync({ userId, diceAmount: diceCount }); onClose(); } catch { console.error('Purchase failed'); } };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000]" data-testid="purchase-modal">
            <div className="bg-slate-800 rounded-3xl p-6 w-80 shadow-2xl tv2-pop-in border border-slate-600">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-300"><ShoppingCart size={22} /> 購買骰子</h3>
                <div className="mb-4 text-sm space-y-1 text-slate-300">
                    <p>優惠方案: <span className="font-bold text-cyan-300">5 ⭐ / 2 顆</span></p>
                    <p>你的星幣: <span className="font-bold text-cyan-300">{starBalance} ⭐</span></p>
                </div>
                <div className="flex items-center justify-center gap-6 mb-4">
                    <button onClick={() => setPacks(Math.max(1, packs - 1))} className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 text-2xl font-bold transition-colors active:scale-95 text-slate-200">−</button>
                    <div className="flex flex-col items-center">
                        <span className="text-4xl font-black tabular-nums text-white">{diceCount}</span>
                        <span className="text-xs text-slate-400">顆骰子</span>
                    </div>
                    <button onClick={() => setPacks(packs + 1)} className="w-12 h-12 rounded-2xl bg-slate-700 hover:bg-slate-600 text-2xl font-bold transition-colors active:scale-95 text-slate-200">+</button>
                </div>
                <p className="text-center mb-4 text-lg text-slate-200">總價: <span className="font-black text-2xl text-orange-400">{totalCost} ⭐</span></p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 font-bold transition-colors text-slate-200">取消</button>
                    <button onClick={handlePurchase} disabled={!canAfford || purchaseDiceMutation.isPending} className="flex-1 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {purchaseDiceMutation.isPending ? '購買中...' : '確認購買'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DicePurchaseModal;
