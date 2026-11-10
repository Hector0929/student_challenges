// 各科島上的「概念站」：依年級列出概念與熟悉度，選一個練一輪（5 題）。

import React, { useMemo, useState } from 'react';
import { getTodayDate } from '../../lib/supabase';
import { ConceptQuiz } from './ConceptQuiz';
import { hasGradeContent, SUBJECT_INFO, useGradeConcepts } from './loadConcepts';
import { pickQuestions } from './pickQuestions';
import { isDue, LEVEL_LABELS, MAX_LEVEL, type ConceptProgress } from './srs';
import { CONCEPT_GRADES, type Concept, type ConceptGrade, type ConceptSubject, type PlayableQuestion } from './types';
import { useChildGrade } from './useChildGrade';
import { useConceptProgress } from './useConceptProgress';

const GRADE_ZH: Record<ConceptGrade, string> = { 2: '二年級', 3: '三年級', 4: '四年級', 5: '五年級', 6: '六年級' };

interface ConceptStationProps {
    subject: ConceptSubject;
    userId: string;
}

type View =
    | { kind: 'list' }
    | { kind: 'quiz'; concept: Concept; items: PlayableQuestion[]; round: number }
    | { kind: 'result'; concept: Concept; correct: number; total: number; before?: ConceptProgress; after: ConceptProgress };

