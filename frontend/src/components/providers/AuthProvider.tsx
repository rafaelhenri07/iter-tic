"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  is_active: boolean;
}

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Tenta carregar o usuário do cookie
    const userCookie = Cookies.get("itertic_user");
    if (userCookie) {
      try {
        const parsedUser = JSON.parse(userCookie);
        setUser(parsedUser);
      } catch (error) {
        console.error("Erro ao fazer parse do usuário do cookie", error);
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    Cookies.remove("itertic_token");
    Cookies.remove("itertic_user");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
