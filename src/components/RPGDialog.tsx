import React from 'react';
import { X } from 'lucide-react';

interface RPGDialogProps {
    isOpen: boolean;
    onClose?: () => void;  // Made optional for cases like game playing
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    dialogClassName?: string;
    contentClassName?: string;
    scrollContainerClassName?: string;
}

export const RPGDialog: React.FC<RPGDialogProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    dialogClassName,
    contentClassName,
    scrollContainerClassName,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] overflow-y-auto touch-pan-y">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={onClose}  // Will do nothing if onClose is undefined
            />

            {/* Scroll container for centering */}
            <div className={`min-h-[100dvh] flex items-center justify-center p-2 sm:p-4 ${scrollContainerClassName || ''}`}>
            {/* Dialog */}
            <div className={`relative clay-dialog max-w-2xl w-full max-h-[calc(100dvh-0.75rem)] sm:max-h-[90vh] overflow-y-auto animate-bounce-in p-4 sm:p-6 my-1 sm:my-2 ${dialogClassName || ''}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-deep-black">
                    <h2 className="text-lg font-pixel">{title}</h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 transition-colors"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className={contentClassName || 'mb-4'}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="pt-3 border-t-2 border-deep-black">
                        {footer}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};
