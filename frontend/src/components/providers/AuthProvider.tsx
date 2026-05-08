"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: string;
  is_active: boolean;
  servidor_id: number | null;
}

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  logout: () => void;
  /** Atualiza o usuário no contexto (usado pelo login) */
  setUser: (user: Usuario) => void;
  /** Verifica se o usuário é administrador */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  setUser: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Tenta carregar o usuário do cookie
    const userCookie = Cookies.get("itertic_user");
    if (userCookie) {
      try {
        const parsedUser = JSON.parse(userCookie);
        setUserState(parsedUser);
      } catch (error) {
        console.error("Erro ao fazer parse do usuário do cookie", error);
        Cookies.remove("itertic_user");
      }
    }
    setLoading(false);
  }, []);

  const setUser = (newUser: Usuario) => {
    setUserState(newUser);
    Cookies.set("itertic_user", JSON.stringify(newUser), { expires: 7 });
  };

  const logout = () => {
    Cookies.remove("itertic_token");
    Cookies.remove("itertic_user");
    setUserState(null);
    router.push("/login");
  };

  const isAdmin = user?.role === "ADMIN";

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
