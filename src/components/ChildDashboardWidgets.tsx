import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';

interface ParentsMessageCardProps {
    message?: string;
}

/**
 * Parent's encouraging message card
 * Will only render if parent has enabled the feature
 */
export const ParentsMessageCard: React.FC<ParentsMessageCardProps> = ({
    message
}) => {
    const { data: settings, isLoading } = useFamilySettings();

    // Don't render if loading or feature is disabled
    if (isLoading) return null;
    if (!settings?.parent_message_enabled) return null;

    const displayMessage = message || settings?.parent_message || DEFAULT_FAMILY_SETTINGS.parent_message;

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
                <p className="font-pixel text-base md:text-lg leading-relaxed text-deep-black font-medium">
                    {displayMessage}
                </p>
            </div>
        </div>
    );
};

interface ExchangeRateCardProps {
    starRate?: number;
    currency?: string;
}

/**
 * Star to TWD exchange rate display card
 * Will only render if parent has enabled the feature
 */
export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({
    starRate,
    currency = "TWD"
}) => {
    const { data: settings, isLoading } = useFamilySettings();

    // Don't render if loading or feature is disabled
    if (isLoading) return null;
    if (!settings?.exchange_rate_enabled) return null;

    const displayRate = starRate ?? settings?.star_to_twd_rate ?? DEFAULT_FAMILY_SETTINGS.star_to_twd_rate;

    return (
        <div className="bg-yellow-400 border-4 border-deep-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between animate-bounce-in h-full">
            <div className="flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-md">⭐</span>
                <span className="font-mono text-2xl font-bold">1</span>
            </div>

            <ArrowRight size={20} className="text-deep-black" />

            <div className="flex items-center gap-2">
                <span className="text-2xl filter drop-shadow-md">💰</span>
                <div className="flex flex-col items-end">
                    <span className="font-mono text-2xl font-bold">{displayRate}</span>
                    <span className="font-mono text-xs font-bold uppercase">{currency}</span>
                </div>
            </div>
        </div>
    );
};

/**
 * Combined widget that shows both cards if enabled
 * Use this in ChildDashboard for cleaner integration
 */
export const FamilyInfoWidgets: React.FC = () => {
    const { data: settings } = useFamilySettings();

    // If neither feature is enabled, don't render anything
    if (!settings?.parent_message_enabled && !settings?.exchange_rate_enabled) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ParentsMessageCard />
            <ExchangeRateCard />
        </div>
    );
};
