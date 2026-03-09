import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LEARNING_ITEMS } from '../config/learningItems';
import { getVisibleLearningItems } from '../utils/learningFilters';
import { LearningHub } from './LearningHub';

describe('LearningHub', () => {
    it('renders language and math sections with math stage grouping', () => {
        const items = getVisibleLearningItems(LEARNING_ITEMS, []);
        const onSelectItem = vi.fn();

        render(<LearningHub items={items} onSelectItem={onSelectItem} />);

        expect(screen.getByText('英文學習')).toBeInTheDocument();
        expect(screen.getByText('國語學習')).toBeInTheDocument();
        expect(screen.getByText('數學學習')).toBeInTheDocument();
        expect(screen.getByText('國小數學')).toBeInTheDocument();
        expect(screen.queryByText('國中數學')).not.toBeInTheDocument();
    });

    it('calls onSelectItem when a card is clicked', () => {
        const items = getVisibleLearningItems(LEARNING_ITEMS, []);
        const onSelectItem = vi.fn();

        render(<LearningHub items={items} onSelectItem={onSelectItem} />);

        fireEvent.click(screen.getByRole('button', { name: /單字召喚術/i }));

        expect(onSelectItem).toHaveBeenCalledTimes(1);
        expect(onSelectItem.mock.calls[0][0].id).toBe('spelling');
    });

    it('renders empty state when no items are available', () => {
        render(<LearningHub items={[]} onSelectItem={() => {}} />);

        expect(screen.getByText('目前沒有可用的學習項目')).toBeInTheDocument();
    });
});
