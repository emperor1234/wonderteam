import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, OfficeLocation } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOffline: boolean;
  /** True when a request was rejected because the session expired or was revoked. */
  sessionExpired: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    sponsorName: string;
    uplineDirector: string;
    uplineWorldTeamLeader: string;
    profileImage: string;
    officeLocation: OfficeLocation;
  }) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<User | null>;
  /** The team's roster. Only the team leader's session can retrieve it. */
  teamRoster: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teamRoster, setTeamRoster] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // The roster endpoint is leader-only, so a member's 403 is expected and silent.
  const loadRoster = useCallback(async (session: User | null) => {
    if (!session || session.role !== 'admin') {
      setTeamRoster([]);
      return;
    }
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        setTeamRoster(await res.json());
      } else {
        setTeamRoster([]);
      }
    } catch {
      setTeamRoster([]);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<User | null> => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSessionExpired(false);
        void loadRoster(data.user);
        return data.user as User;
      }
      if (res.status === 401) {
        setUser(null);
        setSessionExpired(true);
        setTeamRoster([]);
      }
      return null;
    } catch {
      // Network failure: keep whatever we already had rather than signing out.
      return null;
    }
  }, [loadRoster]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await refreshSession();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = async (email: string, password?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errMsg = 'Failed to sign in';
      try {
        const errorData = await res.json();
        errMsg = errorData.error || errMsg;
      } catch {
        const text = await res.text();
        errMsg = text || errMsg;
      }
      throw new Error(errMsg);
    }

    const { user: authedUser } = await res.json();
    setUser(authedUser);
    setSessionExpired(false);
    void loadRoster(authedUser);
  };

  const register = async (payload: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    sponsorName: string;
    uplineDirector: string;
    uplineWorldTeamLeader: string;
    profileImage: string;
    officeLocation: OfficeLocation;
  }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        password: payload.password || 'password123',
      }),
    });

    if (!res.ok) {
      let errMsg = 'Registration failed';
      try {
        const errorData = await res.json();
        errMsg = errorData.error || errMsg;
      } catch {
        const text = await res.text();
        errMsg = text || errMsg;
      }
      throw new Error(errMsg);
    }

    const { user: newUser } = await res.json();
    setUser(newUser);
    setSessionExpired(false);
    void loadRoster(newUser);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...data }),
    });

    if (!res.ok) {
      let errMsg = 'Failed to update profile';
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {
        const text = await res.text();
        errMsg = text || errMsg;
      }
      throw new Error(errMsg);
    }

    const { user: updated } = await res.json();
    setUser(updated);
    void loadRoster(updated);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the call fails, drop local state; the cookie expires regardless.
    }
    setUser(null);
    setTeamRoster([]);
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        teamRoster,
        isOffline,
        sessionExpired,
        login,
        register,
        updateProfile,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
