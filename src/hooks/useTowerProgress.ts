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
export function mulberry32(seed: number) {
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
 *  2. 5 ladders + 5 traps, evenly distributed across zones
 *  3. Ladders: source floor 5–93, move UP 7–20 floors (small → large)
 *  4. Snakes/traps: source floor 10–98, move DOWN 7–20 floors (large → small)
 *  5. Floor 1 and 100 NEVER get events
 *  6. A trap source must be ≥ 7 floors away from any ladder target (no climb-then-fall)
 *  7. A ladder source must be ≥ 7 floors away from any trap target (no fall-then-climb)
 *  8. Targets never land on another event source floor
 */
export function generateRandomEvents(seed: number): TowerEvent[] {
    const rng = mulberry32(seed);
    const events: TowerEvent[] = [];
    const DICE_RANGE = 7; // max dice roll 6 + 1 buffer
    const MOVE_MIN = 7;   // minimum movement distance for ladders/snakes
    const MOVE_MAX = 20;  // maximum movement distance for ladders/snakes

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

    // Ladder zones: source floors 5–93, split into 5 zones
    const ladderZones = [
        { from: 5, to: 22 },
        { from: 23, to: 40 },
        { from: 41, to: 58 },
        { from: 59, to: 76 },
        { from: 77, to: 93 },
    ];

    // Trap/snake zones: source floors 10–98, split into 5 zones
    const trapZones = [
        { from: 10, to: 27 },
        { from: 28, to: 45 },
        { from: 46, to: 63 },
        { from: 64, to: 81 },
        { from: 82, to: 98 },
    ];

    const reserved = new Set([1, 100, ...eggFloors.map(e => e.floor)]);

    // Floors that are dangerous to land near (will be populated as we go)
    const dangerZones = new Set<number>(); // floors within DICE_RANGE of a ladder target
    const allSourceFloors = new Set(reserved);

    const ladderDescs = [
        '發現彩虹梯子！',
        '遇到飛行精靈，帶你往上飛！',
        '踩到傳送陣，瞬移往上！',
        '抓住雷雲君的尾巴！',
        '彩虹龍出現！載你往上！',
    ];
    const trapDescs = [
        '踩空了！滑落了！',
        '遇到調皮怪獸，被推下去！',
        '掉進泡泡裡，飄下去了！',
        '被火焰鳥嚇到，跌下去了！',
        '雷雲君在打雷，你避開了！',
    ];

    // Phase 1: Pick ladder sources & targets per zone
    // Ladders move UP: source (small number) → target (larger number), +7 to +20 floors
    const ladders: { floor: number; target: number }[] = [];
    for (let z = 0; z < ladderZones.length; z++) {
        const zone = ladderZones[z];
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

        // Target: floor + 7 to floor + 20, clamped to 99, not on a source floor
        const minT = Math.min(floor + MOVE_MIN, 99);
        const maxT = Math.min(floor + MOVE_MAX, 99);
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

    // Phase 2: Pick trap/snake sources & targets per zone (avoiding danger zones)
    // Snakes move DOWN: source (large number) → target (smaller number), −7 to −20 floors
    const traps: { floor: number; target: number }[] = [];
    // Also build trap-target danger zones for ladder sources (reverse check)
    const trapTargetDanger = new Set<number>();

    for (let z = 0; z < trapZones.length; z++) {
        const zone = trapZones[z];
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

        // Target: floor − 7 to floor − 20, clamped to ≥ 2, not on a source floor
        const minT = Math.max(floor - MOVE_MAX, 2);
        const maxT = Math.max(floor - MOVE_MIN, 2);
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
            const zone = ladderZones[z];
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
            description: `${ladderDescs[i]} 直接到 ${ladders[i].target} 層`,
            is_active: true,
        });
    }
    for (let i = 0; i < traps.length; i++) {
        events.push({
            id: `trap-${traps[i].floor}`,
            floor_number: traps[i].floor,
            event_type: 'trap',
            target_floor: traps[i].target,
            description: `${trapDescs[i]} 滑到 ${traps[i].target} 層`,
            is_active: true,
        });
    }

    return events.sort((a, b) => a.floor_number - b.floor_number);
}

