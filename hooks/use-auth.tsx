'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'Admin' | 'HR' | 'Employee';

// Added organizationId to the User interface to support organization-based data filtering
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  organizationId?: string;
  organizationName?: string;
  organizationDb?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, organizationName: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('zing_user');
    const savedToken = localStorage.getItem('zing_token');
    
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const register = async (name: string, email: string, password: string, organizationName: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organizationName }),
      });
      const data = await response.json();
      
      if (response.ok) {
        const { user: userData, token } = data;
        localStorage.setItem('zing_token', token);
        localStorage.setItem('zing_user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Server error during registration' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        const { user: userData, token } = data;
        localStorage.setItem('zing_token', token);
        localStorage.setItem('zing_user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Server connection failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('zing_token');
    localStorage.removeItem('zing_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
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
