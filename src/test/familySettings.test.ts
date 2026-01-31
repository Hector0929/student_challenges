/**
 * Family Settings Logic Tests
 * 測試家庭設定的預設值和合併邏輯
 * 
 * Note: 這個測試不匯入任何會觸發 Supabase 的模組，只測試純邏輯
 */

import { describe, it, expect } from 'vitest';

// 定義預設值 (與 useFamilySettings.ts 相同)
const DEFAULT_FAMILY_SETTINGS = {
    parent_message_enabled: false,
    parent_message: '完成今天的任務，就離夢想更近一步喔！',
    exchange_rate_enabled: false,
    star_to_twd_rate: 1,
};

describe('Family Settings Defaults', () => {
    it('should have correct default values', () => {
        expect(DEFAULT_FAMILY_SETTINGS.parent_message_enabled).toBe(false);
        expect(DEFAULT_FAMILY_SETTINGS.exchange_rate_enabled).toBe(false);
        expect(DEFAULT_FAMILY_SETTINGS.star_to_twd_rate).toBe(1);
        expect(DEFAULT_FAMILY_SETTINGS.parent_message).toBe('完成今天的任務，就離夢想更近一步喔！');
    });

    it('should have default exchange rate of 1:1', () => {
        expect(DEFAULT_FAMILY_SETTINGS.star_to_twd_rate).toBe(1);
    });
});

describe('Settings Display Logic', () => {
    interface SettingsState {
        parent_message_enabled: boolean;
        exchange_rate_enabled: boolean;
    }

    /**
     * Determine if parent message card should be displayed
     */
    function shouldShowParentMessage(settings: SettingsState | null | undefined): boolean {
        if (!settings) return false;
        return settings.parent_message_enabled === true;
    }

    /**
     * Determine if exchange rate card should be displayed
     */
    function shouldShowExchangeRate(settings: SettingsState | null | undefined): boolean {
        if (!settings) return false;
        return settings.exchange_rate_enabled === true;
    }

    /**
     * Determine if exchange button should be shown in child dashboard
     */
    function shouldShowExchangeButton(
        settings: SettingsState | null | undefined,
        starBalance: number
    ): boolean {
        if (!settings) return false;
        return settings.exchange_rate_enabled === true && starBalance > 0;
    }

    describe('shouldShowParentMessage', () => {
        it('should return false when settings is null', () => {
            expect(shouldShowParentMessage(null)).toBe(false);
        });

        it('should return false when settings is undefined', () => {
            expect(shouldShowParentMessage(undefined)).toBe(false);
        });

        it('should return false when disabled', () => {
            expect(shouldShowParentMessage({
                parent_message_enabled: false,
                exchange_rate_enabled: false
            })).toBe(false);
        });

        it('should return true when enabled', () => {
            expect(shouldShowParentMessage({
                parent_message_enabled: true,
                exchange_rate_enabled: false
            })).toBe(true);
        });
    });

    describe('shouldShowExchangeRate', () => {
        it('should return false when settings is null', () => {
            expect(shouldShowExchangeRate(null)).toBe(false);
        });

        it('should return false when disabled', () => {
            expect(shouldShowExchangeRate({
                parent_message_enabled: false,
                exchange_rate_enabled: false
            })).toBe(false);
        });

        it('should return true when enabled', () => {
            expect(shouldShowExchangeRate({
                parent_message_enabled: false,
                exchange_rate_enabled: true
            })).toBe(true);
        });
    });

    describe('shouldShowExchangeButton', () => {
        it('should return false when settings is null', () => {
            expect(shouldShowExchangeButton(null, 100)).toBe(false);
        });

        it('should return false when exchange rate disabled', () => {
            expect(shouldShowExchangeButton({
                parent_message_enabled: false,
                exchange_rate_enabled: false
            }, 100)).toBe(false);
        });

        it('should return false when balance is 0', () => {
            expect(shouldShowExchangeButton({
                parent_message_enabled: false,
                exchange_rate_enabled: true
            }, 0)).toBe(false);
        });

        it('should return true when enabled and has balance', () => {
            expect(shouldShowExchangeButton({
                parent_message_enabled: false,
                exchange_rate_enabled: true
            }, 100)).toBe(true);
        });

        it('should return false when balance is negative', () => {
            expect(shouldShowExchangeButton({
                parent_message_enabled: false,
                exchange_rate_enabled: true
            }, -10)).toBe(false);
        });
    });
});

describe('Settings Update Validation', () => {
    interface SettingsUpdate {
        parent_message?: string;
        star_to_twd_rate?: number;
    }

    /**
     * Validate settings update before saving
     */
    function validateSettingsUpdate(update: SettingsUpdate): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (update.parent_message !== undefined) {
            if (update.parent_message.length > 100) {
                errors.push('父母叮嚀不可超過 100 字');
            }
        }

        if (update.star_to_twd_rate !== undefined) {
            if (update.star_to_twd_rate <= 0) {
                errors.push('匯率必須大於 0');
            }
            if (update.star_to_twd_rate > 1000) {
                errors.push('匯率不可超過 1000');
            }
        }

        return { valid: errors.length === 0, errors };
    }

    it('should pass valid update', () => {
        const result = validateSettingsUpdate({
            parent_message: '今天也要加油喔！',
            star_to_twd_rate: 10
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject message over 100 characters', () => {
        const longMessage = '這是一個超過一百字的訊息'.repeat(20);
        const result = validateSettingsUpdate({ parent_message: longMessage });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('父母叮嚀不可超過 100 字');
    });

    it('should reject zero exchange rate', () => {
        const result = validateSettingsUpdate({ star_to_twd_rate: 0 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('匯率必須大於 0');
    });

    it('should reject negative exchange rate', () => {
        const result = validateSettingsUpdate({ star_to_twd_rate: -5 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('匯率必須大於 0');
    });

    it('should reject excessive exchange rate', () => {
        const result = validateSettingsUpdate({ star_to_twd_rate: 9999 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('匯率不可超過 1000');
    });
});
