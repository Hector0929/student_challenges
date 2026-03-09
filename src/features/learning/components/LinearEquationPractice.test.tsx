import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LinearEquationPractice } from './LinearEquationPractice';

describe('LinearEquationPractice', () => {
    it('renders the linear equation practice header and difficulty tabs', () => {
        render(<LinearEquationPractice />);

        expect(screen.getByText('🟰 一元一次方程式')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates difficulty description when switching tabs', () => {
        render(<LinearEquationPractice />);

        fireEvent.click(screen.getByRole('button', { name: /🔥 進階/i }));

        expect(screen.getAllByText('🔥 進階').length).toBeGreaterThan(0);
        expect(screen.getByText('兩步驟方程式')).toBeInTheDocument();
    });
});
