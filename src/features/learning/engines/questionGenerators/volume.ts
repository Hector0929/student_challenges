export type VolumeDifficulty = 'easy' | 'medium' | 'hard';
export type VolumeQuestionType = 'cuboid_volume' | 'cube_volume' | 'missing_height';

export interface VolumeQuestion {
    id: string;
    difficulty: VolumeDifficulty;
    type: VolumeQuestionType;
    prompt: string;
    shapeLabel: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    length?: number;
    width?: number;
    height?: number;
    side?: number;
    volume?: number;
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
        const candidate = Math.max(min, correct + randomInt(-18, 18));
        if (candidate !== correct) {
            wrongAnswers.add(String(candidate));
        }
    }
    return shuffle([String(correct), ...wrongAnswers]);
};

const buildCuboidQuestion = (): VolumeQuestion => {
    const length = randomInt(2, 8);
    const width = randomInt(2, 7);
    const height = randomInt(2, 6);
    const volume = length * width * height;

    return {
        id: `volume-cuboid-${length}-${width}-${height}-${Date.now()}`,
        difficulty: 'easy',
        type: 'cuboid_volume',
        prompt: `長方體長 ${length}、寬 ${width}、高 ${height}（公分），體積是多少？`,
        shapeLabel: '長方體',
        length,
        width,
        height,
        volume,
        choices: makeChoices(volume),
        correctAnswer: String(volume),
        explanation: `長方體體積 = 長 × 寬 × 高 = ${length} × ${width} × ${height} = ${volume}。`,
    };
};

const buildCubeQuestion = (): VolumeQuestion => {
    const side = randomInt(2, 9);
    const volume = side * side * side;

    return {
        id: `volume-cube-${side}-${Date.now()}`,
        difficulty: 'medium',
        type: 'cube_volume',
        prompt: `正方體邊長 ${side} 公分，體積是多少？`,
        shapeLabel: '正方體',
        side,
        volume,
        choices: makeChoices(volume),
        correctAnswer: String(volume),
        explanation: `正方體體積 = 邊長³ = ${side} × ${side} × ${side} = ${volume}。`,
    };
};

const buildMissingHeightQuestion = (): VolumeQuestion => {
    const length = randomInt(3, 10);
    const width = randomInt(2, 8);
    const height = randomInt(2, 9);
    const volume = length * width * height;

    return {
        id: `volume-height-${length}-${width}-${height}-${Date.now()}`,
        difficulty: 'hard',
        type: 'missing_height',
        prompt: `長方體體積是 ${volume} 立方公分，長 ${length} 公分、寬 ${width} 公分，高是多少公分？`,
        shapeLabel: '長方體（反推）',
        length,
        width,
        volume,
        choices: makeChoices(height),
        correctAnswer: String(height),
        explanation: `高 = 體積 ÷ (長 × 寬) = ${volume} ÷ (${length} × ${width}) = ${height}。`,
    };
};

export const generateVolumeQuestion = (difficulty: VolumeDifficulty): VolumeQuestion => {
    switch (difficulty) {
        case 'easy':
            return buildCuboidQuestion();
        case 'medium':
            return buildCubeQuestion();
        case 'hard':
            return buildMissingHeightQuestion();
        default:
            return buildCuboidQuestion();
    }
};
