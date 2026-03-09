export type PerimeterDifficulty = 'easy' | 'medium' | 'hard';
export type PerimeterQuestionType = 'rectangle_formula' | 'square_formula' | 'composite_shape';

export interface PerimeterQuestion {
    id: string;
    difficulty: PerimeterDifficulty;
    type: PerimeterQuestionType;
    prompt: string;
    shapeLabel: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    width?: number;
    height?: number;
    side?: number;
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

const makeChoices = (correct: number, min = 1) => {
    const wrongAnswers = new Set<string>();
    while (wrongAnswers.size < 3) {
        const candidate = Math.max(min, correct + randomInt(-10, 10));
        if (candidate !== correct) {
            wrongAnswers.add(String(candidate));
        }
    }
    return shuffle([String(correct), ...wrongAnswers]);
};

const buildRectanglePerimeterQuestion = (): PerimeterQuestion => {
    const width = randomInt(3, 15);
    const height = randomInt(2, 12);
    const perimeter = 2 * (width + height);

    return {
        id: `perimeter-rect-${width}-${height}-${Date.now()}`,
        difficulty: 'easy',
        type: 'rectangle_formula',
        prompt: `長方形長 ${width} 公分、寬 ${height} 公分，周長是多少？`,
        shapeLabel: '長方形',
        width,
        height,
        choices: makeChoices(perimeter),
        correctAnswer: String(perimeter),
        explanation: `長方形周長 = 2 × (長 + 寬) = 2 × (${width} + ${height}) = ${perimeter}。`,
    };
};

const buildSquarePerimeterQuestion = (): PerimeterQuestion => {
    const side = randomInt(3, 18);
    const perimeter = side * 4;

    return {
        id: `perimeter-square-${side}-${Date.now()}`,
        difficulty: 'medium',
        type: 'square_formula',
        prompt: `正方形邊長 ${side} 公分，周長是多少？`,
        shapeLabel: '正方形',
        side,
        choices: makeChoices(perimeter),
        correctAnswer: String(perimeter),
        explanation: `正方形周長 = 4 × 邊長 = 4 × ${side} = ${perimeter}。`,
    };
};

const buildCompositeQuestion = (): PerimeterQuestion => {
    const width = randomInt(4, 10);
    const height = randomInt(3, 8);
    const perimeter = 2 * (width + height) + width;

    return {
        id: `perimeter-composite-${width}-${height}-${Date.now()}`,
        difficulty: 'hard',
        type: 'composite_shape',
        prompt: `L 形圖由兩個長方形組成，外框可視為「長 ${width + width}、寬 ${height}」再多一段內凹邊長 ${width}。周長是多少？`,
        shapeLabel: 'L 形（簡化）',
        width,
        height,
        choices: makeChoices(perimeter),
        correctAnswer: String(perimeter),
        explanation: `先算外框 2 × (${width + width} + ${height}) = ${2 * ((width + width) + height)}，扣掉重疊再加回內凹後可化簡為 ${perimeter}。`,
    };
};

export const generatePerimeterQuestion = (difficulty: PerimeterDifficulty): PerimeterQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildRectanglePerimeterQuestion();
        case 'medium':
            return buildSquarePerimeterQuestion();
        case 'hard':
            return buildCompositeQuestion();
        default:
            return buildRectanglePerimeterQuestion();
    }
};