// Team roles that make a small, fixed, legible difference to a roll's outcome.
// Deliberately flat numbers (not stacking percentages) so a child can see why
// something happened: bring a guardian/support, trap slides hurt less; bring a
// striker/breaker, monster tiles pay a bonus; bring a controller/support,
// ladders carry you a little further.
export const TEAM_TRAP_SHIELD_ROLES = ['guardian', 'support'];
export const TEAM_MONSTER_BONUS_ROLES = ['striker', 'breaker'];
export const TEAM_LADDER_BOOST_ROLES = ['controller', 'support'];
export const TEAM_MONSTER_BONUS_STARS = 10;
export const TEAM_LADDER_BOOST_FLOORS = 2;

/** One monster currently deployed in the Gen3 team, as far as the roll rules care. */
export interface ActiveTeamMember {
    id: string;
    name: string;
    emoji: string;
    role: string;
}

/** Everything the UI needs to show a child exactly which partner helped, and how much. */
export interface TeamEffectDetail {
    kind: 'trap_shield' | 'ladder_boost' | 'monster_bonus';
    monsterId: string;
    monsterName: string;
    monsterEmoji: string;
    role: string;
    /** Short headline, e.g. 護盾展開！ */
    title: string;
    /** Full sentence naming the monster and the concrete difference it made. */
    message: string;
    /** Trap: floors the shield saved. Ladder: extra floors climbed. */
    floorsChanged: number;
    bonusStars: number;
}

export interface TeamRoleEffectResult {
    /** Floor the player actually ends up on after the event resolves. */
    newFloor: number;
    /** Bonus star coins to award on top of the normal roll (0 = none). */
    bonusStars: number;
    /** Which partner helped and by how much, or null if nothing fired. */
    teamEffect: TeamEffectDetail | null;
}

/**
 * Applies the small, fixed team-role effects described in the Gen3 "隊伍功用說明"
 * panel to a landed-on event. Pure function so the rules can be unit-tested
 * without mocking Supabase — see src/__tests__/monsterTowerTeamEffects.test.ts.
 *
 * The result names the specific monster that helped, because a partial slide with
 * no explanation reads as a bug to the player rather than as their team working.
 */
export function applyTeamRoleEffects(event: TowerEvent, activeTeam: ActiveTeamMember[] = []): TeamRoleEffectResult {
    const findHero = (eligibleRoles: string[]) => activeTeam.find((member) => eligibleRoles.includes(member.role)) ?? null;

    if (event.event_type === 'ladder' && event.target_floor) {
        const hero = findHero(TEAM_LADDER_BOOST_ROLES);
        if (hero) {
            const boostedFloor = Math.min(100, event.target_floor + TEAM_LADDER_BOOST_FLOORS);
            const gained = boostedFloor - event.target_floor;
            return {
                newFloor: boostedFloor,
                bonusStars: 0,
                teamEffect: {
                    kind: 'ladder_boost',
                    monsterId: hero.id,
                    monsterName: hero.name,
                    monsterEmoji: hero.emoji,
                    role: hero.role,
                    title: '氣流加速！',
                    message: gained > 0
                        ? `【${hero.name}】引導氣流推了你一把，多爬了 ${gained} 層，直接到第 ${boostedFloor} 層！`
                        : `【${hero.name}】引導氣流推了你一把，一路衝到塔頂第 ${boostedFloor} 層！`,
                    floorsChanged: gained,
                    bonusStars: 0,
                },
            };
        }
        return { newFloor: event.target_floor, bonusStars: 0, teamEffect: null };
    }

    if (event.event_type === 'trap' && event.target_floor) {
        const hero = findHero(TEAM_TRAP_SHIELD_ROLES);
        if (hero) {
            const drop = event.floor_number - event.target_floor;
            const shieldedDrop = Math.ceil(drop / 2);
            const savedFloors = drop - shieldedDrop;
            return {
                newFloor: event.floor_number - shieldedDrop,
                bonusStars: 0,
                teamEffect: {
                    kind: 'trap_shield',
                    monsterId: hero.id,
                    monsterName: hero.name,
                    monsterEmoji: hero.emoji,
                    role: hero.role,
                    title: '護盾展開！',
                    message: `【${hero.name}】幫你擋下衝擊，本來要滑 ${drop} 層，只滑了 ${shieldedDrop} 層，少掉 ${savedFloors} 層！`,
                    floorsChanged: savedFloors,
                    bonusStars: 0,
                },
            };
        }
        return { newFloor: event.target_floor, bonusStars: 0, teamEffect: null };
    }

    // 守門怪獸格不在這裡結算：踩到就會跳出塔內挑戰關卡（TowerChallengeOverlay），
    // 星幣由挑戰過關發放。輸出／破甲夥伴改成在挑戰裡多給一次重試機會。
    return { newFloor: event.floor_number, bonusStars: 0, teamEffect: null };
}

