import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AUTH_EXPIRED_EVENT, authApi, LEGACY_CRM_AUTH_PREFIX, Manager, Organization } from '../services/api';

interface AuthState {
  manager: Manager | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateManager: (data: Partial<Manager>) => void;
  updateOrganization: (data: Partial<Organization>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>({
    manager: null,
    organization: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const clearAuthState = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('manager');
    localStorage.removeItem('organization');
    setState({
      manager: null,
      organization: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedManager = localStorage.getItem('manager');
        const storedOrganization = localStorage.getItem('organization');
        const storedToken = localStorage.getItem('authToken');

        if (storedManager && storedToken) {
          setState({
            manager: JSON.parse(storedManager),
            organization: storedOrganization ? JSON.parse(storedOrganization) : null,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          clearAuthState();
        }
      } catch {
        clearAuthState();
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuthState();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  const login = async (userLogin: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await authApi.login(userLogin, password);

      if (response.success && response.data) {
        const { manager, organization } = response.data;
        const token = response.data.accessToken || response.data.authToken || `${LEGACY_CRM_AUTH_PREFIX}${manager.id}`;
        localStorage.setItem('authToken', token);
        localStorage.setItem('manager', JSON.stringify(manager));
        localStorage.setItem('organization', JSON.stringify(organization));
        setState({
          manager,
          organization,
          isLoading: false,
          isAuthenticated: true,
        });
        return true;
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = () => {
    clearAuthState();
  };

  const refreshUser = async () => {
    if (!state.manager) return;
    if (!localStorage.getItem('authToken')) {
      logout();
      return;
    }

    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        const { manager, organization } = response.data;
        localStorage.setItem('manager', JSON.stringify(manager));
        if (organization) {
          localStorage.setItem('organization', JSON.stringify(organization));
        }
        setState(prev => ({
          ...prev,
          manager,
          organization,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const updateManager = (data: Partial<Manager>) => {
    if (state.manager) {
      const updatedManager = { ...state.manager, ...data };
      localStorage.setItem('manager', JSON.stringify(updatedManager));
      setState(prev => ({
        ...prev,
        manager: updatedManager,
      }));
    }
  };

  const updateOrganization = (data: Partial<Organization>) => {
    if (state.organization) {
      const updatedOrganization = { ...state.organization, ...data };
      localStorage.setItem('organization', JSON.stringify(updatedOrganization));
      setState(prev => ({
        ...prev,
        organization: updatedOrganization,
      }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, updateManager, updateOrganization }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
