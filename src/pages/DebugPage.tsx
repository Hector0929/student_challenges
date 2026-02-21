import React, { useState } from 'react';
import { useDailyLogs, useStarBalance } from '../hooks/useQuests';
import { RefreshCw, Play, PlusCircle, Dices, Bug } from 'lucide-react';
import { GAMES, type Game } from '../lib/gameConfig';
import { GameModal } from '../components/GameModal';
import { MonsterTower, TowerPreview } from '../components/MonsterTower';
import { MonsterTowerV2, TowerV2Preview } from '../components/MonsterTowerV2';
import { useTowerProgress, useAddDice } from '../hooks/useTowerProgress';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { DailyLog } from '../types/database';

interface DailyLogWithRelations extends DailyLog {
    quests?: { title: string };
    profiles?: { name: string; student_id?: string };
}

export const DebugPage: React.FC = () => {
    const { user } = useUser();
    const { data: allLogs, isLoading, refetch } = useDailyLogs('all', null);
    const { data: starBalance = 0, refetch: refetchBalance } = useStarBalance(user?.id || '');

    // QA State
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [activeTab, setActiveTab] = useState<'games' | 'logs' | 'tower' | 'towerV2'>('games');
    const [isTowerOpen, setIsTowerOpen] = useState(false);
    const [isTowerV2Open, setIsTowerV2Open] = useState(false);

    // Tower data
    const { data: towerProgress, refetch: refetchTower } = useTowerProgress(user?.id || '');
    const addDiceMutation = useAddDice();

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
                    <p className="font-heading">載入中...</p>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl clay-card">
                        <Bug className="text-primary-dark" size={28} />
                    </div>
                    <div>
                        <h1 className="font-heading text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Developer Dashboard</h1>
                        <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>快速驗證遊戲與查看系統狀態</p>
                    </div>
                </div>

                <button
                    onClick={() => { refetch(); refetchBalance(); }}
                    className="clay-btn py-3 px-5 flex items-center gap-2 self-start md:self-auto"
                >
                    <RefreshCw size={16} />
                    重新整理
                </button>
            </div>

            <div className="clay-tab-switch w-full md:w-fit p-1 mb-6 flex-wrap">
                <button
                    onClick={() => setActiveTab('games')}
                    className={activeTab === 'games' ? 'active' : ''}
                >
                    🎮 遊戲驗證
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={activeTab === 'logs' ? 'active' : ''}
                >
                    📋 每日任務紀錄
                </button>
                <button
                    onClick={() => setActiveTab('tower')}
                    className={activeTab === 'tower' ? 'active' : ''}
                >
                    🏰 怪獸塔 V1
                </button>
                <button
                    onClick={() => setActiveTab('towerV2')}
                    className={activeTab === 'towerV2' ? 'active' : ''}
                >
                    🏰 怪獸塔 V2
                </button>
            </div>

            {/* QA Tools Section (Always Visible) */}
            <div className="clay-card p-4 mb-6 flex items-center justify-between" style={{ borderRadius: '20px' }}>
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-100 px-4 py-2 rounded-xl border-2 border-yellow-200">
                        <span className="text-xs text-yellow-700 block">目前星幣</span>
                        <span className="font-heading font-bold text-2xl text-yellow-800">{starBalance} ⭐</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => addStars(100)} className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl border-2 border-emerald-200 hover:bg-emerald-200 font-heading font-bold">
                        <PlusCircle size={16} /> +100 星幣
                    </button>
                    <button onClick={() => addStars(1000)} className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl border-2 border-emerald-200 hover:bg-emerald-200 font-heading font-bold">
                        <PlusCircle size={16} /> +1000 星幣
                    </button>
                </div>
            </div>

            {activeTab === 'games' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {GAMES.map(game => (
                        <div key={game.id} className={`${game.color} bg-opacity-10 p-4 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <span className="text-3xl">{game.icon}</span>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded bg-white/50 font-bold`}>
                                    ID: {game.id}
                                </div>
                            </div>

                            <h3 className="font-heading font-bold text-xl text-white mb-1 drop-shadow-md">{game.name}</h3>
                            <p className="text-white/80 text-sm mb-4 h-10">{game.description}</p>

                            <button
                                onClick={() => setSelectedGame(game)}
                                className="w-full py-2 bg-white text-gray-800 font-heading font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Play size={16} /> 立即試玩
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl border-2 border-gray-200">
                        <p>總記錄數: <strong>{allLogs?.length || 0}</strong></p>
                        <p>✅ Verified: {allLogs?.filter(l => l.status === 'verified').length || 0}</p>
                        <p>⏳ Completed: {allLogs?.filter(l => l.status === 'completed').length || 0}</p>
                        <p>📝 Pending: {allLogs?.filter(l => l.status === 'pending').length || 0}</p>
                    </div>

                    {allLogs && allLogs.length > 0 ? (
                        allLogs.map((item) => {
                            const log = item as unknown as DailyLogWithRelations;
                            return (
                                <div
                                    key={log.id}
                                    className={`rpg-panel p-4 border-l-4 ${getStatusColor(log.status)}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getStatusEmoji(log.status)}</span>
                                            <div>
                                                <h3 className="font-pixel text-lg">
                                                    {log.quests?.title || '未知任務'}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {log.profiles?.name || '未知孩子'} ({log.profiles?.student_id || 'N/A'})
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
                            );
                        })
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
                    onGoHome={() => setSelectedGame(null)}
                    gameUrl={selectedGame.url}
                    gameName={selectedGame.name}
                    gameId={selectedGame.id}
                    userId={user.id}
                    starBalance={99999} // Unlimited balance for testing
                    onSpendStars={async () => true} // Always succeed
                    onRefreshBalance={refetchBalance}
                />
            )}

            {/* Tower Tab Content */}
            {activeTab === 'tower' && user && (
                <div className="space-y-4">
                    {/* Tower Preview Card */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h3 className="font-pixel text-lg mb-3 flex items-center gap-2">
                            🏰 怪獸塔預覽
                        </h3>
                        <TowerPreview userId={user.id} onClick={() => setIsTowerOpen(true)} />
                    </div>

                    {/* Tower Stats */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h3 className="font-pixel text-lg mb-3">📊 塔樓狀態</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                <p className="text-xs text-amber-600">目前樓層</p>
                                <p className="font-pixel text-2xl text-amber-800">{towerProgress?.current_floor || 1}</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                <p className="text-xs text-yellow-600">可用骰子</p>
                                <p className="font-pixel text-2xl text-yellow-800">{towerProgress?.dice_count || 0} 🎲</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <p className="text-xs text-purple-600">怪獸收集</p>
                                <p className="font-pixel text-2xl text-purple-800">{towerProgress?.monsters_collected?.length || 0}/4</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <p className="text-xs text-green-600">最高紀錄</p>
                                <p className="font-pixel text-2xl text-green-800">{towerProgress?.highest_floor || 1} 層</p>
                            </div>
                        </div>
                    </div>

                    {/* QA Controls */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h3 className="font-pixel text-lg mb-3 flex items-center gap-2">
                            <Dices size={20} /> QA 工具 - 骰子控制
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={async () => {
                                    await addDiceMutation.mutateAsync({ userId: user.id, amount: 1 });
                                    refetchTower();
                                }}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg border border-green-300 hover:bg-green-200 flex items-center gap-2"
                            >
                                <PlusCircle size={16} /> +1 骰子
                            </button>
                            <button
                                onClick={async () => {
                                    await addDiceMutation.mutateAsync({ userId: user.id, amount: 10 });
                                    refetchTower();
                                }}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg border border-green-300 hover:bg-green-200 flex items-center gap-2"
                            >
                                <PlusCircle size={16} /> +10 骰子
                            </button>
                            <button
                                onClick={() => setIsTowerOpen(true)}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
                            >
                                🏰 開啟怪獸塔
                            </button>
                            <button
                                onClick={() => refetchTower()}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 flex items-center gap-2"
                            >
                                <RefreshCw size={16} /> 重新整理
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tower V2 Tab Content */}
            {activeTab === 'towerV2' && user && (
                <div className="space-y-4">
                    {/* V2 Preview Card */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h3 className="font-pixel text-lg mb-3 flex items-center gap-2">
                            🏰 怪獸塔 V2 - Snakes & Ladders Style
                        </h3>
                        <TowerV2Preview userId={user.id} onClick={() => setIsTowerV2Open(true)} />
                    </div>

                    {/* V2 Info */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                        <h3 className="font-pixel text-lg mb-2">✨ V2 新功能</h3>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• 10x10 經典蛇梯棋盤佈局</li>
                            <li>• 🪜 梯子可以往上爬</li>
                            <li>• 🐍 蛇會讓你滑下去</li>
                            <li>• 保留原有：骰子、轉盤、購買功能</li>
                        </ul>
                    </div>

                    {/* QA Controls */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <h3 className="font-pixel text-lg mb-3 flex items-center gap-2">
                            <Dices size={20} /> QA 工具
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={async () => {
                                    await addDiceMutation.mutateAsync({ userId: user.id, amount: 10 });
                                    refetchTower();
                                }}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg border border-green-300 hover:bg-green-200 flex items-center gap-2"
                            >
                                <PlusCircle size={16} /> +10 骰子
                            </button>
                            <button
                                onClick={() => setIsTowerV2Open(true)}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
                            >
                                🏰 開啟怪獸塔 V2
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Monster Tower Modal */}
            {user && (
                <MonsterTower
                    userId={user.id}
                    isOpen={isTowerOpen}
                    onClose={() => setIsTowerOpen(false)}
                />
            )}

            {/* Monster Tower V2 Modal */}
            {user && (
                <MonsterTowerV2
                    userId={user.id}
                    isOpen={isTowerV2Open}
                    onClose={() => setIsTowerV2Open(false)}
                />
            )}
        </div>
    );
};
