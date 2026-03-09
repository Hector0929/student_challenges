export type FractionDifficulty = 'easy' | 'medium' | 'hard';
export type FractionQuestionType = 'recognition' | 'simplify' | 'addition';

export interface FractionQuestion {
    id: string;
    difficulty: FractionDifficulty;
    type: FractionQuestionType;
    prompt: string;
    promptFraction?: { numerator: number; denominator: number };
    visualSegments?: number;
    visualFilled?: number;
    choices: string[];
    correctAnswer: string;
    explanation: string;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const gcd = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);

    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a || 1;
};

const formatFraction = (numerator: number, denominator: number) => `${numerator}/${denominator}`;

const shuffle = <T,>(items: T[]) => {
    const cloned = [...items];
    for (let index = cloned.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
    }
    return cloned;
};

const buildRecognitionQuestion = (): FractionQuestion => {
    const denominator = randomInt(2, 8);
    const numerator = randomInt(1, denominator - 1);
    const correctAnswer = formatFraction(numerator, denominator);
    const wrongAnswers = new Set<string>();

    while (wrongAnswers.size < 3) {
        const candidateNumerator = randomInt(1, denominator);
        const candidateDenominator = randomInt(2, 8);
        const candidate = formatFraction(candidateNumerator, candidateDenominator);
        if (candidate !== correctAnswer) {
            wrongAnswers.add(candidate);
        }
    }

    return {
        id: `recognition-${numerator}-${denominator}-${Date.now()}`,
        difficulty: 'easy',
        type: 'recognition',
        prompt: '請選出和圖形一樣的分數',
        promptFraction: { numerator, denominator },
        visualSegments: denominator,
        visualFilled: numerator,
        choices: shuffle([correctAnswer, ...wrongAnswers]),
        correctAnswer,
        explanation: `${numerator} 個塗色區塊，共分成 ${denominator} 份，所以是 ${correctAnswer}。`,
    };
};

const buildSimplifyQuestion = (): FractionQuestion => {
    const baseDenominator = randomInt(2, 6);
    const baseNumerator = randomInt(1, baseDenominator - 1);
    const multiplier = randomInt(2, 4);
    const numerator = baseNumerator * multiplier;
    const denominator = baseDenominator * multiplier;
    const correctAnswer = formatFraction(baseNumerator, baseDenominator);
    const wrongAnswers = new Set<string>();

    while (wrongAnswers.size < 3) {
        const candidateNumerator = randomInt(1, denominator - 1);
        const candidateDenominator = randomInt(candidateNumerator + 1, denominator + 2);
        const candidate = formatFraction(candidateNumerator, candidateDenominator);
        if (candidate !== correctAnswer) {
            wrongAnswers.add(candidate);
        }
    }

    return {
        id: `simplify-${numerator}-${denominator}-${Date.now()}`,
        difficulty: 'medium',
        type: 'simplify',
        prompt: `把 ${formatFraction(numerator, denominator)} 約成最簡分數`,
        promptFraction: { numerator, denominator },
        choices: shuffle([correctAnswer, ...wrongAnswers]),
        correctAnswer,
        explanation: `${numerator} 和 ${denominator} 都可以同除以 ${gcd(numerator, denominator)}，所以最簡分數是 ${correctAnswer}。`,
    };
};

const buildAdditionQuestion = (): FractionQuestion => {
    const denominator = randomInt(3, 10);
    const leftNumerator = randomInt(1, denominator - 2);
    const rightNumerator = randomInt(1, denominator - leftNumerator - 1);
    const answerNumerator = leftNumerator + rightNumerator;
    const correctAnswer = formatFraction(answerNumerator, denominator);
    const wrongAnswers = new Set<string>();

    while (wrongAnswers.size < 3) {
        const offset = randomInt(-2, 2);
        const candidateNumerator = Math.min(Math.max(1, answerNumerator + (offset === 0 ? 1 : offset)), denominator - 1);
        const candidate = formatFraction(candidateNumerator, denominator);
        if (candidate !== correctAnswer) {
            wrongAnswers.add(candidate);
        }
    }

    return {
        id: `addition-${leftNumerator}-${rightNumerator}-${denominator}-${Date.now()}`,
        difficulty: 'hard',
        type: 'addition',
        prompt: `${formatFraction(leftNumerator, denominator)} + ${formatFraction(rightNumerator, denominator)} = ?`,
        choices: shuffle([correctAnswer, ...wrongAnswers]),
        correctAnswer,
        explanation: `分母相同時只要把分子相加：${leftNumerator} + ${rightNumerator} = ${answerNumerator}，所以答案是 ${correctAnswer}。`,
    };
};

export const generateFractionQuestion = (difficulty: FractionDifficulty): FractionQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildRecognitionQuestion();
        case 'medium':
            return buildSimplifyQuestion();
        case 'hard':
            return buildAdditionQuestion();
        default:
            return buildRecognitionQuestion();
    }
};

export const simplifyFraction = (numerator: number, denominator: number) => {
    const divisor = gcd(numerator, denominator);
    return {
        numerator: numerator / divisor,
        denominator: denominator / divisor,
    };
};

export const isEquivalentFraction = (
    leftNumerator: number,
    leftDenominator: number,
    rightNumerator: number,
    rightDenominator: number,
) => leftNumerator * rightDenominator === rightNumerator * leftDenominator;
