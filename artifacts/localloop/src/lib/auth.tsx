import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCreateUser, useGetUser } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const createUserMutation = useCreateUser();

  // Try to load user from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('localloop_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as User;
        setLocalUser(parsed);
      } catch (e) {
        localStorage.removeItem('localloop_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Sync with server to get the latest user data (and satisfy useGetUser requirement)
  const { data: serverUser } = useGetUser(localUser?.id as number, { 
    query: { enabled: !!localUser?.id } 
  });

  const user = serverUser || localUser;

  // Update local storage if server user changes
  useEffect(() => {
    if (serverUser) {
      localStorage.setItem('localloop_user', JSON.stringify(serverUser));
      setLocalUser(serverUser);
    }
  }, [serverUser]);

  const login = async (username?: string) => {
    setIsLoading(true);
    try {
      const newUser = await createUserMutation.mutateAsync({ data: { username } });
      setLocalUser(newUser);
      localStorage.setItem('localloop_user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Failed to create user', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setLocalUser(null);
    localStorage.removeItem('localloop_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
