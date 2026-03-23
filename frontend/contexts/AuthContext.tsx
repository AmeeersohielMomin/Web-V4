import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { useRouter } from 'next/router';
import api from '@/lib/api';
import {
  AUTH_USER_KEY,
  clearAuthStorage,
  getToken,
  setStoredUser,
  setToken
} from '@/lib/auth';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  plan?: string;
  role?: string;
  avatar?: string;
  teamId?: string;
  teamRole?: string;
  generationsUsed?: number;
  generationsLimit?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
    inviteToken?: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(raw: any): AuthUser {
  return {
    id: String(raw.id || raw._id || ''),
    email: String(raw.email || ''),
    name: raw.name || '',
    plan: raw.plan || 'free',
    role: raw.role || 'user',
    avatar: raw.avatar || '',
    teamId: raw.teamId || undefined,
    teamRole: raw.teamRole || undefined,
    generationsUsed:
      typeof raw.generationsUsed === 'number' ? raw.generationsUsed : undefined,
    generationsLimit:
      typeof raw.generationsLimit === 'number' ? raw.generationsLimit : undefined
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    const response = await api.get('/api/platform/auth/me');
    const nextUser = normalizeUser(response.data?.data?.user || {});
    setUser(nextUser);
    setStoredUser(nextUser);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const token = getToken();
      if (!token) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem(AUTH_USER_KEY);
        if (cachedUser && mounted) {
          try {
            const parsed = JSON.parse(cachedUser);
            setUser(normalizeUser(parsed));
          } catch {
            localStorage.removeItem(AUTH_USER_KEY);
          }
        }
      }

      try {
        await refreshUser();
      } catch {
        clearAuthStorage();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/api/platform/auth/login', { email, password });
    const token = response.data?.data?.token;
    const rawUser = response.data?.data?.user;

    if (!token || !rawUser) {
      throw new Error('Invalid login response');
    }

    const nextUser = normalizeUser(rawUser);
    setToken(token);
    setStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmPassword?: string,
      inviteToken?: string
    ) => {
      const response = await api.post('/api/platform/auth/register', {
        name,
        email,
        password,
        confirmPassword: confirmPassword ?? password,
        inviteToken: inviteToken || undefined
      });
      const token = response.data?.data?.token;
      const rawUser = response.data?.data?.user;

      if (!token || !rawUser) {
        throw new Error('Invalid register response');
      }

      const nextUser = normalizeUser(rawUser);
      setToken(token);
      setStoredUser(nextUser);
      setUser(nextUser);
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    void router.push('/');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser
    }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
