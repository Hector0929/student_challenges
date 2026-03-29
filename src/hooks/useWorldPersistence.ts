import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdventureClaimResult, AdventureMission } from '../lib/world/adventure';
import type { DemandDepositAccount, TimeDeposit } from '../lib/world/bank';
import { supabase } from '../lib/supabase';
import type {
    WorldAdventureRow,
    WorldBankAccountRow,
    WorldBuildingRow,
    WorldCharacterRow,
    WorldTimeDepositRow,
    WorldInventoryRow,
    WorldStateRow,
} from '../types/database';
import { INITIAL_WORLD_LAB_STATE, type WorldBuildingKey, type WorldLabState, type WorldTerrain, type WorldTheme } from './useWorldState';

export interface WorldPersistenceSnapshot {
    worldLab: WorldLabState;
    activeAdventure: AdventureMission | null;
    lastAdventureResult: AdventureClaimResult | null;
    bankNowMs: number;
    demandDepositAccount: DemandDepositAccount;
    timeDeposits: TimeDeposit[];
}

interface BuildWorldPersistencePayloadArgs {
    userId: string;
    worldLab: WorldLabState;
    activeAdventure: AdventureMission | null;
    lastAdventureResult: AdventureClaimResult | null;
    bankNowMs?: number;
    demandDepositAccount?: DemandDepositAccount;
    timeDeposits?: TimeDeposit[];
}

type WorldBuildingPersistKey = WorldBuildingRow['building_key'];

interface WorldPersistencePayload {
    stateRow: WorldStateRow;
    inventoryRow: WorldInventoryRow;
    characterRow: WorldCharacterRow;
    buildingRows: WorldBuildingRow[];
    adventureRow: WorldAdventureRow | null;
    bankAccountRow?: WorldBankAccountRow;
    timeDepositRows?: WorldTimeDepositRow[];
}

interface RawWorldPersistenceQuery {
    stateRow: WorldStateRow | null;
    inventoryRow: WorldInventoryRow | null;
    characterRow: WorldCharacterRow | null;
    buildingRows: WorldBuildingRow[];
    adventureRow: WorldAdventureRow | null;
    bankAccountRow: WorldBankAccountRow | null;
    timeDepositRows: WorldTimeDepositRow[];
}

const BUILDING_KEYS: Array<WorldBuildingKey> = ['forest', 'mine', 'academy', 'market'];

function parseLastAdventureResult(value: unknown): AdventureClaimResult | null {
    if (!value || typeof value !== 'object') return null;
    const maybeResult = value as Partial<AdventureClaimResult>;
    if (!maybeResult.updatedMission || !maybeResult.rewards || !maybeResult.eventType) {
        return null;
    }
    return maybeResult as AdventureClaimResult;
}

export function buildWorldPersistencePayload({
    userId,
    worldLab,
    activeAdventure,
    lastAdventureResult,
    bankNowMs,
    demandDepositAccount,
    timeDeposits,
}: BuildWorldPersistencePayloadArgs): WorldPersistencePayload {
    const stateRow: WorldStateRow = {
        user_id: userId,
        island_level: worldLab.islandLevel,
        time_of_day_pref: worldLab.timeOfDay,
        world_theme: worldLab.worldTheme,
        world_terrain: worldLab.worldTerrain,
        last_collected_at: new Date(worldLab.lastTickAt).toISOString(),
    };

    const inventoryRow: WorldInventoryRow = {
        user_id: userId,
        wood: worldLab.resources.wood,
        stone: worldLab.resources.stone,
        crystal: worldLab.resources.crystal,
        monster_shards: worldLab.monsterShards,
    };

    const characterRow: WorldCharacterRow = {
        user_id: userId,
        level: worldLab.heroLevel,
        power: worldLab.heroPower,
        hp_bonus: 0,
        atk_bonus: 0,
        move_bonus: 0,
        skill_points: 0,
        job_class: null,
    };

    const buildingRows: WorldBuildingRow[] = BUILDING_KEYS.map((buildingKey) => ({
        user_id: userId,
        building_key: buildingKey as WorldBuildingPersistKey,
        level: worldLab.buildings[buildingKey],
        worker_count: 0,
        assigned_plot_key: `${buildingKey}-${BUILDING_KEYS.indexOf(buildingKey)}`,
    }));

    const adventureRow: WorldAdventureRow | null = activeAdventure
        ? {
            user_id: userId,
            mission_type: activeAdventure.missionType,
            duration_minutes: activeAdventure.durationMinutes,
            status: activeAdventure.status,
            started_at: activeAdventure.startAt,
            ends_at: activeAdventure.endsAt,
            adventure_level: activeAdventure.adventureLevel,
            hero_level: activeAdventure.heroLevel,
            result_payload: lastAdventureResult ? (lastAdventureResult as unknown as Record<string, unknown>) : null,
        }
        : null;

    const bankAccountRow: WorldBankAccountRow | undefined = demandDepositAccount && typeof bankNowMs === 'number'
        ? {
            user_id: userId,
            balance: demandDepositAccount.balance,
            last_interest_at: demandDepositAccount.lastInterestAt,
            simulated_now_at: new Date(bankNowMs).toISOString(),
        }
        : undefined;

    const timeDepositRows: WorldTimeDepositRow[] | undefined = timeDeposits
        ? timeDeposits.map((deposit) => ({
            id: deposit.id,
            user_id: userId,
            principal: deposit.principal,
            daily_rate: deposit.dailyRate,
            start_at: deposit.startAt,
            matures_at: deposit.maturesAt,
            term_days: deposit.termDays,
            status: deposit.status,
        }))
        : undefined;

    return {
        stateRow,
        inventoryRow,
        characterRow,
        buildingRows,
        adventureRow,
        bankAccountRow,
        timeDepositRows,
    };
}

