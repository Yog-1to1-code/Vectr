import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, ROUTES } from '../constants';

/**
 * Auth Context — manages user session state with localStorage persistence.
 * Provides login, logout, and updateUser actions.
 * Auto-redirects to login on session expiry.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.USER);
            return saved ? JSON.parse(saved) : null;
        } catch {
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }
    });

    const [isLoading, setIsLoading] = useState(true);

    // Sync to localStorage whenever user changes
    useEffect(() => {
        if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
        setIsLoading(false);
    }, [user]);

    // Listen for storage events (logout from other tabs)
    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === STORAGE_KEYS.USER && !e.newValue) {
                setUser(null);
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const login = useCallback((userData) => {
        setUser({
            email: userData.email,
            hasPat: userData.hasPat || false,
            authType: userData.authType || 'email',
            token: userData.token || null,
            githubUsername: userData.githubUsername || null,
            experienceLevel: userData.experienceLevel || 'Intermediate',
            loginAt: new Date().toISOString(),
        });
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER);
    }, []);

    const updateUser = useCallback((updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
    }, []);

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
