import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PerimeterPractice } from './PerimeterPractice';

describe('PerimeterPractice', () => {
    it('renders the perimeter practice header and difficulty tabs', () => {
        render(<PerimeterPractice />);

        expect(screen.getByText('📏 周長練習')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates the difficulty card when switching tabs', () => {
        render(<PerimeterPractice />);

        fireEvent.click(screen.getByRole('button', { name: /🔥 進階/i }));

        expect(screen.getAllByText('🔥 進階').length).toBeGreaterThan(0);
        expect(screen.getByText('正方形周長公式')).toBeInTheDocument();
    });
});
