// Database type definitions

export interface Profile {
    id: string;
    role: 'parent' | 'child';
    name: string;
    student_id?: string;
    avatar_url?: string;
    parent_id?: string;
    created_at: string;
}

export interface Quest {
    id: string;
    title: string;
    description?: string;
    icon: string;
    reward_points: number;
    is_active: boolean; // Deprecated, use status
    status: 'active' | 'pending' | 'archived';
    created_by?: string;
    created_at: string;
    updated_at: string;
    quest_assignments?: QuestAssignment[];
}

export interface QuestAssignment {
    id: string;
    quest_id: string;
    child_id: string;
    created_at: string;
}

export interface DailyLog {
    id: string;
    user_id: string;
    quest_id: string;
    status: 'pending' | 'completed' | 'verified';
    completed_at?: string;
    date: string;
    created_at: string;
}

// Extended types with relations
export interface DailyLogWithQuest extends DailyLog {
    quest: Quest;
}

// Form types
export interface QuestFormData {
    title: string;
    description?: string;
    icon: string;
    reward_points: number;
    is_active: boolean;
    status: 'active' | 'pending' | 'archived';
}

// API response types
export interface DailyProgress {
    total_quests: number;
    completed_quests: number;
    total_points: number;
    earned_points: number;
    completion_percentage: number;
}
