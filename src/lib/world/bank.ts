export interface BankRateSettings {
    demandDailyRate: number;
    timeDepositDailyRate: number;
    minTimeDepositDays: number;
    earlyWithdrawPenaltyRate: number;
}

export interface DemandDepositAccount {
    balance: number;
    lastInterestAt: string;
}

export type TimeDepositStatus = 'active' | 'matured' | 'claimed' | 'cancelled';

export interface TimeDeposit {
    id?: string;
    principal: number;
    dailyRate: number;
    startAt: string;
    maturesAt: string;
    termDays: number;
    status: TimeDepositStatus;
}

export interface DemandDepositAccrualResult {
    updatedAccount: DemandDepositAccount;
    elapsedDays: number;
    interestEarned: number;
}

export interface TimeDepositSettlementResult {
    updatedDeposit: TimeDeposit;
    payout: number;
    interestEarned: number;
    penaltyApplied: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function floorNonNegative(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.floor(value));
}

function getElapsedFullDays(from: string, to: string): number {
    const diffMs = new Date(to).getTime() - new Date(from).getTime();
    return Math.max(0, Math.floor(diffMs / ONE_DAY_MS));
}

function addDays(isoString: string, days: number): string {
    return new Date(new Date(isoString).getTime() + days * ONE_DAY_MS).toISOString();
}

export function createDefaultBankSettings(): BankRateSettings {
    return {
        demandDailyRate: 0.002,
        timeDepositDailyRate: 0.01,
        minTimeDepositDays: 7,
        earlyWithdrawPenaltyRate: 0.05,
    };
}

export function accrueDemandDepositInterest({
    account,
    now,
    dailyRate,
}: {
    account: DemandDepositAccount;
    now: string;
    dailyRate: number;
}): DemandDepositAccrualResult {
    const elapsedDays = getElapsedFullDays(account.lastInterestAt, now);
    const normalizedRate = Math.max(0, dailyRate);
    const normalizedBalance = floorNonNegative(account.balance);
    const interestEarned = floorNonNegative(normalizedBalance * normalizedRate * elapsedDays);

    return {
        elapsedDays,
        interestEarned,
        updatedAccount: {
            balance: normalizedBalance + interestEarned,
            lastInterestAt: now,
        },
    };
}

export function createTimeDeposit({
    principal,
    startAt,
    termDays,
    dailyRate,
}: {
    principal: number;
    startAt: string;
    termDays: number;
    dailyRate: number;
}): TimeDeposit {
    const normalizedPrincipal = floorNonNegative(principal);
    const normalizedTermDays = Math.max(1, Math.floor(termDays));

    return {
        principal: normalizedPrincipal,
        dailyRate: Math.max(0, dailyRate),
        startAt,
        maturesAt: addDays(startAt, normalizedTermDays),
        termDays: normalizedTermDays,
        status: 'active',
    };
}

export function getTimeDepositStatus(deposit: TimeDeposit, now: string): TimeDepositStatus {
    if (deposit.status === 'claimed' || deposit.status === 'cancelled') {
        return deposit.status;
    }

    return new Date(now).getTime() >= new Date(deposit.maturesAt).getTime() ? 'matured' : 'active';
}

export function claimMaturedTimeDeposit({
    deposit,
    now,
}: {
    deposit: TimeDeposit;
    now: string;
}): TimeDepositSettlementResult {
    const status = getTimeDepositStatus(deposit, now);
    if (status !== 'matured') {
        throw new Error('定存尚未到期，不能領取');
    }

    const interestEarned = floorNonNegative(deposit.principal * deposit.dailyRate * deposit.termDays);

    return {
        updatedDeposit: {
            ...deposit,
            status: 'claimed',
        },
        payout: deposit.principal + interestEarned,
        interestEarned,
        penaltyApplied: 0,
    };
}

export function cancelTimeDepositEarly({
    deposit,
    now,
    earlyWithdrawPenaltyRate,
}: {
    deposit: TimeDeposit;
    now: string;
    earlyWithdrawPenaltyRate: number;
}): TimeDepositSettlementResult {
    const status = getTimeDepositStatus(deposit, now);
    if (status !== 'active') {
        throw new Error('只有未到期的定存才能提前解約');
    }

    const penaltyApplied = floorNonNegative(deposit.principal * Math.max(0, earlyWithdrawPenaltyRate));

    return {
        updatedDeposit: {
            ...deposit,
            status: 'cancelled',
        },
        payout: Math.max(0, deposit.principal - penaltyApplied),
        interestEarned: 0,
        penaltyApplied,
    };
}