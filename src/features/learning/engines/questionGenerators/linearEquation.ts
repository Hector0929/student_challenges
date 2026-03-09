export type LinearEquationDifficulty = 'easy' | 'medium' | 'hard';
export type LinearEquationQuestionType = 'one_step' | 'two_step' | 'distribution';

export interface LinearEquationQuestion {
    id: string;
    difficulty: LinearEquationDifficulty;
    type: LinearEquationQuestionType;
    prompt: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]) => {
    const cloned = [...items];
    for (let index = cloned.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
    }
    return cloned;
};

const makeChoices = (correct: number) => {
    const wrongAnswers = new Set<string>();
    while (wrongAnswers.size < 3) {
        const candidate = correct + randomInt(-4, 4);
        if (candidate !== correct) {
            wrongAnswers.add(String(candidate));
        }
    }
    return shuffle([String(correct), ...wrongAnswers]);
};

const buildOneStepQuestion = (): LinearEquationQuestion => {
    const x = randomInt(-8, 12);
    const a = randomInt(1, 12);
    const b = x + a;

    return {
        id: `eq-one-${x}-${a}-${Date.now()}`,
        difficulty: 'easy',
        type: 'one_step',
        prompt: `解方程式：x + ${a} = ${b}`,
        choices: makeChoices(x),
        correctAnswer: String(x),
        explanation: `x = ${b} - ${a} = ${x}。`,
    };
};

const buildTwoStepQuestion = (): LinearEquationQuestion => {
    const x = randomInt(1, 12);
    const m = randomInt(2, 6);
    const c = randomInt(1, 10);
    const rhs = m * x + c;

    return {
        id: `eq-two-${x}-${m}-${c}-${Date.now()}`,
        difficulty: 'medium',
        type: 'two_step',
        prompt: `解方程式：${m}x + ${c} = ${rhs}`,
        choices: makeChoices(x),
        correctAnswer: String(x),
        explanation: `先移項得 ${m}x = ${rhs - c}，再除以 ${m}，x = ${x}。`,
    };
};

const buildDistributionQuestion = (): LinearEquationQuestion => {
    const x = randomInt(1, 9);
    const a = randomInt(2, 5);
    const b = randomInt(1, 6);
    const c = randomInt(1, 4);
    const rhs = a * (x + b) - c;

    return {
        id: `eq-dist-${x}-${a}-${b}-${c}-${Date.now()}`,
        difficulty: 'hard',
        type: 'distribution',
        prompt: `解方程式：${a}(x + ${b}) - ${c} = ${rhs}`,
        choices: makeChoices(x),
        correctAnswer: String(x),
        explanation: `先加回 ${c}，再除以 ${a}，得到 x + ${b} = ${x + b}，所以 x = ${x}。`,
    };
};

export const generateLinearEquationQuestion = (difficulty: LinearEquationDifficulty): LinearEquationQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildOneStepQuestion();
        case 'medium':
            return buildTwoStepQuestion();
        case 'hard':
            return buildDistributionQuestion();
        default:
            return buildOneStepQuestion();
    }
};
