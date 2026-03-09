import React from 'react';
import { Calculator, Languages, LibraryBig } from 'lucide-react';
import type { LearningItem, LearningSubjectGroup } from '../types/learning';
import { groupLearningItemsByStage } from '../utils/learningFilters';
import { LearningItemCard } from './LearningItemCard';
import { StageSection } from './StageSection';

const SUBJECT_ICONS = {
    english: Languages,
    chinese: LibraryBig,
    math: Calculator,
} as const;

interface SubjectSectionProps {
    group: LearningSubjectGroup;
    onSelectItem: (item: LearningItem) => void;
}

export const SubjectSection: React.FC<SubjectSectionProps> = ({ group, onSelectItem }) => {
    const Icon = SUBJECT_ICONS[group.subject.id];
    const stageGroups = group.subject.id === 'math' ? groupLearningItemsByStage(group.items) : [];

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-soft)' }}
                >
                    <Icon size={20} style={{ color: 'var(--color-text)' }} />
                </div>
                <div>
                    <h3 className="font-heading text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                        {group.subject.name}
                    </h3>
                    <p className="font-body text-xs" style={{ color: 'var(--color-text-light)' }}>
                        {group.subject.description}
                    </p>
                </div>
            </div>

            {group.subject.id === 'math' ? (
                <div className="space-y-4">
                    {stageGroups.map((stageGroup) => (
                        <StageSection key={stageGroup.stage.id} group={stageGroup} onSelectItem={onSelectItem} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {group.items.map((item) => (
                        <LearningItemCard key={item.id} item={item} onSelect={onSelectItem} />
                    ))}
                </div>
            )}
        </section>
    );
};
