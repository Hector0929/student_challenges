import React from 'react';

export interface RPGButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}

export const RPGButton = ({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    type = 'button',
    className = '',
}: RPGButtonProps) => {
    const baseStyles = 'px-6 py-3 font-pixel text-sm border-4 border-deep-black transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'bg-pokeball-red text-white hover:bg-red-600',
        secondary: 'bg-white text-deep-black hover:bg-gray-100',
        danger: 'bg-red-700 text-white hover:bg-red-800',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            style={{
                boxShadow: disabled ? 'none' : '4px 4px 0 rgba(0, 0, 0, 0.3)',
            }}
        >
            {children}
        </button>
    );
};
