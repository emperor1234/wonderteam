import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, OfficeLocation } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  availableUsers: User[];
  isOffline: boolean;
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
  switchUser: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch available users:', err);
    }
    return [];
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const users = await refreshUsers();
        // Check local storage for stored user id
        const storedUserId = localStorage.getItem('greenline_user_id');
        if (storedUserId && users.length > 0) {
          const found = users.find((u: User) => u.id === storedUserId);
          if (found) {
            setUser(found);
          } else {
            // Default to first member (Amara Okafor)
            setUser(users[0]);
            localStorage.setItem('greenline_user_id', users[0].id);
          }
        } else if (users.length > 0) {
          setUser(users[0]);
          localStorage.setItem('greenline_user_id', users[0].id);
        }
      } catch (err) {
        console.error('Initialization error in AuthProvider:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email: string, password = 'password123') => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to sign in');
    }

    const { user: authedUser } = await res.json();
    setUser(authedUser);
    localStorage.setItem('greenline_user_id', authedUser.id);
    await refreshUsers();
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
      const errorData = await res.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    const { user: newUser } = await res.json();
    setUser(newUser);
    localStorage.setItem('greenline_user_id', newUser.id);
    await refreshUsers();
  };

  const switchUser = async (userId: string) => {
    const target = availableUsers.find((u) => u.id === userId);
    if (target) {
      setUser(target);
      localStorage.setItem('greenline_user_id', target.id);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...data }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }

    const { user: updated } = await res.json();
    setUser(updated);
    localStorage.setItem('greenline_user_id', updated.id);
    await refreshUsers();
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('greenline_user_id');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        availableUsers,
        isOffline,
        login,
        register,
        switchUser,
        updateProfile,
        logout,
        refreshUsers,
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
