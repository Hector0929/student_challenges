import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { GameModal } from './GameModal';
import { GAMES, type Game } from './RewardTime';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';

interface LearningAreaProps {
    userId: string;
}

export const LearningArea: React.FC<LearningAreaProps> = ({ userId }) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

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

    return (
        <div className="rpg-dialog mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 animate-bounce-in">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                        <BookOpen className="text-blue-500" size={24} />
                    </div>
                    <div>
                        <h2 className="font-pixel text-xl text-blue-900">學習書桌</h2>
                        <p className="text-xs text-blue-600">隨時都可以練習，不需要星幣喔！</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="px-3 py-2 border-2 border-blue-900/10 bg-white hover:bg-blue-50 transition-colors rounded-lg text-blue-900"
                >
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {learningGames.map((game) => (
                        <button
                            key={game.id}
                            onClick={() => setSelectedGame(game)}
                            className={`${game.color} border-2 border-blue-900/10 p-4 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg active:scale-95 text-left group relative overflow-hidden`}
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-4xl">📚</span>
                            </div>

                            <div className="text-4xl mb-2 filter drop-shadow-sm">{game.icon}</div>
                            <div className="font-pixel text-sm text-white mb-1 shadow-black/10 drop-shadow-md">
                                {game.name}
                            </div>
                            <div className="text-xs text-white/90 font-medium">
                                {game.description}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Game Modal in Practice Mode */}
            {selectedGame && (
                <GameModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
                    gameUrl={selectedGame.url}
                    gameName={selectedGame.name}
                    gameId={selectedGame.id}
                    userId={userId}
                    starBalance={0} // Not used in practice mode
                    onSpendStars={async () => true} // Always succeed
                    onRefreshBalance={() => { }} // No-op
                    mode="practice"
                />
            )}
        </div>
    );
};
