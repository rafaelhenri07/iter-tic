"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  FolderKanban,
  ClipboardCheck,
  Users,
  ChevronDown,
  X,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

/* ── Tipos ─────────────────────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface NavSection {
  title: string;
  icon: ReactNode;
  items: NavItem[];
}

/* ── Estrutura de navegação ────────────────────────────────────────────── */

const navigation: NavSection[] = [
  {
    title: "Painel de Indicadores",
    icon: <LayoutDashboard size={18} />,
    items: [
      { label: "Visão Geral", href: "/dashboard" },
    ],
  },
  {
    title: "Planejamento Estratégico",
    icon: <BookOpen size={18} />,
    items: [
      { label: "PDTIC", href: "/planejamento/pdtic" },
      { label: "PACC", href: "/planejamento/pacc" },
    ],
  },
  {
    title: "Projetos e Licitações",
    icon: <FolderKanban size={18} />,
    items: [
      { label: "Meus projetos", href: "/projetos" },
    ],
  },
  {
    title: "Execução e Fiscalização",
    icon: <ClipboardCheck size={18} />,
    items: [
      { label: "Gestão de Contratos", href: "/contratos" },
      { label: "Fabricantes", href: "/execucao/fabricantes" },
    ],
  },
  {
    title: "Gestão de Equipe",
    icon: <Users size={18} />,
    items: [
      { label: "Servidores", href: "/equipe" },
    ],
  },
];

/* ── Componente de seção colapsável ────────────────────────────────────── */

function SidebarSection({ section }: { section: NavSection }) {
  const pathname = usePathname();
  const isAnyChildActive = section.items.some((item) => pathname === item.href);
  const [open, setOpen] = useState(isAnyChildActive || true);

  return (
    <div className="mb-1">
      {/* Section header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs
                   font-semibold uppercase tracking-wider text-sidebar-section
                   transition-colors duration-200 hover:text-sidebar-fg-active"
      >
        <span className="opacity-70">{section.icon}</span>
        <span className="flex-1 text-left">{section.title}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>

      {/* Items */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-0.5 space-y-0.5 pl-3">
          {section.items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link flex items-center gap-2.5 rounded-lg px-3 py-2
                  text-sm transition-all duration-200
                  ${
                    isActive
                      ? "active bg-sidebar-hover font-medium text-sidebar-fg-active"
                      : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active"
                  }`}
              >
                {item.icon && (
                  <span className="opacity-60">{item.icon}</span>
                )}
                <span className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className={`${isActive ? "text-sidebar-accent" : "opacity-40"}`}
                  />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar principal ─────────────────────────────────────────────────── */

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar-bg
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl
                        bg-gradient-to-br from-brand-primary to-purple-500
                        shadow-lg shadow-brand-primary/25"
          >
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wide text-white">
              ITER TIC
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-section">
              Gestão de Licitações
            </span>
          </div>

          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-sidebar-fg transition-colors
                       hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {navigation.map((section) => (
            <SidebarSection key={section.title} section={section} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                          bg-gradient-to-br from-emerald-400 to-cyan-500
                          text-xs font-bold text-white"
            >
              U
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-fg-active">
                Usuário
              </span>
              <span className="truncate text-xs text-sidebar-section">
                usuario@pcdf.df.gov.br
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
