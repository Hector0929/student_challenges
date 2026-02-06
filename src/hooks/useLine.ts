import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { supabase } from '../lib/supabase';

// Helper to get LIFF ID from env
const LIFF_ID = import.meta.env.VITE_LIFF_ID;

interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
}

export function useLine() {
    const [liffError, setLiffError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);

    useEffect(() => {
        if (!LIFF_ID) {
            console.warn('LIFF ID is not set in environment variables');
            return;
        }

        // Initialize LIFF
        liff.init({ liffId: LIFF_ID })
            .then(() => {
                if (liff.isLoggedIn()) {
                    setIsLoggedIn(true);
                    liff.getProfile().then(profile => {
                        setLineProfile(profile as LineProfile);
                    });
                }
            })
            .catch((error) => {
                console.error('LIFF Init Error', error);
                setLiffError(String(error));
            });
    }, []);

    const login = () => {
        if (!LIFF_ID) {
            alert('LIFF ID 未設定，請聯絡管理員');
            return;
        }
        if (!liff.isLoggedIn()) {
            liff.login();
        }
    };

    const logout = () => {
        if (liff.isLoggedIn()) {
            liff.logout();
            setIsLoggedIn(false);
            setLineProfile(null);
        }
    };

    const bindLineAccount = async (userId: string) => {
        if (!liff.isLoggedIn()) {
            login();
            return;
        }

        try {
            const profile = await liff.getProfile();
            if (!profile?.userId) throw new Error('無法取得 Line User ID');

            // Update Supabase Profile
            const { error } = await supabase
                .from('profiles')
                .update({ line_user_id: profile.userId })
                .eq('id', userId);

            if (error) throw error;

            alert(`綁定成功！\nLine 暱稱: ${profile.displayName}`);
            return true;
        } catch (error) {
            console.error('Bind Error', error);
            alert(`綁定失敗: ${(error as Error).message || String(error)}`);
            return false;
        }

    };

    return {
        liff,
        liffError,
        isLoggedIn,
        lineProfile,
        login,
        logout,
        bindLineAccount
    };
}
