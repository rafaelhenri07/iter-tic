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
  Briefcase,
  Users,
  Settings,
  X,
  Menu,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

/* ── Tipos ─────────────────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

/* ── Sidebar principal ─────────────────────────────────────────────────── */

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, isAdmin } = useAuth();

  // Monta a lista de nav agrupada dinamicamente
  const navGroups: NavGroup[] = [
    {
      items: [
        { label: "Painel de Indicadores", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
      ],
    },
    {
      title: "Planejamento Estratégico",
      items: [
        { label: "PDTIC", href: "/planejamento/pdtic", icon: <BookOpen size={20} /> },
        { label: "PACC", href: "/planejamento/pacc", icon: <ClipboardList size={20} /> },
      ],
    },
    {
      title: "Gestão e Execução",
      items: [
        { label: "Projetos", href: "/projetos", icon: <FolderKanban size={20} /> },
        { label: "Contratos", href: "/contratos", icon: <ClipboardCheck size={20} /> },
      ],
    },
    {
      title: "Fornecedores",
      items: [
        { label: "Empresas", href: "/empresas", icon: <Briefcase size={20} /> },
        { label: "Fabricantes", href: "/execucao/fabricantes", icon: <Building2 size={20} /> },
      ],
    },
    {
      title: "Estrutura Interna",
      items: [
        { label: "Servidores", href: "/equipe", icon: <Users size={20} /> },
        ...(isAdmin
          ? [{ label: "Estrutura Org.", href: "/admin/estrutura-organizacional", icon: <Building2 size={20} /> }]
          : []),
      ],
    },
    {
      title: "Sistema",
      items: [
        { label: "Configurações", href: "/configuracoes", icon: <Settings size={20} /> },
        ...(isAdmin
          ? [{ label: "Administração", href: "/admin", icon: <ShieldCheck size={20} /> }]
          : []),
      ],
    },
  ];

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



        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && !isCollapsed && (
                <div className="mt-6 mb-2 mx-3 border-b border-slate-700/60 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.title}
                </div>
              )}
              {group.title && isCollapsed && (
                <div className="mt-6 mb-2 border-t border-white/10" />
              )}
              
              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
