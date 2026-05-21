"use client";

import { useState } from "react";
import { Loader2, Trash2, X, Briefcase } from "lucide-react";
import type { FornecedorResponse } from "@/types/fornecedor";
import { excluirFornecedor } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

interface ExcluirFornecedorDialogProps {
  open: boolean;
  onClose: () => void;
  fornecedor: FornecedorResponse;
  onSuccess?: () => void;
}

export function ExcluirFornecedorDialog({
  open,
  onClose,
  fornecedor,
  onSuccess,
}: ExcluirFornecedorDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await excluirFornecedor(fornecedor.id);
      showToast(
        "success",
        `Fornecedor "${fornecedor.nome}" excluído com sucesso.`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao excluir fornecedor.";
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-2xl border border-border bg-background-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "modalIn 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold text-foreground">Excluir Fornecedor</h2>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg p-2 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  <Briefcase size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {fornecedor.nome}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {fornecedor.documento || "Sem documento"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground-muted">
              Tem certeza que deseja excluir o fornecedor{" "}
              <strong className="text-foreground">{fornecedor.nome}</strong>?
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="h-9 rounded-lg border border-border px-5 text-sm font-medium text-foreground-muted transition-all hover:bg-background-secondary hover:text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="flex h-9 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Confirmar Exclusão
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
