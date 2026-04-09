"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;
const listeners: Set<(toast: ToastData) => void> = new Set();

/** Imperativo — pode chamar de qualquer lugar */
export function showToast(type: ToastType, message: string) {
  const toast: ToastData = { id: ++toastIdCounter, type, message };
  listeners.forEach((fn) => fn(toast));
}

/** Container de Toasts — montar uma vez no layout */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: ToastData) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-emerald-300 bg-emerald-50/95 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300";
      case "error":
        return "border-red-300 bg-red-50/95 text-red-800 dark:border-red-800 dark:bg-red-950/90 dark:text-red-300";
      case "info":
        return "border-blue-300 bg-blue-50/95 text-blue-800 dark:border-blue-800 dark:bg-blue-950/90 dark:text-blue-300";
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle size={18} className="shrink-0" />;
      case "error":
        return <XCircle size={18} className="shrink-0" />;
      case "info":
        return <Info size={18} className="shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm
            transition-all duration-300 ${getStyles(toast.type)}`}
          style={{
            animation: "slideIn 0.3s ease-out",
          }}
        >
          {getIcon(toast.type)}
          <span className="text-sm font-medium max-w-xs">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-2 shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
