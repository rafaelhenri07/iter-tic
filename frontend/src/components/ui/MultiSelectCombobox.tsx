"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (optValue: string | number) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // O texto exibido no trigger é sempre o placeholder (ação)
  const displayText = placeholder;

  return (
    <div className="w-full">
      <div className="relative w-full" ref={containerRef}>
        {/* TRIGGER */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`flex w-full min-h-[40px] items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500
            ${
              disabled
                ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900"
                : "cursor-pointer border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-background dark:hover:bg-slate-800/50"
            }
            ${open ? "border-emerald-500 ring-1 ring-emerald-500 dark:border-emerald-500 dark:ring-emerald-500" : ""}
          `}
        >
          <span className="flex-1 truncate text-left text-slate-500 dark:text-slate-400">
            {displayText}
          </span>
          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </div>
        </button>

      {/* POPOVER */}
      {open && (
        <div
          className="absolute z-50 top-[calc(100%+4px)] left-0 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-100"
        >
          {/* Busca */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Lista de Opções */}
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum resultado encontrado.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-3 rounded-sm px-2 py-2 text-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                      ${
                        isSelected
                          ? "bg-emerald-50/50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(opt.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle(opt.value);
                      }
                    }}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className="truncate flex-1" title={opt.label}>{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      </div>

      {/* SELECTED ITEMS VERTICAL LIST */}
      {value.length > 0 && (
        <div className="flex flex-col gap-2 mt-3 w-full">
          {value.map((val) => {
            const opt = options.find((o) => o.value === val);
            if (!opt) return null;
            return (
              <div
                key={val}
                className="flex items-center justify-between w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 shadow-sm"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {opt.label}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(val);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    title="Remover"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
