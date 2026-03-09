import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VolumePractice } from './VolumePractice';

describe('VolumePractice', () => {
    it('renders the volume practice header and difficulty tabs', () => {
        render(<VolumePractice />);

        expect(screen.getByText('🧊 體積練習')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🌱 基礎/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥 進階/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🚀 挑戰/i })).toBeInTheDocument();
    });

    it('updates the difficulty card when switching tabs', () => {
        render(<VolumePractice />);

        fireEvent.click(screen.getByRole('button', { name: /🔥 進階/i }));

        expect(screen.getAllByText('🔥 進階').length).toBeGreaterThan(0);
        expect(screen.getByText('正方體體積公式')).toBeInTheDocument();
    });
});
