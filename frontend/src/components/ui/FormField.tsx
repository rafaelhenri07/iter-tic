"use client";

import { AlertCircle } from "lucide-react";

/* ── FormField reutilizável ────────────────────────────────────────────── */

export function FormField({
  label,
  error,
  required,
  icon,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ── CSS classes ────────────────────────────────────────────────────────── */

export const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground " +
  "placeholder:text-foreground-muted outline-none transition-all " +
  "focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const selectCls =
  "h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 text-sm text-foreground " +
  "outline-none transition-all " +
  "focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

/* ── Enum options ──────────────────────────────────────────────────────── */

import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";

export const TIPOS_NECESSIDADE = Object.entries(TIPO_NECESSIDADE_LABEL) as [
  string,
  string,
][];

export const STATUS_OPTIONS = [
  "Não iniciada",
  "Em andamento",
  "Contratada",
] as const;
