import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("nexora_token");
    const storedUser = localStorage.getItem("nexora_user");
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("nexora_token");
        localStorage.removeItem("nexora_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("nexora_token", newToken);
    localStorage.setItem("nexora_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
