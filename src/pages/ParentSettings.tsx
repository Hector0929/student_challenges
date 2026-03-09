import React, { useState, useEffect } from 'react';
import { Save, Lock, Home, Coins, Plus, Minus, X, MessageCircle, ArrowRightLeft, Gamepad2, BookOpen } from 'lucide-react';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { useAdjustStars, useStarBalance } from '../hooks/useQuests';
import { useFamilySettings, useUpdateFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';
import { useQuery } from '@tanstack/react-query';
import { ClayDialog } from '../components/ClayDialog';
import { FUN_GAMES, type FunGame } from '../lib/gameConfig';
import { SentenceSettingsDialog } from '../components/SentenceSettingsDialog';
import { ParentMonsterShopManager } from '../components/ParentMonsterShopManager';
import type { LearningItem } from '../features/learning/types/learning';
import { LEARNING_ITEMS } from '../features/learning/config/learningItems';
import { getManageableLearningItems } from '../features/learning/utils/learningFilters';

// Component for individual game toggle
type ToggleableItem = Pick<FunGame, 'id' | 'name' | 'icon'> | Pick<LearningItem, 'id' | 'name' | 'icon'>;

const GameToggleRow = ({
    game,
    toggleKey,
    isEnabled,
    isDisabled,
    onToggle,
    onSettings
}: {
    game: ToggleableItem;
    toggleKey?: string;
    isEnabled: boolean;
    isDisabled: boolean;
    onToggle: (gameId: string, enabled: boolean) => void;
    onSettings?: () => void;
}) => (
    <div className={`flex items-center justify-between bg-white border-2 border-indigo-100 p-3 rounded-xl ${isDisabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="font-heading text-sm font-bold">{game.name}</span>
        </div>
        <div className="flex items-center gap-2">
            {/* Settings gear for sentence game */}
            {onSettings && (
                <button
                    type="button"
                    onClick={onSettings}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="設定自訂句子"
                >
                    ⚙️
                </button>
            )}
            <ToggleSwitch
                enabled={isEnabled}
                onChange={(enabled) => onToggle(toggleKey ?? game.id, enabled)}
                disabled={isDisabled}
            />
        </div>
    </div>
);

const ChildStarRow = ({ child, onAdjust }: { child: Profile; onAdjust: (child: Profile) => void }) => {
    const { data: balance, isLoading } = useStarBalance(child.id);

    return (
        <div className="flex items-center justify-between bg-white border-2 border-indigo-100 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
                <div className="clay-icon-circle bg-white text-2xl" style={{ width: '52px', height: '52px', borderRadius: '14px' }}>{child.avatar_url || '👦'}</div>
                <div>
                    <div className="font-heading font-bold text-base" style={{ color: 'var(--color-text)' }}>{child.name}</div>
                    <div className="text-xs text-yellow-600 font-bold flex items-center gap-1">
                        <Coins size={12} />
                        {isLoading ? '...' : balance} 星幣
                    </div>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onAdjust(child)}
                className="px-4 py-2 bg-amber-400 hover:brightness-105 text-white border-b-4 border-amber-600 rounded-xl font-heading font-bold text-sm transition-all active:scale-95"
            >
                調整
            </button>
        </div>
    );
};

export const ParentSettings: React.FC = () => {
    const { user, setUser } = useUser();
    const [familyName, setFamilyName] = useState('');
    const [userName, setUserName] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Star Adjustment State
    const [adjustChild, setAdjustChild] = useState<Profile | null>(null);
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
    const [adjustAmount, setAdjustAmount] = useState<number | string>(10);
    const [adjustReason, setAdjustReason] = useState<string>('');
    const adjustStarsMutation = useAdjustStars();

    // Family Settings
    const { data: familySettings } = useFamilySettings();
    const updateFamilySettingsMutation = useUpdateFamilySettings();
    const [parentMessageEnabled, setParentMessageEnabled] = useState(false);
    const [parentMessage, setParentMessage] = useState(DEFAULT_FAMILY_SETTINGS.parent_message);
    const [exchangeRateEnabled, setExchangeRateEnabled] = useState(false);
    const [starToTwdRate, setStarToTwdRate] = useState<number | string>(DEFAULT_FAMILY_SETTINGS.star_to_twd_rate);

    // Game Permission States
    const [funGamesEnabled, setFunGamesEnabled] = useState(true);
    const [learningAreaEnabled, setLearningAreaEnabled] = useState(true);
    const [disabledGames, setDisabledGames] = useState<string[]>([]);
    const [showSentenceSettings, setShowSentenceSettings] = useState(false);
    const manageableLearningItems = getManageableLearningItems(LEARNING_ITEMS);

    // Fetch children
    const { data: children } = useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'child')
                .order('name');
            return data as Profile[];
        },
    });

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.family_id) return;

            // Get Family Name
            const { data: family } = await supabase
                .from('families')
                .select('name')
                .eq('id', user.family_id)
                .single();

            if (family) setFamilyName(family.name);

            // Get current PIN and Name (from user profile)
            if (user.pin_code) setPin(user.pin_code);
            if (user.name) setUserName(user.name);
        };

        fetchData();
    }, [user]);

    // Sync family settings to local state
    useEffect(() => {
        if (familySettings) {
            setParentMessageEnabled(familySettings.parent_message_enabled);
            setParentMessage(familySettings.parent_message);
            setExchangeRateEnabled(familySettings.exchange_rate_enabled);
            setStarToTwdRate(familySettings.star_to_twd_rate);
            // Game permissions
            setFunGamesEnabled(familySettings.fun_games_enabled ?? true);
            setLearningAreaEnabled(familySettings.learning_area_enabled ?? true);
            setDisabledGames(familySettings.disabled_games ?? []);
        }
    }, [familySettings]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // Update Family Name
            if (user?.family_id) {
                const { data: updatedDetails, error: familyError } = await supabase
                    .from('families')
                    .update({ name: familyName.trim() })
                    .eq('id', user.family_id)
                    .select('id');

                if (familyError) throw familyError;

                if (!updatedDetails || updatedDetails.length === 0) {
                    console.warn("Family update returned 0 rows. Possible RLS issue.");
                    throw new Error('無法更新家庭名稱 (權限不足：您可能不是家庭建立者)');
                }
            }

            // Update Profile (PIN and Name)
            const { data: updatedUser, error: profileError } = await supabase
                .from('profiles')
                .update({
                    pin_code: pin.trim(),
                    name: userName.trim()
                })
                .eq('id', user!.id)
                .select()
                .single();

            if (profileError) throw profileError;

            if (updatedUser) {
                setUser(updatedUser);
            }

            // Update Family Settings
            await updateFamilySettingsMutation.mutateAsync({
                parent_message_enabled: parentMessageEnabled,
                parent_message: parentMessage,
                exchange_rate_enabled: exchangeRateEnabled,
                star_to_twd_rate: Number(starToTwdRate) || DEFAULT_FAMILY_SETTINGS.star_to_twd_rate,
                // Game permissions
                fun_games_enabled: funGamesEnabled,
                learning_area_enabled: learningAreaEnabled,
                disabled_games: disabledGames,
            });

            setMessage({ text: '設定已更新！', type: 'success' });
        } catch (error) {
            console.error('Update failed:', error);
            const msg = error instanceof Error ? error.message : '更新失敗';
            setMessage({ text: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdjust = (child: Profile) => {
        setAdjustChild(child);
        setAdjustType('add');
        setAdjustAmount(10);
        setAdjustReason('');
    };

    const handleAdjustSubmit = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        if (!adjustChild || !user) return;

        try {
            const finalAmount = adjustType === 'add' ? (Number(adjustAmount) || 0) : -(Number(adjustAmount) || 0);
            const description = adjustReason || (adjustType === 'add' ? '家長獎勵' : '家長扣除');

            await adjustStarsMutation.mutateAsync({
                childId: adjustChild.id,
                amount: finalAmount,
                description: description,
                parentId: user.id
            });

            setAdjustChild(null);
        } catch (error) {
            console.error('Adjustment failed', error);
            alert('調整失敗，請稍後再試');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl clay-card">
                        <Lock className="text-primary-dark" size={28} />
                    </div>
                    <div>
                        <h2 className="font-heading text-3xl font-bold" style={{ color: 'var(--color-text)' }}>家長設定</h2>
                        <p className="font-body text-sm" style={{ color: 'var(--color-text-light)' }}>帳號、星幣、遊戲與學習偏好設定</p>
                    </div>
                </div>
            </div>

            <div className="clay-card animate-bounce-in p-6" style={{ borderRadius: '24px' }}>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* User Name Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-blue-100 p-1 rounded">👤</div>
                            家長暱稱
                        </h3>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                顯示在右上角的稱呼
                            </label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                                placeholder="例如：超級媽媽"
                                required
                            />
                        </div>
                    </div>

                    {/* Family Name Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <Home size={20} />
                            家庭名稱
                        </h3>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                為您的冒險公會取個響亮的名字
                            </label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                                placeholder="例如：陳家大冒險"
                                required
                            />
                        </div>
                    </div>

                    {/* Parent Message & Exchange Rate Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-purple-100 p-1 rounded text-purple-600">
                                <MessageCircle size={20} />
                            </div>
                            訊息與匯率設定
                        </h3>
                        <div className="space-y-6">
                            {/* Parent Message Toggle */}
                            <div className="bg-white border-2 border-deep-black p-4 rounded-lg">
                                <ToggleSwitch
                                    enabled={parentMessageEnabled}
                                    onChange={setParentMessageEnabled}
                                    label="📢 父母叮囑"
                                    description="在孩子的首頁顯示一段鼓勵的話"
                                />
                                {parentMessageEnabled && (
                                    <div className="mt-4">
                                        <textarea
                                            value={parentMessage}
                                            onChange={(e) => setParentMessage(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-deep-black text-sm resize-none"
                                            rows={2}
                                            placeholder="例如：今天也要加油嗎！"
                                            maxLength={100}
                                        />
                                        <p className="text-xs text-gray-500 mt-1 text-right">
                                            {parentMessage.length}/100
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Exchange Rate Toggle */}
                            <div className="bg-white border-2 border-deep-black p-4 rounded-lg">
                                <ToggleSwitch
                                    enabled={exchangeRateEnabled}
                                    onChange={setExchangeRateEnabled}
                                    label="💱 星幣匯率"
                                    description="讓孩子知道星幣可以換成多少零用錢"
                                />
                                {exchangeRateEnabled && (
                                    <div className="mt-4 flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-yellow-100 px-3 py-2 border-2 border-deep-black">
                                            <span className="text-xl">⭐</span>
                                            <span className="font-pixel">1 星</span>
                                        </div>
                                        <ArrowRightLeft size={20} className="text-gray-400" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">💰</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={starToTwdRate}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                                        setStarToTwdRate(v === '' ? '' : v);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (starToTwdRate === '' || Number(starToTwdRate) <= 0) {
                                                        setStarToTwdRate(DEFAULT_FAMILY_SETTINGS.star_to_twd_rate);
                                                    } else {
                                                        setStarToTwdRate(parseFloat(String(starToTwdRate)));
                                                    }
                                                }}
                                                className="w-20 px-2 py-2 border-2 border-deep-black text-sm font-pixel text-center"
                                                min="0.01"
                                                step="0.01"
                                            />
                                            <span className="font-pixel text-sm">TWD</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Star Management Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-yellow-100 p-1 rounded text-yellow-600">
                                <Coins size={20} />
                            </div>
                            星幣管理
                        </h3>
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-2">
                                您可以直接調整孩子的星幣數量 (獎勵或懲罰)。
                            </p>
                            {children?.map(child => (
                                <ChildStarRow
                                    key={child.id}
                                    child={child}
                                    onAdjust={handleOpenAdjust}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Game & Learning Management Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-green-100 p-1 rounded text-green-600">
                                <Gamepad2 size={20} />
                            </div>
                            遊戲與學習管理
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            控制孩子可以玩的遊戲和使用的學習功能。
                        </p>

                        <div className="space-y-6">
                            {/* Fun Games Section */}
                            <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Gamepad2 size={18} className="text-orange-600" />
                                    <span className="font-pixel text-sm text-orange-800">獎勵遊戲</span>
                                </div>
                                <ToggleSwitch
                                    enabled={funGamesEnabled}
                                    onChange={setFunGamesEnabled}
                                    label="🎮 開啟獎勵遊戲區"
                                    description="關閉後，孩子將看不到獎勵時間區塊"
                                />
                                {funGamesEnabled && (
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        {FUN_GAMES.map(game => (
                                            <GameToggleRow
                                                key={game.id}
                                                game={game}
                                                isEnabled={!disabledGames.includes(game.id)}
                                                isDisabled={!funGamesEnabled}
                                                onToggle={(gameId, enabled) => {
                                                    if (enabled) {
                                                        setDisabledGames(prev => prev.filter(id => id !== gameId));
                                                    } else {
                                                        setDisabledGames(prev => [...prev, gameId]);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Learning Area Section */}
                            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen size={18} className="text-blue-600" />
                                    <span className="font-pixel text-sm text-blue-800">學習書桌</span>
                                </div>
                                <ToggleSwitch
                                    enabled={learningAreaEnabled}
                                    onChange={setLearningAreaEnabled}
                                    label="📚 開啟學習書桌"
                                    description="關閉後，孩子將看不到學習區塊"
                                />
                                {learningAreaEnabled && (
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        {manageableLearningItems.map(item => {
                                            const disabledKey = item.legacyDisabledKey ?? item.id;

                                            return (
                                                <GameToggleRow
                                                    key={item.id}
                                                    game={item}
                                                    toggleKey={disabledKey}
                                                    isEnabled={!disabledGames.includes(disabledKey)}
                                                    isDisabled={!learningAreaEnabled}
                                                    onToggle={(gameId, enabled) => {
                                                        if (enabled) {
                                                            setDisabledGames(prev => prev.filter(id => id !== gameId));
                                                        } else {
                                                            setDisabledGames(prev => [...prev, gameId]);
                                                        }
                                                    }}
                                                    onSettings={item.id === 'sentence' ? () => setShowSentenceSettings(true) : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Monster Shop Section */}
                    <div className="border-b-2 border-dashed border-gray-300 pb-6">
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <div className="bg-purple-100 p-1 rounded text-purple-600">🛍️</div>
                            怪獸商店管理
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            開啟上架並設定價格後，孩子頁面才會看到該怪獸並可購買。
                        </p>

                        {user?.family_id ? (
                            <ParentMonsterShopManager familyId={user.family_id} />
                        ) : (
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
                                找不到家庭資訊（family_id），暫時無法設定商店。請重新登入家長帳號後再試。
                            </div>
                        )}
                    </div>

                    {/* PIN Section */}
                    <div>
                        <h3 className="font-pixel text-lg mb-4 flex items-center gap-2">
                            <Lock size={20} />
                            PIN 碼設定
                        </h3>
                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                4位數 PIN 碼 (登入家長模式時使用)
                            </label>
                            <input
                                type="tel"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-3 py-2 border-2 border-deep-black text-sm tracking-widest text-lg font-pixel"
                                placeholder="未設定 (直接登入)"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                若留空，則不需要輸入 PIN 碼即可切換到家長模式。
                            </p>
                        </div>
                    </div>

                    {/* Feedback Message */}
                    {message.text && (
                        <div className={`p-3 rounded text-sm font-bold text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {message.type === 'success' ? '✅ ' : '❌ '}
                            {message.text}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={loading} className="clay-btn py-3 px-6 flex items-center gap-2 disabled:opacity-60">
                            <Save size={16} />
                            <span>{loading ? '儲存中...' : '儲存設定'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Adjustment Dialog */}
            <ClayDialog
                isOpen={!!adjustChild}
                onClose={() => setAdjustChild(null)}
                title="調整星幣"
                footer={
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setAdjustChild(null)} className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 text-gray-600 border-2 border-gray-300 font-heading font-bold hover:bg-gray-200 transition-colors">
                            <div className="flex items-center justify-center gap-2">
                                <X size={16} />
                                <span>取消</span>
                            </div>
                        </button>
                        <button onClick={handleAdjustSubmit} disabled={adjustStarsMutation.isPending} className="flex-1 py-3 px-4 rounded-2xl bg-indigo-500 text-white border-b-4 border-indigo-700 font-heading font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-60">
                            <div className="flex items-center justify-center gap-2">
                                <Save size={16} />
                                <span>{adjustStarsMutation.isPending ? '處理中...' : '確認調整'}</span>
                            </div>
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleAdjustSubmit} className="space-y-4">
                    <div className="text-center mb-4">
                        <div className="text-4xl mb-2">{adjustChild?.avatar_url}</div>
                        <p className="font-pixel">
                            正在調整 <span className="text-blue-600">{adjustChild?.name}</span> 的錢包
                        </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <button
                            type="button"
                            onClick={() => setAdjustType('add')}
                            className={`flex-1 py-3 border-2 border-deep-black rounded-lg font-pixel transition-colors flex flex-col items-center gap-1 ${adjustType === 'add' ? 'bg-yellow-400' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            <Plus size={24} />
                            增加
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdjustType('remove')}
                            className={`flex-1 py-3 border-2 border-deep-black rounded-lg font-pixel transition-colors flex flex-col items-center gap-1 ${adjustType === 'remove' ? 'bg-red-400 text-white' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            <Minus size={24} />
                            刪除
                        </button>
                    </div>

                    <div>
                        <label className="block font-pixel text-xs mb-2">
                            數量
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={adjustAmount}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d+$/.test(v)) {
                                    setAdjustAmount(v === '' ? '' : parseInt(v, 10));
                                }
                            }}
                            onBlur={() => {
                                if (adjustAmount === '' || Number(adjustAmount) <= 0) {
                                    setAdjustAmount(1);
                                }
                            }}
                            className="w-full px-3 py-2 border-2 border-deep-black text-center font-pixel text-xl"
                            min="1"
                        />
                    </div>

                    <div>
                        <label className="block font-pixel text-xs mb-2">
                            原因 (選填)
                        </label>
                        <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-deep-black text-sm"
                            placeholder={adjustType === 'add' ? "例如：幫忙做家事" : "例如：沒收玩具"}
                        />
                    </div>
                </form>
            </ClayDialog>

            {/* Sentence Settings Dialog */}
            {user?.family_id && (
                <SentenceSettingsDialog
                    isOpen={showSentenceSettings}
                    onClose={() => setShowSentenceSettings(false)}
                    familyId={user.family_id}
                    userId={user.id}
                />
            )}
        </div>
    );
};
