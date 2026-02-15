import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { MONSTERS, type MonsterId } from './useTowerProgress';

export interface MonsterShopItem {
    id?: string;
    family_id: string;
    monster_id: MonsterId;
    price: number;
    is_enabled: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface MonsterShopCatalogItem {
    monsterId: MonsterId;
    name: string;
    image?: string;
    emoji?: string;
    zone: string;
    unlockFloor: number;
    isEnabled: boolean;
    price: number;
}

const getCatalog = (): MonsterShopCatalogItem[] => {
    return Object.values(MONSTERS)
        .map((m) => ({
            monsterId: m.id as MonsterId,
            name: m.name,
            image: m.image,
            emoji: m.emoji,
            zone: m.zone,
            unlockFloor: m.unlockFloor,
            isEnabled: false,
            price: 10,
        }))
        .sort((a, b) => a.unlockFloor - b.unlockFloor || a.name.localeCompare(b.name, 'zh-Hant'));
};

export const useParentMonsterShop = (familyId?: string) => {
    return useQuery({
        queryKey: ['monster-shop-parent', familyId],
        enabled: !!familyId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('monster_shop_items')
                .select('*')
                .eq('family_id', familyId!);

            if (error) throw error;

            const configured = new Map<string, MonsterShopItem>();
            (data || []).forEach((item) => configured.set(item.monster_id, item as MonsterShopItem));

            return getCatalog().map((item) => {
                const custom = configured.get(item.monsterId);
                return {
                    ...item,
                    isEnabled: custom?.is_enabled ?? false,
                    price: custom?.price ?? 10,
                };
            });
        },
    });
};

export const useChildMonsterShop = (familyId?: string) => {
    return useQuery({
        queryKey: ['monster-shop-child', familyId],
        enabled: !!familyId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('monster_shop_items')
                .select('*')
                .eq('family_id', familyId!)
                .eq('is_enabled', true)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return (data || [])
                .map((item) => {
                    const monster = MONSTERS[item.monster_id as MonsterId];
                    if (!monster) return null;
                    return {
                        monsterId: item.monster_id as MonsterId,
                        name: monster.name,
                        image: monster.image,
                        emoji: monster.emoji,
                        zone: monster.zone,
                        unlockFloor: monster.unlockFloor,
                        isEnabled: item.is_enabled,
                        price: item.price,
                    } as MonsterShopCatalogItem;
                })
                .filter((x): x is MonsterShopCatalogItem => !!x);
        },
    });
};

export const useUpsertMonsterShopItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            familyId,
            monsterId,
            price,
            isEnabled,
        }: {
            familyId: string;
            monsterId: MonsterId;
            price: number;
            isEnabled: boolean;
        }) => {
            const { error } = await supabase
                .from('monster_shop_items')
                .upsert(
                    {
                        family_id: familyId,
                        monster_id: monsterId,
                        price: Math.max(1, Math.floor(price)),
                        is_enabled: isEnabled,
                    },
                    { onConflict: 'family_id,monster_id' }
                );

            if (error) throw error;
            return true;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['monster-shop-parent', vars.familyId] });
            queryClient.invalidateQueries({ queryKey: ['monster-shop-child', vars.familyId] });
        },
    });
};

export const usePurchaseMonster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            familyId,
            monsterId,
        }: {
            userId: string;
            familyId: string;
            monsterId: MonsterId;
        }) => {
            // Validate item is currently enabled and get latest price
            const { data: item, error: itemError } = await supabase
                .from('monster_shop_items')
                .select('price, is_enabled')
                .eq('family_id', familyId)
                .eq('monster_id', monsterId)
                .single();

            if (itemError || !item || !item.is_enabled) {
                throw new Error('此怪獸目前未開放購買');
            }

            const price = item.price as number;

            // Verify balance
            let currentBalance = 0;
            try {
                const { data } = await supabase.rpc('get_child_star_balance', { child_id: userId });
                currentBalance = Number(data || 0);
            } catch {
                const { data: tx } = await supabase
                    .from('star_transactions')
                    .select('amount')
                    .eq('user_id', userId);
                currentBalance = (tx || []).reduce((sum, t) => sum + (t.amount || 0), 0);
            }

            if (currentBalance < price) {
                throw new Error(`星幣不足，需要 ${price} 星幣`);
            }

            // Spend stars
            const { error: txError } = await supabase
                .from('star_transactions')
                .insert({
                    user_id: userId,
                    amount: -price,
                    type: 'spend',
                    description: `商店購買: ${MONSTERS[monsterId].name}`,
                    game_id: `shop:${monsterId}`,
                });

            if (txError) throw txError;

            // Add monster to collection (tower progress)
            const { data: currentProgress, error: fetchError } = await supabase.rpc('get_tower_progress', {
                p_user_id: userId,
            });
            if (fetchError) throw fetchError;

            const currentMonsters: string[] = currentProgress?.monsters_collected || [];
            const nextMonsters = [...currentMonsters, monsterId];

            const { error: updateError } = await supabase.rpc('update_tower_progress', {
                p_user_id: userId,
                p_current_floor: currentProgress?.current_floor || 1,
                p_dice_count: currentProgress?.dice_count || 0,
                p_monsters_collected: nextMonsters,
                p_total_climbs: currentProgress?.total_climbs || 0,
                p_highest_floor: currentProgress?.highest_floor || 1,
                p_last_roll_result: null,
                p_last_event_type: null,
                p_last_event_floor: null,
            });

            if (updateError) throw updateError;

            return { monsterId, price };
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['star_balance', vars.userId] });
            queryClient.invalidateQueries({ queryKey: ['star_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['tower-progress', vars.userId] });
            queryClient.invalidateQueries({ queryKey: ['monster-shop-child', vars.familyId] });
        },
    });
};
