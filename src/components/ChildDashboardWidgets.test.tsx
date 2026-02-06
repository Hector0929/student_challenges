/**
 * ChildDashboardWidgets Component Tests
 * 測試儀表板 Widget 的條件渲染
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParentsMessageCard, ExchangeRateCard } from '../components/ChildDashboardWidgets';
import { TestWrapper } from '../test/TestWrapper';

// Mock the hooks
vi.mock('../hooks/useFamilySettings', () => ({
    useFamilySettings: vi.fn(),
    DEFAULT_FAMILY_SETTINGS: {
        parent_message: '完成今天的任務，就離夢想更近一步喔！',
        star_to_twd_rate: 1,
    }
}));

import { useFamilySettings } from '../hooks/useFamilySettings';
const mockUseFamilySettings = vi.mocked(useFamilySettings);

describe('ParentsMessageCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when loading', () => {
        mockUseFamilySettings.mockReturnValue({
            data: null,
            isLoading: true,
        } as ReturnType<typeof useFamilySettings>);

        const { container } = render(
            <TestWrapper>
                <ParentsMessageCard />
            </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
    });

    it('should not render when parent message is disabled', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: false,
                parent_message: '',
                exchange_rate_enabled: false,
                star_to_twd_rate: 1,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        const { container } = render(
            <TestWrapper>
                <ParentsMessageCard />
            </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render message when enabled', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: true,
                parent_message: '今天也要加油喔！',
                exchange_rate_enabled: false,
                star_to_twd_rate: 1,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        render(
            <TestWrapper>
                <ParentsMessageCard />
            </TestWrapper>
        );

        expect(screen.getByText('今天也要加油喔！')).toBeInTheDocument();
        expect(screen.getByText('父母的叮嚀')).toBeInTheDocument();
    });

    it('should use custom message prop when provided', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: true,
                parent_message: '資料庫的訊息',
                exchange_rate_enabled: false,
                star_to_twd_rate: 1,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        render(
            <TestWrapper>
                <ParentsMessageCard message="自訂的訊息" />
            </TestWrapper>
        );

        expect(screen.getByText('自訂的訊息')).toBeInTheDocument();
    });
});

describe('ExchangeRateCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render when loading', () => {
        mockUseFamilySettings.mockReturnValue({
            data: null,
            isLoading: true,
        } as ReturnType<typeof useFamilySettings>);

        const { container } = render(
            <TestWrapper>
                <ExchangeRateCard />
            </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
    });

    it('should not render when exchange rate is disabled', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: false,
                parent_message: '',
                exchange_rate_enabled: false,
                star_to_twd_rate: 10,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        const { container } = render(
            <TestWrapper>
                <ExchangeRateCard />
            </TestWrapper>
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render rate when enabled', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: false,
                parent_message: '',
                exchange_rate_enabled: true,
                star_to_twd_rate: 10,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        render(
            <TestWrapper>
                <ExchangeRateCard />
            </TestWrapper>
        );

        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('TWD')).toBeInTheDocument();
    });

    it('should use custom rate prop when provided', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: false,
                parent_message: '',
                exchange_rate_enabled: true,
                star_to_twd_rate: 10,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        render(
            <TestWrapper>
                <ExchangeRateCard starRate={25} />
            </TestWrapper>
        );

        expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should show custom currency', () => {
        mockUseFamilySettings.mockReturnValue({
            data: {
                id: '1',
                family_id: 'family-1',
                parent_message_enabled: false,
                parent_message: '',
                exchange_rate_enabled: true,
                star_to_twd_rate: 10,
                updated_at: new Date().toISOString(),
            },
            isLoading: false,
        } as ReturnType<typeof useFamilySettings>);

        render(
            <TestWrapper>
                <ExchangeRateCard currency="USD" />
            </TestWrapper>
        );

        expect(screen.getByText('USD')).toBeInTheDocument();
    });
});
