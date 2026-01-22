import React, { useState, useEffect } from 'react';
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
    isCompleted: _isCompleted, // Legacy prop, now using status instead
    onComplete,
    disabled = false,
    status = 'pending',
}) => {
    const [isShaking, setIsShaking] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset processing state when status changes (e.g., after error or completion)
    useEffect(() => {
        if (status === 'completed' || status === 'verified') {
            setIsProcessing(false);
        }
    }, [status]);

    // Check if quest is disabled based on status
    const isDisabled = disabled || status === 'completed' || status === 'verified' || isProcessing;

    const handleClick = () => {
        // Prevent clicks if disabled or already processing
        if (isDisabled) {
            console.log('❌ Quest card click blocked:', {
                disabled,
                status,
                isProcessing,
                questId: quest.id.substring(0, 8)
            });
            return;
        }

        // Set processing state immediately to prevent double clicks
        setIsProcessing(true);
        console.log('✅ Quest card clicked, starting animation:', quest.id.substring(0, 8));

        // Trigger shake animation
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        // Call onComplete after shake animation
        setTimeout(() => {
            onComplete(quest.id);
            setIsFlashing(true);
            setTimeout(() => {
                setIsFlashing(false);
                // Keep processing state to prevent re-clicks until parent updates status
            }, 300);
        }, 500);
    };

    return (
        <div
            onClick={handleClick}
            className={`
        quest-card p-4 
        ${isDisabled ? 'opacity-60 bg-gray-100' : 'hover:shadow-lg'}
        ${isShaking ? 'animate-shake' : ''}
        ${isFlashing ? 'animate-flash' : ''}
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
        >
            <div className="flex items-center gap-4">
                {/* Monster Icon */}
                <div className="text-5xl flex-shrink-0">
                    {quest.icon}
                </div>

                {/* Quest Info */}
                <div className="flex-1">
                    <h3 className="text-sm font-pixel mb-2 leading-relaxed">
                        {quest.title}
                    </h3>
                    {quest.description && (
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {quest.description}
                        </p>
                    )}
                </div>

                {/* Reward Badge */}
                <div className="flex-shrink-0">
                    <div className="bg-yellow-400 border-2 border-deep-black px-3 py-2 text-center">
                        <div className="text-xs font-pixel">⭐</div>
                        <div className="text-xs font-pixel">{quest.reward_points}</div>
                    </div>
                </div>
            </div>

            {/* Completion Status */}
            {status === 'completed' && (
                <div className="mt-3 pt-3 border-t-2 border-deep-black">
                    <div className="inline-flex items-center gap-2 bg-orange-100 border-2 border-deep-black px-3 py-1">
                        <span className="text-sm">⏰</span>
                        <span className="text-xs font-pixel text-orange-600">等待家長審核</span>
                    </div>
                </div>
            )}
            {status === 'verified' && (
                <div className="mt-3 pt-3 border-t-2 border-deep-black">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">✅</span>
                        <span className="text-xs font-pixel text-hp-green">已完成！</span>
                    </div>
                </div>
            )}
        </div>
    );
};
