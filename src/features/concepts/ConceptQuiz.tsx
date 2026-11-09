// 共用作答元件：概念站、每日複習、怪獸塔守門怪、世界島冒險都用它。
// 規則：答錯第一次給提示、可以再答一次；第二次還錯就公布答案。只有第一次就答對才算「答對」。

import React, { useMemo, useState } from 'react';
import { answerText, isCorrect, isGeneratedKey, shuffle } from './pickQuestions';
import type { PlayableQuestion, Question } from './types';
import type { RoundResult } from './srs';

interface ConceptQuizProps {
    items: PlayableQuestion[];
    /** 題目上方的小標，例如概念名稱 */
    label?: string;
    onFinish: (result: RoundResult) => void;
}

type Phase = 'answering' | 'right' | 'reveal';

export const ConceptQuiz: React.FC<ConceptQuizProps> = ({ items, label, onFinish }) => {
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>('answering');
    const [tries, setTries] = useState(0);
    const [wrongPicks, setWrongPicks] = useState<string[]>([]);
    const [results, setResults] = useState<boolean[]>([]);

    const item = items[index];

    const finishQuestion = (firstTry: boolean) => {
        setResults((r) => [...r, firstTry]);
    };

    const submit = (answer: string | string[] | boolean) => {
        if (phase !== 'answering') return;
        if (isCorrect(item.question, answer)) {
            finishQuestion(tries === 0);
            setPhase('right');
            return;
        }
        if (tries === 0) {
            setTries(1);
            // 選擇與是非：把答錯的選項劃掉，不能再選
            if (!Array.isArray(answer) && item.question.type !== 'input') setWrongPicks((w) => [...w, String(answer)]);
            return;
        }
        finishQuestion(false);
        setPhase('reveal');
    };

    const next = () => {
        if (index + 1 >= items.length) {
            const all = [...results];
            const keys = items.map((it) => it.key);
            onFinish({
                correct: all.filter(Boolean).length,
                total: items.length,
                wrongKeys: keys.filter((k, i) => !all[i] && !isGeneratedKey(k)),
                rightKeys: keys.filter((k, i) => all[i] && !isGeneratedKey(k)),
            });
            return;
        }
        setIndex(index + 1);
        setPhase('answering');
        setTries(0);
        setWrongPicks([]);
    };

    if (!item) return null;
    const q = item.question;
    const hint = tries > 0 && phase === 'answering' ? (q.h?.[0] ?? '再想想看，仔細讀一次題目。') : null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                <span>{label}</span>
                <span>
                    第 {index + 1} 題 / {items.length}
                </span>
            </div>
            <div className="flex gap-1.5" aria-hidden>
                {items.map((it, i) => (
                    <span
                        key={it.key + i}
                        className={`h-2 flex-1 rounded-full ${i < results.length ? (results[i] ? 'bg-emerald-400' : 'bg-amber-400') : i === index ? 'bg-indigo-300' : 'bg-slate-200'}`}
                    />
                ))}
            </div>

            <p className="text-xl font-bold leading-relaxed text-slate-800 whitespace-pre-line">{q.q}</p>

            <QuestionInput key={item.key + index} question={q} disabled={phase !== 'answering'} wrongPicks={wrongPicks} onSubmit={submit} />

            {hint && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-base text-amber-900" role="status">
                    💡 {hint}
                </div>
            )}

            {phase !== 'answering' && (
                <div
                    className={`rounded-2xl border-2 p-4 ${phase === 'right' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}
                    role="status"
                >
                    <p className={`text-lg font-black ${phase === 'right' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {phase === 'right' ? (tries === 0 ? '🎉 答對了！' : '👍 這次對了！') : `答案是：${answerText(q)}`}
                    </p>
                    {q.e && <p className="mt-1 text-base text-slate-700">{q.e}</p>}
                    <button type="button" onClick={next} className="mt-3 w-full rounded-2xl bg-indigo-500 py-3 text-lg font-bold text-white active:scale-95">
                        {index + 1 >= items.length ? '看結果' : '下一題'}
                    </button>
                </div>
            )}
        </div>
    );
};

interface QuestionInputProps {
    question: Question;
    disabled: boolean;
    wrongPicks: string[];
    onSubmit: (answer: string | string[] | boolean) => void;
}

