"use client";

import { useState, useRef, useEffect } from "react";
import { format, parse, isValid, setYear, setMonth, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

interface MonthYearPickerProps {
  value?: string | null; // Format: "MM/YYYY"
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const YEAR_START = 2020;
const YEAR_END = 2040;

function parseMMYYYY(val: string | null | undefined): Date | undefined {
  if (!val) return undefined;
  const d = parse(val, "MM/yyyy", new Date());
  return isValid(d) ? d : undefined;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Selecione Mês/Ano",
  disabled,
  id,
}: MonthYearPickerProps) {
  const selectedDate = parseMMYYYY(value);
  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(selectedDate ? getYear(selectedDate) : new Date().getFullYear());
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate) {
      setDisplayYear(getYear(selectedDate));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleMonthSelect = (monthIndex: number) => {
    let d = new Date();
    d = setYear(d, displayYear);
    d = setMonth(d, monthIndex);
    onChange(format(d, "MM/yyyy"));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={[
          "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all duration-150 h-10",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900"
            : "cursor-pointer border-slate-200 bg-white hover:bg-slate-50 focus:outline-none dark:border-slate-700 dark:bg-background dark:hover:bg-slate-800/50",
          open ? "border-slate-300 ring-2 ring-slate-100 dark:border-slate-600 dark:ring-slate-800" : "",
        ].join(" ")}
      >
        <CalendarDays size={16} className={`shrink-0 ${selectedDate ? "text-slate-700 dark:text-slate-300" : "text-slate-400"}`} />
        <span className={`flex-1 text-left text-sm ${selectedDate ? "text-foreground font-medium" : "text-slate-400"}`}>
          {selectedDate ? format(selectedDate, "MM/yyyy", { locale: ptBR }) : placeholder}
        </span>
        {selectedDate && !disabled && (
          <X size={14} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={handleClear} />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-2xl border border-border bg-background-card shadow-2xl shadow-black/25 dark:shadow-black/60 p-3"
          style={{ animation: "calendarIn 0.15s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => setDisplayYear((y) => Math.max(YEAR_START, y - 1))}
              disabled={displayYear <= YEAR_START}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-foreground">{displayYear}</span>
            <button
              type="button"
              onClick={() => setDisplayYear((y) => Math.min(YEAR_END, y + 1))}
              disabled={displayYear >= YEAR_END}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid de Meses */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS_PT.map((m, i) => {
              const isSelected = selectedDate && getYear(selectedDate) === displayYear && getMonth(selectedDate) === i;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMonthSelect(i)}
                  className={[
                    "flex h-9 w-full items-center justify-center rounded-lg text-sm font-semibold capitalize transition-all",
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
