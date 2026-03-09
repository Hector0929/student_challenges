import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AreaPractice } from './AreaPractice';

describe('AreaPractice', () => {
    it('renders the area practice header and difficulty tabs', () => {
        render(<AreaPractice />);

        expect(screen.getByText('🟦 面積練習')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates the difficulty description when switching tabs', () => {
        render(<AreaPractice />);

        fireEvent.click(screen.getByRole('button', { name: /🔥 進階/i }));

        expect(screen.getAllByText('🔥 進階').length).toBeGreaterThan(0);
        expect(screen.getByText('數方格求面積')).toBeInTheDocument();
    });
});
