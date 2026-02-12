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

// ============ RANDOM EVENT GENERATION ============
// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/** Generate random ladder/trap events for a game session.
 *  Rules:
 *  1. Fixed egg events at floors 25, 50, 75, 100
 *  2. 5 ladders + 5 traps, one of each per 20-floor zone (evenly distributed)
 *  3. Floor 1 and 100 NEVER get traps
 *  4. A trap source floor must be ≥ 7 floors away from any ladder target (no climb-then-fall)
 *  5. A ladder source floor must be ≥ 7 floors away from any trap target (no fall-then-climb)
 *  6. Targets never land on another event source floor
 */
export function generateRandomEvents(seed: number): TowerEvent[] {
    const rng = mulberry32(seed);
    const events: TowerEvent[] = [];
    const DICE_RANGE = 7; // max dice roll 6 + 1 buffer

    // Pools for random egg drops
    const POOLS = {
        forest: ['slime', 'wind_slime', 'mossy_golem', 'mushroom_kin', 'nian_beast'],
        crystal: ['water_spirit', 'mystic_water', 'ice_cube_slime', 'penguin_knight', 'valentine_diamond'],
        magma: ['flame_bird', 'phoenix_chick', 'magma_blob', 'demon_imp', 'cactus_boy', 'sand_castle_crab'],
        sky: ['thunder_cloud', 'storm_lord', 'cloud_puff', 'star_bit', 'ufo_rider', 'moon_bunny'],
    };

    // Helper to pick distinct monster using the seed
    const pickMonster = (poolKey: keyof typeof POOLS) => {
        const pool = POOLS[poolKey];
        const idx = Math.floor(rng() * pool.length);
        const id = pool[idx];
        const monster = MONSTERS[id as MonsterId];
        return {
            id: id,
            name: monster?.name || '未知怪獸',
            emoji: monster?.emoji || '❓'
        };
    };

    const egg25 = pickMonster('forest');
    const egg50 = pickMonster('crystal');
    const egg75 = pickMonster('magma');
    const egg100 = pickMonster('sky');

    // Fixed egg events (milestones) - Randomized!
    const eggFloors = [
        { floor: 25, monster: egg25.id, desc: `獲得${egg25.name}怪獸蛋！${egg25.emoji}` },
        { floor: 50, monster: egg50.id, desc: `獲得${egg50.name}怪獸蛋！${egg50.emoji}` },
        { floor: 75, monster: egg75.id, desc: `獲得${egg75.name}怪獸蛋！${egg75.emoji}` },
        { floor: 100, monster: egg100.id, desc: `恭喜攻頂！獲得${egg100.name}怪獸蛋！${egg100.emoji}` },
    ];

    for (const egg of eggFloors) {
        events.push({
            id: `egg-${egg.floor}`,
            floor_number: egg.floor,
            event_type: 'egg',
            monster_id: egg.monster,
            description: egg.desc,
            is_active: true,
        });
    }

    // 5 zones of 20 floors each: [2-20], [21-40], [41-60], [61-80], [81-99]
    // We pick 1 ladder + 1 trap per zone for even distribution
    const zones = [
        { from: 2, to: 20 },
        { from: 21, to: 40 },
        { from: 41, to: 60 },
        { from: 61, to: 80 },
        { from: 81, to: 99 },
    ];

    const reserved = new Set([1, 100, ...eggFloors.map(e => e.floor)]);

    // Floors that are dangerous to land near (will be populated as we go)
    const dangerZones = new Set<number>(); // floors within DICE_RANGE of a ladder target
    const allSourceFloors = new Set(reserved);

    const ladderDescs = [
        '\u767c\u73fe\u5f69\u8679\u68af\u5b50\uff01',
        '\u9047\u5230\u98db\u884c\u7cbe\u9748\uff0c\u5e36\u4f60\u5f80\u4e0a\u98db\uff01',
        '\u8e29\u5230\u50b3\u9001\u9663\uff0c\u77ac\u79fb\u5f80\u4e0a\uff01',
        '\u6293\u4f4f\u96f7\u96f2\u541b\u7684\u5c3e\u5df4\uff01',
        '\u5f69\u8679\u9f8d\u51fa\u73fe\uff01\u8f09\u4f60\u5f80\u4e0a\uff01',
    ];
    const trapDescs = [
        '\u8e29\u7a7a\u4e86\uff01\u6ed1\u843d\u4e86\uff01',
        '\u9047\u5230\u8abf\u76ae\u602a\u7378\uff0c\u88ab\u63a8\u4e0b\u53bb\uff01',
        '\u6389\u9032\u6ce1\u6ce1\u88e1\uff0c\u98c4\u4e0b\u53bb\u4e86\uff01',
        '\u88ab\u706b\u7130\u9ce5\u5687\u5230\uff0c\u8dcc\u4e0b\u53bb\u4e86\uff01',
        '\u96f7\u96f2\u541b\u5728\u6253\u96f7\uff0c\u4f60\u907f\u958b\u4e86\uff01',
    ];

    // Phase 1: Pick ladder sources & targets per zone
    const ladders: { floor: number; target: number }[] = [];
    for (let z = 0; z < zones.length; z++) {
        const zone = zones[z];
        // Available floors in this zone (not reserved)
        const pool = [];
        for (let f = zone.from; f <= zone.to; f++) {
            if (!reserved.has(f)) pool.push(f);
        }
        // Shuffle and pick first available
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const floor = pool[0];
        allSourceFloors.add(floor);

        // Target: safe floor 8-25 floors above, not on a source floor
        const minT = Math.min(floor + 8, 99);
        const maxT = Math.min(floor + 25, 99);
        const candidates: number[] = [];
        for (let f = minT; f <= maxT; f++) {
            if (!allSourceFloors.has(f)) candidates.push(f);
        }
        const target = candidates.length > 0
            ? candidates[Math.floor(rng() * candidates.length)]
            : minT;

        ladders.push({ floor, target });

        // Mark danger zone around ladder target: trap sources must stay away
        for (let d = -DICE_RANGE; d <= DICE_RANGE; d++) {
            dangerZones.add(target + d);
        }
    }

    // Phase 2: Pick trap sources & targets per zone (avoiding danger zones)
    const traps: { floor: number; target: number }[] = [];
    // Also build trap-target danger zones for ladder sources (reverse check)
    const trapTargetDanger = new Set<number>();

    for (let z = 0; z < zones.length; z++) {
        const zone = zones[z];
        const pool = [];
        for (let f = zone.from; f <= zone.to; f++) {
            // Not reserved, not a ladder source, not within dice range of a ladder target
            if (!allSourceFloors.has(f) && !dangerZones.has(f)) pool.push(f);
        }
        // Fallback: if no safe floor, relax the danger zone constraint
        if (pool.length === 0) {
            for (let f = zone.from; f <= zone.to; f++) {
                if (!allSourceFloors.has(f)) pool.push(f);
            }
        }
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const floor = pool[0];
        allSourceFloors.add(floor);

        // Target: safe floor 8-25 floors below, not on a source floor
        const minT = Math.max(floor - 25, 2);
        const maxT = Math.max(floor - 8, 2);
        const candidates: number[] = [];
        for (let f = minT; f <= maxT; f++) {
            if (!allSourceFloors.has(f)) candidates.push(f);
        }
        const target = candidates.length > 0
            ? candidates[Math.floor(rng() * candidates.length)]
            : Math.max(minT, 2);

        traps.push({ floor, target });

        // Mark danger zone around trap target: ladder sources should stay away
        for (let d = -DICE_RANGE; d <= DICE_RANGE; d++) {
            trapTargetDanger.add(target + d);
        }
    }

    // Phase 3: Verify ladders — if a ladder source is within dice range of
    // a trap target, swap it to the farthest safe floor in the same zone.
    for (let z = 0; z < ladders.length; z++) {
        if (trapTargetDanger.has(ladders[z].floor)) {
            const zone = zones[z];
            let best = ladders[z].floor;
            let bestDist = 0;
            for (let f = zone.from; f <= zone.to; f++) {
                if (f === ladders[z].floor) continue;
                if (allSourceFloors.has(f) || reserved.has(f)) continue;
                // Find distance to nearest trap target
                let minDist = Infinity;
                for (const t of traps) {
                    minDist = Math.min(minDist, Math.abs(f - t.target));
                }
                if (minDist > bestDist) {
                    bestDist = minDist;
                    best = f;
                }
            }
            if (bestDist >= DICE_RANGE) {
                allSourceFloors.delete(ladders[z].floor);
                ladders[z].floor = best;
                allSourceFloors.add(best);
            }
        }
    }

    // Build final events
    for (let i = 0; i < ladders.length; i++) {
        events.push({
            id: `ladder-${ladders[i].floor}`,
            floor_number: ladders[i].floor,
            event_type: 'ladder',
            target_floor: ladders[i].target,
            description: `${ladderDescs[i]} \u76f4\u63a5\u5230 ${ladders[i].target} \u5c64`,
            is_active: true,
        });
    }
    for (let i = 0; i < traps.length; i++) {
        events.push({
            id: `trap-${traps[i].floor}`,
            floor_number: traps[i].floor,
            event_type: 'trap',
            target_floor: traps[i].target,
            description: `${trapDescs[i]} \u6ed1\u5230 ${traps[i].target} \u5c64`,
            is_active: true,
        });
    }

    return events.sort((a, b) => a.floor_number - b.floor_number);
}

