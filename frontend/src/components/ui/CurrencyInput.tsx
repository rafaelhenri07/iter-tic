"use client";

import React, { useState, useEffect } from "react";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: number;
  onChange?: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    // Sincroniza o valor inicial/externo
    useEffect(() => {
      if (value !== undefined && value !== null && !isNaN(value)) {
        const formatted = new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
        setDisplayValue(formatted);
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let rawValue = e.target.value;
      
      // Remove tudo que não for dígito
      rawValue = rawValue.replace(/\D/g, "");
      
      if (!rawValue) {
        setDisplayValue("");
        onChange?.(0);
        return;
      }

      // Converte para número (dividindo por 100 para considerar os centavos)
      const numberValue = parseInt(rawValue, 10) / 100;
      
      // Formata em padrão brasileiro
      const formatted = new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numberValue);

      setDisplayValue(formatted);
      onChange?.(numberValue);
    };

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={className}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
