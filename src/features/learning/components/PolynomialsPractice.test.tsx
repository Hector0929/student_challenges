import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PolynomialsPractice } from './PolynomialsPractice';

describe('PolynomialsPractice', () => {
    it('renders the polynomials practice header and difficulty tabs', () => {
        render(<PolynomialsPractice />);

        expect(screen.getByText('📐 多項式基礎')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates difficulty description when switching tabs', () => {
        render(<PolynomialsPractice />);

        fireEvent.click(screen.getByRole('button', { name: /🔥 進階/i }));

        expect(screen.getAllByText('🔥 進階').length).toBeGreaterThan(0);
        expect(screen.getByText('代入求值')).toBeInTheDocument();
    });
});
