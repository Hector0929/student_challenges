// 把 learning/engines/questionGenerators 的數學產生器轉成概念題庫的題目格式。
// 需要搭配圖形才看得懂的題型（看圖選分數、數方格）先排除，共用作答元件目前不畫圖。

import { generateFractionQuestion, type FractionDifficulty } from '../../learning/engines/questionGenerators/fractions';
import { generateFactorsMultiplesQuestion, type FactorsMultiplesDifficulty } from '../../learning/engines/questionGenerators/factorsMultiples';
import { generateAreaQuestion, type AreaDifficulty } from '../../learning/engines/questionGenerators/area';
import { generatePerimeterQuestion, type PerimeterDifficulty } from '../../learning/engines/questionGenerators/perimeter';
import { generateVolumeQuestion, type VolumeDifficulty } from '../../learning/engines/questionGenerators/volume';
import type { ChoiceQuestion, GeneratorRef } from '../types';
import { GRADE2_GENERATORS } from './grade2';
import { GRADE3_GENERATORS } from './grade3';
import { GRADE4_GENERATORS } from './grade4';
import type { LocalGenerator } from './shared';

/** 各年級自己寫的產生器，直接回傳選擇題 */
const LOCAL_GENERATORS: Record<string, LocalGenerator> = { ...GRADE2_GENERATORS, ...GRADE3_GENERATORS, ...GRADE4_GENERATORS };

interface GeneratedLike {
    type: string;
    prompt: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
}

type Generator = (difficulty: string) => GeneratedLike;

const GENERATORS: Record<string, Generator> = {
    fractions: (d) => generateFractionQuestion(d as FractionDifficulty),
    factorsMultiples: (d) => generateFactorsMultiplesQuestion(d as FactorsMultiplesDifficulty),
    area: (d) => generateAreaQuestion(d as AreaDifficulty),
    perimeter: (d) => generatePerimeterQuestion(d as PerimeterDifficulty),
    volume: (d) => generateVolumeQuestion(d as VolumeDifficulty),
};

/** 只能看圖作答的題型 */
const VISUAL_ONLY_TYPES = new Set(['recognition', 'count_grid']);

export const hasGenerator = (id: string) => id in GENERATORS || id in LOCAL_GENERATORS;

/** 產生一題；找不到可用題型時回傳 null */
export function generateQuestion(ref: GeneratorRef, rand: () => number = Math.random): ChoiceQuestion | null {
    if (ref.difficulties.length === 0) return null;
    const local = LOCAL_GENERATORS[ref.id];
    if (local) return local(ref.difficulties[Math.floor(rand() * ref.difficulties.length)], rand);
    const gen = GENERATORS[ref.id];
    if (!gen) return null;
    for (let attempt = 0; attempt < 20; attempt++) {
        const difficulty = ref.difficulties[Math.floor(rand() * ref.difficulties.length)];
        const g = gen(difficulty);
        if (VISUAL_ONLY_TYPES.has(g.type)) continue;
        const wrong = [...new Set(g.choices.filter((c) => c !== g.correctAnswer))].slice(0, 3);
        if (wrong.length === 0) continue;
        return { type: 'choice', q: g.prompt, a: g.correctAnswer, w: wrong, e: g.explanation };
    }
    return null;
}
