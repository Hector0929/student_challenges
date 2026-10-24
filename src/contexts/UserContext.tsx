import React, { useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/database';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { UserContext } from './UserContextDefinition';

/** 這個分頁目前選的小孩；分頁關掉就消失，所以重新打開網站會回到使用者清單 */
const CHILD_TAB_KEY = 'questmon-child-tab';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUserState] = useState<Profile | null>(null);
    const [familyName, setFamilyName] = useState<string | null>(null);
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
                setFamilyName(null);
                localStorage.removeItem('questmon-current-profile-id');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 1.5 Fetch Family Name when session exists
    useEffect(() => {
        const fetchFamilyName = async () => {
            if (!session?.user?.id) return;

            try {
                // Get the admin profile to find family_id
                const { data: adminProfile } = await supabase
                    .from('profiles')
                    .select('family_id')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (adminProfile?.family_id) {
                    const { data: family } = await supabase
                        .from('families')
                        .select('name')
                        .eq('id', adminProfile.family_id)
                        .maybeSingle();

                    if (family) {
                        setFamilyName(family.name);
                    }
                }
            } catch (error) {
                console.error('Error fetching family name:', error);
            }
        };

        if (session && !familyName) {
            fetchFamilyName();
        }
    }, [session, familyName]);

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
                        // 小孩：只在同一個分頁重新整理時接回；重新打開網站一律先看使用者清單
                        if (data.role === 'child' && sessionStorage.getItem(CHILD_TAB_KEY) !== data.id) {
                            localStorage.removeItem('questmon-current-profile-id');
                            setUserState(null);
                            return;
                        }

                        // Security Check: If restoring a Parent profile, require active session auth
                        if (data.role === 'parent') {
                            const isParentAuth = sessionStorage.getItem('parent-auth') === 'verified';
                            if (!isParentAuth) {
                                // Session invalid (e.g. browser closed), force partial logout to Role Selection
                                console.log('🔒 Parent session expired, requiring PIN re-entry');
                                localStorage.removeItem('questmon-current-profile-id');
                                setUserState(null);
                                return;
                            }
                        }

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
    }, [session, loading, user]);

    const setUser = (newUser: Profile | null) => {
        setUserState(newUser);
        if (newUser) {
            localStorage.setItem('questmon-current-profile-id', newUser.id);
        } else {
            localStorage.removeItem('questmon-current-profile-id');
        }
        if (newUser?.role === 'child') sessionStorage.setItem(CHILD_TAB_KEY, newUser.id);
        else sessionStorage.removeItem(CHILD_TAB_KEY);
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

    const loginAsParent = async (pin?: string) => {
        if (!session) return;

        const cleanPin = pin ? pin.trim() : undefined;
        // console.log(`🔐 Attempting parent login. PIN provided: ${!!cleanPin}`);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id) // Get the profile matching the Auth User
                .maybeSingle();

            if (error) throw error;
            if (data) {
                // Logic:
                // 1. If PIN provided, check against DB.
                // 2. If PIN NOT provided, check if session is already verified.

                const sessionVerified = sessionStorage.getItem('parent-auth') === 'verified';
                const dbPin = data.pin_code ? data.pin_code.trim() : null;

                if (cleanPin !== undefined) {
                    // PIN provided (trying to login with PIN)
                    // If DB has no PIN (null or 0000?), allow? User request A says default 0000.
                    // If dbPin is '0000', allow specific check? No, just match string.

                    if (dbPin && dbPin !== cleanPin) {
                        // console.error(`❌ PIN Mismatch.`);
                        throw new Error('PIN 碼錯誤');
                    }
                    // Verification success -> Mark session
                    sessionStorage.setItem('parent-auth', 'verified');
                } else {
                    // PIN not provided (trying to bypass or switch back)
                    if (!sessionVerified && dbPin) {
                        // Not verified and DB has PIN -> Reject
                        // Note: If DB has NO PIN, we might allow? Secure default is Reject.
                        throw new Error('請輸入 PIN 碼');
                    }
                    // If verified, allow.
                }

                console.log('✅ Parent login successful');
                setUser(data);
            } else {
                console.error('Profile not found for authenticated user');
                throw new Error('找不到家長檔案，請重新註冊');
            }
        } catch (error) {
            console.error('家長登入失敗:', error);
            // Alert is handled by UI caller if needed, or we just throw
            // But usually contexts verify silent or loud. 
            // We throw so RoleSelection can show error
            throw error;
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

    const lockParent = () => {
        sessionStorage.removeItem('parent-auth');
        setUser(null);
    };

    return (
        <UserContext.Provider value={{
            session,
            user,
            familyName,
            loading,
            setUser,
            registerUser,
            loginAsChild,
            loginAsParent,
            logout,
            exitProfile,
            lockParent
        }}>
            {children}
        </UserContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
};
