// 家長的題庫預覽：逐科逐年級看所有概念與題目（含答案、提示、解析），
// 覺得不好的題目按「標記」並寫下原因，最後「複製標記清單」貼給開發者修正。
// 標記只存在這台裝置的瀏覽器裡。

import React, { useEffect, useMemo, useState } from 'react';
import { answerText, questionKey } from './pickQuestions';
import { generateQuestion } from './generators';
import { CONCEPT_SUBJECTS, hasGradeContent, SUBJECT_INFO, useGradeConcepts } from './loadConcepts';
import { CONCEPT_GRADES, type Concept, type ConceptGrade, type ConceptSubject, type Question } from './types';

const GRADE_ZH: Record<ConceptGrade, string> = { 2: '二年級', 3: '三年級', 4: '四年級', 5: '五年級', 6: '六年級' };
const TYPE_ZH: Record<Question['type'], string> = { choice: '選擇', input: '填答', order: '排序', tf: '是非' };
const FLAGS_KEY = 'questmon-concept-flags';
const SAMPLE_SIZE = 5;

interface Flag {
    conceptId: string;
    key: string;
    q: string;
    note: string;
}
type Flags = Record<string, Flag>; // `${conceptId}|${key}`

const readFlags = (): Flags => {
    try {
        return JSON.parse(localStorage.getItem(FLAGS_KEY) ?? '{}') as Flags;
    } catch {
        return {};
    }
};

export const ConceptPreview: React.FC = () => {
    const [subject, setSubject] = useState<ConceptSubject>('chinese');
    const [grade, setGrade] = useState<ConceptGrade>(2);
    const [flags, setFlags] = useState<Flags>(readFlags);
    const [copied, setCopied] = useState(false);
    const bank = useGradeConcepts(subject, grade);

    useEffect(() => {
        try {
            localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
        } catch {
            /* 無法儲存就只在這次有效 */
        }
    }, [flags]);

    const flagList = Object.values(flags);
    const total = useMemo(() => (bank.data ?? []).reduce((n, c) => n + (c.questions?.length ?? 0), 0), [bank.data]);

    const toggleFlag = (conceptId: string, q: Question) => {
        const id = `${conceptId}|${questionKey(q)}`;
        setFlags((f) => {
            const next = { ...f };
            if (next[id]) delete next[id];
            else next[id] = { conceptId, key: questionKey(q), q: q.q, note: '' };
            return next;
        });
    };
    const setNote = (id: string, note: string) => setFlags((f) => (f[id] ? { ...f, [id]: { ...f[id], note } } : f));

    const copyFlags = async () => {
        const text = ['題庫標記清單', ...flagList.map((f, i) => `${i + 1}. [${f.conceptId}] ${f.q}\n   原因：${f.note || '（未填）'}`)].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('請手動複製：', text);
        }
    };

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-3xl border-2 border-deep-black bg-white/90 p-4 shadow-md sm:p-6">
            <header className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-slate-800">📚 題庫預覽</h2>
                <p className="text-sm text-slate-500">
                    孩子在各島「概念站」練習的題目都在這裡。看到不好的題目按 🚩 標記並寫下原因，再按「複製標記清單」貼給開發者修正。數學標示 ♾️ 的概念由程式即時出題，這裡顯示隨機範例。
                </p>
            </header>

            {flagList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 p-3 text-sm">
                    <span className="font-bold text-rose-700">已標記 {flagList.length} 題</span>
                    <button type="button" onClick={copyFlags} className="rounded-full bg-rose-500 px-3 py-1 font-bold text-white">
                        {copied ? '已複製！' : '複製標記清單'}
                    </button>
                    <button
                        type="button"
                        onClick={() => window.confirm('清除全部標記？') && setFlags({})}
                        className="rounded-full border-2 border-rose-200 bg-white px-3 py-1 font-bold text-rose-600"
                    >
                        清除全部
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="科目">
                {CONCEPT_SUBJECTS.map((s) => (
                    <Pill key={s} active={s === subject} onClick={() => setSubject(s)}>
                        {SUBJECT_INFO[s].icon} {SUBJECT_INFO[s].name}
                    </Pill>
                ))}
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="年級">
                {CONCEPT_GRADES.map((g) => (
                    <Pill key={g} active={g === grade} dim={!hasGradeContent(subject, g)} onClick={() => setGrade(g)}>
                        {GRADE_ZH[g]}
                    </Pill>
                ))}
            </div>

            {bank.isLoading ? (
                <p className="py-8 text-center font-bold text-slate-400">題庫載入中…</p>
            ) : !bank.data?.length ? (
                <p className="py-8 text-center font-bold text-slate-400">這個年級還沒有題目。</p>
            ) : (
                <>
                    <p className="text-sm font-bold text-slate-500">
                        {SUBJECT_INFO[subject].name} {GRADE_ZH[grade]}：{bank.data.length} 個概念、{total} 題寫好的題目
                        {bank.data.some((c) => c.generator) ? '＋程式出題' : ''}
                    </p>
                    {bank.data.map((c) => (
                        <ConceptBlock key={c.id} concept={c} flags={flags} onToggle={toggleFlag} onNote={setNote} />
                    ))}
                </>
            )}
        </div>
    );
};

