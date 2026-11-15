import React, { useState } from 'react';
import { Plus, Trash2, Volume2, Loader2 } from 'lucide-react';
import { RPGDialog } from './RPGDialog';
import { RPGButton } from './RPGButton';
import {
    useCustomSentences,
    useAddCustomSentence,
    useDeleteCustomSentence,
    playSentence
} from '../hooks/useCustomSentences';

interface SentenceSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    familyId: string;
    userId?: string;
}

export const SentenceSettingsDialog: React.FC<SentenceSettingsDialogProps> = ({
    isOpen,
    onClose,
    familyId,
    userId,
}) => {
    const [newEn, setNewEn] = useState('');
    const [newZh, setNewZh] = useState('');

    const { data: sentences = [], isLoading } = useCustomSentences(familyId);
    const addMutation = useAddCustomSentence();
    const deleteMutation = useDeleteCustomSentence();

    const handleAdd = () => {
        if (!newEn.trim() || !newZh.trim()) return;

        addMutation.mutate(
            { familyId, en: newEn, zh: newZh, createdBy: userId },
            {
                onSuccess: () => {
                    setNewEn('');
                    setNewZh('');
                },
            }
        );
    };

    const handleDelete = (id: string) => {
        if (confirm('確定要刪除這個句子嗎？')) {
            deleteMutation.mutate({ id, familyId });
        }
    };

    return (
        <RPGDialog isOpen={isOpen} onClose={onClose} title="📝 句子重組設定">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Add new sentence */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <h3 className="font-heading text-sm mb-3 text-blue-700">新增練習句子</h3>

                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-600">英文句子</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newEn}
                                    onChange={(e) => setNewEn(e.target.value)}
                                    placeholder="This is a cat"
                                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => newEn && playSentence(newEn)}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border-2 border-gray-300"
                                    title="預覽發音"
                                >
                                    <Volume2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-600">中文翻譯</label>
                            <input
                                type="text"
                                value={newZh}
                                onChange={(e) => setNewZh(e.target.value)}
                                placeholder="這是一隻貓"
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded text-sm"
                            />
                        </div>

                        <RPGButton
                            onClick={handleAdd}
                            disabled={!newEn.trim() || !newZh.trim() || addMutation.isPending}
                            className="w-full mt-2"
                        >
                            {addMutation.isPending ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <>
                                    <Plus size={16} /> 新增句子
                                </>
                            )}
                        </RPGButton>
                    </div>
                </div>

                {/* Sentence list */}
                <div>
                    <h3 className="font-heading text-sm mb-2">目前句子 ({sentences.length})</h3>

                    {isLoading ? (
                        <div className="text-center py-4 text-gray-500">
                            <Loader2 className="animate-spin mx-auto" />
                        </div>
                    ) : sentences.length === 0 ? (
                        <p className="text-center py-4 text-gray-500 text-sm">
                            尚無自訂句子，遊戲會使用預設句子
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {sentences.map((sentence) => (
                                <div
                                    key={sentence.id}
                                    className="flex items-center gap-2 p-3 bg-white border-2 border-gray-200 rounded-lg"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{sentence.en}</p>
                                        <p className="text-xs text-gray-500 truncate">{sentence.zh}</p>
                                    </div>

                                    <button
                                        onClick={() => playSentence(sentence.en)}
                                        className="p-2 hover:bg-blue-50 rounded"
                                        title="播放發音"
                                    >
                                        <Volume2 size={16} className="text-blue-500" />
                                    </button>

                                    <button
                                        onClick={() => handleDelete(sentence.id)}
                                        className="p-2 hover:bg-red-50 rounded"
                                        title="刪除"
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <p className="text-xs text-gray-500 text-center">
                    💡 句子會在孩子玩「句子重組」時出現
                </p>
            </div>
        </RPGDialog>
    );
};
