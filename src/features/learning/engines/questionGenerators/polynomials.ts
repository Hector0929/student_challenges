export type PolynomialsDifficulty = 'easy' | 'medium' | 'hard';
export type PolynomialsQuestionType = 'like_terms' | 'evaluate' | 'add_subtract';

export interface PolynomialsQuestion {
    id: string;
    difficulty: PolynomialsDifficulty;
    type: PolynomialsQuestionType;
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

const makeNumericChoices = (correct: number) => {
    const wrongAnswers = new Set<string>();
    while (wrongAnswers.size < 3) {
        const candidate = correct + randomInt(-6, 6);
        if (candidate !== correct) {
            wrongAnswers.add(String(candidate));
        }
    }
    return shuffle([String(correct), ...wrongAnswers]);
};

const makeExpressionChoices = (correct: string, pool: string[]) => {
    const wrongAnswers = pool.filter((item) => item !== correct).slice(0, 3);
    return shuffle([correct, ...wrongAnswers]);
};

const buildLikeTermsQuestion = (): PolynomialsQuestion => {
    const a = randomInt(1, 9);
    const b = randomInt(1, 9);
    const c = a + b;
    const correct = `${c}x`;

    return {
        id: `poly-like-${a}-${b}-${Date.now()}`,
        difficulty: 'easy',
        type: 'like_terms',
        prompt: `化簡：${a}x + ${b}x = ?`,
        choices: makeExpressionChoices(correct, [`${Math.abs(a - b)}x`, `${a + b + 1}x`, `${a * b}x`, correct]),
        correctAnswer: correct,
        explanation: `同類項可直接相加：${a}x + ${b}x = (${a} + ${b})x = ${c}x。`,
    };
};

const buildEvaluateQuestion = (): PolynomialsQuestion => {
    const a = randomInt(1, 5);
    const b = randomInt(1, 8);
    const x = randomInt(1, 6);
    const value = a * x + b;

    return {
        id: `poly-eval-${a}-${b}-${x}-${Date.now()}`,
        difficulty: 'medium',
        type: 'evaluate',
        prompt: `若 x = ${x}，求 ${a}x + ${b} 的值。`,
        choices: makeNumericChoices(value),
        correctAnswer: String(value),
        explanation: `代入 x = ${x}：${a} × ${x} + ${b} = ${value}。`,
    };
};

const buildAddSubtractQuestion = (): PolynomialsQuestion => {
    const a = randomInt(1, 6);
    const b = randomInt(1, 6);
    const c = randomInt(1, 6);
    const d = randomInt(1, 6);
    const xCoeff = a + c;
    const constant = b - d;
    const constantPart = constant >= 0 ? ` + ${constant}` : ` - ${Math.abs(constant)}`;
    const correct = `${xCoeff}x${constantPart}`;

    return {
        id: `poly-add-${a}-${b}-${c}-${d}-${Date.now()}`,
        difficulty: 'hard',
        type: 'add_subtract',
        prompt: `化簡：(${a}x + ${b}) + (${c}x - ${d})`,
        choices: makeExpressionChoices(correct, [
            `${Math.abs(a - c)}x + ${b + d}`,
            `${xCoeff}x + ${b + d}`,
            `${a * c}x + ${constant}`,
            correct,
        ]),
        correctAnswer: correct,
        explanation: `同類項合併：(${a}x + ${c}x) + (${b} - ${d}) = ${correct}。`,
    };
};

export const generatePolynomialsQuestion = (difficulty: PolynomialsDifficulty): PolynomialsQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildLikeTermsQuestion();
        case 'medium':
            return buildEvaluateQuestion();
        case 'hard':
            return buildAddSubtractQuestion();
        default:
            return buildLikeTermsQuestion();
    }
};
