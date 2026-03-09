import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FactorsMultiplesPractice } from './FactorsMultiplesPractice';

describe('FactorsMultiplesPractice', () => {
    it('renders the factors and multiples header and difficulty tabs', () => {
        render(<FactorsMultiplesPractice />);

        expect(screen.getByText('🧩 因數與倍數')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates the difficulty description when switching tabs', () => {
        render(<FactorsMultiplesPractice />);

        fireEvent.click(screen.getByRole('button', { name: /🚀 挑戰/i }));

        expect(screen.getAllByText('🚀 挑戰').length).toBeGreaterThan(0);
        expect(screen.getByText('最大公因數 / 最小公倍數')).toBeInTheDocument();
    });
});
