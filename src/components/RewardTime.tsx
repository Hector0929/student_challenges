import React, { useState } from 'react';
import { Gamepad2, Lock, Star } from 'lucide-react';
import { GameModal } from './GameModal';
import { useStarBalance, useSpendStars } from '../hooks/useQuests';
import { GAME_COST } from '../lib/constants';

interface RewardTimeProps {
    isUnlocked: boolean;
    remainingQuests: number;
    totalQuests: number;
    userId: string;  // NEW: Required for star balance
}

interface Game {
    id: string;
    name: string;
    icon: string;
    description: string;
    url: string;
    color: string;
}

const GAMES: Game[] = [
    {
        id: 'spelling',
        name: '單字召喚術',
        icon: '🅰️',
        description: '英文拼字戰鬥',
        url: '/games/spelling_game.html',
        color: 'bg-teal-400 hover:bg-teal-500'
    },
    {
        id: 'echo',
        name: '聽音辨位',
        icon: '👂',
        description: '英文聽力迷宮',
        url: '/games/echo_game.html',
        color: 'bg-indigo-400 hover:bg-indigo-500'
    },
    {
        id: 'sentence',
        name: '句子重組',
        icon: '📝',
        description: '英文文法挑戰',
        url: '/games/sentence_game.html',
        color: 'bg-pink-400 hover:bg-pink-500'
    },
    {
        id: 'akila',
        name: '加法練習',
        icon: '➕',
        description: '數學計算挑戰',
        url: '/games/akila_plus_test.html',
        color: 'bg-blue-400 hover:bg-blue-500'
    },
    {
        id: 'multiplication',
        name: '乘法練習',
        icon: '✖️',
        description: '九九乘法表',
        url: '/games/multiplication_test.html',
        color: 'bg-purple-400 hover:bg-purple-500'
    },
    {
        id: 'shooting',
        name: '射擊遊戲',
        icon: '🎯',
        description: '反應力訓練',
        url: '/games/shooting_game.html',
        color: 'bg-orange-400 hover:bg-orange-500'
    },
    {
        id: 'tetris',
        name: '俄羅斯方塊',
        icon: '🧱',
        description: '經典益智遊戲',
        url: '/games/Tetris.html',
        color: 'bg-green-400 hover:bg-green-500'
    }
];

export const RewardTime: React.FC<RewardTimeProps> = ({
    isUnlocked,
    remainingQuests,
    totalQuests,
    userId
}) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);

    // Fetch star balance
    const { data: starBalance = 0, refetch: refetchBalance } = useStarBalance(userId);
    const spendStarsMutation = useSpendStars();

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

    if (!isUnlocked) {
        // Locked state
        return (
            <div className="rpg-dialog mt-6 animate-bounce-in">
                <div className="text-center py-8">
                    <Lock className="mx-auto mb-4 text-gray-400" size={48} />
                    <h3 className="font-pixel text-lg mb-2 text-gray-600">🔒 獎勵時間（未解鎖）</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        還差 <span className="font-pixel text-pokeball-red text-lg">{remainingQuests}</span> 個任務就能玩遊戲囉！
                    </p>
                    <div className="max-w-md mx-auto">
                        <div className="w-full bg-gray-200 border-2 border-deep-black h-6 relative">
                            <div
                                className="bg-gradient-to-r from-yellow-400 to-pokeball-red h-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center font-pixel text-xs">
                                {Math.round(progressPercentage)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Unlocked state
    return (
        <>
            <div className="rpg-dialog mt-6 bg-gradient-to-br from-yellow-50 to-orange-50 animate-bounce-in">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-2 animate-bounce">🎉</div>
                    <h3 className="font-pixel text-xl mb-2 text-pokeball-red">獎勵時間解鎖！</h3>
                    <p className="text-sm text-gray-700">選一個遊戲放鬆一下吧 🎮</p>

                    {/* Star Balance Display */}
                    <div className="mt-4 inline-flex items-center gap-2 bg-yellow-100 border-2 border-yellow-400 rounded-full px-4 py-2">
                        <Star className="text-yellow-500" fill="currentColor" size={20} />
                        <span className="font-pixel text-lg text-yellow-700">{starBalance}</span>
                        <span className="text-xs text-yellow-600">可用星幣</span>
                    </div>
                </div>

                {/* Game Cards Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {GAMES.map((game) => (
                        <button
                            key={game.id}
                            onClick={() => setSelectedGame(game)}
                            className={`${game.color} border-2 border-deep-black p-4 transition-all transform hover:scale-105 hover:shadow-lg active:scale-95 relative`}
                        >
                            <div className="text-4xl mb-2">{game.icon}</div>
                            <div className="font-pixel text-sm text-white mb-1">{game.name}</div>
                            <div className="text-xs text-white opacity-90">{game.description}</div>
                            {/* Cost badge */}
                            <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 rounded-full px-2 py-1 text-xs font-bold flex items-center gap-1">
                                <Star size={12} fill="currentColor" />
                                {GAME_COST}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Gamepad2 size={16} />
                        <span className="text-xs">每次遊戲 {GAME_COST} 星幣 / 3分鐘</span>
                    </div>
                </div>
            </div>

            {/* Game Modal */}
            {selectedGame && (
                <GameModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
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
