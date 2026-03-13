import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { createDefaultBankSettings } from '../lib/world/bank';
import { createDefaultExchangePriceTable } from '../lib/world/exchangeShop';
import type { FamilyBankSettings, FamilyExchangeRates } from '../types/database';

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

const defaultExchangeRates = createDefaultExchangePriceTable();
const defaultBankSettings = createDefaultBankSettings();

export const DEFAULT_FAMILY_EXCHANGE_RATES: Omit<FamilyExchangeRates, 'id' | 'family_id' | 'updated_at' | 'updated_by'> = {
    wood_rate: defaultExchangeRates.wood,
    stone_rate: defaultExchangeRates.stone,
    crystal_rate: defaultExchangeRates.crystal,
};

export const DEFAULT_FAMILY_BANK_SETTINGS: Omit<FamilyBankSettings, 'id' | 'family_id' | 'updated_at' | 'updated_by'> = {
    demand_daily_rate: defaultBankSettings.demandDailyRate,
    time_deposit_daily_rate: defaultBankSettings.timeDepositDailyRate,
    min_time_deposit_days: defaultBankSettings.minTimeDepositDays,
    early_withdraw_penalty_rate: defaultBankSettings.earlyWithdrawPenaltyRate,
};

export const useFamilyExchangeRates = (overrideFamilyId?: string) => {
    const { user } = useUser();
    const familyId = overrideFamilyId ?? user?.family_id;

    return useQuery({
        queryKey: ['family_exchange_rates', familyId],
        enabled: !!familyId,
        queryFn: async () => {
            if (!familyId) return null;

            const { data, error } = await supabase
                .from('family_exchange_rates')
                .select('*')
                .eq('family_id', familyId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching family exchange rates:', error);
                throw error;
            }

            return data as FamilyExchangeRates | null;
        },
    });
};

export const useUpdateFamilyExchangeRates = () => {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (rates: Partial<FamilyExchangeRates>) => {
            if (!user?.family_id) {
                throw new Error('No family ID found');
            }

            const payload: Partial<FamilyExchangeRates> = {};

            if (rates.wood_rate !== undefined) {
                payload.wood_rate = clampNonNegativeNumber(Number(rates.wood_rate));
            }
            if (rates.stone_rate !== undefined) {
                payload.stone_rate = clampNonNegativeNumber(Number(rates.stone_rate));
            }
            if (rates.crystal_rate !== undefined) {
                payload.crystal_rate = clampNonNegativeNumber(Number(rates.crystal_rate));
            }

            const { data, error } = await supabase
                .from('family_exchange_rates')
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
                console.error('Error updating family exchange rates:', error);
                throw error;
            }

            return data as FamilyExchangeRates;
        },
        onSuccess: (_, __, ___) => {
            queryClient.invalidateQueries({
                queryKey: ['family_exchange_rates'],
                refetchType: 'all',
            });
        },
    });
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
                console.error('Error updating family bank settings:', error);
                throw error;
            }

            return data as FamilyBankSettings;
        },
        onSuccess: (_, __, ___) => {
            queryClient.invalidateQueries({
                queryKey: ['family_bank_settings'],
                refetchType: 'all',
            });
        },
    });
};