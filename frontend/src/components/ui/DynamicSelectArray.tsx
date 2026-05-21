"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { selectCls } from "@/components/ui/FormField";

export interface Option {
  value: string | number;
  label: string;
}

interface DynamicSelectArrayProps {
  options: Option[];
  value: (string | number)[];
  onChange: (val: any[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DynamicSelectArray({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
}: DynamicSelectArrayProps) {
  const [rows, setRows] = useState<(string | number)[]>(value.length > 0 ? value : [""]);

  // Sincroniza estado interno com o React Hook Form
  useEffect(() => {
    const validRows = rows.filter((v) => v !== "" && v !== 0);
    const valueString = value.join(",");
    const rowsString = validRows.join(",");

    if (valueString !== rowsString) {
      setRows(value.length > 0 ? value : [""]);
    }
  }, [value, rows]);

  const updateRow = (index: number, rawValue: string) => {
    const newRows = [...rows];
    const isNumber = options.length > 0 && typeof options[0].value === "number";
    const newValue = isNumber ? Number(rawValue) : rawValue;
    
    newRows[index] = newValue;
    setRows(newRows);
    onChange(newRows.filter((v) => v !== "" && v !== 0));
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);

    if (newRows.length === 0) {
      newRows.push("");
    }

    setRows(newRows);
    onChange(newRows.filter((v) => v !== "" && v !== 0));
  };

  const addRow = () => {
    setRows([...rows, ""]);
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.map((rowValue, index) => {
        // Filtrar opções já selecionadas em OUTRAS caixas para evitar duplicidade
        const availableOptions = options.filter(
          (opt) => opt.value === rowValue || !rows.includes(opt.value)
        );

        return (
          <div key={`${index}-${rowValue}`} className="flex items-center gap-1.5">
            <select
              value={rowValue === 0 || rowValue === "" ? "" : String(rowValue)}
              onChange={(e) => {
                updateRow(index, e.target.value);
              }}
              disabled={disabled}
              title={rowValue === 0 || rowValue === "" ? "" : options.find(o => o.value === rowValue)?.label}
              className={`${selectCls} flex-1 text-[13px]`}
            >
              <option value="">{placeholder}</option>
              {availableOptions.map((opt) => (
                <option key={opt.value} value={String(opt.value)} title={opt.label} className="text-[13px]">
                  {opt.label}
                </option>
              ))}
            </select>

            {index === 0 ? (
              <button
                type="button"
                onClick={addRow}
                disabled={disabled}
                className="w-8 h-8 shrink-0 flex items-center justify-center text-emerald-600/70 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                title="Adicionar novo"
              >
                <Plus size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="w-8 h-8 shrink-0 flex items-center justify-center text-red-500/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Remover"
              >
                <X size={18} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
