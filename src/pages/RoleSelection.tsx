import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { useUser } from '../contexts/UserContext';
import { feedText, useFamilyWordFeed } from '../features/englishHarbour/useWordProgress';
import { needsPinSetup } from '../lib/pin';
import { isQuestVisibleToChild, useDailyLogs, useQuests, useStarBalance } from '../hooks/useQuests';
import { computeTodayProgress } from '../lib/todayProgress';
import { formatStars } from '../lib/formatStars';

interface RoleSelectionProps {
    onChildSelected: (child: Profile) => void;
    onParentAuthenticated: () => void;
}

// 每個小孩的小島配色：[地面, 海]
const ISLAND_COLORS: Array<[string, string]> = [
    ['#a6d96a', '#d6f0fa'],
    ['#f5b860', '#fde9d2'],
    ['#b9bdf6', '#e4e6fc'],
    ['#ebc9f7', '#f7e9fc'],
    ['#8fd3ea', '#dff3fa'],
    ['#f2a7a7', '#fbe3e3'],
];

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onChildSelected, onParentAuthenticated }) => {
    const { loginAsParent, familyName, session } = useUser();
    const [showParentDialog, setShowParentDialog] = useState(false);
    const [parentPassword, setParentPassword] = useState('');
    const [error, setError] = useState('');

    const { data: wordFeed } = useFamilyWordFeed();
    const { data: children, isLoading } = useQuery({
        queryKey: ['children'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'child')
                .order('name');

            if (error) throw error;
            return data as Profile[];
        },
    });

    const handleParentClick = async () => {
        const isParentAuth = sessionStorage.getItem('parent-auth') === 'verified';
        if (isParentAuth) {
            onParentAuthenticated();
            return;
        }
        // 還在用預設 PIN（或沒有 PIN）：不必輸入，直接進家長模式，會先跳出「設定新 PIN」
        try {
            if (session?.user?.id) {
                const { data } = await supabase.from('profiles').select('pin_code').eq('id', session.user.id).maybeSingle();
                const pin = (data?.pin_code as string | null | undefined) ?? null;
                if (needsPinSetup(pin)) {
                    await loginAsParent(pin?.trim() ?? '');
                    sessionStorage.setItem('parent-auth', 'verified');
                    onParentAuthenticated();
                    return;
                }
            }
        } catch (err) {
            console.error('檢查家長 PIN 失敗:', err);
        }
        setShowParentDialog(true);
    };

    const handleParentLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await loginAsParent(parentPassword);
            sessionStorage.setItem('parent-auth', 'verified');
            setShowParentDialog(false);
            onParentAuthenticated();
        } catch (err) {
            setParentPassword('');
            setError(err instanceof Error && /[\u4e00-\u9fff]/.test(err.message) ? err.message : 'PIN 碼錯誤，請再試一次');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-sky flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-float">👋</div>
                    <p className="font-heading text-lg text-ink">載入中...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen p-4"
            style={{ background: 'linear-gradient(180deg, #B8E0F6 0%, #E8F4FC 100%)' }}
        >
            {/* Floating Cloud Decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                <div className="absolute top-[10%] left-[5%] w-24 h-12 bg-white/60 rounded-full blur-sm"></div>
                <div className="absolute top-[15%] left-[8%] w-16 h-8 bg-white/50 rounded-full blur-sm"></div>
                <div className="absolute top-[8%] right-[10%] w-32 h-16 bg-white/60 rounded-full blur-sm"></div>
                <div className="absolute top-[12%] right-[15%] w-20 h-10 bg-white/50 rounded-full blur-sm"></div>
                <div className="absolute bottom-[20%] left-[15%] w-28 h-14 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-[25%] right-[20%] w-24 h-12 bg-white/40 rounded-full blur-sm"></div>
            </div>

            {/* Header Bar */}
            <div className="max-w-4xl mx-auto mb-8 relative z-10">
                <div
                    className="clay-card flex justify-between items-center p-3"
                    style={{ borderRadius: '16px' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🏠</span>
                        <span className="font-heading font-bold text-lg text-ink">
                            {familyName || '我們家'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleParentClick}
                            className="flex items-center gap-2 px-4 py-2 rounded-full font-heading text-sm transition-all cursor-pointer hover:opacity-80"
                            style={{
                                backgroundColor: 'var(--color-cta)',
                                color: 'white',
                                border: '2px solid #E09000',
                            }}
                        >
                            👨‍👩‍👧 家長模式
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Selection Card */}
            <div className="flex flex-col items-center justify-center relative z-10">
                <div
                    className="clay-card max-w-4xl w-full animate-bounce-in p-5 sm:p-8"
                    style={{ borderRadius: '32px' }}
                >
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3 animate-float">🏝️</div>
                        <h1 className="font-heading text-2xl font-bold mb-2 text-ink">
                            今天誰要出發？
                        </h1>
                        <p className="font-body text-ink-soft">
                            點自己的頭像，看看今天的任務。
                        </p>
                    </div>

                    {/* Children Grid：手機兩欄、平板三欄、桌機四欄 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {children && children.length > 0 ? (
                            children.map((child, i) => (
                                <ChildCard key={child.id} child={child} colors={ISLAND_COLORS[i % ISLAND_COLORS.length]} onSelect={() => onChildSelected(child)} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-8 text-ink-muted">
                                <p className="font-heading text-lg">尚無註冊的孩子</p>
                                <p className="font-body text-sm mt-2">請家長先建立孩子帳號</p>
                            </div>
                        )}
                    </div>

                    {/* 家人動態：今天在英文書港新熟悉的單字 */}
                    {wordFeed && wordFeed.length > 0 && (
                        <div className="mt-6 flex flex-col gap-2" data-testid="family-word-feed">
                            {wordFeed.map((e) => (
                                <div key={e.userId} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#dfeccf' }}>
                                    <span className="text-2xl">{e.avatar}</span>
                                    <span className="font-body text-sm min-w-0 text-ink">
                                        <b>{feedText(e)}</b> 📣
                                        <span className="block text-xs truncate text-ink-soft">
                                            {e.words.slice(-5).join('、')}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Parent Password Dialog */}
            {showParentDialog && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 animate-popup-in"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
                >
                    <div
                        className="clay-card w-full max-w-md p-6"
                        style={{ borderRadius: '24px' }}
                    >
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">🔐</div>
                            <h2 className="font-heading text-xl font-bold text-ink">
                                家長驗證
                            </h2>
                        </div>

                        <form onSubmit={handleParentLogin} className="space-y-4">
                            <p className="font-body text-center text-ink-soft">
                                請輸入 4 位數的家長 PIN
                            </p>

                            <div className="relative">
                                <Lock
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2"
                                    size={20}
                                    style={{ color: 'var(--color-text-muted)' }}
                                />
                                <input
                                    type="tel"
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={parentPassword}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setParentPassword(val);
                                        setError('');
                                    }}
                                    className="w-full pl-12 pr-4 py-4 text-2xl font-heading text-center tracking-widest"
                                    style={{
                                        backgroundColor: '#fff',
                                        border: '2px solid var(--border-soft)',
                                        borderRadius: 'var(--radius-control)',
                                        color: 'var(--color-text)',
                                    }}
                                    placeholder="● ● ● ●"
                                    autoFocus
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-center font-heading text-danger">
                                    ❌ {error}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowParentDialog(false);
                                        setParentPassword('');
                                        setError('');
                                    }}
                                    className="flex-1 clay-btn-secondary py-3 font-heading cursor-pointer"
                                    style={{ borderRadius: '12px' }}
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 clay-btn py-3 font-heading cursor-pointer"
                                    style={{ borderRadius: '12px' }}
                                >
                                    確認
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const HEX = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';

/** 一張孩子卡＝一個點擊目標；卡上顯示今天還差幾個任務和星幣，兼當家庭總覽 */
function ChildCard({ child, colors, onSelect }: { child: Profile; colors: [string, string]; onSelect: () => void }) {
    const [ground, sea] = colors;
    const { data: quests, isLoading: questsLoading } = useQuests('active', child.family_id);
    const { data: logs, isLoading: logsLoading } = useDailyLogs(child.id);
    const loading = questsLoading || logsLoading;
    const { data: stars } = useStarBalance(child.id);
    const total = (quests ?? []).filter((q) => isQuestVisibleToChild(q, child.id)).length;
    const done = (logs ?? []).filter((l) => l.status === 'completed' || l.status === 'verified').length;
    const p = computeTodayProgress(done, total);
    const r = 46;
    const c = 2 * Math.PI * r;
    const pct = p.total > 0 ? Math.min(1, p.done / p.goal) : 0;

    return (
        <button
            type="button"
            onClick={onSelect}
            className="group clay-card p-4 flex flex-col items-center gap-1.5 min-w-0 cursor-pointer hover:-translate-y-1 transition-transform"
            style={{ borderRadius: '20px', background: `linear-gradient(180deg, #ffffff 0%, ${sea} 100%)` }}
            title={`${child.name} 的首頁`}
            data-testid={`child-dashboard-${child.id}`}
        >
            {/* 小島頭像＋今日進度環（以解鎖遊戲的門檻為滿） */}
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="6" />
                    <circle
                        cx="50"
                        cy="50"
                        r={r}
                        fill="none"
                        stroke={p.unlocked ? 'var(--color-primary)' : 'var(--color-cta)'}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${c * pct} ${c}`}
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dasharray .5s ease' }}
                    />
                </svg>
                <div className="absolute inset-[14%] group-hover:scale-105 transition-transform" style={{ background: ground, clipPath: HEX }} />
                <span className="relative text-4xl drop-shadow">{child.avatar_url || '👦'}</span>
            </div>
            <span className="font-heading font-bold text-base sm:text-lg leading-tight truncate max-w-full text-ink">
                {child.name}
            </span>
            <span className="font-body text-xs font-bold" style={{ color: p.total === 0 ? 'var(--color-text-muted)' : p.allDone || p.unlocked ? 'var(--color-primary-dark)' : '#B45309' }}>
                {loading ? '　' : p.total === 0 ? '今天還沒有任務' : p.allDone ? '今天完成了 🎉' : p.unlocked ? '遊戲時間解鎖 🎮' : `還差 ${p.left} 個任務`}
            </span>
            <span className="font-body text-xs tabular-nums text-ink-soft">⭐ {formatStars(stars)}</span>
        </button>
    );
}
