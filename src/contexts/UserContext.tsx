import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/database';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface UserContextType {
    session: Session | null;
    user: Profile | null; // The currently active profile (Child or Parent)
    loading: boolean;
    setUser: (user: Profile | null) => void;
    registerUser: (userData: Omit<Profile, 'id' | 'created_at' | 'family_id'>) => Promise<void>;
    loginAsChild: (childId: string) => Promise<void>;
    loginAsParent: () => Promise<void>;
    logout: () => Promise<void>; // Logout from Auth (Family transaction)
    exitProfile: () => void; // Go back to Role Selection
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUserState] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Initialize Supabase Auth Listener
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                setUserState(null); // Clear profile if logged out
                localStorage.removeItem('questmon-current-profile-id');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Restore active profile from localStorage if session exists
    useEffect(() => {
        const restoreProfile = async () => {
            if (!session) return;

            const savedProfileId = localStorage.getItem('questmon-current-profile-id');
            if (savedProfileId) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', savedProfileId)
                        .maybeSingle();

                    if (data && !error) {
                        // Verify this profile belongs to the family (or is the family admin)
                        // Note: RLS should handle this, but double check logic:
                        // If I am the auth user, I can see my family members.
                        setUserState(data);
                    } else {
                        localStorage.removeItem('questmon-current-profile-id');
                    }
                } catch (e) {
                    console.error('Failed to restore profile', e);
                }
            }
        };

        if (session && !loading && !user) {
            restoreProfile();
        }
    }, [session, loading]);

    const setUser = (newUser: Profile | null) => {
        setUserState(newUser);
        if (newUser) {
            localStorage.setItem('questmon-current-profile-id', newUser.id);
        } else {
            localStorage.removeItem('questmon-current-profile-id');
        }
    };

    const registerUser = async (userData: Omit<Profile, 'id' | 'created_at' | 'family_id'>) => {
        if (!session) {
            alert('請先登入家庭帳號');
            return;
        }

        try {
            // Fetch family_id from the current parent (who is creating this user)
            // Or simpler: We know the auth user created the family, or we fetch the user's profile to get family_id

            // 1. Get current Admin Profile to find family_id
            const { data: adminProfile } = await supabase
                .from('profiles')
                .select('family_id')
                .eq('id', session.user.id)
                .single();

            if (!adminProfile?.family_id) {
                throw new Error('Family ID not found for current user');
            }

            // 2. Insert new profile
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    ...userData,
                    family_id: adminProfile.family_id,
                    // If we support avatars, pass them through
                    // student_id is optional
                })
                .select()
                .single();

            if (error) throw error;

            // 3. Set as current user
            if (data) {
                setUser(data);
            }
        } catch (error) {
            console.error('Error registering user:', error);
            alert('註冊失敗，請重試');
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
        if (!session) return;
        try {
            // Ideally, open a dialog to choose *which* parent if there are multiple.
            // For now, default to the Main Admin Parent (matches Auth ID).

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id) // Get the profile matching the Auth User
                .single();

            if (error) throw error;
            if (data) {
                setUser(data);
            }
        } catch (error) {
            console.error('家長登入失敗:', error);
            alert('登入失敗，請重試');
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUserState(null);
        setSession(null);
        localStorage.removeItem('questmon-current-profile-id');
    };

    const exitProfile = () => {
        setUser(null);
    };

    return (
        <UserContext.Provider value={{
            session,
            user,
            loading,
            setUser,
            registerUser,
            loginAsChild,
            loginAsParent,
            logout,
            exitProfile
        }}>
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
