import React from 'react';
import { X } from 'lucide-react';

interface RPGDialogProps {
    isOpen: boolean;
    onClose?: () => void;  // Made optional for cases like game playing
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const RPGDialog: React.FC<RPGDialogProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}  // Will do nothing if onClose is undefined
            />

            {/* Dialog */}
            <div className="relative rpg-dialog max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-bounce-in">
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
                <div className="mb-4">
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
    );
};
