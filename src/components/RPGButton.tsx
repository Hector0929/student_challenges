import React from 'react';

export interface RPGButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
    form?: string;
}

export const RPGButton = ({
    children,
    onClick,
    variant = 'primary',
    disabled = false,
    type = 'button',
    className = '',
    form,
}: RPGButtonProps) => {
    const baseStyles = 'px-6 py-3 font-heading text-sm rounded-control transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'clay-btn',
        secondary: 'clay-btn-secondary',
        danger: 'clay-btn-danger',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            form={form}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        >
            {children}
        </button>
    );
};
