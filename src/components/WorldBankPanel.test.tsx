import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorldBankPanel } from './WorldBankPanel';

describe('WorldBankPanel', () => {
    const baseProps = {
        starBalance: 500,
        bankNowIso: '2026-03-13T00:00:00.000Z',
        bankSettings: {
            demandDailyRate: 0.002,
            timeDepositDailyRate: 0.01,
            minTimeDepositDays: 7,
            earlyWithdrawPenaltyRate: 0.05,
        },
        demandDepositAccount: {
            balance: 120,
            lastInterestAt: '2026-03-10T00:00:00.000Z',
        },
        timeDeposits: [],
        onDepositDemand: vi.fn(),
        onWithdrawDemand: vi.fn(),
        onSettleDemandInterest: vi.fn(),
        onCreateTimeDeposit: vi.fn(),
        onClaimTimeDeposit: vi.fn(),
        onCancelTimeDeposit: vi.fn(),
        onAdvanceDays: vi.fn(),
    };

    it('submits demand deposit amount and supports interest settlement', () => {
        render(<WorldBankPanel {...baseProps} />);

        fireEvent.change(screen.getByLabelText('活存金額'), { target: { value: '45' } });
        fireEvent.click(screen.getByRole('button', { name: '🏦 存入活存' }));
        fireEvent.click(screen.getByRole('button', { name: '💹 活存結息' }));

        expect(baseProps.onDepositDemand).toHaveBeenCalledWith(45);
        expect(baseProps.onSettleDemandInterest).toHaveBeenCalledTimes(1);
    });

    it('renders time deposits and allows claim when matured', () => {
        render(
            <WorldBankPanel
                {...baseProps}
                bankNowIso="2026-03-25T00:00:00.000Z"
                timeDeposits={[
                    {
                        principal: 200,
                        dailyRate: 0.01,
                        startAt: '2026-03-13T00:00:00.000Z',
                        maturesAt: '2026-03-20T00:00:00.000Z',
                        termDays: 7,
                        status: 'active',
                    },
                ]}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '🎁 領取定存' }));

        expect(baseProps.onClaimTimeDeposit).toHaveBeenCalledWith(0);
        expect(screen.getByText('預估收益：+14 ⭐')).toBeInTheDocument();
    });
});