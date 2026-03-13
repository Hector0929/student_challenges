import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorldExchangePanel } from './WorldExchangePanel';

describe('WorldExchangePanel', () => {
    it('caps entered quantity at current inventory', () => {
        render(
            <WorldExchangePanel
                currentResources={{ wood: 25, stone: 10, crystal: 5 }}
                basePrices={{ wood: 0.025, stone: 0.04, crystal: 0.14 }}
                marketMultiplier={1.08}
                onPreviewExchange={(selectedResources) => ({
                    soldResources: selectedResources,
                    remainingResources: {
                        wood: 25 - selectedResources.wood,
                        stone: 10 - selectedResources.stone,
                        crystal: 5 - selectedResources.crystal,
                    },
                    basePrices: { wood: 0.025, stone: 0.04, crystal: 0.14 },
                    finalUnitPrices: { wood: 0.027, stone: 0.0432, crystal: 0.1512 },
                    marketMultiplier: 1.08,
                    starsEarned: 0,
                })}
                onConfirmExchange={() => {}}
            />
        );

        const woodInput = screen.getByLabelText('木材賣出數量') as HTMLInputElement;
        fireEvent.change(woodInput, { target: { value: '999' } });

        expect(woodInput.value).toBe('25');
        expect(screen.getByText('剩餘 0')).toBeInTheDocument();
    });

    it('submits selected resources when confirm is clicked', () => {
        const onConfirmExchange = vi.fn();

        render(
            <WorldExchangePanel
                currentResources={{ wood: 25, stone: 10, crystal: 5 }}
                basePrices={{ wood: 0.025, stone: 0.04, crystal: 0.14 }}
                marketMultiplier={1.08}
                onPreviewExchange={(selectedResources) => ({
                    soldResources: selectedResources,
                    remainingResources: {
                        wood: 25 - selectedResources.wood,
                        stone: 10 - selectedResources.stone,
                        crystal: 5 - selectedResources.crystal,
                    },
                    basePrices: { wood: 0.025, stone: 0.04, crystal: 0.14 },
                    finalUnitPrices: { wood: 0.027, stone: 0.0432, crystal: 0.1512 },
                    marketMultiplier: 1.08,
                    starsEarned: selectedResources.wood > 0 ? 1 : 0,
                })}
                onConfirmExchange={onConfirmExchange}
            />
        );

        fireEvent.change(screen.getByLabelText('木材賣出數量'), { target: { value: '12' } });
        fireEvent.change(screen.getByLabelText('石材賣出數量'), { target: { value: '4' } });
        fireEvent.click(screen.getByRole('button', { name: '💰 確認賣出資源' }));

        expect(onConfirmExchange).toHaveBeenCalledWith({ wood: 12, stone: 4, crystal: 0 });
    });

    it('supports quick quantity buttons and clearing all selections', () => {
        render(
            <WorldExchangePanel
                currentResources={{ wood: 25, stone: 10, crystal: 5 }}
                basePrices={{ wood: 0.025, stone: 0.04, crystal: 0.14 }}
                marketMultiplier={1.08}
                onPreviewExchange={(selectedResources) => ({
                    soldResources: selectedResources,
                    remainingResources: {
                        wood: 25 - selectedResources.wood,
                        stone: 10 - selectedResources.stone,
                        crystal: 5 - selectedResources.crystal,
                    },
                    basePrices: { wood: 0.025, stone: 0.04, crystal: 0.14 },
                    finalUnitPrices: { wood: 0.027, stone: 0.0432, crystal: 0.1512 },
                    marketMultiplier: 1.08,
                    starsEarned: selectedResources.wood + selectedResources.stone + selectedResources.crystal,
                })}
                onConfirmExchange={() => {}}
            />
        );

        const woodInput = screen.getByLabelText('木材賣出數量') as HTMLInputElement;

        fireEvent.click(screen.getByRole('button', { name: '木材賣一半' }));
        expect(woodInput.value).toBe('12');

        fireEvent.click(screen.getByRole('button', { name: '木材全部賣出' }));
        expect(woodInput.value).toBe('25');

        fireEvent.click(screen.getByRole('button', { name: '↺ 清空全部' }));
        expect(woodInput.value).toBe('');
    });
});