// Roll dice and move - uses RPC to bypass RLS
export const useRollDice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, currentFloor, clientEvents }: { userId: string; currentFloor: number; clientEvents?: TowerEvent[] }) => {
            // Generate random roll (1-6)
            const roll = Math.floor(Math.random() * 6) + 1;
            let newFloor = Math.min(currentFloor + roll, 100);

            // Check for events at the new floor — use client events if provided
            let event: TowerEvent | null = null;
            if (clientEvents) {
                event = clientEvents.find(e => e.floor_number === newFloor && e.is_active) || null;
            } else {
                const { data } = await supabase
                    .from('tower_events')
                    .select('*')
                    .eq('floor_number', newFloor)
                    .eq('is_active', true)
                    .single();
                event = data as TowerEvent | null;
            }

            let eventResult: TowerEvent | null = null;
            let monstersToAdd: string[] = [];

            if (event) {
                eventResult = event as TowerEvent;

                if (event.event_type === 'ladder' && event.target_floor) {
                    newFloor = event.target_floor;
                } else if (event.event_type === 'trap' && event.target_floor) {
                    newFloor = event.target_floor;
                } else if (event.event_type === 'egg' && event.monster_id) {
                    // Store as unopened egg (prefix with 'egg:')
                    monstersToAdd = [`egg:${event.monster_id}`];
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
            const newMonsters = [...currentMonsters, ...monstersToAdd];
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

// Claim lottery reward (coins, dice, or monster)
export const useLotteryReward = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            prizeType,
            prizeValue,
            monsterId,
            prizeName
        }: {
            userId: string;
            prizeType: 'coins' | 'dice' | 'monster';
            prizeValue?: number;
            monsterId?: string;
            prizeName: string;
        }) => {
            console.log('🎰 Claiming lottery reward:', { userId, prizeType, prizeValue, monsterId });

            if (prizeType === 'coins' && prizeValue) {
                // Add stars via star_transactions (type must be 'earn')
                const { error } = await supabase
                    .from('star_transactions')
                    .insert({
                        user_id: userId,
                        amount: prizeValue,
                        type: 'earn',
                        description: `🎰 抽獎獲得 ${prizeValue} 星幣`,
                    });

                if (error) throw error;
            } else if (prizeType === 'dice' && prizeValue) {
                // Add dice via RPC
                const { error } = await supabase.rpc('award_dice', {
                    p_user_id: userId,
                    p_dice_amount: prizeValue
                });

                if (error) throw error;
            } else if (prizeType === 'monster' && monsterId) {
                // Store as unopened egg so it goes to collection
                const eggId = `egg:${monsterId}`;
                const { data: currentProgress } = await supabase.rpc('get_tower_progress', {
                    p_user_id: userId
                });

                const currentMonsters = currentProgress?.monsters_collected || [];
                // Allow duplicate eggs (each is a new egg)
                const newMonsters = [...currentMonsters, eggId];

                const { error } = await supabase.rpc('update_tower_progress', {
                    p_user_id: userId,
                    p_current_floor: currentProgress?.current_floor || 1,
                    p_dice_count: currentProgress?.dice_count || 0,
                    p_monsters_collected: newMonsters,
                    p_total_climbs: currentProgress?.total_climbs || 0,
                    p_highest_floor: currentProgress?.highest_floor || 1,
                    p_last_roll_result: null,
                    p_last_event_type: null,
                    p_last_event_floor: null,
                });

                if (error) throw error;
            }

            return { success: true, prizeType, prizeValue, monsterId, prizeName };
        },
        onSuccess: (result, { userId }) => {
            console.log('🎰 Lottery reward claimed, refreshing queries...', result);
            // Invalidate and refetch to ensure immediate UI update
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.invalidateQueries({ queryKey: ['star_balance', userId] });
            // Force immediate refetch
            queryClient.refetchQueries({ queryKey: ['tower-progress', userId] });
            queryClient.refetchQueries({ queryKey: ['star_balance', userId] });
        },
    });
};

