import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TowerProgress, TowerEvent } from '../types/database';

// Fetch user's tower progress via RPC (bypasses RLS)
export const useTowerProgress = (userId?: string) => {
    return useQuery({
        queryKey: ['tower-progress', userId],
        queryFn: async () => {
            if (!userId) return null;

            // Use RPC to bypass RLS issues with child profiles
            const { data, error } = await supabase.rpc('get_tower_progress', {
                p_user_id: userId
            });

            if (error) {
                console.error('Failed to get tower progress:', error);
                // Return default values on error
                return {
                    id: '',
                    user_id: userId,
                    current_floor: 1,
                    dice_count: 3,
                    monsters_collected: [] as string[],
                    total_climbs: 0,
                    highest_floor: 1,
                    last_roll_result: undefined,
                    last_event_type: undefined,
                    last_event_floor: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as TowerProgress;
            }

            return data as TowerProgress;
        },
        enabled: !!userId,
    });
};

// Fetch all tower events
export const useTowerEvents = () => {
    return useQuery({
        queryKey: ['tower-events'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tower_events')
                .select('*')
                .eq('is_active', true)
                .order('floor_number');

            if (error) throw error;
            return data as TowerEvent[];
        },
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
    });
};

// Roll dice and move - uses RPC to bypass RLS
export const useRollDice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, currentFloor }: { userId: string; currentFloor: number }) => {
            // Generate random roll (1-6)
            const roll = Math.floor(Math.random() * 6) + 1;
            let newFloor = Math.min(currentFloor + roll, 100);

            // Check for events at the new floor
            const { data: event } = await supabase
                .from('tower_events')
                .select('*')
                .eq('floor_number', newFloor)
                .eq('is_active', true)
                .single();

            let eventResult: TowerEvent | null = null;
            let monstersToAdd: string[] = [];

            if (event) {
                eventResult = event as TowerEvent;

                if (event.event_type === 'ladder' && event.target_floor) {
                    newFloor = event.target_floor;
                } else if (event.event_type === 'trap' && event.target_floor) {
                    newFloor = event.target_floor;
                } else if (event.event_type === 'egg' && event.monster_id) {
                    monstersToAdd = [event.monster_id];
                }
            }

            // Get current progress via RPC (bypasses RLS)
            const { data: currentProgress, error: fetchError } = await supabase.rpc('get_tower_progress', {
                p_user_id: userId
            });

            if (fetchError) {
                console.error('Roll failed:', fetchError);
                throw new Error('無法取得塔進度');
            }

            const currentMonsters = currentProgress?.monsters_collected || [];
            const newMonsters = [...new Set([...currentMonsters, ...monstersToAdd])];
            const newHighest = Math.max(currentProgress?.highest_floor || 1, newFloor);
            const newDiceCount = Math.max(0, (currentProgress?.dice_count || 1) - 1);

            // Update progress via RPC (bypasses RLS)
            const { data: updateResult, error: updateError } = await supabase.rpc('update_tower_progress', {
                p_user_id: userId,
                p_current_floor: newFloor,
                p_dice_count: newDiceCount,
                p_monsters_collected: newMonsters,
                p_total_climbs: (currentProgress?.total_climbs || 0) + 1,
                p_highest_floor: newHighest,
                p_last_roll_result: roll,
                p_last_event_type: eventResult?.event_type || null,
                p_last_event_floor: eventResult?.floor_number || null,
            });

            if (updateError) {
                console.error('Roll failed:', updateError);
                throw new Error('無法更新塔進度');
            }

            if (updateResult?.success === false) {
                throw new Error(updateResult.message || '更新失敗');
            }

            return {
                progress: {
                    ...currentProgress,
                    current_floor: newFloor,
                    dice_count: newDiceCount,
                    monsters_collected: newMonsters,
                    total_climbs: (currentProgress?.total_climbs || 0) + 1,
                    highest_floor: newHighest,
                    last_roll_result: roll,
                    last_event_type: eventResult?.event_type || null,
                    last_event_floor: eventResult?.floor_number || null,
                } as TowerProgress,
                roll,
                event: eventResult,
                reachedTop: newFloor >= 100,
            };
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
        },
        onError: (error) => {
            console.error('Roll failed:', error);
        },
    });
};

// Add dice (called when completing quests)
export const useAddDice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
            const { data: current } = await supabase
                .from('tower_progress')
                .select('dice_count')
                .eq('user_id', userId)
                .single();

            const newCount = (current?.dice_count || 0) + amount;

            const { data, error } = await supabase
                .from('tower_progress')
                .update({ dice_count: newCount })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data as TowerProgress;
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
        },
    });
};

// Reset tower (when reaching top, start over with bonus)
export const useResetTower = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            const { data, error } = await supabase
                .from('tower_progress')
                .update({
                    current_floor: 1,
                    dice_count: 5, // Bonus dice for completing tower
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;
            return data as TowerProgress;
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
        },
    });
};

// Purchase dice with stars
export const usePurchaseDice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, diceAmount }: { userId: string; diceAmount: number }) => {
            const { data, error } = await supabase.rpc('purchase_dice', {
                p_user_id: userId,
                p_dice_amount: diceAmount
            });

            if (error) throw error;

            // Check application-level success
            if (data && data.success === false) {
                throw new Error(data.message || '購買失敗');
            }

            return data;
        },
        onSuccess: (_data, { userId }) => {
            // Invalidate queries to update UI
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            // Also invalidate star balance usually in useStarBalance
            queryClient.invalidateQueries({ queryKey: ['starBalance', userId] });
        },
    });
};

// Monster info helper - using new generated pixel art assets
export const MONSTERS = {
    slime: {
        id: 'slime',
        name: '小綠球',
        emoji: '🟢',
        image: '/images/monsters/slime_new.png',
        zone: '森林入口',
        unlockFloor: 25,
    },
    water_spirit: {
        id: 'water_spirit',
        name: '水晶精靈',
        emoji: '🔵',
        image: '/images/monsters/crystal.png',
        zone: '水晶洞穴',
        unlockFloor: 50,
    },
    flame_bird: {
        id: 'flame_bird',
        name: '火焰鳥',
        emoji: '🟠',
        image: '/images/monsters/fire.png',
        zone: '熔岩地帶',
        unlockFloor: 75,
    },
    thunder_cloud: {
        id: 'thunder_cloud',
        name: '雷雲君',
        emoji: '🟣',
        image: '/images/monsters/thunder.png',
        zone: '雲端天空',
        unlockFloor: 100,
    },
    rainbow_dragon: {
        id: 'rainbow_dragon',
        name: '彩虹龍',
        emoji: '🌈',
        image: '/images/monsters/dragon.png',
        zone: '塔頂',
        unlockFloor: 100, // Special unlock
    },
};

export type MonsterId = keyof typeof MONSTERS;

// Game assets paths
export const GAME_ASSETS = {
    tile: '/images/monsters/tile.png',
    ladder: '/images/monsters/ladder_new.png',
    snake: '/images/monsters/snake.png',
    player: '/images/monsters/player.png',
    torch: '/images/monsters/torch.png',
};
