import React from 'react';

interface ProgressBarProps {
    current: number;
    total: number;
    label?: string;
    showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    current,
    total,
    label,
    showPercentage = true,
}) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between items-center mb-2">
                    <span className="font-heading font-semibold" style={{ color: 'var(--color-text)' }}>
                        {label}
                    </span>
                    {showPercentage && (
                        <span className="font-body font-bold" style={{ color: 'var(--color-text-light)' }}>
                            {current}/{total}
                        </span>
                    )}
                </div>
            )}
            <div className="clay-progress">
                <div
                    className="clay-progress-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showPercentage && !label && (
                <div className="text-center mt-2">
                    <span className="font-heading font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                        {current}/{total}
                    </span>
                </div>
            )}
        </div>
    );
};
