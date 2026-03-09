import React from 'react';
import type { LearningItem } from '../types/learning';
import { getLearningItemDisplayName } from '../utils/learningAdapters';

const LEARNING_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    teal: { bg: 'var(--pastel-teal-bg)', border: 'var(--pastel-teal-border)', text: 'var(--pastel-teal-text)' },
    indigo: { bg: 'var(--pastel-indigo-bg)', border: 'var(--pastel-indigo-border)', text: 'var(--pastel-indigo-text)' },
    pink: { bg: 'var(--pastel-pink-bg)', border: 'var(--pastel-pink-border)', text: 'var(--pastel-pink-text)' },
    blue: { bg: 'var(--pastel-blue-bg)', border: 'var(--pastel-blue-border)', text: 'var(--pastel-blue-text)' },
    purple: { bg: 'var(--pastel-purple-bg)', border: 'var(--pastel-purple-border)', text: 'var(--pastel-purple-text)' },
    green: { bg: 'var(--pastel-green-bg)', border: 'var(--pastel-green-border)', text: 'var(--pastel-green-text)' },
    orange: { bg: 'var(--pastel-orange-bg)', border: 'var(--pastel-orange-border)', text: 'var(--pastel-orange-text)' },
    rose: { bg: 'var(--pastel-pink-bg)', border: 'var(--pastel-pink-border)', text: 'var(--pastel-pink-text)' },
    cyan: { bg: 'var(--pastel-cyan-bg)', border: 'var(--pastel-cyan-border)', text: 'var(--pastel-cyan-text)' },
    yellow: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
    sky: { bg: '#E0F2FE', border: '#7DD3FC', text: '#0369A1' },
    emerald: { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
    violet: { bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },
};

const getItemColors = (item: LearningItem) => LEARNING_COLORS[item.accentColorToken ?? 'blue'] || LEARNING_COLORS.blue;

interface LearningItemCardProps {
    item: LearningItem;
    onSelect: (item: LearningItem) => void;
}

export const LearningItemCard: React.FC<LearningItemCardProps> = ({ item, onSelect }) => {
    const colors = getItemColors(item);

    return (
        <button
            onClick={() => onSelect(item)}
            className="clay-game-card"
            style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
            }}
        >
            <div className="icon-circle" style={{ borderColor: colors.border }}>
                {item.icon}
            </div>
            <h4 className="font-heading text-base font-bold text-center">
                {getLearningItemDisplayName(item)}
            </h4>
            <p className="font-body text-xs text-center opacity-80">
                {item.description}
            </p>
        </button>
    );
};
