import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "@/services/storageService";
import { apiClient } from "@/services/apiClient";

export interface UserContext {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  customInstructions?: string | null;
  isGuest?: boolean;
  githubToken?: string;
}

interface AuthContextType {
  user: UserContext | null;
  setUser: React.Dispatch<React.SetStateAction<UserContext | null>>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have a user in localStorage
    const savedUser = storageService.getItem("devengine_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }

    // We fetch user info in DevEngine/Landing anyway, but let's centralize the token check
    const checkAuth = async () => {
      const token = storageService.getSessionToken();
      if (token) {
        try {
          const userData = await apiClient.get<UserContext>("/api/auth/me");
          setUser(userData);
          storageService.setItem("devengine_user", JSON.stringify(userData));
        } catch (error) {
          console.error("Auth context failed to fetch user:", error);
          setUser(null);
          storageService.removeItem("devengine_user");
          storageService.removeSessionToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
