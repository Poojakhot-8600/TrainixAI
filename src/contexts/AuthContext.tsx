import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type UserRole = "trainee" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinDate: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: Record<string, User & { password: string }> = {
  "trainee@company.com": {
    id: "1",
    name: "Alex Johnson",
    email: "trainee@company.com",
    role: "trainee",
    password: "password",
    joinDate: "2026-04-01",
    department: "Engineering",
  },
  "admin@company.com": {
    id: "2",
    name: "Sarah Chen",
    email: "admin@company.com",
    role: "admin",
    password: "password",
    joinDate: "2024-01-15",
    department: "Learning & Development",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem("trainix_user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      sessionStorage.setItem("trainix_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("trainix_user");
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const found = MOCK_USERS[email];
    if (found && found.password === password) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
