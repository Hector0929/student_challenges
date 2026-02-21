import React, { useState } from 'react';
import { Gamepad2, Lock, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { GameModal } from './GameModal';
import { useStarBalance, useSpendStars } from '../hooks/useQuests';
import { GAME_COST } from '../lib/constants';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';

interface RewardTimeProps {
    isUnlocked: boolean;
    remainingQuests: number;
    totalQuests: number;
    userId: string;  // NEW: Required for star balance
    onGoHome?: () => void;
}

import { GAMES, getFunGameColors, type Game } from '../lib/gameConfig';

export const RewardTime: React.FC<RewardTimeProps> = ({
    isUnlocked,
    remainingQuests,
    totalQuests,
    userId,
    onGoHome,
}) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Fetch star balance
    const { data: starBalance = 0, refetch: refetchBalance } = useStarBalance(userId);
    const spendStarsMutation = useSpendStars();

    // Fetch family settings for game permissions
    const { data: familySettings } = useFamilySettings();
    const funGamesEnabled = familySettings?.fun_games_enabled ?? DEFAULT_FAMILY_SETTINGS.fun_games_enabled;
    const disabledGames = familySettings?.disabled_games ?? DEFAULT_FAMILY_SETTINGS.disabled_games;

    // Filter games based on settings
    const availableFunGames = GAMES.filter(
        g => g.category === 'fun' && !disabledGames.includes(g.id)
    );

    const progressPercentage = totalQuests > 0 ? ((totalQuests - remainingQuests) / totalQuests) * 100 : 0;

    // Handle spending stars for a game
    const handleSpendStars = async (): Promise<boolean> => {
        if (!selectedGame) return false;

        try {
            await spendStarsMutation.mutateAsync({
                userId,
                amount: GAME_COST,
                gameId: selectedGame.id,
                gameName: selectedGame.name
            });
            return true;
        } catch (error) {
            console.error('Failed to spend stars:', error);
            return false;
        }
    };

    // If fun games are disabled by parent, don't show reward section at all
    if (!funGamesEnabled) {
        return null;
    }

    if (!isUnlocked) {
        // Locked state - Claymorphism style
        return (
            <div className="clay-card mt-6 p-5 animate-bounce-in" style={{ borderRadius: '20px', backgroundColor: '#F5F5F5' }}>
                <div className="text-center py-6">
                    <div
                        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--border-soft)', border: '3px solid var(--border-card)' }}
                    >
                        <Lock size={28} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <h3 className="font-heading text-lg mb-2" style={{ color: 'var(--color-text-light)' }}>
                        🔒 獎勵時間（未解鎖）
                    </h3>
                    <p className="font-body text-base mb-4" style={{ color: 'var(--color-text)' }}>
                        還差 <span className="font-heading text-2xl font-bold" style={{ color: 'var(--color-cta)' }}>{remainingQuests}</span> 個任務就能玩遊戲囉！
                    </p>
                    <div className="max-w-md mx-auto">
                        <div className="clay-progress">
                            <div
                                className="clay-progress-fill"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <p className="font-body text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>
                            {Math.round(progressPercentage)}% 完成
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Unlocked state - Claymorphism style
    return (
        <>
            <div className="clay-card mt-6 p-5 animate-bounce-in" style={{ borderRadius: '20px' }}>
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: 'var(--pastel-orange-bg)', border: '3px solid var(--pastel-orange-border)' }}
                        >
                            <Gamepad2 size={24} style={{ color: 'var(--pastel-orange-text)' }} />
                        </div>
                        <div>
                            <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                                獎勵時間
                            </h2>
                            <p className="font-body text-xs" style={{ color: 'var(--color-text-light)' }}>
                                已解鎖，盡情玩樂吧！
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
                    <>
                        {/* Celebration & Star Balance */}
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-2 animate-float">🎉</div>
                            <h3 className="font-heading text-lg mb-2" style={{ color: 'var(--color-cta)' }}>
                                獎勵時間解鎖！
                            </h3>
                            <p className="font-body text-sm mb-4" style={{ color: 'var(--color-text-light)' }}>
                                選一個遊戲放鬆一下吧 🎮
                            </p>

                            {/* Star Balance Display */}
                            <div className="inline-flex items-center gap-2 clay-star px-4 py-2">
                                <Star fill="currentColor" size={20} />
                                <span className="text-xl font-bold">{starBalance}</span>
                                <span className="text-sm">可用星幣</span>
                            </div>
                        </div>

                        {/* Game Cards Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {availableFunGames.map((game) => {
                                const colors = getFunGameColors(game.id);
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
                                        {/* Cost Badge */}
                                        <div
                                            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full"
                                            style={{
                                                backgroundColor: 'var(--color-cta)',
                                                color: 'white',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                            }}
                                        >
                                            <Star size={12} fill="currentColor" />
                                            <span>{GAME_COST}</span>
                                        </div>

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

                        <div className="mt-4 text-center">
                            <div className="flex items-center justify-center gap-2" style={{ color: 'var(--color-text-light)' }}>
                                <Gamepad2 size={16} />
                                <span className="font-body text-xs">每次遊戲 {GAME_COST} 星幣 / 3分鐘</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Game Modal */}
            {selectedGame && (
                <GameModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
                    onGoHome={onGoHome}
                    gameUrl={selectedGame.url}
                    gameName={selectedGame.name}
                    gameId={selectedGame.id}
                    userId={userId}
                    starBalance={starBalance}
                    onSpendStars={handleSpendStars}
                    onRefreshBalance={() => refetchBalance()}
                />
            )}
        </>
    );
};