const btn = 'rounded-2xl border-2 px-4 py-3 text-lg font-bold transition active:scale-95 disabled:active:scale-100';

const QuestionInput: React.FC<QuestionInputProps> = ({ question, disabled, wrongPicks, onSubmit }) => {
    switch (question.type) {
        case 'choice':
            return <ChoiceInput question={question} disabled={disabled} wrongPicks={wrongPicks} onSubmit={onSubmit} />;
        case 'tf':
            return (
                <div className="grid grid-cols-2 gap-3">
                    {[true, false].map((v) => (
                        <button
                            key={String(v)}
                            type="button"
                            disabled={disabled || wrongPicks.includes(String(v))}
                            onClick={() => onSubmit(v)}
                            className={`${btn} border-slate-200 bg-white text-3xl text-slate-700 disabled:opacity-40`}
                            aria-label={v ? '對' : '錯'}
                        >
                            {v ? '⭕' : '❌'}
                        </button>
                    ))}
                </div>
            );
        case 'input':
            return <TextInput disabled={disabled} onSubmit={onSubmit} />;
        case 'order':
            return <OrderInput tokens={question.a} disabled={disabled} onSubmit={onSubmit} />;
    }
};

const ChoiceInput: React.FC<{ question: Extract<Question, { type: 'choice' }>; disabled: boolean; wrongPicks: string[]; onSubmit: (a: string) => void }> = ({
    question,
    disabled,
    wrongPicks,
    onSubmit,
}) => {
    // 選項順序在這一題裡固定，不因重新渲染而變
    const options = useMemo(() => shuffle([question.a, ...question.w]), [question]);
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {options.map((o) => {
                const wrong = wrongPicks.includes(o);
                const reveal = disabled && o === question.a;
                return (
                    <button
                        key={o}
                        type="button"
                        disabled={disabled || wrong}
                        onClick={() => onSubmit(o)}
                        className={`${btn} text-left ${reveal ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : wrong ? 'border-rose-200 bg-rose-50 text-rose-400 line-through' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}
                    >
                        {o}
                    </button>
                );
            })}
        </div>
    );
};

const TextInput: React.FC<{ disabled: boolean; onSubmit: (a: string) => void }> = ({ disabled, onSubmit }) => {
    const [value, setValue] = useState('');
    return (
        <form
            className="flex gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) onSubmit(value);
            }}
        >
            <input
                value={value}
                disabled={disabled}
                onChange={(e) => setValue(e.target.value)}
                className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-4 py-3 text-xl"
                aria-label="答案"
                autoComplete="off"
            />
            <button type="submit" disabled={disabled || !value.trim()} className={`${btn} border-indigo-500 bg-indigo-500 text-white disabled:opacity-40`}>
                確定
            </button>
        </form>
    );
};

const OrderInput: React.FC<{ tokens: string[]; disabled: boolean; onSubmit: (a: string[]) => void }> = ({ tokens, disabled, onSubmit }) => {
    // 用索引記錄，重複的詞也能分開點
    const pool = useMemo(() => shuffle(tokens.map((t, i) => ({ t, i }))), [tokens]);
    const [picked, setPicked] = useState<number[]>([]);
    const built = picked.map((i) => tokens[i]);
    return (
        <div className="flex flex-col gap-3">
            <div className="flex min-h-14 flex-wrap gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-2">
                {picked.map((i, pos) => (
                    <button
                        key={`${i}-${pos}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPicked((p) => p.filter((_, k) => k !== pos))}
                        className="rounded-xl border-2 border-indigo-300 bg-white px-3 py-2 text-lg font-bold text-indigo-700"
                    >
                        {tokens[i]}
                    </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
                {pool.map(({ t, i }) => (
                    <button
                        key={i}
                        type="button"
                        disabled={disabled || picked.includes(i)}
                        onClick={() => setPicked((p) => [...p, i])}
                        className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-lg font-bold text-slate-700 disabled:opacity-30"
                    >
                        {t}
                    </button>
                ))}
            </div>
            <button
                type="button"
                disabled={disabled || picked.length !== tokens.length}
                onClick={() => {
                    onSubmit(built);
                    setPicked([]);
                }}
                className={`${btn} border-indigo-500 bg-indigo-500 text-white disabled:opacity-40`}
            >
                確定
            </button>
        </div>
    );
};
