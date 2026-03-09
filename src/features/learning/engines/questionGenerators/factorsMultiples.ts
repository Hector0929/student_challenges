export type FactorsMultiplesDifficulty = 'easy' | 'medium' | 'hard';
export type FactorsMultiplesQuestionType = 'true_false' | 'find_factor' | 'gcf_lcm';

export interface FactorsMultiplesQuestion {
    id: string;
    difficulty: FactorsMultiplesDifficulty;
    type: FactorsMultiplesQuestionType;
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

export const getFactors = (value: number) => {
    const factors: number[] = [];
    for (let candidate = 1; candidate <= value; candidate += 1) {
        if (value % candidate === 0) {
            factors.push(candidate);
        }
    }
    return factors;
};

export const getGcd = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);

    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a || 1;
};

export const getLcm = (left: number, right: number) => Math.abs(left * right) / getGcd(left, right);

const buildTrueFalseQuestion = (): FactorsMultiplesQuestion => {
    const base = randomInt(2, 12);
    const relationType = Math.random() > 0.5 ? 'factor' : 'multiple';
    let candidate = 1;
    let isTrue = false;

    if (relationType === 'factor') {
        isTrue = Math.random() > 0.5;
        candidate = isTrue
            ? getFactors(base)[randomInt(0, getFactors(base).length - 1)]
            : base + randomInt(1, 5);
        return {
            id: `factor-${base}-${candidate}-${Date.now()}`,
            difficulty: 'easy',
            type: 'true_false',
            prompt: `${candidate} 是 ${base} 的因數嗎？`,
            choices: ['是', '不是'],
            correctAnswer: isTrue ? '是' : '不是',
            explanation: isTrue
                ? `因為 ${base} ÷ ${candidate} 可以整除，所以 ${candidate} 是 ${base} 的因數。`
                : `因為 ${base} ÷ ${candidate} 不能整除，所以 ${candidate} 不是 ${base} 的因數。`,
        };
    }

    isTrue = Math.random() > 0.5;
    candidate = isTrue ? base * randomInt(2, 5) : base * randomInt(2, 5) + 1;
    return {
        id: `multiple-${base}-${candidate}-${Date.now()}`,
        difficulty: 'easy',
        type: 'true_false',
        prompt: `${candidate} 是 ${base} 的倍數嗎？`,
        choices: ['是', '不是'],
        correctAnswer: isTrue ? '是' : '不是',
        explanation: isTrue
            ? `因為 ${candidate} ÷ ${base} 可以整除，所以 ${candidate} 是 ${base} 的倍數。`
            : `因為 ${candidate} ÷ ${base} 不能整除，所以 ${candidate} 不是 ${base} 的倍數。`,
    };
};

const buildFindFactorQuestion = (): FactorsMultiplesQuestion => {
    const value = randomInt(12, 36);
    const factors = getFactors(value).filter((factor) => factor !== 1 && factor !== value);
    const correctFactor = factors[randomInt(0, factors.length - 1)] ?? 1;
    const wrongAnswers = new Set<string>();

    while (wrongAnswers.size < 3) {
        const candidate = randomInt(2, value - 1);
        if (value % candidate !== 0) {
            wrongAnswers.add(String(candidate));
        }
    }

    return {
        id: `find-factor-${value}-${correctFactor}-${Date.now()}`,
        difficulty: 'medium',
        type: 'find_factor',
        prompt: `下面哪一個是 ${value} 的因數？`,
        choices: shuffle([String(correctFactor), ...wrongAnswers]),
        correctAnswer: String(correctFactor),
        explanation: `因為 ${value} ÷ ${correctFactor} 可以整除，所以 ${correctFactor} 是 ${value} 的因數。`,
    };
};

const buildGcfLcmQuestion = (): FactorsMultiplesQuestion => {
    const left = randomInt(4, 12);
    const right = randomInt(4, 12);
    const askFor = Math.random() > 0.5 ? 'gcf' : 'lcm';
    const correctAnswer = askFor === 'gcf' ? getGcd(left, right) : getLcm(left, right);
    const wrongAnswers = new Set<string>();

    while (wrongAnswers.size < 3) {
        const candidate = Math.max(2, correctAnswer + randomInt(-6, 6));
        if (candidate !== correctAnswer) {
            wrongAnswers.add(String(candidate));
        }
    }

    return {
        id: `${askFor}-${left}-${right}-${Date.now()}`,
        difficulty: 'hard',
        type: 'gcf_lcm',
        prompt: askFor === 'gcf' ? `${left} 和 ${right} 的最大公因數是？` : `${left} 和 ${right} 的最小公倍數是？`,
        choices: shuffle([String(correctAnswer), ...wrongAnswers]),
        correctAnswer: String(correctAnswer),
        explanation: askFor === 'gcf'
            ? `${left} 和 ${right} 都能整除的最大數是 ${correctAnswer}。`
            : `${left} 和 ${right} 共同的倍數中最小的是 ${correctAnswer}。`,
    };
};

export const generateFactorsMultiplesQuestion = (difficulty: FactorsMultiplesDifficulty): FactorsMultiplesQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildTrueFalseQuestion();
        case 'medium':
            return buildFindFactorQuestion();
        case 'hard':
            return buildGcfLcmQuestion();
        default:
            return buildTrueFalseQuestion();
    }
};