const ConceptBlock: React.FC<{
    concept: Concept;
    flags: Flags;
    onToggle: (conceptId: string, q: Question) => void;
    onNote: (id: string, note: string) => void;
}> = ({ concept, flags, onToggle, onNote }) => {
    const [open, setOpen] = useState(false);
    const [seed, setSeed] = useState(0);
    const samples = useMemo(() => {
        if (!concept.generator || !open) return [];
        void seed;
        return Array.from({ length: SAMPLE_SIZE }, () => generateQuestion(concept.generator!)).filter((q): q is NonNullable<typeof q> => !!q);
    }, [concept.generator, open, seed]);
    const questions = concept.questions ?? [];

    return (
        <section className="rounded-2xl border-2 border-slate-200 bg-slate-50">
            <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                <div>
                    <div className="text-xs font-bold text-slate-400">{concept.unit}</div>
                    <div className="text-lg font-black text-slate-800">{concept.title}</div>
                    <div className="text-sm text-slate-500">{concept.summary}</div>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-400">
                    {concept.generator ? '♾️ 程式出題' : `${questions.length} 題`} {open ? '▲' : '▼'}
                </span>
            </button>
            {open && (
                <div className="flex flex-col gap-2 border-t-2 border-slate-200 p-3">
                    {questions.map((q, i) => {
                        const id = `${concept.id}|${questionKey(q)}`;
                        return <QuestionCard key={id} n={i + 1} q={q} flag={flags[id]} onToggle={() => onToggle(concept.id, q)} onNote={(note) => onNote(id, note)} />;
                    })}
                    {concept.generator && (
                        <>
                            {samples.map((q, i) => (
                                <QuestionCard key={`${seed}-${i}`} n={i + 1} q={q} />
                            ))}
                            <button type="button" onClick={() => setSeed((s) => s + 1)} className="self-start rounded-full border-2 border-indigo-200 bg-white px-3 py-1 text-sm font-bold text-indigo-600">
                                🔄 換一批範例
                            </button>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

const QuestionCard: React.FC<{ n: number; q: Question; flag?: Flag; onToggle?: () => void; onNote?: (note: string) => void }> = ({ n, q, flag, onToggle, onNote }) => (
    <div className={`rounded-xl border-2 bg-white p-3 text-sm ${flag ? 'border-rose-300' : 'border-slate-100'}`}>
        <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-slate-800">
                <span className="mr-1 text-slate-400">{n}.</span>
                <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{TYPE_ZH[q.type]}</span>
                {q.q}
            </p>
            {onToggle && (
                <button type="button" onClick={onToggle} aria-pressed={!!flag} title="標記這題有問題" className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${flag ? 'bg-rose-500 text-white' : 'border border-slate-200 text-slate-400'}`}>
                    🚩 {flag ? '已標記' : '標記'}
                </button>
            )}
        </div>
        <p className="mt-1 text-emerald-700">✅ {answerText(q)}</p>
        {q.type === 'choice' && <p className="text-slate-400">✗ {q.w.join('　✗ ')}</p>}
        {q.type === 'input' && Array.isArray(q.a) && q.a.length > 1 && <p className="text-slate-400">也接受：{q.a.slice(1).join('、')}</p>}
        {q.h?.length ? <p className="text-amber-700">💡 {q.h.join(' → ')}</p> : null}
        {q.e && <p className="text-slate-600">📖 {q.e}</p>}
        {flag && onNote && (
            <input
                value={flag.note}
                onChange={(e) => onNote(e.target.value)}
                placeholder="哪裡有問題？例如：答案錯、太難、用詞不對"
                className="mt-2 w-full rounded-lg border-2 border-rose-200 px-2 py-1 text-sm"
            />
        )}
    </div>
);

const Pill: React.FC<{ active: boolean; dim?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, dim, onClick, children }) => (
    <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold ${active ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-600'} ${dim ? 'opacity-50' : ''}`}
    >
        {children}
    </button>
);