export const ConceptStation: React.FC<ConceptStationProps> = ({ subject, userId }) => {
    const progress = useConceptProgress(userId);
    const childGrade = useChildGrade(userId);
    const [pickedGrade, setPickedGrade] = useState<ConceptGrade | null>(null);
    const [view, setView] = useState<View>({ kind: 'list' });
    const today = getTodayDate();

    const info = SUBJECT_INFO[subject];
    // 沒設定年級時，預設看最低一個有題目的年級
    const grade: ConceptGrade = pickedGrade ?? childGrade.data ?? CONCEPT_GRADES.find((g) => hasGradeContent(subject, g)) ?? 2;
    const bank = useGradeConcepts(subject, grade);
    const concepts = useMemo(() => bank.data ?? [], [bank.data]);
    const units = useMemo(() => {
        const m = new Map<string, Concept[]>();
        concepts.forEach((c) => m.set(c.unit, [...(m.get(c.unit) ?? []), c]));
        return [...m.entries()];
    }, [concepts]);

    const start = (concept: Concept, round = 1) => {
        const items = pickQuestions(concept, progress.map.get(concept.id)?.recent_wrong ?? []);
        if (items.length) setView({ kind: 'quiz', concept, items, round });
    };

    if (bank.isError) return <Centered>題庫載入失敗，請關掉再開一次。</Centered>;

    if (view.kind === 'quiz') {
        return (
            <Frame>
                <button type="button" onClick={() => setView({ kind: 'list' })} className="self-start text-sm font-bold text-slate-500">
                    ← 回到概念列表
                </button>
                <ConceptQuiz
                    key={`${view.concept.id}-${view.round}`}
                    items={view.items}
                    label={view.concept.title}
                    onFinish={async (r) => {
                        const before = progress.map.get(view.concept.id);
                        const after = await progress.recordRound(view.concept.id, r);
                        setView({ kind: 'result', concept: view.concept, correct: r.correct, total: r.total, before, after });
                    }}
                />
            </Frame>
        );
    }

    if (view.kind === 'result') {
        const { concept, correct, total, before, after } = view;
        const up = !!before && before.level < after.level;
        const down = !!before && before.level > after.level;
        return (
            <Frame>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="text-6xl">{correct === total ? '🏆' : correct >= total * 0.8 ? '🎉' : correct >= total / 2 ? '💪' : '📚'}</div>
                    <h2 className="text-2xl font-black text-slate-800">{concept.title}</h2>
                    <p className="text-xl font-bold text-slate-700">
                        第一次就答對 {correct} / {total} 題
                    </p>
                    <Stars level={after.level} large />
                    <p className="text-base font-bold text-indigo-600">
                        {!before
                            ? '開始學習這個概念了！'
                            : up
                              ? `熟悉度升級：${LEVEL_LABELS[after.level]}！`
                              : down
                                ? `有點生疏了，熟悉度回到：${LEVEL_LABELS[after.level]}`
                                : `熟悉度：${LEVEL_LABELS[after.level]}`}
                    </p>
                    <p className="text-sm text-slate-500">{after.due_on > today ? `下次複習：${after.due_on}` : '今天再練一次會更熟喔！'}</p>
                    {progress.missing && <MissingTableNote />}
                    <div className="mt-2 grid w-full max-w-sm grid-cols-2 gap-3">
                        <button type="button" onClick={() => setView({ kind: 'list' })} className="rounded-2xl border-2 border-slate-200 bg-white py-3 font-bold text-slate-600">
                            回到列表
                        </button>
                        <button type="button" onClick={() => start(concept, Date.now())} className="rounded-2xl bg-indigo-500 py-3 font-bold text-white">
                            再練一輪
                        </button>
                    </div>
                </div>
            </Frame>
        );
    }

    return (
        <Frame>
            <header className="flex items-center gap-3">
                <span className="text-4xl">{info.icon}</span>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">{info.name}概念站</h2>
                    <p className="text-sm text-slate-500">選一個概念練 5 題，熟悉度會跟著你到每一座島。</p>
                </div>
            </header>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="年級">
                {CONCEPT_GRADES.map((g) => (
                    <button
                        key={g}
                        type="button"
                        role="tab"
                        aria-selected={g === grade}
                        onClick={() => setPickedGrade(g)}
                        className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold ${g === grade ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-600'} ${hasGradeContent(subject, g) ? '' : 'opacity-50'}`}
                    >
                        {GRADE_ZH[g]}
                        {g === childGrade.data ? ' ⭐' : ''}
                    </button>
                ))}
            </div>

            {progress.missing && <MissingTableNote />}

            {bank.isLoading ? (
                <p className="py-8 text-center font-bold text-slate-400">題庫載入中…</p>
            ) : units.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                    <div className="mb-2 text-5xl">🛠️</div>
                    <p className="text-lg font-bold text-slate-700">{GRADE_ZH[grade]}的題目正在準備中</p>
                    <p className="mt-1 text-sm text-slate-500">先到其他年級看看吧！</p>
                </div>
            ) : (
                units.map(([unit, list]) => (
                    <section key={unit} className="flex flex-col gap-2">
                        <h3 className="text-sm font-black tracking-wide text-slate-500">{unit}</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {list.map((c) => {
                                const p = progress.map.get(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => start(c)}
                                        className="flex flex-col gap-1 rounded-3xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 active:scale-[0.98]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-lg font-black text-slate-800">{c.title}</span>
                                            {!p ? (
                                                <Badge className="bg-sky-100 text-sky-700">新</Badge>
                                            ) : isDue(p, today) ? (
                                                <Badge className="bg-amber-100 text-amber-700">該複習</Badge>
                                            ) : null}
                                        </div>
                                        <span className="line-clamp-2 text-sm text-slate-500">{c.summary}</span>
                                        <div className="mt-1 flex items-center justify-between">
                                            <Stars level={p?.level ?? 0} />
                                            <span className="text-xs font-bold text-slate-400">{c.generator ? '♾️ 每次新題目' : `${c.questions?.length ?? 0} 題`}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </Frame>
    );
};

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="h-full overflow-y-auto bg-slate-50">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6">{children}</div>
    </div>
);

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-full items-center justify-center bg-slate-50 p-6 text-lg font-bold text-slate-500">{children}</div>
);

const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${className}`}>{children}</span>
);

const Stars: React.FC<{ level: number; large?: boolean }> = ({ level, large }) => (
    <span className={large ? 'text-3xl' : 'text-base'} aria-label={`熟悉度 ${LEVEL_LABELS[level]}`}>
        {Array.from({ length: MAX_LEVEL }, (_, i) => (
            <span key={i} className={i < level ? 'text-amber-400' : 'text-slate-200'}>
                ★
            </span>
        ))}
    </span>
);

const MissingTableNote = () => (
    <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        進度目前還不會保存：請家長在 Supabase SQL Editor 執行 <code>supabase/add_concept_progress.sql</code>。
    </p>
);
