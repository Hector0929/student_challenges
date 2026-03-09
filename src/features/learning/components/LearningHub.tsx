import React from 'react';
import type { LearningItem } from '../types/learning';
import { groupLearningItemsBySubject } from '../utils/learningFilters';
import { SubjectSection } from './SubjectSection';

interface LearningHubProps {
    items: LearningItem[];
    onSelectItem: (item: LearningItem) => void;
}

export const LearningHub: React.FC<LearningHubProps> = ({ items, onSelectItem }) => {
    const subjectGroups = groupLearningItemsBySubject(items);

    if (subjectGroups.length === 0) {
        return (
            <div
                className="text-center py-8 rounded-3xl"
                style={{ backgroundColor: 'var(--bg-card)', border: '2px dashed var(--border-soft)' }}
            >
                <div className="text-5xl mb-3">📚</div>
                <h3 className="font-heading text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    目前沒有可用的學習項目
                </h3>
                <p className="font-body text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>
                    請稍後再試，或請家長確認學習設定。
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {subjectGroups.map((group) => (
                <SubjectSection key={group.subject.id} group={group} onSelectItem={onSelectItem} />
            ))}
        </div>
    );
};
