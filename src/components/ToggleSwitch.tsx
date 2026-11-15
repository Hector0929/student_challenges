import React from 'react';

interface ToggleSwitchProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    enabled,
    onChange,
    label,
    description,
    disabled = false,
}) => {
    const handleClick = () => {
        if (!disabled) {
            onChange(!enabled);
        }
    };

    return (
        <div className="flex items-start justify-between gap-4">
            {(label || description) && (
                <div className="flex-1">
                    {label && (
                        <span className="font-heading text-sm block">{label}</span>
                    )}
                    {description && (
                        <span className="text-xs text-ink-soft block mt-1">{description}</span>
                    )}
                </div>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={disabled}
                onClick={handleClick}
                className={`
                    relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full
                    border-2 border-transparent transition-colors duration-200 ease-in-out
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary
                    ${enabled ? 'bg-primary' : 'bg-line'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                <span className="sr-only">{label}</span>
                <span
                    className={`
                        pointer-events-none inline-block h-5 w-5 
                        transform rounded-full bg-white shadow-soft
                        transition duration-200 ease-in-out
                        ${enabled ? 'translate-x-5' : 'translate-x-0'}
                        mt-[2px] ml-[2px]
                    `}
                />
            </button>
        </div>
    );
};
