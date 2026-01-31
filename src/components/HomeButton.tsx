import React from 'react';
import { Home } from 'lucide-react';

interface HomeButtonProps {
    /** Click handler to navigate back to role selection */
    onClick: () => void;
    /** Whether to show the button */
    show?: boolean;
}

/**
 * Floating Action Button (FAB) for quick navigation to home/role selection
 * 
 * Features:
 * - Fixed position at bottom-right corner
 * - Respects safe-area-inset for iOS devices
 * - Pixel RPG styling to match the app theme
 */
export const HomeButton: React.FC<HomeButtonProps> = ({
    onClick,
    show = true
}) => {
    if (!show) {
        return null;
    }

    return (
        <button
            onClick={onClick}
            className="
                fixed right-4 bottom-4 z-50
                w-14 h-14 
                bg-pokeball-red hover:bg-red-700
                border-4 border-deep-black
                shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-none active:translate-x-1 active:translate-y-1
                transition-all duration-150
                flex items-center justify-center
                cursor-pointer
                group
            "
            style={{
                // Respect iOS safe area
                marginBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
            aria-label="回到首頁"
            title="回到首頁"
        >
            <Home
                size={24}
                className="text-white group-hover:scale-110 transition-transform"
            />
        </button>
    );
};
