import type { LearningItem } from './learning';

export type MathDomain =
    | 'number_operations'
    | 'fractions'
    | 'factors_multiples'
    | 'measurement'
    | 'geometry'
    | 'algebra';

export type MathPracticeModeId =
    | 'basic_arithmetic'
    | 'fraction_recognition'
    | 'fraction_operations'
    | 'factor_multiple_rules'
    | 'perimeter_calculation'
    | 'area_calculation'
    | 'volume_calculation'
    | 'linear_equation_solving'
    | 'polynomial_basics';

export interface MathLearningItem extends LearningItem {
    subjectId: 'math';
    stageId: 'elementary' | 'junior_high';
    domain: MathDomain;
    grades: string[];
    supportsVisualAid: boolean;
    practiceModes: MathPracticeModeId[];
}
