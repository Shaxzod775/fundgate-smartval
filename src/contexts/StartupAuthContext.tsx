import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { CRM_API_BASE_URL as API_BASE_URL } from '../services/api';

interface StartupAuthContextType {
  token: string | null;
  startup: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
}

const StartupAuthContext = createContext<StartupAuthContextType | undefined>(undefined);

interface StartupAuthProviderProps {
  children: ReactNode;
}

export const StartupAuthProvider = ({ children }: StartupAuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [startup, setStartup] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedToken = localStorage.getItem('startup_cabinet_token');
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/cabinet/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setToken(storedToken);
            setStartup(data.data);
          } else {
            localStorage.removeItem('startup_cabinet_token');
          }
        } else {
          localStorage.removeItem('startup_cabinet_token');
        }
      } catch {
        localStorage.removeItem('startup_cabinet_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, []);

  const login = async (loginId: string, password: string): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/cabinet/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      const { token: newToken, startup: startupData } = data.data;

      localStorage.setItem('startup_cabinet_token', newToken);
      setToken(newToken);
      setStartup(startupData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('startup_cabinet_token');
    setToken(null);
    setStartup(null);
  };

  const isAuthenticated = !!token && !!startup;

  return (
    <StartupAuthContext.Provider value={{ token, startup, isAuthenticated, isLoading, login, logout }}>
      {children}
    </StartupAuthContext.Provider>
  );
};

export const useStartupAuth = () => {
  const context = useContext(StartupAuthContext);
  if (context === undefined) {
    throw new Error('useStartupAuth must be used within a StartupAuthProvider');
  }
  return context;
};
