import React, { useEffect, useMemo, useState } from 'react';
import { Store, Save } from 'lucide-react';
import { ToggleSwitch } from './ToggleSwitch';
import { useParentMonsterShop, useUpsertMonsterShopItem } from '../hooks/useMonsterShop';
import type { MonsterId } from '../hooks/useTowerProgress';

interface ParentMonsterShopManagerProps {
    familyId: string;
}

type DraftItem = {
    price: string;
    isEnabled: boolean;
};

export const ParentMonsterShopManager: React.FC<ParentMonsterShopManagerProps> = ({ familyId }) => {
    const { data: items = [], isLoading } = useParentMonsterShop(familyId);
    const upsertMutation = useUpsertMonsterShopItem();
    const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});

    useEffect(() => {
        const next: Record<string, DraftItem> = {};
        items.forEach((item) => {
            next[item.monsterId] = {
                price: String(item.price),
                isEnabled: item.isEnabled,
            };
        });
        setDrafts(next);
    }, [items]);

    const enabledCount = useMemo(
        () => Object.values(drafts).filter((d) => d.isEnabled).length,
        [drafts]
    );

    const handleSave = async (monsterId: MonsterId) => {
        const draft = drafts[monsterId];
        if (!draft) return;

        const priceNum = Math.max(1, parseInt(draft.price || '0', 10) || 1);
        await upsertMutation.mutateAsync({
            familyId,
            monsterId,
            price: priceNum,
            isEnabled: draft.isEnabled,
        });
    };

    if (isLoading) {
        return (
            <div className="clay-card p-4 rounded-2xl">
                <p className="font-body text-sm text-gray-500">商店設定載入中...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Store size={18} className="text-indigo-600" />
                    <span className="font-heading font-bold text-sm text-indigo-800">怪獸商店設定</span>
                </div>
                <span className="text-xs font-heading text-gray-500">已上架 {enabledCount} / {items.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => {
                    const draft = drafts[item.monsterId] || { price: '10', isEnabled: false };
                    return (
                        <div key={item.monsterId} className="bg-white border-2 border-indigo-100 rounded-2xl p-3">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center overflow-hidden">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-9 h-9 object-contain" />
                                    ) : (
                                        <span className="text-2xl">{item.emoji || '👾'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-heading font-bold text-sm text-gray-800 truncate">{item.name}</h4>
                                    <p className="text-xs text-gray-500">{item.zone} · {item.unlockFloor}層</p>
                                </div>
                                <ToggleSwitch
                                    enabled={draft.isEnabled}
                                    onChange={(v) => setDrafts((prev) => ({
                                        ...prev,
                                        [item.monsterId]: { ...draft, isEnabled: v },
                                    }))}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500">售價</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={draft.price}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '' || /^\d+$/.test(v)) {
                                            setDrafts((prev) => ({
                                                ...prev,
                                                [item.monsterId]: { ...draft, price: v },
                                            }));
                                        }
                                    }}
                                    onBlur={() => {
                                        const n = Math.max(1, parseInt(draft.price || '0', 10) || 1);
                                        setDrafts((prev) => ({
                                            ...prev,
                                            [item.monsterId]: { ...draft, price: String(n) },
                                        }));
                                    }}
                                    className="w-20 px-2 py-1 border-2 border-indigo-100 rounded-lg text-center text-sm font-heading"
                                />
                                <span className="text-xs text-yellow-600 font-bold">⭐</span>
                                <button
                                    type="button"
                                    onClick={() => handleSave(item.monsterId)}
                                    disabled={upsertMutation.isPending}
                                    className="ml-auto px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-heading font-bold border-b-2 border-indigo-700 hover:brightness-110 disabled:opacity-60 flex items-center gap-1"
                                >
                                    <Save size={12} />
                                    儲存
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
