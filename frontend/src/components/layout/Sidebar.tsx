"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FolderKanban,
  ClipboardCheck,
  Building2,
  Users,
  Settings,
  X,
  Menu,
  Search,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

/* ── Tipos ─────────────────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

/* ── Estrutura de navegação (Flat) ─────────────────────────────────────── */

const navigation: NavItem[] = [
  { label: "Painel de Indicadores", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
  { label: "PDTIC", href: "/planejamento/pdtic", icon: <BookOpen size={20} /> },
  { label: "PACC", href: "/planejamento/pacc", icon: <ClipboardList size={20} /> },
  { label: "Meus Projetos", href: "/projetos", icon: <FolderKanban size={20} /> },
  { label: "Gestão de Contratos", href: "/contratos", icon: <ClipboardCheck size={20} /> },
  { label: "Fabricantes", href: "/execucao/fabricantes", icon: <Building2 size={20} /> },
  { label: "Servidores", href: "/equipe", icon: <Users size={20} /> },
  { label: "Configurações", href: "/configuracoes", icon: <Settings size={20} /> },
];

/* ── Sidebar principal ─────────────────────────────────────────────────── */

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar-bg
          transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isCollapsed ? "lg:w-20" : "lg:w-72"}
          ${open ? "translate-x-0 w-72" : "-translate-x-full w-72"}
        `}
      >
        {/* Top actions (Hamburger / Close) */}
        <div className="flex items-center justify-end px-4 pt-4">
          {/* Desktop Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block rounded-lg p-2 text-sidebar-fg transition-colors hover:text-white"
            aria-label="Alternar menu"
          >
            <Menu size={20} />
          </button>
          
          {/* Mobile Close */}
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-2 text-sidebar-fg transition-colors hover:text-white"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Busca Integrada */}
        <div className="px-4 py-4">
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex w-full justify-center rounded-lg p-2 text-sidebar-fg transition-colors hover:bg-white/5 hover:text-white"
              title="Buscar"
            >
              <Search size={20} />
            </button>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-section" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm text-white placeholder-sidebar-section transition-colors focus:border-brand-primary focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link flex items-center rounded-lg px-3 py-2.5 transition-all duration-200
                  ${isActive ? "active bg-sidebar-hover font-medium text-sidebar-fg-active" : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active"}
                  ${isCollapsed ? "justify-center" : "justify-start"}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={`shrink-0 ${isActive ? "text-sidebar-accent" : "opacity-80"}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="ml-3 truncate text-sm">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
