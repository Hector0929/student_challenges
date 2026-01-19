// Mock Supabase client for testing without backend
import type { Quest, DailyLog, Profile } from '../types/database';

// Mock data
const mockQuests: Quest[] = [
    {
        id: '1',
        title: '刷牙怪獸 (Brush Teeth Monster)',
        description: '早晚刷牙保持牙齒健康！',
        icon: '🦷',
        reward_points: 10,
        is_active: true,
        created_by: 'parent-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '2',
        title: '整理床鋪怪獸 (Make Bed Monster)',
        description: '起床後整理好自己的床鋪',
        icon: '🛏️',
        reward_points: 10,
        is_active: true,
        created_by: 'parent-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        title: '寫作業怪獸 (Homework Monster)',
        description: '完成今天的學校作業',
        icon: '📚',
        reward_points: 15,
        is_active: true,
        created_by: 'parent-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        title: '收拾玩具怪獸 (Tidy Toys Monster)',
        description: '玩完玩具後收拾整齊',
        icon: '🧸',
        reward_points: 10,
        is_active: true,
        created_by: 'parent-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '5',
        title: '幫忙家事怪獸 (Chores Monster)',
        description: '幫忙做家事（洗碗、掃地等）',
        icon: '🧹',
        reward_points: 15,
        is_active: true,
        created_by: 'parent-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const mockProfile: Profile = {
    id: 'mock-user-1',
    role: 'child',
    name: '小勇者',
    student_id: 'S001',
    created_at: new Date().toISOString(),
};

const mockDailyLogs: DailyLog[] = [];

// Create a proper mock query builder
const createQueryBuilder = (_table: string, data: any[]) => {
    let filters: any = {};
    // let selectFields = '*'; // Unused

    const builder: any = {
        select: (_fields?: string) => {
            // selectFields = fields || '*'; // Unused
            return builder;
        },
        eq: (column: string, value: any) => {
            filters[column] = value;
            return builder;
        },
        order: (_column: string, _options?: any) => {
            return builder;
        },
        single: async () => {
            let result = data;
            Object.keys(filters).forEach(key => {
                result = result.filter((item: any) => item[key] === filters[key]);
            });
            return { data: result[0] || null, error: null };
        },
        then: async (resolve: any) => {
            let result = data;
            Object.keys(filters).forEach(key => {
                result = result.filter((item: any) => item[key] === filters[key]);
            });
            resolve({ data: result, error: null });
            return { data: result, error: null };
        },
    };

    return builder;
};

// Mock Supabase client
export const supabase: any = {
    from: (table: string) => {
        if (table === 'profiles') {
            return {
                select: (_columns?: string) => createQueryBuilder(table, [mockProfile]),
                insert: (data: any) => ({
                    select: () => ({
                        single: async () => {
                            const newProfile: Profile = {
                                id: `profile-${Date.now()}`,
                                ...data,
                                created_at: new Date().toISOString(),
                            };
                            return { data: newProfile, error: null };
                        },
                    }),
                }),
            };
        } else if (table === 'quests') {
            return {
                select: (_columns?: string) => createQueryBuilder(table, mockQuests),
                insert: (data: any) => ({
                    select: () => ({
                        single: async () => {
                            const newQuest: Quest = {
                                id: `quest-${Date.now()}`,
                                ...data,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            mockQuests.push(newQuest);
                            return { data: newQuest, error: null };
                        },
                    }),
                }),
                update: (data: any) => ({
                    eq: (column: string, value: any) => ({
                        select: () => ({
                            single: async () => {
                                const quest = mockQuests.find((q) => q[column as keyof Quest] === value);
                                if (quest) {
                                    Object.assign(quest, data, { updated_at: new Date().toISOString() });
                                    return { data: quest, error: null };
                                }
                                return { data: null, error: null };
                            },
                        }),
                    }),
                }),
                delete: () => ({
                    eq: (column: string, value: any) => ({
                        then: async (resolve: any) => {
                            const index = mockQuests.findIndex((q) => q[column as keyof Quest] === value);
                            if (index > -1) {
                                mockQuests.splice(index, 1);
                            }
                            resolve({ error: null });
                            return { error: null };
                        },
                    }),
                }),
            };
        } else if (table === 'daily_logs') {
            return {
                select: (_columns?: string) => {
                    const builder: any = {
                        eq: (column: string, value: any) => {
                            let filtered = mockDailyLogs;
                            if (value !== 'all') {
                                filtered = filtered.filter((log: any) => log[column] === value);
                            }
                            return {
                                ...builder,
                                eq: (col2: string, val2: any) => {
                                    filtered = filtered.filter((log: any) => log[col2] === val2);
                                    return {
                                        ...builder,
                                        then: async (resolve: any) => {
                                            const enriched = filtered.map(log => ({
                                                ...log,
                                                quest: mockQuests.find(q => q.id === log.quest_id),
                                                profile: mockProfile,
                                            }));
                                            resolve({ data: enriched, error: null });
                                            return { data: enriched, error: null };
                                        },
                                    };
                                },
                                then: async (resolve: any) => {
                                    const enriched = filtered.map(log => ({
                                        ...log,
                                        quest: mockQuests.find(q => q.id === log.quest_id),
                                        profile: mockProfile,
                                    }));
                                    resolve({ data: enriched, error: null });
                                    return { data: enriched, error: null };
                                },
                            };
                        },
                        then: async (resolve: any) => {
                            const enriched = mockDailyLogs.map(log => ({
                                ...log,
                                quest: mockQuests.find(q => q.id === log.quest_id),
                                profile: mockProfile,
                            }));
                            resolve({ data: enriched, error: null });
                            return { data: enriched, error: null };
                        },
                    };
                    return builder;
                },
                insert: (data: any) => ({
                    select: () => ({
                        single: async () => {
                            const newLog: DailyLog = {
                                id: `log-${Date.now()}`,
                                user_id: data.user_id,
                                quest_id: data.quest_id,
                                status: data.status,
                                completed_at: data.completed_at,
                                date: data.date,
                                created_at: new Date().toISOString(),
                            };
                            mockDailyLogs.push(newLog);
                            return { data: newLog, error: null };
                        },
                    }),
                }),
                update: (data: any) => ({
                    eq: (column: string, value: any) => ({
                        select: () => ({
                            single: async () => {
                                const log = mockDailyLogs.find((l) => l[column as keyof DailyLog] === value);
                                if (log) {
                                    Object.assign(log, data);
                                    return { data: log, error: null };
                                }
                                return { data: null, error: null };
                            },
                        }),
                    }),
                }),
            };
        }
        return {};
    },
};

export const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};
