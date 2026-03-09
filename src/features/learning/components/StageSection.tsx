import React from 'react';
import type { LearningStageGroup, LearningItem } from '../types/learning';
import { LearningItemCard } from './LearningItemCard';

interface StageSectionProps {
    group: LearningStageGroup;
    onSelectItem: (item: LearningItem) => void;
}

export const StageSection: React.FC<StageSectionProps> = ({ group, onSelectItem }) => {
    if (group.items.length === 0) {
        return null;
    }

    return (
        <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '2px dashed var(--border-soft)' }}>
            <div className="mb-3">
                <h4 className="font-heading text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {group.stage.name}
                </h4>
                <p className="font-body text-xs" style={{ color: 'var(--color-text-light)' }}>
                    {group.stage.description}
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {group.items.map((item) => (
                    <LearningItemCard key={item.id} item={item} onSelect={onSelectItem} />
                ))}
            </div>
        </div>
    );
};
