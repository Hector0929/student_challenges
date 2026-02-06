import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

export interface UserContextType {
    session: Session | null;
    user: Profile | null; // The currently active profile (Child or Parent)
    familyName: string | null; // Family name for the authenticated session
    loading: boolean;
    setUser: (user: Profile | null) => void;
    registerUser: (userData: Omit<Profile, 'id' | 'created_at' | 'family_id'>) => Promise<void>;
    loginAsChild: (childId: string) => Promise<void>;
    loginAsParent: (pin?: string) => Promise<void>;
    logout: () => Promise<void>;
    exitProfile: () => void;
    lockParent: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
