import React from 'react';
import type { LearningItem } from '../types/learning';
import { FractionsPractice } from './FractionsPractice';
import { FactorsMultiplesPractice } from './FactorsMultiplesPractice';
import { AreaPractice } from './AreaPractice';
import { PerimeterPractice } from './PerimeterPractice';
import { VolumePractice } from './VolumePractice';
import { LinearEquationPractice } from './LinearEquationPractice';
import { PolynomialsPractice } from './PolynomialsPractice';

export const getLearningEmbeddedContent = (item: LearningItem): React.ReactNode | null => {
    if (item.launcher.type !== 'react') {
        return null;
    }

    switch (item.launcher.target) {
        case 'fractions':
            return <FractionsPractice />;
        case 'factors_multiples':
            return <FactorsMultiplesPractice />;
        case 'area':
            return <AreaPractice />;
        case 'perimeter':
            return <PerimeterPractice />;
        case 'volume':
            return <VolumePractice />;
        case 'linear_equation':
            return <LinearEquationPractice />;
        case 'polynomials':
            return <PolynomialsPractice />;
        default:
            return (
                <div className="h-full flex items-center justify-center bg-slate-50 p-6">
                    <div className="max-w-md w-full rounded-3xl border-2 border-slate-200 bg-white p-6 text-center shadow-sm">
                        <div className="text-5xl mb-3">🛠️</div>
                        <h3 className="font-heading text-xl font-bold text-slate-800 mb-2">這個單元正在準備中</h3>
                        <p className="font-body text-sm text-slate-500">{item.name} 會在後續版本開放，先挑戰其他練習吧！</p>
                    </div>
                </div>
            );
    }
};
