import React, { useMemo, useState } from 'react';
import { generateFractionQuestion, type FractionDifficulty } from '../engines/questionGenerators/fractions';

const DIFFICULTY_META: Record<FractionDifficulty, { label: string; description: string }> = {
    easy: { label: '🌱 基礎', description: '看圖辨識分數' },
    medium: { label: '🔥 進階', description: '約分成最簡分數' },
    hard: { label: '🚀 挑戰', description: '同分母分數加法' },
};

const FractionBar = ({ total, filled }: { total: number; filled: number }) => (
    <div className="flex gap-1 justify-center flex-wrap max-w-sm mx-auto">
        {Array.from({ length: total }, (_, index) => (
            <div
                key={`${total}-${index}`}
                className="w-9 h-14 rounded-lg border-2"
                style={{
                    backgroundColor: index < filled ? '#F9A8D4' : '#FCE7F3',
                    borderColor: '#F472B6',
                }}
            />
        ))}
    </div>
);

export const FractionsPractice: React.FC = () => {
    const [difficulty, setDifficulty] = useState<FractionDifficulty>('easy');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [attemptCount, setAttemptCount] = useState(0);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const question = useMemo(() => generateFractionQuestion(difficulty), [difficulty, questionIndex]);
    const accuracy = attemptCount === 0 ? 100 : Math.round((correctCount / attemptCount) * 100);

    const handleDifficultyChange = (nextDifficulty: FractionDifficulty) => {
        setDifficulty(nextDifficulty);
        setQuestionIndex((current) => current + 1);
        setFeedback(null);
    };

    const handleAnswer = (answer: string) => {
        const isCorrect = answer === question.correctAnswer;

        setAttemptCount((current) => current + 1);
        if (isCorrect) {
            setCorrectCount((current) => current + 1);
        }

        setFeedback({
            type: isCorrect ? 'success' : 'error',
            message: isCorrect ? `答對了！${question.explanation}` : `再想想看：${question.explanation}`,
        });

        window.setTimeout(() => {
            setQuestionIndex((current) => current + 1);
            setFeedback(null);
        }, 900);
    };

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-pink-50 to-white p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-3xl p-4 bg-white border-2 border-pink-200 shadow-sm">
                        <div className="text-xs text-pink-500 font-bold mb-1">目前難度</div>
                        <div className="font-heading text-lg font-bold text-pink-700">{DIFFICULTY_META[difficulty].label}</div>
                        <div className="text-xs text-gray-500 mt-1">{DIFFICULTY_META[difficulty].description}</div>
                    </div>
                    <div className="rounded-3xl p-4 bg-white border-2 border-emerald-200 shadow-sm">
                        <div className="text-xs text-emerald-500 font-bold mb-1">答對題數</div>
                        <div className="font-heading text-2xl font-bold text-emerald-700">{correctCount}</div>
                    </div>
                    <div className="rounded-3xl p-4 bg-white border-2 border-indigo-200 shadow-sm">
                        <div className="text-xs text-indigo-500 font-bold mb-1">答對率</div>
                        <div className="font-heading text-2xl font-bold text-indigo-700">{accuracy}%</div>
                    </div>
                </div>

                <div className="rounded-3xl p-4 bg-white border-2 border-pink-200 shadow-sm">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {(Object.keys(DIFFICULTY_META) as FractionDifficulty[]).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleDifficultyChange(key)}
                                className={`px-4 py-2 rounded-full border-2 font-heading text-sm transition-colors ${difficulty === key ? 'bg-pink-500 text-white border-pink-500' : 'bg-pink-50 text-pink-700 border-pink-200'}`}
                            >
                                {DIFFICULTY_META[key].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-[2rem] p-5 sm:p-6 bg-white border-2 border-pink-200 shadow-md space-y-5">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 border border-pink-200 text-pink-700 text-xs font-bold mb-3">
                            🍰 分數練習
                        </div>
                        <h3 className="font-heading text-2xl font-bold text-gray-800">{question.prompt}</h3>
                    </div>

                    {question.visualSegments && question.visualFilled && (
                        <div className="space-y-2">
                            <div className="text-center text-sm text-gray-500">看圖幫忙想一想</div>
                            <FractionBar total={question.visualSegments} filled={question.visualFilled} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {question.choices.map((choice) => (
                            <button
                                key={choice}
                                type="button"
                                onClick={() => handleAnswer(choice)}
                                disabled={feedback !== null}
                                className="rounded-2xl border-2 border-pink-200 bg-pink-50 px-4 py-4 text-lg font-heading font-bold text-pink-700 transition-all hover:bg-pink-100 disabled:opacity-70"
                            >
                                {choice}
                            </button>
                        ))}
                    </div>

                    <div className={`rounded-2xl p-4 text-sm font-medium ${feedback === null ? 'bg-slate-50 text-slate-500 border border-slate-200' : feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        {feedback?.message ?? '選一個答案開始練習，系統會自動出下一題。'}
                    </div>
                </div>
            </div>
        </div>
    );
};
