import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { GameModal } from './GameModal';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import type { LearningItem } from '../features/learning/types/learning';
import { LEARNING_ITEMS } from '../features/learning/config/learningItems';
import { getVisibleLearningItems } from '../features/learning/utils/learningFilters';
import { toLearningModalPayload } from '../features/learning/utils/learningAdapters';
import { LearningHub } from '../features/learning/components/LearningHub';
import { getLearningEmbeddedContent } from '../features/learning/components/reactLearningRegistry';

interface LearningAreaProps {
    userId: string;
    onGoHome?: () => void;
}

export const LearningArea: React.FC<LearningAreaProps> = ({ userId, onGoHome }) => {
    const [selectedItem, setSelectedItem] = useState<LearningItem | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const queryClient = useQueryClient();

    // Fetch family settings for learning area permissions
    const { data: familySettings } = useFamilySettings();
    const learningAreaEnabled = familySettings?.learning_area_enabled ?? DEFAULT_FAMILY_SETTINGS.learning_area_enabled;
    const disabledGames = familySettings?.disabled_games ?? DEFAULT_FAMILY_SETTINGS.disabled_games;

    const learningItems = getVisibleLearningItems(LEARNING_ITEMS, disabledGames);
    const modalPayload = selectedItem ? toLearningModalPayload(selectedItem) : null;
    const embeddedContent = selectedItem ? getLearningEmbeddedContent(selectedItem) : null;

    // If learning area is disabled by parent, don't show at all
    if (!learningAreaEnabled) {
        return null;
    }

    const handlePracticeComplete = async (stars: number) => {
        if (!selectedItem || stars <= 0) return;

        const { error } = await supabase.from('star_transactions').insert({
            user_id: userId,
            amount: stars,
            type: 'earn',
            description: `學習完成獎勵: ${selectedItem.name} (3分鐘)`,
            game_id: selectedItem.id,
        });

        if (error) {
            console.error('Failed to grant learning reward:', error);
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['star_balance', userId] });
        queryClient.invalidateQueries({ queryKey: ['star_transactions'] });
    };

    return (
        <div className="clay-card mb-6 p-5 animate-bounce-in" style={{ borderRadius: '20px' }}>
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: 'var(--pastel-blue-bg)', border: '3px solid var(--pastel-blue-border)' }}
                    >
                        <BookOpen size={24} style={{ color: 'var(--pastel-blue-text)' }} />
                    </div>
                    <div>
                        <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                            學習書桌
                        </h2>
                        <p className="font-body text-xs" style={{ color: 'var(--color-text-light)' }}>
                            隨時都可以練習，不需要星幣喔！
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 rounded-full transition-all cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--border-soft)' }}
                >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
            </div>

            {!isCollapsed && (
                <LearningHub
                    items={learningItems}
                    onSelectItem={setSelectedItem}
                />
            )}

            {/* Game Modal in Practice Mode */}
            {selectedItem && modalPayload && (
                <GameModal
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onGoHome={onGoHome}
                    gameUrl={modalPayload.gameUrl}
                    gameName={modalPayload.gameName}
                    gameId={modalPayload.gameId}
                    userId={userId}
                    starBalance={0} // Not used in practice mode
                    onSpendStars={async () => true} // Always succeed
                    onRefreshBalance={() => { }} // No-op
                    mode="practice"
                    practiceRewardStars={10}
                    onPracticeComplete={handlePracticeComplete}
                    embeddedContent={embeddedContent}
                />
            )}
        </div>
    );
};
