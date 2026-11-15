import React, { useMemo, useState } from 'react';
import { Gamepad2, Lock, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { GameModal } from './GameModal';
import { useRewardGamePlay } from '../hooks/useRewardGamePlay';
import { GAME_COST } from '../lib/constants';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';
import { FUN_GAMES, type FunGame } from '../lib/gameConfig';
import { groupFunGames, recentFunGames } from '../lib/funGameCatalog';
import { useIslandActivity } from '../features/challengeIsland/useChallengeIsland';
import { formatStars } from '../lib/formatStars';

interface RewardTimeProps {
    isUnlocked: boolean;
    remainingQuests: number;
    totalQuests: number;
    userId: string;  // NEW: Required for star balance
    onGoHome?: () => void;
}

export const RewardTime: React.FC<RewardTimeProps> = ({
    isUnlocked,
    remainingQuests,
    totalQuests,
    userId,
    onGoHome,
}) => {
    const [selectedGame, setSelectedGame] = useState<FunGame | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // 付費開玩與結算（與學習挑戰群島的遊戲島共用）
    const { starBalance, refetchBalance, spendStars: handleSpendStars, earnStars: handleEarnStars } = useRewardGamePlay(userId, selectedGame);

    // Fetch family settings for game permissions
    const { data: familySettings } = useFamilySettings();
    const funGamesEnabled = familySettings?.fun_games_enabled ?? DEFAULT_FAMILY_SETTINGS.fun_games_enabled;
    const disabledGames = familySettings?.disabled_games ?? DEFAULT_FAMILY_SETTINGS.disabled_games;

    // Filter games based on settings
    const availableFunGames = useMemo(() => FUN_GAMES.filter((game) => !disabledGames.includes(game.id)), [disabledGames]);
    const groups = useMemo(() => groupFunGames(availableFunGames), [availableFunGames]);
    const { data: activity } = useIslandActivity(userId);
    const recent = useMemo(() => recentFunGames(availableFunGames, activity ?? []), [availableFunGames, activity]);

    const progressPercentage = totalQuests > 0 ? ((totalQuests - remainingQuests) / totalQuests) * 100 : 0;

    // If fun games are disabled by parent, don't show reward section at all
    if (!funGamesEnabled) {
        return null;
    }

    if (!isUnlocked) {
        // Locked state - Claymorphism style
        return (
            <div className="clay-card mt-6 p-5 animate-bounce-in" style={{ borderRadius: '20px', backgroundColor: '#F5F5F5' }}>
                <div className="text-center py-6">
                    <div
                        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--border-soft)', border: '3px solid var(--border-card)' }}
                    >
                        <Lock size={28} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <h3 className="font-heading text-lg mb-2 text-ink-soft">
                        🔒 獎勵時間（未解鎖）
                    </h3>
                    <p className="font-body text-base mb-4 text-ink">
                        還差 <span className="font-heading text-2xl font-bold text-accent">{remainingQuests}</span> 個任務就能玩遊戲囉！
                    </p>
                    <div className="max-w-md mx-auto">
                        <div className="clay-progress">
                            <div
                                className="clay-progress-fill"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <p className="font-body text-sm mt-2 text-ink-soft">
                            {Math.round(progressPercentage)}% 完成
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 已解鎖：遊戲目錄（最近玩過 + 三個分區，全部在同一張卡裡）
    return (
        <>
            <section aria-label="遊戲區" className="clay-card p-5 animate-bounce-in rounded-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-control flex items-center justify-center bg-amber-50 border-2 border-amber-200 text-accent">
                            <Gamepad2 size={22} />
                        </span>
                        <div>
                            <h2 className="font-heading text-xl font-bold text-ink">遊戲時間 🎮</h2>
                            <p className="font-body text-xs text-ink-soft">
                                每次 {GAME_COST} ⭐ 玩 3 分鐘
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="clay-star px-3 py-1.5" title="可用星幣">
                            <Star size={16} fill="currentColor" />
                            <span className="font-bold tabular-nums">{formatStars(starBalance)}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            aria-expanded={!isCollapsed}
                            aria-label={isCollapsed ? '展開遊戲區' : '收起遊戲區'}
                            className="p-2 rounded-full border-2 border-line bg-white text-ink-soft cursor-pointer hover:bg-surface"
                        >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="mt-5 space-y-6">
                        {recent.length > 0 && (
                            <GameShelf title="最近玩過" icon="🕘">
                                {recent.map((game) => (
                                    <GameCard key={`recent-${game.id}`} game={game} onSelect={setSelectedGame} compact />
                                ))}
                            </GameShelf>
                        )}
                        {groups.map(({ category, games }) => (
                            <GameShelf key={category.id} title={category.name} icon={category.icon} hint={category.hint}>
                                {games.map((game) => (
                                    <GameCard key={game.id} game={game} onSelect={setSelectedGame} />
                                ))}
                            </GameShelf>
                        ))}
                    </div>
                )}
            </section>

            {/* Game Modal */}
            {selectedGame && (
                <GameModal
                    isOpen={!!selectedGame}
                    onClose={() => setSelectedGame(null)}
                    onGoHome={onGoHome}
                    gameUrl={selectedGame.url}
                    gameName={selectedGame.name}
                    gameCover={selectedGame.cover}
                    gameDescription={selectedGame.description}
                    gameId={selectedGame.id}
                    userId={userId}
                    starBalance={starBalance}
                    onSpendStars={handleSpendStars}
                    onRefreshBalance={() => refetchBalance()}
                    onEarnStars={handleEarnStars}
                />
            )}
        </>
    );
};

function GameShelf({ title, icon, hint, children }: { title: string; icon: string; hint?: string; children: React.ReactNode }) {
    return (
        <section aria-label={title}>
            <h3 className="font-heading text-base font-bold text-ink mb-2.5">
                <span aria-hidden="true">{icon} </span>
                {title}
                {hint && <span className="font-body text-xs font-normal text-ink-muted ml-2">{hint}</span>}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{children}</div>
        </section>
    );
}

/** 封面卡：遊戲截圖 + 名稱 + 一句玩法 + 最多兩個標籤 */
function GameCard({ game, onSelect, compact }: { game: FunGame; onSelect: (g: FunGame) => void; compact?: boolean }) {
    const tags = [...(game.tags ?? []), ...(game.earnsStars ? ['過關拿星幣'] : [])].slice(0, 2);
    return (
        <button
            type="button"
            onClick={() => onSelect(game)}
            className="group flex flex-col justify-start text-left rounded-control overflow-hidden border-2 border-line bg-white cursor-pointer transition hover:-translate-y-0.5 hover:shadow-soft-hover focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-primary"
        >
            <div className="relative aspect-[16/10] bg-[#0b0b16] overflow-hidden">
                <img
                    src={game.cover}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </div>
            <div className="p-2.5">
                <p className="font-heading font-bold text-sm text-ink truncate">
                    <span aria-hidden="true">{game.icon} </span>
                    {game.name}
                </p>
                {!compact && <p className="font-body text-xs text-ink-soft mt-0.5 line-clamp-2 min-h-[2rem]">{game.description}</p>}
                {!compact && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {tags.map((t) => (
                            <span
                                key={t}
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${t === '過關拿星幣' ? 'bg-amber-50 text-amber-700' : 'bg-surface text-ink-soft'}`}
                            >
                                {t === '過關拿星幣' ? '⭐ ' : ''}
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
}