// Roll dice and move - uses RPC to bypass RLS
export const useRollDice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, currentFloor, clientEvents, activeTeam }: { userId: string; currentFloor: number; clientEvents?: TowerEvent[]; activeTeam?: ActiveTeamMember[] }) => {
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
            let teamEffect: TeamEffectDetail | null = null;
            let bonusStarsAwarded = 0;

            if (event) {
                eventResult = event as TowerEvent;

                if (event.event_type === 'egg' && event.monster_id) {
                    // Store as unopened egg (prefix with 'egg:')
                    monstersToAdd = [`egg:${event.monster_id}`];
                } else if (event.event_type === 'ladder' || event.event_type === 'trap' || event.event_type === 'monster') {
                    const effect = applyTeamRoleEffects(event, activeTeam ?? []);
                    newFloor = effect.newFloor;
                    bonusStarsAwarded = effect.bonusStars;
                    teamEffect = effect.teamEffect;
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

            if (bonusStarsAwarded > 0) {
                const { error: bonusError } = await supabase.from('star_transactions').insert({
                    user_id: userId,
                    amount: bonusStarsAwarded,
                    type: 'earn',
                    description: `🏰 怪獸塔隊伍加成：擊破怪物額外獲得 ${bonusStarsAwarded} 星幣`,
                });
                if (bonusError) console.error('Team bonus star award failed:', bonusError);
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
                teamEffect,
                bonusStarsAwarded,
            };
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.invalidateQueries({ queryKey: ['star_balance', userId] });
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
    // === EVOLVED FORMS (5→1 Merge) ===
    evolved_slime: {
        id: 'evolved_slime',
        name: '翡翠巨獸',
        emoji: '💚',
        image: '/images/monsters/evolved/evolved_slime.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_water_spirit: {
        id: 'evolved_water_spirit',
        name: '深海龍王',
        emoji: '🌊',
        image: '/images/monsters/evolved/evolved_water_spirit.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_flame_bird: {
        id: 'evolved_flame_bird',
        name: '烈焰鳳凰',
        emoji: '🔥',
        image: '/images/monsters/evolved/evolved_flame_bird.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_thunder_cloud: {
        id: 'evolved_thunder_cloud',
        name: '雷神',
        emoji: '⛈️',
        image: '/images/monsters/evolved/evolved_thunder_cloud.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_rainbow_dragon: {
        id: 'evolved_rainbow_dragon',
        name: '虹光神龍',
        emoji: '🐲',
        image: '/images/monsters/evolved/evolved_rainbow_dragon.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_star_fairy: {
        id: 'evolved_star_fairy',
        name: '銀河女神',
        emoji: '🌌',
        image: '/images/monsters/evolved/evolved_star_fairy.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_lucky_clover: {
        id: 'evolved_lucky_clover',
        name: '幸運之王',
        emoji: '👑',
        image: '/images/monsters/evolved/evolved_lucky_clover.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_gold_mimic: {
        id: 'evolved_gold_mimic',
        name: '龍金寶藏',
        emoji: '🏆',
        image: '/images/monsters/evolved/evolved_gold_mimic.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
    evolved_ufo_rider: {
        id: 'evolved_ufo_rider',
        name: '銀河指揮官',
        emoji: '👾',
        image: '/images/monsters/evolved/evolved_ufo_rider_v2.png',
        zone: '進化限定',
        unlockFloor: 9999,
        isEvolved: true,
    },
};

export type MonsterId = keyof typeof MONSTERS;

// Evolution map: base monster → evolved form (requires 5 copies)
export const EVOLUTION_MAP: Partial<Record<MonsterId, MonsterId>> = {
    // Core base monsters
    slime: 'evolved_slime',
    water_spirit: 'evolved_water_spirit',
    flame_bird: 'evolved_flame_bird',
    thunder_cloud: 'evolved_thunder_cloud',
    rainbow_dragon: 'evolved_rainbow_dragon',

    // Forest variants
    wind_slime: 'evolved_slime',
    mossy_golem: 'evolved_slime',
    mushroom_kin: 'evolved_slime',
    nian_beast: 'evolved_slime',

    // Crystal variants
    mystic_water: 'evolved_water_spirit',
    ice_cube_slime: 'evolved_water_spirit',
    penguin_knight: 'evolved_water_spirit',
    valentine_diamond: 'evolved_water_spirit',

    // Magma variants
    phoenix_chick: 'evolved_flame_bird',
    magma_blob: 'evolved_flame_bird',
    demon_imp: 'evolved_flame_bird',
    cactus_boy: 'evolved_flame_bird',
    sand_castle_crab: 'evolved_flame_bird',

    // Sky / space variants
    storm_lord: 'evolved_thunder_cloud',
    cloud_puff: 'evolved_thunder_cloud',
    star_bit: 'evolved_thunder_cloud',
    moon_bunny: 'evolved_ufo_rider',

    // Rare / special
    star_fairy: 'evolved_star_fairy',
    lucky_clover: 'evolved_lucky_clover',
    gold_mimic: 'evolved_gold_mimic',

    // Space boss
    ufo_rider: 'evolved_ufo_rider',
};

export const EVOLUTION_COST = 5; // Number of copies needed to evolve

// Upgrade monster: consume 5 base copies → 1 evolved form
export const useUpgradeMonster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, monsterId }: { userId: string; monsterId: MonsterId }) => {
            const evolvedId = EVOLUTION_MAP[monsterId];
            if (!evolvedId) throw new Error('此怪獸無法進化');

            // Get current progress
            const { data: currentProgress, error: fetchError } = await supabase.rpc('get_tower_progress', {
                p_user_id: userId
            });
            if (fetchError) throw fetchError;

            const currentMonsters: string[] = currentProgress?.monsters_collected || [];

            // Count copies of the base monster
            const count = currentMonsters.filter(m => m === monsterId).length;
            if (count < EVOLUTION_COST) {
                throw new Error(`需要 ${EVOLUTION_COST} 隻 ${MONSTERS[monsterId].name}，目前只有 ${count} 隻`);
            }

            // Remove 5 copies and add 1 evolved form
            const newMonsters = [...currentMonsters];
            let removed = 0;
            for (let i = newMonsters.length - 1; i >= 0 && removed < EVOLUTION_COST; i--) {
                if (newMonsters[i] === monsterId) {
                    newMonsters.splice(i, 1);
                    removed++;
                }
            }
            newMonsters.push(evolvedId);

            // Update via RPC
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
            return { evolvedId, evolvedName: MONSTERS[evolvedId].name };
        },
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['tower-progress', userId] });
            queryClient.refetchQueries({ queryKey: ['tower-progress', userId] });
        },
    });
};

// Game assets paths
export const GAME_ASSETS = {
    tile: '/images/monsters/tile.png',
    ladder: '/images/monsters/ladder_new.png',
    snake: '/images/monsters/snake.png',
    player: '/images/monsters/player.png',
    torch: '/images/monsters/torch.png',
};
