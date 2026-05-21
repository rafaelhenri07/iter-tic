"use client";

import { useState, useRef, useEffect } from "react";
import { format, parse, isValid, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────── */

type ViewMode = "months" | "years";

interface MonthYearPickerProps {
  value?: string | null; // Formato esperado: "YYYY-MM"
  onChange: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  id?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const YEAR_START = 2010;
const YEAR_END   = 2042;
const YEARS      = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

function parseMonthYear(str: string | null | undefined): Date | undefined {
  if (!str) return undefined;
  // Parse "YYYY-MM"
  const d = parse(str, "yyyy-MM", new Date());
  return isValid(d) ? d : undefined;
}

function toYYYYMM(year: number, month: number): string {
  const m = (month + 1).toString().padStart(2, "0");
  return `${year}-${m}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────────────────────── */

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Selecione o mês/ano",
  disabled = false,
  label,
  required,
  id,
}: MonthYearPickerProps) {
  const selected = parseMonthYear(value);

  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("months");
  const [displayYear, setDisplayYear] = useState<number>(selected ? getYear(selected) : new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);
  const yearsContainerRef = useRef<HTMLDivElement>(null);

  /* ── Auto-scroll para o ano atual quando abre a visão de anos ── */
  useEffect(() => {
    if (viewMode === "years" && yearsContainerRef.current) {
      // setTimeout garante que o render do DOM finalizou
      setTimeout(() => {
        const container = yearsContainerRef.current;
        if (!container) return;
        const targetBtn = container.querySelector(`[data-year="${displayYear}"]`) as HTMLButtonElement;
        if (targetBtn) {
          targetBtn.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 10);
    }
  }, [viewMode, displayYear]);

  /* ── Sincroniza displayYear quando o valor externo muda ── */
  useEffect(() => {
    if (selected) setDisplayYear(getYear(selected));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Reset view ao abrir ── */
  useEffect(() => {
    if (open) setViewMode("months");
  }, [open]);

  /* ── Fechar ao clicar fora ── */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  /* ── Fechar no Escape ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* ── Handlers ── */
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleMonthClick = (monthIndex: number) => {
    onChange(toYYYYMM(displayYear, monthIndex));
    setOpen(false);
  };

  const handleYearClick = (year: number) => {
    setDisplayYear(year);
    setViewMode("months");
  };

  const toggleCaptionView = () => {
    setViewMode((v) => (v === "months" ? "years" : "months"));
  };

  const currentMonthIndex = selected ? getMonth(selected) : -1;
  const currentYear = selected ? getYear(selected) : -1;

  /* ────────────────────────────────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────────────────────────────── */
  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Label ── */}
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-foreground-muted"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}

      {/* ── Trigger button ── */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={[
          "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all duration-150",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900"
            : "cursor-pointer border-slate-200 bg-white hover:bg-slate-50 focus:outline-none dark:border-slate-700 dark:bg-background dark:hover:bg-slate-800/50",
          open ? "border-slate-300 ring-2 ring-slate-100 dark:border-slate-600 dark:ring-slate-800" : "",
        ].join(" ")}
      >
        <CalendarDays size={14} className={`shrink-0 ${selected ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}`} />
        <span className={`flex-1 text-left text-sm ${selected ? "text-foreground font-medium" : "text-slate-400"}`}>
          {selected ? format(selected, "MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
        </span>
        {selected && !disabled && (
          <X size={13} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={handleClear} />
        )}
      </button>

      {/* ── Popover ── */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-72 overflow-hidden rounded-2xl border border-border bg-background-card shadow-2xl shadow-black/25 dark:shadow-black/60"
          style={{ animation: "calendarIn 0.15s ease-out" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <button
              type="button"
              onClick={() => {
                if (viewMode === "months") setDisplayYear((y) => y - 1);
                if (viewMode === "years")  setDisplayYear((y) => y - 12);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              onClick={toggleCaptionView}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold capitalize text-foreground hover:bg-background-secondary transition-colors"
            >
              {viewMode === "months" && displayYear}
              {viewMode === "years"  && `${YEAR_START} – ${YEAR_END}`}
              <ChevronDown
                size={13}
                className={`text-foreground-muted transition-transform ${viewMode !== "months" ? "rotate-180" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                if (viewMode === "months") setDisplayYear((y) => y + 1);
                if (viewMode === "years")  setDisplayYear((y) => y + 12);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* ════════════════════════════════════════════════════════════════
            * VIEW: MONTHS — grade 3×4
            * ══════════════════════════════════════════════════════════════ */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-1">
              {MONTHS_PT.map((m, i) => {
                const isSelected = selected && displayYear === currentYear && currentMonthIndex === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthClick(i)}
                    className={[
                      "flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold capitalize transition-all",
                      isSelected
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                        : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
            * VIEW: YEARS — grade com scroll
            * ══════════════════════════════════════════════════════════════ */}
          {viewMode === "years" && (
            <div ref={yearsContainerRef} className="max-h-52 overflow-y-auto px-4 pb-4 pt-1 scrollbar-thin">
              <div className="grid grid-cols-3 gap-2">
                {YEARS.map((yr) => {
                  const isSelected = selected && currentYear === yr;
                  const isCurrentDisplay = displayYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      data-year={yr}
                      onClick={() => handleYearClick(yr)}
                      className={[
                        "flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all",
                        isSelected
                          ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                          : isCurrentDisplay
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                            : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes calendarIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
