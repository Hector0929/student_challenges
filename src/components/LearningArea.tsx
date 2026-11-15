import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { GameModal } from './GameModal';
import { useFamilySettings, DEFAULT_FAMILY_SETTINGS } from '../hooks/useFamilySettings';
import type { LearningItem, LearningSubjectId } from '../features/learning/types/learning';
import { LEARNING_ITEMS } from '../features/learning/config/learningItems';
import { getVisibleLearningItems, groupLearningItemsBySubject } from '../features/learning/utils/learningFilters';
import { toLearningModalPayload, getLearningItemDisplayName } from '../features/learning/utils/learningAdapters';
import { SubjectSection } from '../features/learning/components/SubjectSection';
import { getLearningEmbeddedContent } from '../features/learning/components/reactLearningRegistry';
import { usePracticeReward } from '../features/learning/hooks/usePracticeReward';
import { recommendLearning, weeklySubjectCounts } from '../features/learning/utils/learningRecommendations';
import { useIslandActivity } from '../features/challengeIsland/useChallengeIsland';

interface LearningAreaParts {
    /** 今天推薦（學習關閉時為 null） */
    recommended: React.ReactNode;
    /** 全部學習（學習關閉時為 null） */
    all: React.ReactNode;
}

interface LearningAreaProps {
    userId: string;
    onGoHome?: () => void;
    /** 由頁面決定兩塊放哪裡；練習視窗由 LearningArea 自己掛 */
    children: (parts: LearningAreaParts) => React.ReactNode;
}

/**
 * 學習書桌：先推薦，再全部。
 * - 今天推薦 2–3 個（上次練過的、這週練最少的科目）
 * - 全部學習預設收合，依科目分頁，每科顯示本週練習次數
 */
export const LearningArea: React.FC<LearningAreaProps> = ({ userId, onGoHome, children }) => {
    const [selectedItem, setSelectedItem] = useState<LearningItem | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [subject, setSubject] = useState<LearningSubjectId | null>(null);
    const grantPracticeReward = usePracticeReward(userId);
    const { data: records } = useIslandActivity(userId);

    const { data: familySettings } = useFamilySettings();
    const learningAreaEnabled = familySettings?.learning_area_enabled ?? DEFAULT_FAMILY_SETTINGS.learning_area_enabled;
    const disabledGames = familySettings?.disabled_games ?? DEFAULT_FAMILY_SETTINGS.disabled_games;

    const learningItems = useMemo(() => getVisibleLearningItems(LEARNING_ITEMS, disabledGames), [disabledGames]);
    const groups = useMemo(() => groupLearningItemsBySubject(learningItems), [learningItems]);
    const recommendations = useMemo(() => recommendLearning(learningItems, records ?? []), [learningItems, records]);
    const weekly = useMemo(() => weeklySubjectCounts(learningItems, records ?? []), [learningItems, records]);

    const modalPayload = selectedItem ? toLearningModalPayload(selectedItem) : null;
    const embeddedContent = selectedItem ? getLearningEmbeddedContent(selectedItem, userId) : null;

    if (!learningAreaEnabled || learningItems.length === 0) {
        return <>{children({ recommended: null, all: null })}</>;
    }

    const activeSubject = subject ?? groups[0]?.subject.id ?? null;
    const activeGroup = groups.find((g) => g.subject.id === activeSubject);
    const handlePracticeComplete = (stars: number) => grantPracticeReward(selectedItem, stars);

    const recommended = (
        <section aria-label="今天推薦的學習" className="clay-card p-5 animate-bounce-in rounded-card">
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="w-10 h-10 rounded-control flex items-center justify-center"
                    style={{
                        backgroundColor: 'var(--pastel-blue-bg)',
                        border: '2px solid var(--pastel-blue-border)',
                    }}
                >
                    <BookOpen size={20} style={{ color: 'var(--pastel-blue-text)' }} />
                </div>
                <div>
                    <h2 className="font-heading text-lg font-bold text-ink">今天推薦的學習</h2>
                    <p className="font-body text-xs text-ink-soft">練滿 3 分鐘可以拿星幣，不需要先完成任務</p>
                </div>
            </div>
            {/* 手機：左右滑；平板以上：並排 */}
            <div className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
                {recommendations.map(({ item, reason }) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="snap-start shrink-0 w-[70%] sm:w-auto text-left rounded-control p-3 border-2 border-line bg-white cursor-pointer transition hover:-translate-y-0.5 hover:shadow-soft"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-heading font-bold truncate text-ink">{getLearningItemDisplayName(item)}</span>
                        </div>
                        <p className="font-body text-xs mt-1 text-primary-dark">{reason}</p>
                    </button>
                ))}
            </div>
        </section>
    );

    const all = (
        <section aria-label="全部學習" className="clay-card p-5 rounded-card">
            <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="w-full flex items-center justify-between gap-3 cursor-pointer">
                <span className="font-heading text-lg font-bold text-ink">
                    全部學習 <span className="font-body text-sm font-normal text-ink-soft">（{learningItems.length} 個）</span>
                </span>
                {showAll ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <div role="tablist" aria-label="科目" className="flex flex-wrap gap-2 mt-3">
                {groups.map((g) => {
                    const on = showAll && g.subject.id === activeSubject;
                    return (
                        <button
                            key={g.subject.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => {
                                setSubject(g.subject.id);
                                setShowAll(true);
                            }}
                            className={`px-3 py-1.5 rounded-full border-2 font-body text-sm cursor-pointer transition-colors ${on ? 'bg-accent border-accent text-white' : 'bg-white border-line text-ink hover:bg-surface'}`}
                        >
                            {g.subject.icon} {g.subject.name.replace('學習', '')}
                            <span className="ml-1 text-xs opacity-80">本週 {weekly[g.subject.id] ?? 0}</span>
                        </button>
                    );
                })}
            </div>

            {showAll && activeGroup && (
                <div className="mt-5">
                    <SubjectSection group={activeGroup} onSelectItem={setSelectedItem} />
                </div>
            )}
        </section>
    );

    return (
        <>
            {children({ recommended, all })}

            {selectedItem && modalPayload && (
                <GameModal
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onGoHome={onGoHome}
                    gameUrl={modalPayload.gameUrl}
                    gameName={modalPayload.gameName}
                    gameId={modalPayload.gameId}
                    userId={userId}
                    starBalance={0}
                    onSpendStars={async () => true}
                    onRefreshBalance={() => {}}
                    mode="practice"
                    practiceRewardStars={10}
                    onPracticeComplete={handlePracticeComplete}
                    embeddedContent={embeddedContent}
                />
            )}
        </>
    );
};
