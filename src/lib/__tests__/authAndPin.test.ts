import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '../authErrors';
import { needsPinSetup } from '../pin';
import { formatStars } from '../formatStars';

describe('authErrorMessage', () => {
    it('把常見的 Supabase 英文錯誤轉成中文並附下一步', () => {
        expect(authErrorMessage(new Error('Invalid login credentials'))).toContain('忘記密碼');
        expect(authErrorMessage(new Error('Email not confirmed'))).toContain('驗證');
        expect(authErrorMessage(new Error('User already registered'))).toContain('已經註冊');
        expect(authErrorMessage(new Error('Password should be at least 6 characters'))).toContain('6 個字元');
        expect(authErrorMessage(new TypeError('Failed to fetch'))).toContain('網路');
    });
    it('中文訊息原樣顯示，其他未知錯誤給通用中文', () => {
        expect(authErrorMessage(new Error('註冊失敗，請重試'))).toBe('註冊失敗，請重試');
        expect(authErrorMessage(new Error('something odd'))).toBe('發生錯誤，請稍後再試。');
        expect(authErrorMessage(undefined)).toBe('發生錯誤，請稍後再試。');
    });
});

describe('needsPinSetup', () => {
    it('沒有 PIN 或預設 0000 時需要設定', () => {
        expect(needsPinSetup(null)).toBe(true);
        expect(needsPinSetup(undefined)).toBe(true);
        expect(needsPinSetup('')).toBe(true);
        expect(needsPinSetup(' 0000 ')).toBe(true);
        expect(needsPinSetup('1234')).toBe(false);
    });
});

describe('formatStars', () => {
    it('加千分位，空值當 0', () => {
        expect(formatStars(1424644979)).toBe('1,424,644,979');
        expect(formatStars(undefined)).toBe('0');
    });
});
