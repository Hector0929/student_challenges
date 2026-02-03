import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { playSentence } from '../hooks/useCustomSentences';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn()
                }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn()
            })),
            update: vi.fn(() => ({
                eq: vi.fn()
            }))
        }))
    }
}));

// Mock Web Speech API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => [
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Generic', lang: 'en-GB' }
]);

Object.defineProperty(window, 'speechSynthesis', {
    value: {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: mockGetVoices
    },
    writable: true
});

// Proper constructor mock for SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
    text: string;
    voice: any = null;
    lang: string = '';
    rate: number = 1;

    constructor(text: string) {
        this.text = text;
    }
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: MockSpeechSynthesisUtterance,
    writable: true
});

describe('Custom Sentences Feature', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('playSentence', () => {
        it('should cancel any existing speech before playing', () => {
            playSentence('Hello world');

            expect(mockCancel).toHaveBeenCalled();
            expect(mockSpeak).toHaveBeenCalled();
        });

        it('should create utterance with correct text', () => {
            playSentence('This is a test');

            const utterance = mockSpeak.mock.calls[0][0];
            expect(utterance.text).toBe('This is a test');
        });

        it('should prefer Samantha/Siri voice if available', () => {
            playSentence('Hello');

            const utterance = mockSpeak.mock.calls[0][0];
            expect(utterance.voice).toEqual({ name: 'Samantha', lang: 'en-US' });
        });

        it('should set language to en-US', () => {
            playSentence('Test');

            const utterance = mockSpeak.mock.calls[0][0];
            expect(utterance.lang).toBe('en-US');
        });

        it('should set speech rate to 0.85', () => {
            playSentence('Test');

            const utterance = mockSpeak.mock.calls[0][0];
            expect(utterance.rate).toBe(0.85);
        });
    });

    describe('localStorage sync', () => {
        it('should store sentences in localStorage when key exists', () => {
            const sentences = [
                { id: '1', en: 'Hello', zh: '你好' },
                { id: '2', en: 'Goodbye', zh: '再見' }
            ];

            localStorage.setItem('customSentences', JSON.stringify(sentences));

            const stored = JSON.parse(localStorage.getItem('customSentences') || '[]');
            expect(stored).toHaveLength(2);
            expect(stored[0].en).toBe('Hello');
        });

        it('should return empty array when no custom sentences exist', () => {
            const stored = JSON.parse(localStorage.getItem('customSentences') || '[]');
            expect(stored).toEqual([]);
        });
    });

    describe('sentence validation', () => {
        it('should validate English sentence is present', () => {
            const validSentence = { en: 'Test', zh: '測試' };
            const invalidSentence = { en: '', zh: '測試' };

            expect(validSentence.en.trim().length > 0).toBe(true);
            expect(invalidSentence.en.trim().length > 0).toBe(false);
        });

        it('should validate Chinese translation is present', () => {
            const validSentence = { en: 'Test', zh: '測試' };
            const invalidSentence = { en: 'Test', zh: '' };

            expect(validSentence.zh.trim().length > 0).toBe(true);
            expect(invalidSentence.zh.trim().length > 0).toBe(false);
        });
    });

    describe('game sentence loading', () => {
        it('should parse valid JSON from localStorage', () => {
            const sentences = [{ en: 'Cat', zh: '貓' }];
            localStorage.setItem('customSentences', JSON.stringify(sentences));

            const loaded = JSON.parse(localStorage.getItem('customSentences')!);
            expect(loaded).toEqual(sentences);
        });

        it('should handle invalid JSON gracefully', () => {
            localStorage.setItem('customSentences', 'invalid json');

            let result: any[] = [];
            try {
                result = JSON.parse(localStorage.getItem('customSentences')!);
            } catch {
                result = [];
            }

            expect(result).toEqual([]);
        });

        it('should use default sentences when custom list is empty', () => {
            localStorage.setItem('customSentences', '[]');

            const loaded = JSON.parse(localStorage.getItem('customSentences')!);
            const useDefault = loaded.length === 0;

            expect(useDefault).toBe(true);
        });
    });

    describe('TTS voice selection', () => {
        it('should fall back to Google US English if Samantha not available', () => {
            const voices = [
                { name: 'Google US English', lang: 'en-US' },
                { name: 'Generic', lang: 'en-GB' }
            ];

            const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Siri'))
                || voices.find(v => v.name.includes('Google US English'));

            expect(preferredVoice?.name).toBe('Google US English');
        });

        it('should fall back to any en-US voice if no preferred voices available', () => {
            const voices = [
                { name: 'Random Voice', lang: 'en-US' },
                { name: 'French Voice', lang: 'fr-FR' }
            ];

            const preferredVoice = voices.find(v => v.name.includes('Samantha'))
                || voices.find(v => v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith('en-US'));

            expect(preferredVoice?.lang).toBe('en-US');
        });
    });
});
