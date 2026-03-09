export type AreaDifficulty = 'easy' | 'medium' | 'hard';
export type AreaQuestionType = 'rectangle_formula' | 'count_grid' | 'triangle_formula';

export interface AreaQuestion {
    id: string;
    difficulty: AreaDifficulty;
    type: AreaQuestionType;
    prompt: string;
    width?: number;
    height?: number;
    shapeLabel: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    grid?: {
        rows: number;
        cols: number;
        filledCells: number;
    };
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
        const candidate = Math.max(min, correct + randomInt(-6, 6));
        if (candidate !== correct) {
            wrongAnswers.add(String(candidate));
        }
    }
    return shuffle([String(correct), ...wrongAnswers]);
};

const buildRectangleQuestion = (): AreaQuestion => {
    const width = randomInt(2, 9);
    const height = randomInt(2, 9);
    const area = width * height;

    return {
        id: `rect-${width}-${height}-${Date.now()}`,
        difficulty: 'easy',
        type: 'rectangle_formula',
        prompt: `長方形長 ${width} 公分，寬 ${height} 公分，面積是多少？`,
        width,
        height,
        shapeLabel: '長方形',
        choices: makeChoices(area),
        correctAnswer: String(area),
        explanation: `長方形面積 = 長 × 寬 = ${width} × ${height} = ${area}。`,
    };
};

const buildGridQuestion = (): AreaQuestion => {
    const rows = randomInt(3, 6);
    const cols = randomInt(3, 6);
    const filledCells = rows * cols;

    return {
        id: `grid-${rows}-${cols}-${Date.now()}`,
        difficulty: 'medium',
        type: 'count_grid',
        prompt: '數一數塗色方格共有幾格？',
        shapeLabel: '方格圖',
        choices: makeChoices(filledCells),
        correctAnswer: String(filledCells),
        explanation: `一共有 ${rows} 排，每排 ${cols} 格，所以面積是 ${rows} × ${cols} = ${filledCells}。`,
        grid: {
            rows,
            cols,
            filledCells,
        },
    };
};

const buildTriangleQuestion = (): AreaQuestion => {
    const base = randomInt(4, 12);
    const height = randomInt(2, 10);
    const area = (base * height) / 2;

    return {
        id: `tri-${base}-${height}-${Date.now()}`,
        difficulty: 'hard',
        type: 'triangle_formula',
        prompt: `三角形底 ${base} 公分，高 ${height} 公分，面積是多少？`,
        width: base,
        height,
        shapeLabel: '三角形',
        choices: makeChoices(area),
        correctAnswer: String(area),
        explanation: `三角形面積 = 底 × 高 ÷ 2 = ${base} × ${height} ÷ 2 = ${area}。`,
    };
};

export const generateAreaQuestion = (difficulty: AreaDifficulty): AreaQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildRectangleQuestion();
        case 'medium':
            return buildGridQuestion();
        case 'hard':
            return buildTriangleQuestion();
        default:
            return buildRectangleQuestion();
    }
};
