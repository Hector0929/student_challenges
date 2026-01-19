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
                    <span className="text-xs font-pixel">{label}</span>
                    {showPercentage && (
                        <span className="text-xs font-pixel">{current}/{total}</span>
                    )}
                </div>
            )}
            <div className="hp-bar">
                <div
                    className="hp-bar-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showPercentage && (
                <div className="text-center mt-1">
                    <span className="text-xs font-pixel text-hp-green">{percentage}%</span>
                </div>
            )}
        </div>
    );
};
