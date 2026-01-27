import React, { useState } from 'react';
import { useDailyLogs, useStarBalance } from '../hooks/useQuests';
import { RefreshCw, Play, PlusCircle, Wrench } from 'lucide-react';
import { GAMES, type Game } from '../components/RewardTime';
import { GameModal } from '../components/GameModal';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';

export const DebugPage: React.FC = () => {
    const { user } = useUser();
    const { data: allLogs, isLoading, refetch } = useDailyLogs('all', null);
    const { data: starBalance = 0, refetch: refetchBalance } = useStarBalance(user?.id || '');

    // QA State
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [activeTab, setActiveTab] = useState<'games' | 'logs'>('games');

    // Add Stars Mutation (Quick Hack for QA)
    const addStars = async (amount: number) => {
        if (!user) return;
        try {
            await supabase.from('star_transactions').insert({
                user_id: user.id,
                amount: amount,
                type: 'admin_adjust',
                description: '開發者測試調整',
                game_id: 'qa_tool'
            });
            refetchBalance();
            alert(`已增加 ${amount} 星幣！`);
        } catch (e) {
            console.error(e);
            alert('新增失敗');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-4xl mb-2">⏳</div>
                    <p className="font-pixel">載入中...</p>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 border-green-500';
            case 'completed': return 'bg-yellow-100 border-yellow-500';
            case 'pending': return 'bg-blue-100 border-blue-500';
            default: return 'bg-gray-100 border-gray-500';
        }
    };

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'verified': return '✅';
            case 'completed': return '⏳';
            case 'pending': return '📝';
            default: return '❓';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-pixel flex items-center gap-2">
                        <Wrench className="text-gray-600" />
                        Developer Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">快速驗證遊戲與查看系統狀態</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('games')}
                        className={`px-4 py-2 font-pixel rounded-lg transition-colors ${activeTab === 'games' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300'
                            }`}
                    >
                        🎮 遊戲驗證
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 font-pixel rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300'
                            }`}
                    >
                        📋 每日任務紀錄
                    </button>
                    <button
                        onClick={() => { refetch(); refetchBalance(); }}
                        className="rpg-button flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        重新整理
                    </button>
                </div>
            </div>

            {/* QA Tools Section (Always Visible) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-100 px-4 py-2 rounded-lg border border-yellow-300">
                        <span className="text-xs text-yellow-700 block">目前星幣</span>
                        <span className="font-pixel text-2xl text-yellow-800">{starBalance} ⭐</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => addStars(100)} className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded border border-green-300 hover:bg-green-200">
                        <PlusCircle size={16} /> +100 星幣
                    </button>
                    <button onClick={() => addStars(1000)} className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded border border-green-300 hover:bg-green-200">
                        <PlusCircle size={16} /> +1000 星幣
                    </button>
                </div>
            </div>

            {activeTab === 'games' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {GAMES.map(game => (
                        <div key={game.id} className={`${game.color} bg-opacity-10 p-4 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <span className="text-3xl">{game.icon}</span>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded bg-white/50 font-bold`}>
                                    ID: {game.id}
                                </div>
                            </div>

                            <h3 className="font-pixel text-lg text-white mb-1 drop-shadow-md">{game.name}</h3>
                            <p className="text-white/80 text-sm mb-4 h-10">{game.description}</p>

                            <button
                                onClick={() => setSelectedGame(game)}
                                className="w-full py-2 bg-white text-gray-800 font-pixel rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Play size={16} /> 立即試玩
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded">
                        <p>總記錄數: <strong>{allLogs?.length || 0}</strong></p>
                        <p>✅ Verified: {allLogs?.filter(l => l.status === 'verified').length || 0}</p>
                        <p>⏳ Completed: {allLogs?.filter(l => l.status === 'completed').length || 0}</p>
                        <p>📝 Pending: {allLogs?.filter(l => l.status === 'pending').length || 0}</p>
                    </div>

                    {allLogs && allLogs.length > 0 ? (
                        allLogs.map(log => (
                            <div
                                key={log.id}
                                className={`rpg-panel p-4 border-l-4 ${getStatusColor(log.status)}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{getStatusEmoji(log.status)}</span>
                                        <div>
                                            <h3 className="font-pixel text-lg">
                                                {(log as any).quests?.title || '未知任務'}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {(log as any).profiles?.name || '未知孩子'} ({(log as any).profiles?.student_id || 'N/A'})
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`
                                            px-2 py-1 text-xs font-pixel rounded
                                            ${log.status === 'verified' ? 'bg-green-500 text-white' :
                                                log.status === 'completed' ? 'bg-yellow-500 text-white' :
                                                    'bg-blue-500 text-white'}
                                        `}>
                                            {log.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">
                                    <div><strong>ID:</strong> {log.id.slice(0, 8)}...</div>
                                    <div><strong>日期:</strong> {log.date}</div>
                                    <div>
                                        <strong>完成:</strong>{' '}
                                        {log.completed_at ? new Date(log.completed_at).toLocaleString('zh-TW') : 'N/A'}
                                    </div>
                                    <div>
                                        <strong>建立:</strong>{' '}
                                        {new Date(log.created_at).toLocaleString('zh-TW')}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rpg-panel p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">📭</div>
                            <p className="font-pixel">目前沒有任何記錄</p>
                        </div>
                    )}
                </div>
            )}

            {/* Game Modal - Reused with mock spend function checking */}
            {selectedGame && user && (
                <GameModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
                    gameUrl={selectedGame.url}
                    gameName={selectedGame.name}
                    gameId={selectedGame.id}
                    userId={user.id}
                    starBalance={99999} // Unlimited balance for testing
                    onSpendStars={async () => true} // Always succeed
                    onRefreshBalance={refetchBalance}
                />
            )}
        </div>
    );
};