export function parseWorldPersistenceSnapshot({
    stateRow,
    inventoryRow,
    characterRow,
    buildingRows,
    adventureRow,
    bankAccountRow,
    timeDepositRows,
}: RawWorldPersistenceQuery): WorldPersistenceSnapshot | null {
    if (!stateRow && !inventoryRow && !characterRow && buildingRows.length === 0 && !adventureRow && !bankAccountRow && timeDepositRows.length === 0) {
        return null;
    }

    const buildingLevels = { ...INITIAL_WORLD_LAB_STATE.buildings };
    for (const row of buildingRows) {
        if (row.building_key in buildingLevels) {
            buildingLevels[row.building_key as WorldBuildingKey] = Math.max(1, row.level);
        }
    }

    const VALID_THEMES: WorldTheme[] = ['normal', 'night', 'sakura'];
    const VALID_TERRAINS: WorldTerrain[] = ['grassland', 'desert', 'snow'];
    // Migrate legacy world_theme values that used to encode terrain info
    const legacyRaw = stateRow?.world_theme ?? 'normal';
    const legacyTerrainMap: Record<string, WorldTerrain> = { grassland: 'grassland', desert: 'desert', snow: 'snow', night: 'grassland', sakura: 'grassland' };
    const legacyAtmosMap: Record<string, WorldTheme> = { grassland: 'normal', desert: 'normal', snow: 'normal', night: 'night', sakura: 'sakura' };
    const parsedTheme: WorldTheme = VALID_THEMES.includes(legacyRaw as WorldTheme) ? (legacyRaw as WorldTheme) : (legacyAtmosMap[legacyRaw] ?? 'normal');
    const legacyTerrain: WorldTerrain = legacyTerrainMap[legacyRaw] ?? 'grassland';
    const parsedTerrainRaw = stateRow?.world_terrain ?? legacyTerrain;
    const parsedTerrain: WorldTerrain = VALID_TERRAINS.includes(parsedTerrainRaw as WorldTerrain) ? (parsedTerrainRaw as WorldTerrain) : legacyTerrain;

    const worldLab: WorldLabState = {
        islandLevel: stateRow?.island_level ?? INITIAL_WORLD_LAB_STATE.islandLevel,
        heroLevel: characterRow?.level ?? INITIAL_WORLD_LAB_STATE.heroLevel,
        heroPower: characterRow?.power ?? INITIAL_WORLD_LAB_STATE.heroPower,
        monsterShards: inventoryRow?.monster_shards ?? INITIAL_WORLD_LAB_STATE.monsterShards,
        timeOfDay: stateRow?.time_of_day_pref ?? INITIAL_WORLD_LAB_STATE.timeOfDay,
        worldTheme: parsedTheme,
        worldTerrain: parsedTerrain,
        buildings: buildingLevels,
        resources: {
            wood: inventoryRow?.wood ?? INITIAL_WORLD_LAB_STATE.resources.wood,
            stone: inventoryRow?.stone ?? INITIAL_WORLD_LAB_STATE.resources.stone,
            crystal: inventoryRow?.crystal ?? INITIAL_WORLD_LAB_STATE.resources.crystal,
        },
        lastTickAt: stateRow?.last_collected_at ? new Date(stateRow.last_collected_at).getTime() : INITIAL_WORLD_LAB_STATE.lastTickAt,
    };

    const activeAdventure: AdventureMission | null = adventureRow
        ? {
            missionType: adventureRow.mission_type,
            durationMinutes: adventureRow.duration_minutes,
            startAt: adventureRow.started_at,
            endsAt: adventureRow.ends_at,
            adventureLevel: adventureRow.adventure_level,
            heroLevel: adventureRow.hero_level,
            status: adventureRow.status,
        }
        : null;

    const lastAdventureResult = parseLastAdventureResult(adventureRow?.result_payload);

    return {
        worldLab,
        activeAdventure,
        lastAdventureResult,
        bankNowMs: bankAccountRow?.simulated_now_at ? new Date(bankAccountRow.simulated_now_at).getTime() : Date.now(),
        demandDepositAccount: {
            balance: bankAccountRow?.balance ?? 0,
            lastInterestAt: bankAccountRow?.last_interest_at ?? new Date().toISOString(),
        },
        timeDeposits: timeDepositRows.map((row) => ({
            id: row.id,
            principal: row.principal,
            dailyRate: row.daily_rate,
            startAt: row.start_at,
            maturesAt: row.matures_at,
            termDays: row.term_days,
            status: row.status,
        })),
    };
}

