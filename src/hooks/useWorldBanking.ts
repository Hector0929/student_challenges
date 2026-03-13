import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    accrueDemandDepositInterest,
    cancelTimeDepositEarly,
    claimMaturedTimeDeposit,
    createTimeDeposit,
    type BankRateSettings,
    type DemandDepositAccount,
    type TimeDeposit,
} from '../lib/world/bank';
import { supabase } from '../lib/supabase';
import type { WorldBankAccountRow, WorldTimeDepositRow } from '../types/database';

export interface WorldBankingSnapshot {
    bankNowMs: number;
    demandDepositAccount: DemandDepositAccount;
    timeDeposits: TimeDeposit[];
}

interface UseWorldBankingOptions {
    userId?: string;
    starBalance: number;
    onAdjustStars: (amount: number, description: string) => Promise<boolean>;
    bankSettings: BankRateSettings;
    timeMode?: 'simulated' | 'realtime';
}

interface WorldBankingActionResult {
    ok: boolean;
    error?: string;
    interestEarned?: number;
    payout?: number;
}

const createDefaultSnapshot = (): WorldBankingSnapshot => ({
    bankNowMs: Date.now(),
    demandDepositAccount: {
        balance: 0,
        lastInterestAt: new Date().toISOString(),
    },
    timeDeposits: [],
});

