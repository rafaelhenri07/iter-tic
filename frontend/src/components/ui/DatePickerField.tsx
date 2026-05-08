"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import {
  format,
  parseISO,
  isValid,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  getYear,
  getMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import "react-day-picker/style.css";

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────── */

type ViewMode = "days" | "months" | "years";

interface DatePickerFieldProps {
  value?: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
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

function parseDate(str: string | null | undefined): Date | undefined {
  if (!str) return undefined;
  const d = parseISO(str);
  return isValid(d) ? d : undefined;
}

function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────────────────────── */

export function DatePickerField({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  minDate,
  maxDate,
  label,
  required,
  id,
}: DatePickerFieldProps) {
  const selected     = parseDate(value);
  const fromDate     = parseDate(minDate);
  const toDate       = parseDate(maxDate);

  const [open, setOpen]               = useState(false);
  const [viewMode, setViewMode]       = useState<ViewMode>("days");
  const [displayMonth, setDisplayMonth] = useState<Date>(selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Sincroniza displayMonth quando o valor externo muda ── */
  useEffect(() => {
    if (selected) setDisplayMonth(selected);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Reset view ao abrir ── */
  useEffect(() => {
    if (open) setViewMode("days");
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
  const handleDaySelect = useCallback((day: Date | undefined) => {
    if (!day) return;
    onChange(toYMD(day));
    setOpen(false);
  }, [onChange]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleMonthClick = (monthIndex: number) => {
    const next = setMonth(displayMonth, monthIndex);
    setDisplayMonth(next);
    setViewMode("days");
  };

  const handleYearClick = (year: number) => {
    const next = setYear(displayMonth, year);
    setDisplayMonth(next);
    setViewMode("months");
  };

  const toggleCaptionView = () => {
    setViewMode((v) => (v === "days" ? "months" : v === "months" ? "years" : "days"));
  };

  const currentYear  = getYear(displayMonth);
  const currentMonth = getMonth(displayMonth); // 0-indexed

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
          {selected ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
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
          {/* ── Custom header (shared across all views) ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {/* Prev button */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === "days")   setDisplayMonth((d) => subMonths(d, 1));
                if (viewMode === "months") setDisplayMonth((d) => setYear(d, getYear(d) - 1));
                if (viewMode === "years")  setDisplayMonth((d) => setYear(d, getYear(d) - 12));
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Caption — clickable label to switch views */}
            <button
              type="button"
              onClick={toggleCaptionView}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold capitalize text-foreground hover:bg-background-secondary transition-colors"
            >
              {viewMode === "days"   && format(displayMonth, "MMMM yyyy", { locale: ptBR })}
              {viewMode === "months" && format(displayMonth, "yyyy")}
              {viewMode === "years"  && `${YEAR_START} – ${YEAR_END}`}
              <ChevronDown
                size={13}
                className={`text-foreground-muted transition-transform ${viewMode !== "days" ? "rotate-180" : ""}`}
              />
            </button>

            {/* Next button */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === "days")   setDisplayMonth((d) => addMonths(d, 1));
                if (viewMode === "months") setDisplayMonth((d) => setYear(d, getYear(d) + 1));
                if (viewMode === "years")  setDisplayMonth((d) => setYear(d, getYear(d) + 12));
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* ════════════════════════════════════════════════════════════════
            * VIEW: DAYS — usa DayPicker sem cabeçalho (hideNavigation)
            * ══════════════════════════════════════════════════════════════ */}
          {viewMode === "days" && (
            <div className="px-3 pb-3">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleDaySelect}
                locale={ptBR}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                hideNavigation
                fromDate={fromDate}
                toDate={toDate}
                classNames={{
                  root: "",
                  months: "flex flex-col",
                  month_caption: "hidden",
                  nav: "hidden",
                  month_grid: "w-full border-collapse",
                  weekdays: "flex",
                  weekday: "w-9 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-foreground-muted",
                  week: "flex mt-1",
                  day: "w-9 h-9 flex items-center justify-center",
                  day_button: [
                    "w-8 h-8 rounded-full text-sm font-medium text-foreground transition-all",
                    "hover:bg-violet-100 hover:text-violet-700",
                    "dark:hover:bg-violet-900/30 dark:hover:text-violet-300",
                    "focus:outline-none focus:ring-2 focus:ring-violet-500/40",
                  ].join(" "),
                  selected: "[&>button]:!bg-violet-600 [&>button]:!text-white [&>button]:!hover:bg-violet-700",
                  today: "[&>button]:font-extrabold [&>button]:text-violet-600 dark:[&>button]:text-violet-400",
                  outside: "opacity-30",
                  disabled: "opacity-20 pointer-events-none",
                }}
              />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
            * VIEW: MONTHS — grade 3×4
            * ══════════════════════════════════════════════════════════════ */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-1">
              {MONTHS_PT.map((m, i) => {
                const isSelected =
                  selected && getYear(selected) === currentYear && getMonth(selected) === i;
                const isCurrent = currentMonth === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthClick(i)}
                    className={[
                      "flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold capitalize transition-all",
                      isSelected
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                        : isCurrent
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
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
            <div className="max-h-52 overflow-y-auto px-4 pb-4 pt-1 scrollbar-thin">
              <div className="grid grid-cols-3 gap-2">
                {YEARS.map((yr) => {
                  const isSelected = selected && getYear(selected) === yr;
                  const isCurrent  = currentYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleYearClick(yr)}
                      className={[
                        "flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all",
                        isSelected
                          ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
                          : isCurrent
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

      {/* ── Keyframe animation ── */}
      <style>{`
        @keyframes calendarIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
