import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { createDefaultBankSettings } from '../lib/world/bank';
import type { FamilyBankSettings } from '../types/database';

type PostgrestLikeError = {
    code?: string;
    status?: number;
    message?: string;
    details?: string;
};

function isMissingRelationError(error: unknown): error is PostgrestLikeError {
    if (!error || typeof error !== 'object') return false;

    const pgError = error as PostgrestLikeError;
    // PGRST205: relation is not in schema cache (table likely missing in DB)
    if (pgError.code === 'PGRST205') return true;

    const sourceText = `${pgError.message ?? ''} ${pgError.details ?? ''}`.toLowerCase();
    return sourceText.includes('could not find the table') || sourceText.includes('schema cache');
}

function createMissingTableMigrationError(tableName: string): Error {
    return new Error(
        `資料庫缺少 ${tableName}，請先在 Supabase SQL Editor 執行 supabase/add_shop_street_settings.sql 後再儲存。`
    );
}

function clampNonNegativeNumber(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
}

function clampNonNegativeInteger(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(value));
}

function clampRateToUnitInterval(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

const defaultBankSettings = createDefaultBankSettings();

export const DEFAULT_FAMILY_BANK_SETTINGS: Omit<FamilyBankSettings, 'id' | 'family_id' | 'updated_at' | 'updated_by'> = {
    demand_daily_rate: defaultBankSettings.demandDailyRate,
    time_deposit_daily_rate: defaultBankSettings.timeDepositDailyRate,
    min_time_deposit_days: defaultBankSettings.minTimeDepositDays,
    early_withdraw_penalty_rate: defaultBankSettings.earlyWithdrawPenaltyRate,
};

export const useFamilyBankSettings = (overrideFamilyId?: string) => {
    const { user } = useUser();
    const familyId = overrideFamilyId ?? user?.family_id;

    return useQuery({
        queryKey: ['family_bank_settings', familyId],
        enabled: !!familyId,
        queryFn: async () => {
            if (!familyId) return null;

            const { data, error } = await supabase
                .from('family_bank_settings')
                .select('*')
                .eq('family_id', familyId)
                .maybeSingle();

            if (error) {
                if (isMissingRelationError(error)) {
                    // Table is not deployed yet; allow UI to continue with defaults.
                    console.warn('family_bank_settings table is missing. Falling back to defaults.');
                    return null;
                }
                console.error('Error fetching family bank settings:', error);
                throw error;
            }

            return data as FamilyBankSettings | null;
        },
    });
};

export const useUpdateFamilyBankSettings = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (settings: Partial<FamilyBankSettings>) => {
            if (!user?.family_id) {
                throw new Error('No family ID found');
            }

            const payload: Partial<FamilyBankSettings> = {};

            if (settings.demand_daily_rate !== undefined) {
                payload.demand_daily_rate = clampNonNegativeNumber(Number(settings.demand_daily_rate));
            }
            if (settings.time_deposit_daily_rate !== undefined) {
                payload.time_deposit_daily_rate = clampNonNegativeNumber(Number(settings.time_deposit_daily_rate));
            }
            if (settings.min_time_deposit_days !== undefined) {
                payload.min_time_deposit_days = clampNonNegativeInteger(Number(settings.min_time_deposit_days));
            }
            if (settings.early_withdraw_penalty_rate !== undefined) {
                payload.early_withdraw_penalty_rate = clampRateToUnitInterval(Number(settings.early_withdraw_penalty_rate));
            }

            const { data, error } = await supabase
                .from('family_bank_settings')
                .upsert(
                    {
                        family_id: user.family_id,
                        ...payload,
                        updated_by: user.id,
                    },
                    {
                        onConflict: 'family_id',
                    }
                )
                .select()
                .single();

            if (error) {
                if (isMissingRelationError(error)) {
                    throw createMissingTableMigrationError('family_bank_settings');
                }
                console.error('Error updating family bank settings:', error);
                throw error;
            }

            return data as FamilyBankSettings;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['family_bank_settings'],
                refetchType: 'all',
            });
        },
    });
};