function parseWorldBankingSnapshot({
    bankAccountRow,
    timeDepositRows,
}: {
    bankAccountRow: WorldBankAccountRow | null;
    timeDepositRows: WorldTimeDepositRow[];
}): WorldBankingSnapshot {
    const fallback = createDefaultSnapshot();

    return {
        bankNowMs: bankAccountRow?.simulated_now_at ? new Date(bankAccountRow.simulated_now_at).getTime() : fallback.bankNowMs,
        demandDepositAccount: {
            balance: bankAccountRow?.balance ?? fallback.demandDepositAccount.balance,
            lastInterestAt: bankAccountRow?.last_interest_at ?? fallback.demandDepositAccount.lastInterestAt,
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

async function persistWorldBankingSnapshot(userId: string, snapshot: WorldBankingSnapshot) {
    const bankAccountRow: WorldBankAccountRow = {
        user_id: userId,
        balance: snapshot.demandDepositAccount.balance,
        last_interest_at: snapshot.demandDepositAccount.lastInterestAt,
        simulated_now_at: new Date(snapshot.bankNowMs).toISOString(),
    };

    const timeDepositRows: WorldTimeDepositRow[] = snapshot.timeDeposits.map((deposit) => ({
        id: deposit.id,
        user_id: userId,
        principal: deposit.principal,
        daily_rate: deposit.dailyRate,
        start_at: deposit.startAt,
        matures_at: deposit.maturesAt,
        term_days: deposit.termDays,
        status: deposit.status,
    }));

    const bankUpsertResult = await supabase.from('world_bank_accounts').upsert(bankAccountRow, { onConflict: 'user_id' });
    if (bankUpsertResult.error) throw bankUpsertResult.error;

    const deleteDepositsResult = await supabase.from('world_time_deposits').delete().eq('user_id', userId);
    if (deleteDepositsResult.error) throw deleteDepositsResult.error;

    if (timeDepositRows.length > 0) {
        const insertDepositsResult = await supabase.from('world_time_deposits').insert(timeDepositRows);
        if (insertDepositsResult.error) throw insertDepositsResult.error;
    }
}

export const useWorldBanking = ({ userId, starBalance, onAdjustStars, bankSettings, timeMode = 'simulated' }: UseWorldBankingOptions) => {
    const queryClient = useQueryClient();
    const hasHydratedRef = useRef(false);
    const [bankNowMs, setBankNowMs] = useState(Date.now());
    const [demandDepositAccount, setDemandDepositAccount] = useState<DemandDepositAccount>(createDefaultSnapshot().demandDepositAccount);
    const [timeDeposits, setTimeDeposits] = useState<TimeDeposit[]>([]);

    const bankQuery = useQuery({
        queryKey: ['world-banking', userId],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return createDefaultSnapshot();

            const [bankAccountResult, timeDepositsResult] = await Promise.all([
                supabase.from('world_bank_accounts').select('*').eq('user_id', userId).maybeSingle(),
                supabase.from('world_time_deposits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
            ]);

            const queryErrors = [bankAccountResult.error, timeDepositsResult.error].filter(Boolean);
            if (queryErrors.length > 0) {
                throw queryErrors[0];
            }

            return parseWorldBankingSnapshot({
                bankAccountRow: (bankAccountResult.data as WorldBankAccountRow | null) ?? null,
                timeDepositRows: (timeDepositsResult.data as WorldTimeDepositRow[] | null) ?? [],
            });
        },
    });

    const getCurrentNowMs = useCallback(() => (
        timeMode === 'realtime' ? Date.now() : bankNowMs
    ), [bankNowMs, timeMode]);

    useEffect(() => {
        if (!bankQuery.data) return;
        if (hasHydratedRef.current && !bankQuery.isRefetching) return;

        setBankNowMs(bankQuery.data.bankNowMs);
        setDemandDepositAccount(bankQuery.data.demandDepositAccount);
        setTimeDeposits(bankQuery.data.timeDeposits);
        hasHydratedRef.current = true;
    }, [bankQuery.data, bankQuery.isRefetching]);

    const persistMutation = useMutation({
        mutationFn: async (snapshot: WorldBankingSnapshot) => {
            if (!userId) {
                throw new Error('No user ID found');
            }

            await persistWorldBankingSnapshot(userId, snapshot);
            return snapshot;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['world-banking', userId] });
            queryClient.invalidateQueries({ queryKey: ['world-persistence', userId] });
        },
    });

    const commitSnapshot = useCallback(async (snapshot: WorldBankingSnapshot) => {
        setBankNowMs(snapshot.bankNowMs);
        setDemandDepositAccount(snapshot.demandDepositAccount);
        setTimeDeposits(snapshot.timeDeposits);
        await persistMutation.mutateAsync(snapshot);
    }, [persistMutation]);

    const settleDemandInterest = useCallback(async (): Promise<WorldBankingActionResult> => {
        const nextBankNowMs = getCurrentNowMs();
        const nowIso = new Date(nextBankNowMs).toISOString();
        const result = accrueDemandDepositInterest({
            account: demandDepositAccount,
            now: nowIso,
            dailyRate: bankSettings.demandDailyRate,
        });

        await commitSnapshot({
            bankNowMs: nextBankNowMs,
            demandDepositAccount: result.updatedAccount,
            timeDeposits,
        });

        return {
            ok: true,
            interestEarned: result.interestEarned,
        };
    }, [bankSettings.demandDailyRate, commitSnapshot, demandDepositAccount, getCurrentNowMs, timeDeposits]);

    const depositDemand = useCallback(async (amount: number): Promise<WorldBankingActionResult> => {
        if (amount <= 0) return { ok: false, error: '存入金額需大於 0' };
        if (starBalance < amount) return { ok: false, error: `星幣不足，需要 ${amount} ⭐` };

        const ok = await onAdjustStars(-amount, '銀行活存存入');
        if (!ok) return { ok: false, error: '活存存入失敗' };

        const nextBankNowMs = getCurrentNowMs();
        const nowIso = new Date(nextBankNowMs).toISOString();
        const settled = accrueDemandDepositInterest({
            account: demandDepositAccount,
            now: nowIso,
            dailyRate: bankSettings.demandDailyRate,
        }).updatedAccount;

        await commitSnapshot({
            bankNowMs: nextBankNowMs,
            demandDepositAccount: {
                balance: settled.balance + amount,
                lastInterestAt: nowIso,
            },
            timeDeposits,
        });

        return { ok: true };
    }, [bankSettings.demandDailyRate, commitSnapshot, demandDepositAccount, getCurrentNowMs, onAdjustStars, starBalance, timeDeposits]);

    const withdrawDemand = useCallback(async (amount: number): Promise<WorldBankingActionResult> => {
        if (amount <= 0) return { ok: false, error: '提領金額需大於 0' };

        const nextBankNowMs = getCurrentNowMs();
        const nowIso = new Date(nextBankNowMs).toISOString();
        const settled = accrueDemandDepositInterest({
            account: demandDepositAccount,
            now: nowIso,
            dailyRate: bankSettings.demandDailyRate,
        }).updatedAccount;

        if (settled.balance < amount) {
            return { ok: false, error: `活存餘額不足，目前只有 ${settled.balance} ⭐` };
        }

        const ok = await onAdjustStars(amount, '銀行活存提領');
        if (!ok) return { ok: false, error: '活存提領失敗' };

        await commitSnapshot({
            bankNowMs: nextBankNowMs,
            demandDepositAccount: {
                balance: settled.balance - amount,
                lastInterestAt: nowIso,
            },
            timeDeposits,
        });

        return { ok: true };
    }, [bankSettings.demandDailyRate, commitSnapshot, demandDepositAccount, getCurrentNowMs, onAdjustStars, timeDeposits]);

    const createTimeDepositEntry = useCallback(async (amount: number): Promise<WorldBankingActionResult> => {
        if (amount <= 0) return { ok: false, error: '定存金額需大於 0' };
        if (starBalance < amount) return { ok: false, error: `星幣不足，需要 ${amount} ⭐` };

        const ok = await onAdjustStars(-amount, `銀行建立定存 ${amount}⭐`);
        if (!ok) return { ok: false, error: '建立定存失敗' };

        const nextBankNowMs = getCurrentNowMs();
        await commitSnapshot({
            bankNowMs: nextBankNowMs,
            demandDepositAccount,
            timeDeposits: [
                ...timeDeposits,
                createTimeDeposit({
                    principal: amount,
                    startAt: new Date(nextBankNowMs).toISOString(),
                    termDays: bankSettings.minTimeDepositDays,
                    dailyRate: bankSettings.timeDepositDailyRate,
                }),
            ],
        });

        return { ok: true };
    }, [bankSettings.minTimeDepositDays, bankSettings.timeDepositDailyRate, commitSnapshot, demandDepositAccount, getCurrentNowMs, onAdjustStars, starBalance, timeDeposits]);

    const claimTimeDepositEntry = useCallback(async (index: number): Promise<WorldBankingActionResult> => {
        const deposit = timeDeposits[index];
        if (!deposit) return { ok: false, error: '找不到定存單' };

        try {
            const result = claimMaturedTimeDeposit({
                deposit,
                now: new Date(getCurrentNowMs()).toISOString(),
            });

            const ok = await onAdjustStars(result.payout, '銀行定存到期領取');
            if (!ok) return { ok: false, error: '定存領取失敗' };

            await commitSnapshot({
                bankNowMs: getCurrentNowMs(),
                demandDepositAccount,
                timeDeposits: timeDeposits.map((item, itemIndex) => (
                    itemIndex === index ? result.updatedDeposit : item
                )),
            });

            return { ok: true, payout: result.payout };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : '定存領取失敗' };
        }
    }, [commitSnapshot, demandDepositAccount, getCurrentNowMs, onAdjustStars, timeDeposits]);

    const cancelTimeDepositEntry = useCallback(async (index: number): Promise<WorldBankingActionResult> => {
        const deposit = timeDeposits[index];
        if (!deposit) return { ok: false, error: '找不到定存單' };

        try {
            const result = cancelTimeDepositEarly({
                deposit,
                now: new Date(getCurrentNowMs()).toISOString(),
                earlyWithdrawPenaltyRate: bankSettings.earlyWithdrawPenaltyRate,
            });

            const ok = await onAdjustStars(result.payout, '銀行定存提前解約');
            if (!ok) return { ok: false, error: '定存解約失敗' };

            await commitSnapshot({
                bankNowMs: getCurrentNowMs(),
                demandDepositAccount,
                timeDeposits: timeDeposits.map((item, itemIndex) => (
                    itemIndex === index ? result.updatedDeposit : item
                )),
            });

            return { ok: true, payout: result.payout };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : '定存解約失敗' };
        }
    }, [bankSettings.earlyWithdrawPenaltyRate, commitSnapshot, demandDepositAccount, getCurrentNowMs, onAdjustStars, timeDeposits]);

    const advanceDays = useCallback(async (days: number): Promise<WorldBankingActionResult> => {
        if (timeMode === 'realtime') {
            return { ok: false, error: '正式模式不可快轉銀行時間' };
        }

        const nextBankNowMs = bankNowMs + days * 24 * 60 * 60 * 1000;
        await commitSnapshot({
            bankNowMs: nextBankNowMs,
            demandDepositAccount,
            timeDeposits,
        });

        return { ok: true };
    }, [bankNowMs, commitSnapshot, demandDepositAccount, timeDeposits, timeMode]);

    return {
        bankNowMs: timeMode === 'realtime' ? Date.now() : bankNowMs,
        demandDepositAccount,
        timeDeposits,
        settleDemandInterest,
        depositDemand,
        withdrawDemand,
        createTimeDeposit: createTimeDepositEntry,
        claimTimeDeposit: claimTimeDepositEntry,
        cancelTimeDeposit: cancelTimeDepositEntry,
        advanceDays,
        isLoading: bankQuery.isLoading,
        isSaving: persistMutation.isPending,
        error: bankQuery.error ?? persistMutation.error,
    };
};