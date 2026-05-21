"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SingleSelectOption {
  value: string | number;
  label: string;
}

interface SingleSelectComboboxProps {
  options: SingleSelectOption[];
  value: string | number | undefined | null;
  onChange: (value: string | number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SingleSelectCombobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
}: SingleSelectComboboxProps) {
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

  const handleSelect = (optValue: string | number) => {
    if (value === optValue) {
      onChange(undefined); // Deselect if clicking the same item
    } else {
      onChange(optValue);
    }
    setOpen(false);
    setSearch("");
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

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
          <span className={`flex-1 truncate text-left ${selectedOption ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
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
              autoFocus
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
                const isSelected = value === opt.value;
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
                      handleSelect(opt.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(opt.value);
                      }
                    }}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
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
    </div>
  );
}
