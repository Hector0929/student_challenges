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

// Monster Tower types
export interface TowerProgress {
    id: string;
    user_id: string;
    current_floor: number;
    dice_count: number;
    monsters_collected: string[];
    total_climbs: number;
    highest_floor: number;
    last_roll_result?: number;
    last_event_type?: string;
    last_event_floor?: number;
    created_at: string;
    updated_at: string;
}

export interface TowerEvent {
    id: string;
    floor_number: number;
    event_type: 'ladder' | 'trap' | 'monster' | 'treasure' | 'egg';
    target_floor?: number;
    reward_stars?: number;
    monster_id?: string;
    description?: string;
    is_active: boolean;
}

export interface WorldStateRow {
    user_id: string;
    island_level: number;
    time_of_day_pref: 'day' | 'dusk';
    world_theme?: string;
    world_terrain?: string;
    last_collected_at: string;
    created_at?: string;
    updated_at?: string;
}

export interface WorldBuildingRow {
    id?: string;
    user_id: string;
    building_key: 'forest' | 'mine' | 'academy' | 'market' | 'storage' | 'adventure';
    level: number;
    worker_count?: number;
    assigned_plot_key?: string | null;
    updated_at?: string;
}

export interface WorldInventoryRow {
    user_id: string;
    wood: number;
    stone: number;
    crystal: number;
    monster_shards: number;
    updated_at?: string;
}

export interface WorldCharacterRow {
    user_id: string;
    level: number;
    power: number;
    hp_bonus?: number;
    atk_bonus?: number;
    move_bonus?: number;
    skill_points?: number;
    job_class?: string | null;
    updated_at?: string;
}

export interface WorldAdventureRow {
    id?: string;
    user_id: string;
    mission_type: 'short' | 'standard' | 'long';
    duration_minutes: number;
    status: 'idle' | 'running' | 'completed' | 'claimed';
    started_at: string;
    ends_at: string;
    adventure_level: number;
    hero_level: number;
    result_payload?: Record<string, unknown> | null;
    updated_at?: string;
}

// Monster shop configuration (parent-managed)
export interface MonsterShopItem {
    id: string;
    family_id: string;
    monster_id: string;
    price: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface FamilyExchangeRates {
    id: string;
    family_id: string;
    wood_rate: number;
    stone_rate: number;
    crystal_rate: number;
    updated_at: string;
    updated_by?: string;
}

export interface FamilyBankSettings {
    id: string;
    family_id: string;
    demand_daily_rate: number;
    time_deposit_daily_rate: number;
    min_time_deposit_days: number;
    early_withdraw_penalty_rate: number;
    updated_at: string;
    updated_by?: string;
}

export interface WorldBankAccountRow {
    user_id: string;
    balance: number;
    last_interest_at: string;
    simulated_now_at: string;
    updated_at?: string;
}

export interface WorldTimeDepositRow {
    id?: string;
    user_id: string;
    principal: number;
    daily_rate: number;
    start_at: string;
    matures_at: string;
    term_days: number;
    status: 'active' | 'matured' | 'claimed' | 'cancelled';
    created_at?: string;
    updated_at?: string;
}

export interface WorldExchangeLogRow {
    id?: string;
    user_id: string;
    sold_wood: number;
    sold_stone: number;
    sold_crystal: number;
    market_level: number;
    market_multiplier: number;
    base_wood_rate: number;
    base_stone_rate: number;
    base_crystal_rate: number;
    stars_earned: number;
    created_at?: string;
}
