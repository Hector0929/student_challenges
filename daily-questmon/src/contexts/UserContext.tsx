import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../types/database';

interface UserContextType {
    user: Profile | null;
    setUser: (user: Profile | null) => void;
    registerUser: (userData: Omit<Profile, 'id' | 'created_at'>) => void;
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
                setUserState(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse saved user', e);
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

    const registerUser = (userData: Omit<Profile, 'id' | 'created_at'>) => {
        // Create new user profile
        const newUser: Profile = {
            id: `user-${Date.now()}`,
            ...userData,
            created_at: new Date().toISOString(),
        };

        // Save to localStorage (in real app, this would be saved to Supabase)
        const users = JSON.parse(localStorage.getItem('questmon-users') || '[]');
        users.push(newUser);
        localStorage.setItem('questmon-users', JSON.stringify(users));

        // Set as current user
        setUser(newUser);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, registerUser, logout }}>
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
