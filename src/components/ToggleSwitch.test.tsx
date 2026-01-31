/**
 * ToggleSwitch Component Tests
 * 測試 Toggle 開關元件的渲染和互動行為
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '../components/ToggleSwitch';

describe('ToggleSwitch', () => {
    it('should render with label', () => {
        render(
            <ToggleSwitch
                enabled={false}
                onChange={() => { }}
                label="測試標籤"
            />
        );

        // Label appears twice: once in the visible label, once in sr-only
        const labels = screen.getAllByText('測試標籤');
        expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    it('should render with description', () => {
        render(
            <ToggleSwitch
                enabled={false}
                onChange={() => { }}
                label="標籤"
                description="這是描述文字"
            />
        );

        expect(screen.getByText('這是描述文字')).toBeInTheDocument();
    });

    it('should call onChange when clicked', () => {
        const handleChange = vi.fn();
        render(
            <ToggleSwitch
                enabled={false}
                onChange={handleChange}
                label="開關"
            />
        );

        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('should toggle from on to off', () => {
        const handleChange = vi.fn();
        render(
            <ToggleSwitch
                enabled={true}
                onChange={handleChange}
                label="開關"
            />
        );

        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should not call onChange when disabled', () => {
        const handleChange = vi.fn();
        render(
            <ToggleSwitch
                enabled={false}
                onChange={handleChange}
                label="已停用的開關"
                disabled={true}
            />
        );

        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        expect(handleChange).not.toHaveBeenCalled();
    });

    it('should have correct aria-checked attribute', () => {
        const { rerender } = render(
            <ToggleSwitch
                enabled={false}
                onChange={() => { }}
                label="開關"
            />
        );

        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

        rerender(
            <ToggleSwitch
                enabled={true}
                onChange={() => { }}
                label="開關"
            />
        );

        expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
});
