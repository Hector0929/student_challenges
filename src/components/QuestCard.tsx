import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { Quest } from '../types/database';

interface QuestCardProps {
    quest: Quest;
    isCompleted: boolean;
    onComplete: (questId: string) => void;
    disabled?: boolean;
    status?: 'pending' | 'completed' | 'verified';
}

export const QuestCard: React.FC<QuestCardProps> = ({
    quest,
    onComplete,
    disabled = false,
    status = 'pending',
}) => {
    const [isShaking, setIsShaking] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);

    const isDisabled = disabled || status === 'completed' || status === 'verified';

    const handleClick = () => {
        if (isDisabled) return;
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setTimeout(() => {
            onComplete(quest.id);
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 300);
        }, 500);
    };

    // Card border color based on status
    const getBorderColor = () => {
        if (status === 'verified') return 'var(--color-primary)';
        if (status === 'completed') return 'var(--color-cta)';
        return 'var(--border-card)';
    };

    return (
        <div
            onClick={handleClick}
            className={`
                clay-card p-4 
                ${isDisabled ? 'opacity-70' : 'cursor-pointer'}
                ${isShaking ? 'animate-wiggle' : ''}
                ${isFlashing ? 'animate-pop-in' : ''}
            `}
            style={{
                borderColor: getBorderColor(),
                backgroundColor: status === 'verified' ? '#E8F5E9' : 'var(--bg-card)',
            }}
        >
            <div className="flex items-center gap-4">
                {/* Icon Circle */}
                <div
                    className="clay-icon-circle flex-shrink-0"
                    style={{
                        backgroundColor: status === 'verified' ? '#C8E6C9' : 'var(--bg-card)',
                        borderColor: status === 'verified' ? 'var(--color-primary)' : 'var(--border-soft)',
                    }}
                >
                    <span className="text-2xl">{quest.icon}</span>
                </div>

                {/* Quest Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-base truncate" style={{ color: 'var(--color-text)' }}>
                        {quest.title}
                    </h3>
                    {quest.description && (
                        <p className="font-body text-sm truncate" style={{ color: 'var(--color-text-light)' }}>
                            {quest.description}
                        </p>
                    )}
                </div>

                {/* Reward Badge */}
                <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="clay-star">
                        <span>⭐</span>
                        <span>{quest.reward_points}</span>
                    </div>

                    {/* Status Check */}
                    {status === 'verified' && (
                        <div className="clay-check">
                            <Check size={14} strokeWidth={3} />
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Review Badge */}
            {status === 'completed' && (
                <div className="mt-3 pt-3" style={{ borderTop: '2px dashed var(--border-soft)' }}>
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                        style={{ backgroundColor: '#FFF3E0', border: '2px solid #FFB74D' }}
                    >
                        <span className="text-sm">⏰</span>
                        <span className="font-heading text-sm font-semibold" style={{ color: '#E65100' }}>
                            等待家長審核
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
