/**
 * AuthContext — Stage B
 *
 * Calls POST /api/auth/login instead of checking DEMO_USERS locally.
 * Calls POST /api/auth/logout to clear the httpOnly cookie.
 * Ward comes from the server response (derived from JWT) — never client-settable.
 *
 * DEMO_USERS removed: no hardcoded credentials remain client-side.
 * setOfficerWard: preserved for admin-initiated ward reassignment UI,
 *   but only updates local display state — the authoritative ward is always
 *   from the JWT stored in the httpOnly cookie.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  setOfficerWard: (ward: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'kpg_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Restore non-sensitive user profile from sessionStorage on page refresh
    // (the actual auth token is in the httpOnly cookie — this is just display state)
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ensures the httpOnly cookie is received and stored
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      setUser(data.user);
      return { success: true, role: data.user.role };
    } catch (err: any) {
      return { success: false, error: 'Network error — could not reach the server.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors on logout — clear local state regardless
    }
    setUser(null);
  };

  /**
   * Helper for display-only ward label updates (Admin UI only).
   * The authoritative ward is always from the JWT — this only updates the
   * local display state for UI feedback purposes.
   */
  const setOfficerWard = (ward: string) => {
    if (user && user.role === 'admin') {
      setUser({ ...user, ward });
    } else {
      console.warn('[AuthContext Security Guard] Officer ward jurisdiction is fixed post-login and cannot be changed.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        login,
        logout,
        setOfficerWard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
