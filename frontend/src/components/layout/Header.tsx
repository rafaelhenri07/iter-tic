"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Search,
  Menu,
} from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  const themeLabel = !mounted
    ? "Sistema"
    : theme === "system"
      ? "Sistema"
      : theme === "dark"
        ? "Escuro"
        : "Claro";

  return (
    <header
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b
                 border-header-border bg-header-bg px-4 backdrop-blur-xl
                 transition-colors duration-300 lg:px-6"
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-foreground-muted transition-colors
                   hover:bg-background-secondary hover:text-foreground lg:hidden"
        aria-label="Abrir menu lateral"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
        />
        <input
          type="text"
          placeholder="Buscar..."
          className="h-9 w-full rounded-lg border border-border bg-background-secondary
                     pl-9 pr-4 text-sm text-foreground placeholder:text-foreground-muted
                     outline-none transition-all duration-200
                     focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-foreground-muted transition-colors
                     hover:bg-background-secondary hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell size={18} />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full
                       bg-brand-primary ring-2 ring-header-bg"
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm
                     text-foreground-muted transition-all duration-200
                     hover:bg-background-secondary hover:text-foreground"
          aria-label={`Tema: ${themeLabel}. Clique para alternar.`}
          title={`Tema: ${themeLabel}`}
        >
          <ThemeIcon size={18} className="transition-transform duration-300" />
          <span className="hidden sm:inline">{themeLabel}</span>
        </button>

        {/* User avatar */}
        <button
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full
                     bg-brand-primary text-sm font-semibold text-white
                     transition-transform duration-200 hover:scale-105"
          aria-label="Perfil do usuário"
        >
          U
        </button>
      </div>
    </header>
  );
}
