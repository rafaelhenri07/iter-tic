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
  ScrollText,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useAuth();
  const hasAdminAccess = user?.role === "ADMIN" || (user as any)?.nivel_acesso === "ADMIN";

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
        { label: "Base de Fornecedores", href: "/fornecedores", icon: <Briefcase size={20} /> },
        { label: "Catálogo", href: "/catalogo", icon: <Building2 size={20} /> },
      ],
    },
  ];

  const adminItems = [
    { label: "Equipe", href: "/equipe", icon: <Users size={16} /> },
    { label: "Estrutura Organizacional", href: "/admin/estrutura-organizacional", icon: <Building2 size={16} /> },
    { label: "Acessos do Sistema", href: "/admin?tab=acessos", icon: <ShieldCheck size={16} /> },
    { label: "Logs de Auditoria", href: "/admin?tab=auditoria", icon: <ScrollText size={16} /> },
    { label: "Configurações", href: "/configuracoes", icon: <Settings size={16} /> },
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
        {/* Rodapé da Sidebar */}
        {hasAdminAccess && (
          <div className="border-t border-slate-700/60 p-3 relative z-50">
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div
                  className={`absolute z-50 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl animate-in fade-in-50 slide-in-from-bottom-2 duration-200
                    ${isCollapsed 
                      ? "left-full ml-3 bottom-3 w-56" 
                      : "bottom-full left-3 right-3 mb-2"
                    }`}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-800/60 mb-1">
                    Painel Administrativo
                  </div>
                  <div className="space-y-0.5">
                    {adminItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className={`flex items-center rounded-lg px-2.5 py-2 text-sm transition-all duration-150
                            ${isActive 
                              ? "bg-slate-800 font-medium text-white" 
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                          <span className={`shrink-0 opacity-80 ${isActive ? "text-sidebar-accent" : ""}`}>
                            {item.icon}
                          </span>
                          <span className="ml-2.5 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex w-full items-center rounded-lg p-2.5 text-sidebar-fg transition-all duration-200 hover:bg-sidebar-hover hover:text-sidebar-fg-active
                ${isCollapsed ? "justify-center" : "justify-start"}`}
              title="Configurações & Admin"
            >
              <span className="shrink-0">
                <Settings size={20} className={`transition-transform duration-500 ${dropdownOpen ? "rotate-95 text-white" : ""}`} />
              </span>
              {!isCollapsed && (
                <span className="ml-3 text-sm font-medium">Configurações & Admin</span>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
