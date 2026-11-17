import React, { useState } from 'react';
import { useDailyLogs, useStarBalance } from '../hooks/useQuests';
import { RefreshCw, Play, PlusCircle, Dices, Bug } from 'lucide-react';
import { FUN_GAMES, type FunGame } from '../lib/gameConfig';
import { GameModal } from '../components/GameModal';
import { MonsterTowerGen3, TowerGen3Preview } from '../components/MonsterTowerGen3';
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
    const [selectedGame, setSelectedGame] = useState<FunGame | null>(null);
    const [activeTab, setActiveTab] = useState<'games' | 'logs' | 'towerV3'>('games');
    const [isTowerGen3Open, setIsTowerGen3Open] = useState(false);

    // Debug 分頁操作的是孩子「真實」的爬塔進度（V1/V2/V3 共用同一筆 tower_progress），
    // 開啟前先提醒家長，避免測試時的擲骰/加骰子誤動到孩子的正式紀錄。
    const openLiveTowerModal = (open: () => void) => {
        const confirmed = window.confirm(
            '這會直接開啟孩子在怪獸塔的「正式進度」（樓層、骰子、怪獸收藏），在這裡的任何操作都會真的改動孩子的存檔。確定要繼續嗎？'
        );
        if (confirmed) open();
    };

    // Tower data
    const { data: towerProgress, refetch: refetchTower } = useTowerProgress(user?.id || '');
    const addDiceMutation = useAddDice();

    const adjustStars = async (amount: number, description: string): Promise<boolean> => {
        if (!user) return false;
        try {
            // Compatibility strategy:
            // 1) Newer schema supports: adjustment/correction
            // 2) Older schema only supports: earn/spend
            const candidates: Array<{ type: string; description: string }> = [
                { type: 'adjustment', description },
                { type: amount >= 0 ? 'earn' : 'spend', description: `[fallback] ${description}` },
            ];

            let inserted = false;
            let lastError: unknown = null;

            for (const c of candidates) {
                const { error } = await supabase.from('star_transactions').insert({
                    user_id: user.id,
                    amount: amount,
                    type: c.type,
                    description: c.description,
                    game_id: 'qa_tool'
                });

                if (!error) {
                    inserted = true;
                    break;
                }
                lastError = error;
            }

            if (!inserted) {
                throw lastError || new Error('unknown star transaction insert error');
            }

            refetchBalance();
            return true;
        } catch (e) {
            console.error(e);
            alert('星幣調整失敗');
            return false;
        }
    };

    // Add Stars Mutation (Quick Hack for QA)
    const addStars = async (amount: number) => {
        const ok = await adjustStars(amount, '開發者測試調整');
        if (ok) {
            alert(`已增加 ${amount} 星幣！`);
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
                        <h1 className="font-heading text-3xl font-bold text-ink">Developer Dashboard</h1>
                        <p className="font-body text-sm text-ink-soft">快速驗證遊戲與查看系統狀態</p>
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
                    onClick={() => setActiveTab('towerV3')}
                    className={activeTab === 'towerV3' ? 'active' : ''}
                >
                    🏰 怪獸塔 V3 (2.5D)
                </button>
            </div>

            {/* QA Tools Section (Always Visible) */}
            <div className="clay-card p-4 mb-6 flex items-center justify-between rounded-card">
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
                    {FUN_GAMES.map(game => (
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

            {/* Tower V3 (2.5D) Tab Content */}
            {activeTab === 'towerV3' && user && (
                <div className="space-y-4">
                    {/* V3 Preview Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-amber-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-pixel text-lg flex items-center gap-2 text-amber-800">
                                🏰 怪獸塔 V3 (2.5D) · 開發驗證專區
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                2.5D Isometric Engine
                            </span>
                        </div>
                        <TowerGen3Preview userId={user.id} onClick={() => openLiveTowerModal(() => setIsTowerGen3Open(true))} />
                    </div>

                    {/* V3 核心改版特色與舊怪獸保存說明 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
                            <h4 className="font-pixel text-base text-amber-900 mb-2 flex items-center gap-1.5">
                                🌟 2.5D 新視覺特色
                            </h4>
                            <ul className="text-xs text-amber-950 space-y-1.5 leading-relaxed">
                                <li>• <strong>等角立體地塊</strong>：泥土/晶石厚度側面、接地陰影與頂部高光。</li>
                                <li>• <strong>連續微光路徑</strong>：發光階梯與魔力導引線，爬塔路徑更清晰。</li>
                                <li>• <strong>寵物隨行系統</strong>：出戰首席怪獸化身為浮空小跟班陪伴攀登。</li>
                                <li>• <strong>關卡情報泡泡</strong>：點擊任意格子即可檢視地形與事件。</li>
                            </ul>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 shadow-sm">
                            <h4 className="font-pixel text-base text-emerald-900 mb-2 flex items-center gap-1.5">
                                🎒 舊怪獸 100% 完整保存
                            </h4>
                            <p className="text-xs text-emerald-950 leading-relaxed mb-2">
                                孩子在 V2/V1 收集的所有怪獸已自動直連繼承，展出於畫面底部常駐的「怪獸庇護所背包」：
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {(towerProgress?.monsters_collected || []).filter((m) => !m.startsWith('egg:')).length > 0 ? (
                                    (towerProgress?.monsters_collected || [])
                                        .filter((m) => !m.startsWith('egg:'))
                                        .map((mId) => (
                                            <span key={mId} className="px-2 py-0.5 rounded-lg bg-white/80 border border-emerald-300 text-xs font-bold text-emerald-800">
                                                👾 {mId}
                                            </span>
                                        ))
                                ) : (
                                    <span className="text-xs text-emerald-700 italic">（目前尚無怪獸，進入 V3 將自動配置初號夥伴小綠球測試）</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* QA Controls */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                        <h3 className="font-pixel text-base mb-3 flex items-center gap-2">
                            <Dices size={18} /> V3 測試快捷控制
                        </h3>
                        <div className="flex flex-wrap gap-2.5">
                            <button
                                onClick={async () => {
                                    await addDiceMutation.mutateAsync({ userId: user.id, amount: 5 });
                                    refetchTower();
                                }}
                                className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 hover:bg-emerald-200 font-bold flex items-center gap-1.5 text-sm"
                            >
                                <PlusCircle size={15} /> +5 骰子
                            </button>
                            <button
                                onClick={async () => {
                                    await addDiceMutation.mutateAsync({ userId: user.id, amount: 20 });
                                    refetchTower();
                                }}
                                className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 hover:bg-emerald-200 font-bold flex items-center gap-1.5 text-sm"
                            >
                                <PlusCircle size={15} /> +20 骰子
                            </button>
                            <button
                                onClick={() => openLiveTowerModal(() => setIsTowerGen3Open(true))}
                                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-md flex items-center gap-2 text-sm"
                            >
                                🚀 開啟怪獸塔 V3 (2.5D)
                            </button>
                            <button
                                onClick={() => refetchTower()}
                                className="px-3.5 py-2 bg-gray-100 text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-200 text-sm flex items-center gap-1.5"
                            >
                                <RefreshCw size={14} /> 重新讀取進度
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Monster Tower Gen3 Modal */}
            {user && (
                <MonsterTowerGen3
                    userId={user.id}
                    isOpen={isTowerGen3Open}
                    onClose={() => setIsTowerGen3Open(false)}
                />
            )}
        </div>
    );
};
