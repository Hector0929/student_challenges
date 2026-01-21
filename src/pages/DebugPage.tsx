import React from 'react';
import { useDailyLogs } from '../hooks/useQuests';
import { RefreshCw } from 'lucide-react';

export const DebugPage: React.FC = () => {
    const { data: allLogs, isLoading, refetch } = useDailyLogs('all', null);

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
            case 'verified':
                return 'bg-green-100 border-green-500';
            case 'completed':
                return 'bg-yellow-100 border-yellow-500';
            case 'pending':
                return 'bg-blue-100 border-blue-500';
            default:
                return 'bg-gray-100 border-gray-500';
        }
    };

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'verified':
                return '✅';
            case 'completed':
                return '⏳';
            case 'pending':
                return '📝';
            default:
                return '❓';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="rpg-panel mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-pixel">🐛 Debug 頁面</h1>
                    <button
                        onClick={() => refetch()}
                        className="rpg-button flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        重新整理
                    </button>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                    <p>總記錄數: <strong>{allLogs?.length || 0}</strong></p>
                    <p>✅ Verified: {allLogs?.filter(l => l.status === 'verified').length || 0}</p>
                    <p>⏳ Completed: {allLogs?.filter(l => l.status === 'completed').length || 0}</p>
                    <p>📝 Pending: {allLogs?.filter(l => l.status === 'pending').length || 0}</p>
                </div>
            </div>

            <div className="space-y-3">
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
                                <div>
                                    <strong>ID:</strong> {log.id.slice(0, 8)}...
                                </div>
                                <div>
                                    <strong>日期:</strong> {log.date}
                                </div>
                                <div>
                                    <strong>完成時間:</strong>{' '}
                                    {log.completed_at
                                        ? new Date(log.completed_at).toLocaleString('zh-TW')
                                        : 'N/A'}
                                </div>
                                <div>
                                    <strong>建立時間:</strong>{' '}
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
        </div>
    );
};
