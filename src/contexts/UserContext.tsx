import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/database';
import { supabase } from '../lib/supabase';

interface UserContextType {
    user: Profile | null;
    setUser: (user: Profile | null) => void;
    registerUser: (userData: Omit<Profile, 'id' | 'created_at'>) => Promise<void>;
    loginAsChild: (childId: string) => Promise<void>;
    loginAsParent: () => Promise<void>;
    logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUserState] = useState<Profile | null>(null);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('questmon-current-user');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                // Validate if ID is a valid UUID
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

                if (parsedUser && parsedUser.id && uuidRegex.test(parsedUser.id)) {
                    setUserState(parsedUser);
                } else {
                    console.warn('Invalid user ID found (legacy), clearing session');
                    localStorage.removeItem('questmon-current-user');
                    setUserState(null);
                }
            } catch (e) {
                console.error('Failed to parse saved user', e);
                localStorage.removeItem('questmon-current-user');
            }
        }
    }, []);

    const setUser = (newUser: Profile | null) => {
        setUserState(newUser);
        if (newUser) {
            localStorage.setItem('questmon-current-user', JSON.stringify(newUser));
        } else {
            localStorage.removeItem('questmon-current-user');
        }
    };

    const registerUser = async (userData: Omit<Profile, 'id' | 'created_at'>) => {
        try {
            let profile: Profile | null = null;

            // 1. Check if user already exists
            if (userData.role === 'child' && userData.student_id) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'child')
                    .eq('student_id', userData.student_id)
                    .maybeSingle();

                if (data) profile = data;
            } else if (userData.role === 'parent') {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'parent')
                    .eq('name', userData.name)
                    .maybeSingle();

                if (data) profile = data;
            }

            // 2. If not exists, create new user
            if (!profile) {
                const { data, error } = await supabase
                    .from('profiles')
                    .insert({
                        role: userData.role,
                        name: userData.name,
                        student_id: userData.student_id,
                        avatar_url: userData.avatar_url
                    })
                    .select()
                    .single();

                if (error) throw error;
                profile = data;
            }

            // 3. Set as current user
            if (profile) {
                setUser(profile);
            }
        } catch (error) {
            console.error('Error registering/logging in user:', error);
            alert('登入/註冊失敗，請重試');
        }
    };

    const loginAsChild = async (childId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', childId)
                .eq('role', 'child')
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setUser(data);
            } else {
                throw new Error('找不到此孩子的資料');
            }
        } catch (error) {
            console.error('登入失敗:', error);
            alert('登入失敗，請重試');
        }
    };

    const loginAsParent = async () => {
        try {
            // Check if parent profile exists
            const { data: existingParent } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'parent')
                .maybeSingle();

            let parentProfile = existingParent;

            // Create parent profile if it doesn't exist
            if (!parentProfile) {
                const { data, error } = await supabase
                    .from('profiles')
                    .insert({
                        role: 'parent',
                        name: '家長',
                        avatar_url: '👨‍👩‍👧‍👦'
                    })
                    .select()
                    .single();

                if (error) throw error;
                parentProfile = data;
            }

            if (parentProfile) {
                setUser(parentProfile);
            }
        } catch (error) {
            console.error('家長登入失敗:', error);
            alert('登入失敗，請重試');
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, registerUser, loginAsChild, loginAsParent, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
};
