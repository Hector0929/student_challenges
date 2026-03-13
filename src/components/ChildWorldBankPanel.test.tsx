import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChildWorldBankPanel } from './ChildWorldBankPanel';

describe('ChildWorldBankPanel', () => {
    it('supports quick-fill actions for demand deposit and time deposit', () => {
        const onDepositDemand = vi.fn();
        const onWithdrawDemand = vi.fn();
        const onCreateTimeDeposit = vi.fn();

        render(
            <ChildWorldBankPanel
                starBalance={120}
                bankNowIso="2026-03-13T00:00:00.000Z"
                bankSettings={{
                    demandDailyRate: 0.002,
                    timeDepositDailyRate: 0.01,
                    minTimeDepositDays: 7,
                    earlyWithdrawPenaltyRate: 0.05,
                }}
                demandDepositAccount={{
                    balance: 44,
                    lastInterestAt: '2026-03-12T00:00:00.000Z',
                }}
                timeDeposits={[]}
                onDepositDemand={onDepositDemand}
                onWithdrawDemand={onWithdrawDemand}
                onSettleDemandInterest={vi.fn()}
                onCreateTimeDeposit={onCreateTimeDeposit}
                onClaimTimeDeposit={vi.fn()}
                onCancelTimeDeposit={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '活存快捷 60 星' }));
        expect((screen.getByLabelText('孩子活存金額') as HTMLInputElement).value).toBe('60');
        fireEvent.click(screen.getByRole('button', { name: '🏦 存入活存' }));
        expect(onDepositDemand).toHaveBeenCalledWith(60);

        fireEvent.click(screen.getByRole('button', { name: '活存全額提領' }));
        expect((screen.getByLabelText('孩子活存金額') as HTMLInputElement).value).toBe('44');
        fireEvent.click(screen.getByRole('button', { name: '💸 提領活存' }));
        expect(onWithdrawDemand).toHaveBeenCalledWith(44);

        fireEvent.click(screen.getByRole('button', { name: '定存快捷 120 星' }));
        expect((screen.getByLabelText('孩子定存金額') as HTMLInputElement).value).toBe('120');
        fireEvent.click(screen.getByRole('button', { name: '🔒 建立定存' }));
        expect(onCreateTimeDeposit).toHaveBeenCalledWith(120);
    });
});