import React, { useMemo, useState } from 'react';
import { generateAreaQuestion, type AreaDifficulty } from '../engines/questionGenerators/area';

const DIFFICULTY_META: Record<AreaDifficulty, { label: string; description: string }> = {
    easy: { label: '🌱 基礎', description: '長方形面積公式' },
    medium: { label: '🔥 進階', description: '數方格求面積' },
    hard: { label: '🚀 挑戰', description: '三角形面積公式' },
};

const AreaGrid = ({ rows, cols }: { rows: number; cols: number }) => (
    <div
        className="grid gap-1 mx-auto"
        style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            maxWidth: `${cols * 2.5}rem`,
        }}
    >
        {Array.from({ length: rows * cols }, (_, index) => (
            <div
                key={index}
                className="aspect-square rounded-sm border-2"
                style={{ backgroundColor: '#C7D2FE', borderColor: '#818CF8' }}
            />
        ))}
    </div>
);

export const AreaPractice: React.FC = () => {
    const [difficulty, setDifficulty] = useState<AreaDifficulty>('easy');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [attemptCount, setAttemptCount] = useState(0);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const question = useMemo(() => generateAreaQuestion(difficulty), [difficulty, questionIndex]);
    const accuracy = attemptCount === 0 ? 100 : Math.round((correctCount / attemptCount) * 100);

    const handleDifficultyChange = (nextDifficulty: AreaDifficulty) => {
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
        <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-50 to-white p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-3xl p-4 bg-white border-2 border-indigo-200 shadow-sm">
                        <div className="text-xs text-indigo-500 font-bold mb-1">目前難度</div>
                        <div className="font-heading text-lg font-bold text-indigo-700">{DIFFICULTY_META[difficulty].label}</div>
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

                <div className="rounded-3xl p-4 bg-white border-2 border-indigo-200 shadow-sm">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {(Object.keys(DIFFICULTY_META) as AreaDifficulty[]).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleDifficultyChange(key)}
                                className={`px-4 py-2 rounded-full border-2 font-heading text-sm transition-colors ${difficulty === key ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}
                            >
                                {DIFFICULTY_META[key].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-[2rem] p-5 sm:p-6 bg-white border-2 border-indigo-200 shadow-md space-y-5">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
                            🟦 面積練習
                        </div>
                        <h3 className="font-heading text-2xl font-bold text-gray-800">{question.prompt}</h3>
                    </div>

                    {question.grid && (
                        <div className="space-y-2">
                            <div className="text-center text-sm text-gray-500">把每一格都算進去</div>
                            <AreaGrid rows={question.grid.rows} cols={question.grid.cols} />
                        </div>
                    )}

                    {!question.grid && question.width && question.height && (
                        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 text-center">
                            <div className="font-heading text-lg text-indigo-700">{question.shapeLabel}</div>
                            <div className="text-sm text-indigo-600 mt-2">
                                {question.type === 'triangle_formula'
                                    ? `底 ${question.width} 公分，高 ${question.height} 公分`
                                    : `長 ${question.width} 公分，寬 ${question.height} 公分`}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {question.choices.map((choice) => (
                            <button
                                key={choice}
                                type="button"
                                onClick={() => handleAnswer(choice)}
                                disabled={feedback !== null}
                                className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-4 text-lg font-heading font-bold text-indigo-700 transition-all hover:bg-indigo-100 disabled:opacity-70"
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