// Reset tower (when reaching top, start over with bonus)
export const useResetTower = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            console.log('🏰 Resetting tower for user:', userId);

            // Use RPC function with SECURITY DEFINER to bypass RLS
            const { data, error } = await supabase.rpc('reset_tower_progress', {
                p_user_id: userId
            });

            if (error) {
                console.error('❌ Reset tower failed:', error);
                throw error;
            }

            console.log('✅ Tower reset success:', data);
            return data as TowerProgress;
        },
        onSuccess: (_, { userId }) => {
            // Force immediate refetch to update UI
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.refetchQueries({ queryKey: ['tower-progress', userId] });
        },
    });
};

// Purchase dice with stars (5 coins = 2 dice)
export const usePurchaseDice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, diceAmount }: { userId: string; diceAmount: number }) => {
            // New logic: 5 coins for 2 dice
            const cost = Math.ceil(diceAmount / 2) * 5;

            // 1. Deduct stars
            const { error: txError } = await supabase
                .from('star_transactions')
                .insert({
                    user_id: userId,
                    amount: -cost,
                    type: 'spend',
                    description: `購買 ${diceAmount} 顆骰子`,
                });

            if (txError) throw txError;

            // 2. Award dice
            const { error } = await supabase.rpc('award_dice', {
                p_user_id: userId,
                p_dice_amount: diceAmount
            });

            if (error) throw error;

            return { success: true };
        },
        onSuccess: (_data, { userId }) => {
            // Invalidate queries to update UI
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['star_balance', userId] });
        },
    });
};

