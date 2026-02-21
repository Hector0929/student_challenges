import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { GameModal } from './GameModal';
import { GAMES, type Game } from '../lib/gameConfig';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface LearningAreaProps {
    userId: string;
    onGoHome?: () => void;
}

// Pastel color mapping for learning games
const LEARNING_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    'spelling': { bg: 'var(--pastel-teal-bg)', border: 'var(--pastel-teal-border)', text: 'var(--pastel-teal-text)' },
    'pronunciation': { bg: 'var(--pastel-indigo-bg)', border: 'var(--pastel-indigo-border)', text: 'var(--pastel-indigo-text)' },
    'sentence': { bg: 'var(--pastel-pink-bg)', border: 'var(--pastel-pink-border)', text: 'var(--pastel-pink-text)' },
    'akila': { bg: 'var(--pastel-blue-bg)', border: 'var(--pastel-blue-border)', text: 'var(--pastel-blue-text)' },
    'multiplication': { bg: 'var(--pastel-purple-bg)', border: 'var(--pastel-purple-border)', text: 'var(--pastel-purple-text)' },
    'subtraction': { bg: 'var(--pastel-green-bg)', border: 'var(--pastel-green-border)', text: 'var(--pastel-green-text)' },
    'division': { bg: 'var(--pastel-orange-bg)', border: 'var(--pastel-orange-border)', text: 'var(--pastel-orange-text)' },
    'idiom': { bg: 'var(--pastel-pink-bg)', border: 'var(--pastel-pink-border)', text: 'var(--pastel-pink-text)' },
    'memory_matrix': { bg: 'var(--pastel-cyan-bg)', border: 'var(--pastel-cyan-border)', text: 'var(--pastel-cyan-text)' },
    '2048_cyber': { bg: 'var(--pastel-blue-bg)', border: 'var(--pastel-blue-border)', text: 'var(--pastel-blue-text)' },
};

const getGameColors = (gameId: string) => {
    return LEARNING_COLORS[gameId] || {
        bg: 'var(--pastel-blue-bg)',
        border: 'var(--pastel-blue-border)',
        text: 'var(--pastel-blue-text)'
    };
};

export const LearningArea: React.FC<LearningAreaProps> = ({ userId, onGoHome }) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const queryClient = useQueryClient();

    // Fetch family settings for learning area permissions
    const { data: familySettings } = useFamilySettings();
    const learningAreaEnabled = familySettings?.learning_area_enabled ?? DEFAULT_FAMILY_SETTINGS.learning_area_enabled;
    const disabledGames = familySettings?.disabled_games ?? DEFAULT_FAMILY_SETTINGS.disabled_games;

    // Filter only learning games that are not disabled
    const learningGames = GAMES.filter(
        game => game.category === 'learning' && !disabledGames.includes(game.id)
    );

    // If learning area is disabled by parent, don't show at all
    if (!learningAreaEnabled) {
        return null;
    }

    const handlePracticeComplete = async (stars: number) => {
        if (!selectedGame || stars <= 0) return;

        const { error } = await supabase.from('star_transactions').insert({
            user_id: userId,
            amount: stars,
            type: 'earn',
            description: `學習完成獎勵: ${selectedGame.name} (3分鐘)`,
            game_id: selectedGame.id,
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

            {/* Game Cards Grid */}
            {!isCollapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {learningGames.map((game) => {
                        const colors = getGameColors(game.id);
                        return (
                            <button
                                key={game.id}
                                onClick={() => setSelectedGame(game)}
                                className="clay-game-card"
                                style={{
                                    backgroundColor: colors.bg,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
                            >
                                <div className="icon-circle" style={{ borderColor: colors.border }}>
                                    {game.icon}
                                </div>
                                <h4 className="font-heading text-base font-bold text-center">
                                    {game.name}
                                </h4>
                                <p className="font-body text-xs text-center opacity-80">
                                    {game.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Game Modal in Practice Mode */}
            {selectedGame && (
                <GameModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
                    onGoHome={onGoHome}
                    gameUrl={selectedGame.url}
                    gameName={selectedGame.name}
                    gameId={selectedGame.id}
                    userId={userId}
                    starBalance={0} // Not used in practice mode
                    onSpendStars={async () => true} // Always succeed
                    onRefreshBalance={() => { }} // No-op
                    mode="practice"
                    practiceRewardStars={10}
                    onPracticeComplete={handlePracticeComplete}
                />
            )}
        </div>
    );
};
