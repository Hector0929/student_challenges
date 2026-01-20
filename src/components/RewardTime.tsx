import React, { useState } from 'react';
import { Gamepad2, Lock } from 'lucide-react';
import { GameModal } from './GameModal';

interface RewardTimeProps {
    isUnlocked: boolean;
    remainingQuests: number;
    totalQuests: number;
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
        id: 'akila',
        name: '英文測驗',
        icon: '🔤',
        description: '單字記憶遊戲',
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

export const RewardTime: React.FC<RewardTimeProps> = ({ isUnlocked, remainingQuests, totalQuests }) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);

    const progressPercentage = totalQuests > 0 ? ((totalQuests - remainingQuests) / totalQuests) * 100 : 0;

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
                </div>

                {/* Game Cards Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {GAMES.map((game) => (
                        <button
                            key={game.id}
                            onClick={() => setSelectedGame(game)}
                            className={`${game.color} border-2 border-deep-black p-6 transition-all transform hover:scale-105 hover:shadow-lg active:scale-95`}
                        >
                            <div className="text-5xl mb-2">{game.icon}</div>
                            <div className="font-pixel text-sm text-white mb-1">{game.name}</div>
                            <div className="text-xs text-white opacity-90">{game.description}</div>
                        </button>
                    ))}
                </div>

                <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Gamepad2 size={16} />
                        <span className="text-xs">點擊卡片開始遊戲</span>
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
                />
            )}
        </>
    );
};