// Hatch an egg — converts 'egg:monster_id' to 'monster_id' in monsters_collected
export const useHatchEgg = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, eggIndex }: { userId: string; eggIndex: number }) => {
            const { data: currentProgress, error: fetchError } = await supabase.rpc('get_tower_progress', {
                p_user_id: userId
            });

            if (fetchError) throw fetchError;

            const currentMonsters: string[] = currentProgress?.monsters_collected || [];
            // Find the egg at the given index and hatch it
            let eggCount = 0;
            const newMonsters = [...currentMonsters];
            for (let i = 0; i < newMonsters.length; i++) {
                if (newMonsters[i].startsWith('egg:')) {
                    if (eggCount === eggIndex) {
                        // Hatch: replace 'egg:monster_id' with 'monster_id'
                        const monsterId = newMonsters[i].replace('egg:', '');
                        newMonsters[i] = monsterId;
                        break;
                    }
                    eggCount++;
                }
            }

            const { error } = await supabase.rpc('update_tower_progress', {
                p_user_id: userId,
                p_current_floor: currentProgress?.current_floor || 1,
                p_dice_count: currentProgress?.dice_count || 0,
                p_monsters_collected: newMonsters,
                p_total_climbs: currentProgress?.total_climbs || 0,
                p_highest_floor: currentProgress?.highest_floor || 1,
                p_last_roll_result: null,
                p_last_event_type: null,
                p_last_event_floor: null,
            });

            if (error) throw error;
            return newMonsters;
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.refetchQueries({ queryKey: ['tower-progress', userId] });
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
    nian_beast: {
        id: 'nian_beast',
        name: '可愛年獸',
        emoji: '🧧',
        image: '/images/monsters/new/nian_beast.png',
        zone: '森林入口', // Special Event
        unlockFloor: 88,
    },
    valentine_diamond: {
        id: 'valentine_diamond',
        name: '戀愛鑽石',
        emoji: '💎',
        image: '/images/monsters/new/valentine_diamond.png',
        zone: '水晶洞窟', // Special Event
        unlockFloor: 52, // 520
    },
    rainbow_dragon: {
        id: 'rainbow_dragon',
        name: '彩虹龍',
        emoji: '🌈',
        image: '/images/monsters/dragon.png',
        zone: '塔頂',
        unlockFloor: 100, // Special unlock
    },
    // === Forest Zone Variants (Floor 1-25) ===
    wind_slime: {
        id: 'wind_slime',
        name: '風之史萊姆',
        emoji: '🌪️',
        image: '/images/monsters/new/wind_slime.png',
        zone: '森林入口',
        unlockFloor: 25,
    },
    mossy_golem: {
        id: 'mossy_golem',
        name: '青苔巨像',
        emoji: '🗿',
        image: '/images/monsters/new/mossy_golem.png',
        zone: '森林入口',
        unlockFloor: 25,
    },
    mushroom_kin: {
        id: 'mushroom_kin',
        name: '蘑菇族',
        emoji: '🍄',
        image: '/images/monsters/new/mushroom_kin.png',
        zone: '森林入口',
        unlockFloor: 25,
    },
    // === Crystal Zone Variants (Floor 26-50) ===
    mystic_water: {
        id: 'mystic_water',
        name: '秘法水靈',
        emoji: '🔮',
        image: '/images/monsters/new/mystic_water.png',
        zone: '水晶洞穴',
        unlockFloor: 50,
    },
    ice_cube_slime: {
        id: 'ice_cube_slime',
        name: '冰塊史萊姆',
        emoji: '🧊',
        image: '/images/monsters/new/ice_cube_slime.png',
        zone: '水晶洞穴',
        unlockFloor: 50,
    },
    penguin_knight: {
        id: 'penguin_knight',
        name: '企鵝騎士',
        emoji: '🐧',
        image: '/images/monsters/new/penguin_knight.png',
        zone: '水晶洞穴',
        unlockFloor: 50,
    },
    // === Magma Zone Variants (Floor 51-75) ===
    phoenix_chick: {
        id: 'phoenix_chick',
        name: '鳳凰雛鳥',
        emoji: '🐣',
        image: '/images/monsters/new/phoenix_chick.png',
        zone: '熔岩地帶',
        unlockFloor: 75,
    },
    magma_blob: {
        id: 'magma_blob',
        name: '岩漿怪',
        emoji: '🌋',
        image: '/images/monsters/new/magma_blob.png',
        zone: '熔岩地帶',
        unlockFloor: 75,
    },
    demon_imp: {
        id: 'demon_imp',
        name: '小惡魔',
        emoji: '😈',
        image: '/images/monsters/new/demon_imp.png',
        zone: '熔岩地帶',
        unlockFloor: 75,
    },
    cactus_boy: {
        id: 'cactus_boy',
        name: '仙人掌小子',
        emoji: '🌵',
        image: '/images/monsters/new/cactus_boy.png',
        zone: '熔岩地帶', // Or Sand
        unlockFloor: 75,
    },
    sand_castle_crab: {
        id: 'sand_castle_crab',
        name: '沙堡蟹',
        emoji: '🦀',
        image: '/images/monsters/new/sand_castle_crab.png',
        zone: '熔岩地帶',
        unlockFloor: 75,
    },
    // === Sky Zone Variants (Floor 76-100) ===
    storm_lord: {
        id: 'storm_lord',
        name: '風暴領主',
        emoji: '⚡',
        image: '/images/monsters/new/storm_lord.png',
        zone: '雲端天空',
        unlockFloor: 100,
    },
    cloud_puff: {
        id: 'cloud_puff',
        name: '雲朵棉花',
        emoji: '☁️',
        image: '/images/monsters/new/cloud_puff.png',
        zone: '雲端天空',
        unlockFloor: 100,
    },
    star_bit: {
        id: 'star_bit',
        name: '星星碎片',
        emoji: '⭐',
        image: '/images/monsters/new/star_bit.png',
        zone: '雲端天空',
        unlockFloor: 100,
    },
    // === Space/Special ===
    ufo_rider: {
        id: 'ufo_rider',
        name: 'UFO騎士',
        emoji: '🛸',
        image: '/images/monsters/new/ufo_rider.png',
        zone: '外太空', // New zone conceptual
        unlockFloor: 100,
    },
    moon_bunny: {
        id: 'moon_bunny',
        name: '月兔',
        emoji: '🐇',
        image: '/images/monsters/new/moon_bunny.png',
        zone: '外太空',
        unlockFloor: 100,
    },
    gold_mimic: {
        id: 'gold_mimic',
        name: '黃金寶箱怪',
        emoji: '💰',
        image: '/images/monsters/new/gold_mimic.png',
        zone: '抽獎限定',
        unlockFloor: 999,
    },
    // Lottery-exclusive rare monsters
    star_fairy: {
        id: 'star_fairy',
        name: '星光精靈',
        emoji: '🌟',
        image: '/images/monsters/star_fairy.png',
        zone: '抽獎限定',
        unlockFloor: 999, // Lottery only
    },
    lucky_clover: {
        id: 'lucky_clover',
        name: '幸運草寶寶',
        emoji: '🍀',
        image: '/images/monsters/lucky_clover.png',
        zone: '抽獎限定',
        unlockFloor: 999, // Lottery only
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
