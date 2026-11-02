export type LearningSubjectId = 'math' | 'english' | 'chinese';

export type LearningStageId = 'general' | 'elementary' | 'junior_high';

export type LearningLauncherType = 'html' | 'react';

// retired：已被新版取代，檔案先留著備用，不再顯示
export type LearningItemStatus = 'active' | 'planned' | 'retired';

export interface LearningSubject {
    id: LearningSubjectId;
    name: string;
    icon: string;
    description: string;
    order: number;
}

export interface LearningStage {
    id: LearningStageId;
    name: string;
    description: string;
    order: number;
}

export interface LearningLauncher {
    type: LearningLauncherType;
    target: string;
}

export interface LearningItem {
    id: string;
    name: string;
    shortName?: string;
    icon: string;
    description: string;
    subjectId: LearningSubjectId;
    stageId: LearningStageId;
    order: number;
    enabledByDefault: boolean;
    status: LearningItemStatus;
    launcher: LearningLauncher;
    legacyDisabledKey?: string;
    accentColorToken?: string;
    tags?: string[];
}

export interface LearningSubjectGroup {
    subject: LearningSubject;
    items: LearningItem[];
}

export interface LearningStageGroup {
    stage: LearningStage;
    items: LearningItem[];
}
