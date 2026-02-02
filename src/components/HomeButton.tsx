import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Home } from 'lucide-react';

interface HomeButtonProps {
    /** Click handler to navigate back to role selection */
    onClick: () => void;
    /** Whether to show the button */
    show?: boolean;
}

// Storage key for position persistence
const POSITION_STORAGE_KEY = 'homeButtonPosition';

// Default position (percentage from top, 0-100)
const DEFAULT_POSITION = 85; // Near bottom

/**
 * Draggable Floating Action Button (FAB) for quick navigation to home/role selection
 * 
 * Features:
 * - Fixed position on right edge
 * - Vertically draggable along right edge
 * - Position persisted in localStorage
 * - Touch and mouse drag support
 * - Respects safe-area-inset for iOS devices
 * - Pixel RPG styling to match the app theme
 */
export const HomeButton: React.FC<HomeButtonProps> = ({
    onClick,
    show = true
}) => {
    // Position as percentage from top (0-100)
    const [position, setPosition] = useState<number>(() => {
        if (typeof window === 'undefined') return DEFAULT_POSITION;
        const saved = localStorage.getItem(POSITION_STORAGE_KEY);
        return saved ? parseFloat(saved) : DEFAULT_POSITION;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartPosition, setDragStartPosition] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hasMoved = useRef(false);

    // Save position to localStorage when it changes
    useEffect(() => {
        localStorage.setItem(POSITION_STORAGE_KEY, position.toString());
    }, [position]);

    // Calculate position percentage from clientY
    const calculatePosition = useCallback((clientY: number): number => {
        const windowHeight = window.innerHeight;
        const buttonHeight = 56; // 14 * 4 = 56px (h-14)
        const padding = 16; // 4 * 4 = 16px minimum from edges

        const minY = padding;
        const maxY = windowHeight - buttonHeight - padding;

        // Calculate new position based on drag delta
        const deltaY = clientY - dragStartY;
        const deltaPercent = (deltaY / windowHeight) * 100;
        const newPosition = dragStartPosition + deltaPercent;

        // Clamp between safe bounds (as percentage)
        const minPercent = (minY / windowHeight) * 100;
        const maxPercent = (maxY / windowHeight) * 100;

        return Math.max(minPercent, Math.min(maxPercent, newPosition));
    }, [dragStartY, dragStartPosition]);

    // Touch event handlers
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        setIsDragging(true);
        setDragStartY(touch.clientY);
        setDragStartPosition(position);
        hasMoved.current = false;
    }, [position]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const newPosition = calculatePosition(touch.clientY);

        // Check if moved significantly (more than 5px)
        if (Math.abs(touch.clientY - dragStartY) > 5) {
            hasMoved.current = true;
        }

        setPosition(newPosition);
    }, [isDragging, calculatePosition, dragStartY]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        setIsDragging(false);

        // If dragged, prevent click
        if (hasMoved.current) {
            e.preventDefault();
        }
    }, []);

    // Mouse event handlers (for desktop testing)
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStartY(e.clientY);
        setDragStartPosition(position);
        hasMoved.current = false;
    }, [position]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newPosition = calculatePosition(e.clientY);

            if (Math.abs(e.clientY - dragStartY) > 5) {
                hasMoved.current = true;
            }

            setPosition(newPosition);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, calculatePosition, dragStartY]);

    // Handle click - only trigger if not dragging
    const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (hasMoved.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick();
    }, [onClick]);

    if (!show) {
        return null;
    }

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            className={`
                fixed right-4 z-50
                w-14 h-14 
                bg-pokeball-red hover:bg-red-700
                border-4 border-deep-black
                shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                ${isDragging
                    ? 'scale-110 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-grabbing'
                    : 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] cursor-grab'
                }
                active:shadow-none active:translate-x-1 active:translate-y-1
                transition-all ${isDragging ? 'duration-0' : 'duration-150'}
                flex items-center justify-center
                group
                touch-none
                select-none
            `}
            style={{
                top: `${position}%`,
                // Respect iOS safe area
                marginRight: 'env(safe-area-inset-right, 0px)',
            }}
            aria-label="回到首頁 (可拖曳移動)"
            title="回到首頁 (拖曳可移動位置)"
        >
            <Home
                size={24}
                className={`text-white transition-transform ${isDragging ? 'scale-90' : 'group-hover:scale-110'}`}
            />

            {/* Drag indicator - shows briefly on first render or when dragging */}
            {isDragging && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-full" />
            )}
        </button>
    );
};
