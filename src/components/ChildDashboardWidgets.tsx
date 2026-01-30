import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';

interface ParentsMessageCardProps {
    message?: string;
}

export const ParentsMessageCard: React.FC<ParentsMessageCardProps> = ({
    message = "完成今天的任務，就離夢想更近一步喔！"
}) => {
    return (
        <div className="bg-white border-4 border-deep-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex gap-4 items-start animate-bounce-in">
            <div className="flex-shrink-0 text-4xl animate-bounce">
                🧙‍♂️
            </div>
            <div className="flex-1">
                <h3 className="font-pixel text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <MessageCircle size={12} />
                    父母的叮嚀
                </h3>
                <p className="font-pixel text-sm md:text-base leading-relaxed text-deep-black">
                    {message}
                </p>
            </div>
        </div>
    );
};

interface ExchangeRateCardProps {
    starRate?: number; // How much 1 star is worth
    currency?: string;
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({
    starRate = 10,
    currency = "TWD"
}) => {
    return (
        <div className="bg-yellow-400 border-4 border-deep-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between animate-bounce-in h-full">
            <div className="flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-md">⭐</span>
                <span className="font-pixel text-xl font-bold">1</span>
            </div>

            <ArrowRight size={20} className="text-deep-black" />

            <div className="flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-md">💰</span>
                <div className="flex flex-col items-end">
                    <span className="font-pixel text-xl font-bold">{starRate}</span>
                    <span className="font-pixel text-[10px] uppercase">{currency}</span>
                </div>
            </div>
        </div>
    );
};