export function useWorldPersistence(userId?: string) {
    return useQuery({
        queryKey: ['world-persistence', userId],
        queryFn: async () => {
            if (!userId) return null;

            const [stateResult, inventoryResult, characterResult, buildingResult, adventureResult, bankAccountResult, timeDepositsResult] = await Promise.all([
                supabase.from('world_states').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('world_inventory').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('world_characters').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('world_buildings').select('*').eq('user_id', userId),
                supabase.from('world_adventures').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('world_bank_accounts').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('world_time_deposits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
            ]);

            const queryErrors = [stateResult.error, inventoryResult.error, characterResult.error, buildingResult.error, adventureResult.error, bankAccountResult.error, timeDepositsResult.error].filter(Boolean);
            if (queryErrors.length > 0) {
                throw queryErrors[0];
            }

            return parseWorldPersistenceSnapshot({
                stateRow: (stateResult.data as WorldStateRow | null) ?? null,
                inventoryRow: (inventoryResult.data as WorldInventoryRow | null) ?? null,
                characterRow: (characterResult.data as WorldCharacterRow | null) ?? null,
                buildingRows: (buildingResult.data as WorldBuildingRow[] | null) ?? [],
                adventureRow: (adventureResult.data as WorldAdventureRow | null) ?? null,
                bankAccountRow: (bankAccountResult.data as WorldBankAccountRow | null) ?? null,
                timeDepositRows: (timeDepositsResult.data as WorldTimeDepositRow[] | null) ?? [],
            });
        },
        enabled: !!userId,
    });
}

export function useSaveWorldPersistence(userId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            worldLab,
            activeAdventure,
            lastAdventureResult,
            bankNowMs,
            demandDepositAccount,
            timeDeposits,
        }: Omit<BuildWorldPersistencePayloadArgs, 'userId'>) => {
            if (!userId) {
                throw new Error('No user ID found');
            }

            const payload = buildWorldPersistencePayload({
                userId,
                worldLab,
                activeAdventure,
                lastAdventureResult,
                bankNowMs,
                demandDepositAccount,
                timeDeposits,
            });

            const [stateResult, inventoryResult, characterResult, buildingsResult, adventureUpsertResult] = await Promise.all([
                supabase.from('world_states').upsert(payload.stateRow, { onConflict: 'user_id' }),
                supabase.from('world_inventory').upsert(payload.inventoryRow, { onConflict: 'user_id' }),
                supabase.from('world_characters').upsert(payload.characterRow, { onConflict: 'user_id' }),
                supabase.from('world_buildings').upsert(payload.buildingRows, { onConflict: 'user_id,building_key' }),
                payload.adventureRow
                    ? supabase.from('world_adventures').upsert(payload.adventureRow, { onConflict: 'user_id' })
                    : supabase.from('world_adventures').delete().eq('user_id', userId),
            ]);

            const bankAccountUpsertResult = payload.bankAccountRow
                ? await supabase.from('world_bank_accounts').upsert(payload.bankAccountRow, { onConflict: 'user_id' })
                : { error: null };

            let timeDepositsUpsertResult: { error: unknown } = { error: null };
            if (payload.timeDepositRows) {
                const deleteDepositsResult = await supabase.from('world_time_deposits').delete().eq('user_id', userId);
                if (deleteDepositsResult.error) {
                    throw deleteDepositsResult.error;
                }

                timeDepositsUpsertResult = payload.timeDepositRows.length > 0
                    ? await supabase.from('world_time_deposits').insert(payload.timeDepositRows)
                    : { error: null };
            }

            const mutationErrors = [stateResult.error, inventoryResult.error, characterResult.error, buildingsResult.error, adventureUpsertResult.error, bankAccountUpsertResult.error, timeDepositsUpsertResult.error].filter(Boolean);
            if (mutationErrors.length > 0) {
                throw mutationErrors[0];
            }

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['world-persistence', userId] });
        },
    });
}