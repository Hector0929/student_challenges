// 怪獸塔 V3/V4 共用的遊戲彈窗：夥伴出手演出、換隨行夥伴、撿到怪獸蛋
import React from 'react';
import { X } from 'lucide-react';
import { MONSTERS, type MonsterId, type TeamEffectDetail } from '../../hooks/useTowerProgress';
import { getMonsterRole, type TeamRole } from '../../lib/towerGen3Rules';
import { ROLE_META, TEAM_EFFECT_THEME } from './roleMeta';

export const TeamEffectBurst: React.FC<{ effect: TeamEffectDetail }> = ({ effect }) => {
    const theme = TEAM_EFFECT_THEME[effect.kind];
    const roleMeta = ROLE_META[(effect.role as TeamRole)] ?? ROLE_META.striker;
    const monsterImage = MONSTERS[effect.monsterId as MonsterId]?.image;

    return (
        <div className="absolute inset-0 z-[2500] flex items-center justify-center pointer-events-none px-4">
            <div
                className={`gen3-effect-burst relative w-full max-w-sm rounded-3xl border-2 ${theme.ring} bg-slate-950/95 backdrop-blur-md px-6 py-5 text-center shadow-2xl`}
                style={{ boxShadow: `0 0 60px ${theme.glow}, 0 24px 60px rgba(0,0,0,0.65)` }}
            >
                {/* 光暈脈動 */}
                <div
                    className="absolute inset-0 rounded-3xl animate-ping opacity-20 pointer-events-none"
                    style={{ border: `2px solid ${theme.glow}` }}
                />

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold mb-3 ${theme.badge} ${theme.badgeText}`}>
                    <span>{theme.icon}</span>
                    <span>{roleMeta.label}夥伴出手！</span>
                </div>

                {/* 出手的怪獸 */}
                <div className="gen3-effect-monster mx-auto mb-2 flex items-center justify-center">
                    {monsterImage ? (
                        <img
                            src={monsterImage}
                            alt={effect.monsterName}
                            className="w-20 h-20 object-contain"
                            style={{ filter: `drop-shadow(0 6px 18px ${theme.glow})` }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <span className="text-6xl" style={{ filter: `drop-shadow(0 6px 18px ${theme.glow})` }}>{effect.monsterEmoji}</span>
                    )}
                </div>

                <h3 className={`text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r ${theme.accent}`}>
                    {effect.title}
                </h3>
                <p className="text-lg font-black text-white mb-1.5">{effect.monsterName}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{effect.message}</p>

                {/* 具體數字，讓「少滑了幾層」一眼看得到 */}
                {effect.kind === 'trap_shield' && effect.floorsChanged > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40">
                        <span className="text-xs text-emerald-200 font-bold">少滑落</span>
                        <span className="text-2xl font-black text-emerald-300 tabular-nums leading-none">{effect.floorsChanged}</span>
                        <span className="text-xs text-emerald-200 font-bold">層</span>
                    </div>
                )}
                {effect.kind === 'ladder_boost' && effect.floorsChanged > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/40">
                        <span className="text-xs text-cyan-200 font-bold">額外爬升</span>
                        <span className="text-2xl font-black text-cyan-300 tabular-nums leading-none">{effect.floorsChanged}</span>
                        <span className="text-xs text-cyan-200 font-bold">層</span>
                    </div>
                )}
                {effect.kind === 'monster_bonus' && effect.bonusStars > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/40">
                        <span className="text-xs text-amber-200 font-bold">額外獲得</span>
                        <span className="text-2xl font-black text-amber-300 tabular-nums leading-none">{effect.bonusStars}</span>
                        <span className="text-xs text-amber-200 font-bold">星幣 ⭐</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── 換隨行夥伴：只挑一隻，不是編隊 ──
export const CompanionPicker: React.FC<{
    monsters: MonsterId[];
    currentId?: string;
    onChoose: (monsterId: MonsterId) => void;
    onClose: () => void;
}> = ({ monsters, currentId, onChoose, onClose }) => (
    <div className="absolute inset-0 z-[2350] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div
            className="w-full max-w-sm max-h-[80%] flex flex-col rounded-3xl border-2 border-amber-500/40 bg-slate-950 shadow-2xl overflow-hidden gen3-effect-burst"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950">
                <div>
                    <h3 className="font-black text-sm text-amber-200">挑一隻夥伴一起爬塔</h3>
                    <p className="text-[11px] text-slate-400">夥伴的定位會決定路上幫你做什麼</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center shrink-0"
                >
                    <X size={16} />
                </button>
            </div>

            {/* 定位說明：讓孩子知道挑不同定位差在哪 */}
            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                🛡️ 守護／支援：踩到陷阱少滑一半
                🌀 控場／支援：搭電梯多爬 2 層
                ⚡ 輸出／破甲：挑戰多一次重試
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {monsters.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-8">還沒有夥伴，先去孵一顆怪獸蛋吧！</p>
                ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                        {monsters.map((monsterId) => {
                            const monster = MONSTERS[monsterId];
                            const roleInfo = ROLE_META[getMonsterRole(monsterId)];
                            const RoleIcon = roleInfo.icon;
                            const isCurrent = currentId === monsterId;

                            return (
                                <button
                                    key={monsterId}
                                    onClick={() => onChoose(monsterId)}
                                    data-testid={`companion-option-${monsterId}`}
                                    className={`p-2.5 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                                        isCurrent
                                            ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-slate-900 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                                            : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
                                    }`}
                                >
                                    {monster.image ? (
                                        <img src={monster.image} alt={monster.name} className="w-10 h-10 object-contain" />
                                    ) : (
                                        <span className="text-3xl">{monster.emoji}</span>
                                    )}
                                    <span className="text-[11px] font-bold text-slate-100 text-center leading-tight">{monster.name}</span>
                                    <span className={`text-[10px] flex items-center gap-0.5 font-bold ${roleInfo.color}`}>
                                        <RoleIcon size={10} /> {roleInfo.label}
                                    </span>
                                    {isCurrent && <span className="text-[9px] text-amber-300 font-black">出戰中</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// ── 撿到怪獸蛋 ──
export const EggReveal: React.FC<{ monsterId: string; onHatch: () => void; onClose: () => void }> = ({ monsterId, onHatch, onClose }) => (
    <div className="absolute inset-0 z-[2450] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div
            className="gen3-effect-burst w-full max-w-xs rounded-3xl border-2 border-amber-400/70 bg-slate-950/95 px-6 py-6 text-center shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(251,191,36,0.45), 0 24px 60px rgba(0,0,0,0.65)' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="gen3-effect-monster text-6xl mb-2">🥚</div>
            <h3 className="text-2xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-orange-300">
                撿到怪獸蛋！
            </h3>
            <p className="text-lg font-black text-white mb-1">{MONSTERS[monsterId as MonsterId]?.name ?? '神秘怪獸'}</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">蛋已經放進「收藏」裡了，點右下角的 🗂 就可以孵化牠。</p>
            <button
                onClick={onHatch}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg active:scale-95 transition-transform mb-2"
            >
                去孵蛋！
            </button>
            <button
                onClick={onClose}
                className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors active:scale-95"
            >
                繼續爬塔
            </button>
        </div>
    </div>
);
