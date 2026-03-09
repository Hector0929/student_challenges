import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FractionsPractice } from './FractionsPractice';

describe('FractionsPractice', () => {
    it('renders the fractions practice header and difficulty tabs', () => {
        render(<FractionsPractice />);

        expect(screen.getByText('🍰 分數練習')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates the difficulty card when switching tabs', () => {
        render(<FractionsPractice />);

        fireEvent.click(screen.getByRole('button', { name: /🔥 進階/i }));

        expect(screen.getAllByText('🔥 進階').length).toBeGreaterThan(0);
        expect(screen.getByText('約分成最簡分數')).toBeInTheDocument();
    });
});
