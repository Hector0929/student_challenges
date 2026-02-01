// Database type definitions

export interface Family {
    id: string;
    name: string;
    invite_code: string;
    created_by?: string;
    created_at: string;
}

export interface FamilySettings {
    id: string;
    family_id: string;
    parent_message_enabled: boolean;
    parent_message: string;
    exchange_rate_enabled: boolean;
    star_to_twd_rate: number;
    // Game permission controls
    fun_games_enabled: boolean;
    learning_area_enabled: boolean;
    disabled_games: string[];  // Array of disabled game IDs
    updated_at: string;
    updated_by?: string;
}

export interface ExchangeRequest {
    id: string;
    child_id: string;
    family_id: string;
    star_amount: number;
    twd_amount: number;
    exchange_rate: number;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by?: string;
    reviewed_at?: string;
    reject_reason?: string;
    created_at: string;
}

export interface ExchangeRequestWithChild extends ExchangeRequest {
    profiles?: Profile; // The child who made the request
}

export interface Profile {
    id: string;
    role: 'parent' | 'child';
    name: string;
    student_id?: string;
    avatar_url?: string;
    parent_id?: string;
    family_id?: string;
    pin_code?: string; // Hashed/Encrypted ideally, but frontend might just send it
    line_user_id?: string;
    is_family_admin?: boolean;
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
