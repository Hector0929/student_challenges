import React from 'react';
import { X } from 'lucide-react';

interface ClayDialogProps {
    isOpen: boolean;
    onClose?: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const ClayDialog: React.FC<ClayDialogProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto touch-pan-y">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Scroll container for centering */}
            <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
            {/* Dialog */}
            <div className="relative clay-dialog max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col animate-bounce-in my-2">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <h2 className="text-2xl font-heading font-bold" style={{ color: 'var(--color-text)' }}>
                        {title}
                    </h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X size={24} style={{ color: 'var(--color-text-light)' }} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 pt-4">
                        {footer}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};
