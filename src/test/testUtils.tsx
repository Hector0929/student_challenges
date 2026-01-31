/**
 * Test Utilities and Mocks
 * 提供測試所需的 Mock 資料和工具函數
 */

import type { Profile, FamilySettings, ExchangeRequest } from '../types/database';

// Mock User Data
export const mockParent: Profile = {
    id: 'parent-123',
    role: 'parent',
    name: '測試家長',
    family_id: 'family-abc',
    pin_code: '1234',
    created_at: new Date().toISOString(),
};

export const mockChild: Profile = {
    id: 'child-456',
    role: 'child',
    name: '小明',
    family_id: 'family-abc',
    avatar_url: '👦',
    student_id: 'S12345',
    created_at: new Date().toISOString(),
};

// Mock Family Settings
export const mockFamilySettings: FamilySettings = {
    id: 'settings-001',
    family_id: 'family-abc',
    parent_message_enabled: true,
    parent_message: '今天也要加油喔！',
    exchange_rate_enabled: true,
    star_to_twd_rate: 10,
    updated_at: new Date().toISOString(),
    updated_by: 'parent-123',
};

export const mockDisabledSettings: FamilySettings = {
    id: 'settings-002',
    family_id: 'family-abc',
    parent_message_enabled: false,
    parent_message: '',
    exchange_rate_enabled: false,
    star_to_twd_rate: 1,
    updated_at: new Date().toISOString(),
};

// Mock Exchange Request
export const mockPendingExchange: ExchangeRequest = {
    id: 'exchange-001',
    child_id: 'child-456',
    family_id: 'family-abc',
    star_amount: 50,
    twd_amount: 500,
    exchange_rate: 10,
    status: 'pending',
    created_at: new Date().toISOString(),
};

export const mockApprovedExchange: ExchangeRequest = {
    id: 'exchange-002',
    child_id: 'child-456',
    family_id: 'family-abc',
    star_amount: 30,
    twd_amount: 300,
    exchange_rate: 10,
    status: 'approved',
    reviewed_by: 'parent-123',
    reviewed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
};

// Helper to create a wrapper with providers
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
        },
    },
});

export const TestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = createTestQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};
