"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useConfig } from "@/components/providers/ConfigProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2, Bell, Sun, Moon, Monitor, Menu as MenuIcon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Shell do Dashboard — combina TopBar unificada + Sidebar + conteúdo.
 * Rotas públicas (ex: /login) renderizam apenas o children sem shell.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { config, loading } = useConfig();
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Rotas públicas não exibem o shell (Sidebar + TopBar)
  const isPublicRoute = pathname === "/login";
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  const primaryColor = config?.cor_primaria || "#6366f1";

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const ThemeIcon = !mounted
    ? Monitor
    : theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background"
      style={
        {
          "--brand-primary": primaryColor,
          "--sidebar-accent": primaryColor,
        } as React.CSSProperties
      }
    >
      {/* Faixa Superior (Top Bar White Label Unificada) */}
      <div className="flex h-14 shrink-0 flex-row items-center bg-slate-950 px-5 z-50 shadow-md">
        
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="mr-3 block rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <MenuIcon size={20} />
        </button>

        {/* Left Section: Branding */}
        <div className="flex items-center overflow-hidden">
          {config?.logo_url && (
            <img src={config.logo_url} alt="Logo" className="mr-3 h-8 w-auto object-contain" />
          )}
          <span className="truncate font-semibold text-white">
            {config?.nome_orgao || "Polícia Civil do Distrito Federal"}
          </span>
          <span className="hidden sm:inline mx-3 font-light text-slate-600">|</span>
          <span className="hidden sm:inline font-medium text-slate-300">ITER TIC</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Notificações"
          >
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-primary ring-2 ring-slate-950" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-2 rounded-lg p-2 text-sm text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white"
            aria-label="Alternar Tema"
            title="Alternar Tema"
          >
            <ThemeIcon size={18} className="transition-transform duration-300" />
          </button>

          {/* User avatar & menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-105 uppercase"
              aria-label="Perfil do usuário"
            >
              {user?.nome ? user.nome.charAt(0) : "U"}
            </button>
            
            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-xl z-50 animate-in slide-in-from-top-2">
                  <div className="px-2 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm font-medium text-white truncate">{user?.nome || "Usuário"}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email || "email@orgao.gov.br"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Sair do sistema
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background-secondary p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
