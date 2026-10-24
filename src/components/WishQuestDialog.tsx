import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { RPGDialog } from './RPGDialog';
import { RPGButton } from './RPGButton';
import { useCreateQuest, useUpdateQuestAssignments } from '../hooks/useQuests';
import { useUser } from '../contexts/UserContext';
import { COMMON_EMOJIS } from '../lib/constants';

interface WishQuestDialogProps {
    isOpen: boolean;
    onClose: () => void;
    /** 許願的小孩 */
    userId: string;
}

// 小孩許願新任務：送給家長審核。儀表板與學習挑戰群島的許願池共用。
export const WishQuestDialog: React.FC<WishQuestDialogProps> = ({ isOpen, onClose, userId }) => {
    const [formData, setFormData] = useState({ title: '', icon: '👾' });
    const createQuestMutation = useCreateQuest();
    const updateAssignmentsMutation = useUpdateQuestAssignments();
    const { user, session } = useUser();
    const handleCloseDialog = () => {
        setFormData({ title: '', icon: '👾' });
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('📝 handleSubmit triggered!', formData);

        try {
            console.log('🚀 Sending quest mutation...');

            // Critical Fix: Use session.user.id (Parent Auth ID) to satisfy RLS
            // Logic: The "Quest" is technically created by the Account Owner (Parent)
            // but we note the Child's name in the description.
            const creatorId = session?.user?.id || userId;
            const childName = user?.name || '孩子';

            const newQuest = await createQuestMutation.mutateAsync({
                title: formData.title,
                description: `由 ${childName} 建立的願望任務`,
                icon: formData.icon,
                reward_points: 10,
                is_active: true, // Required by TS
                status: 'pending',
                created_by: creatorId,
            });
            // Pre-assign to the wishing child so approval can find the correct child_id.
            // (created_by stores the parent's auth ID for RLS, not the child's profile ID)
            if (newQuest?.id) {
                await updateAssignmentsMutation.mutateAsync({
                    questId: newQuest.id,
                    childIds: [userId],
                });
            }
            console.log('✅ Quest created successfully');
            alert('✅ 任務已送出審核！\n\n請等待爸爸媽媽核准。');
            handleCloseDialog();
        } catch (error) {
            console.error('Failed to create quest', error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`❌ 建立失敗\n\n錯誤：${msg}\n\n請告訴爸爸媽媽這個錯誤訊息`);
        }
    };

    return (
        <>
            {/* Create Quest Dialog */}
            <RPGDialog
                isOpen={isOpen}
                onClose={handleCloseDialog}
                title="許願新任務 For Parents"
                footer={
                    <div className="flex gap-3 justify-end">
                        <RPGButton variant="secondary" onClick={handleCloseDialog}>
                            <div className="flex items-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </RPGButton>
                        <RPGButton
                            type="button"
                            onClick={() => {
                                console.log('🖱️ Button clicked, attempting to submit form...');
                                const form = document.getElementById('create-quest-form') as HTMLFormElement;
                                if (form) {
                                    form.requestSubmit();
                                } else {
                                    console.error('❌ Form element not found!');
                                    alert('程式錯誤：找不到表單，請重新整理網頁');
                                }
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Save size={16} />
                                <span>送出許願</span>
                            </div>
                        </RPGButton>
                    </div>
                }
            >
                <form id="create-quest-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block font-pixel text-xs mb-2">我想做什麼...</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            placeholder="例：幫忙摺衣服"
                            required
                        />
                    </div>
                    <div>
                        <label className="block font-pixel text-xs mb-2">選個圖案</label>
                        <div className="grid grid-cols-6 gap-2">
                            {COMMON_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon: emoji })}
                                    className={`text-xl p-2 border-2 border-deep-black hover:bg-gray-100 transition-colors ${formData.icon === emoji ? 'bg-yellow-200' : 'bg-white'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </form>
            </RPGDialog>

        </>
    );
};
