import React, { useMemo } from 'react';

interface FloatingEncouragementProps {
    userName: string;
}

const MESSAGES = [
    '加油！',
    '一級棒！',
    '最帥了！',
    '好厲害！',
    '你是最棒的！',
    '前進吧！',
    '大冒險家！',
];

export const FloatingEncouragement: React.FC<FloatingEncouragementProps> = ({ userName }) => {
    const items = useMemo(() => {
        return Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            text: `${userName} ${MESSAGES[Math.floor(Math.random() * MESSAGES.length)]}`,
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 90}%`,
            delay: `${Math.random() * 5}s`,
            duration: `${15 + Math.random() * 10}s`,
            scale: 0.8 + Math.random() * 0.5,
        }));
    }, [userName]);

    return (
        <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="absolute font-heading font-bold whitespace-nowrap animate-float-slow opacity-[0.05]"
                    style={{
                        top: item.top,
                        left: item.left,
                        transform: `scale(${item.scale})`,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        color: 'var(--color-primary-dark)',
                    }}
                >
                    {item.text}
                </div>
            ))}
        </div>
    );
};
