"use client";

import { useState } from "react";
import { Loader2, Trash2, X, AlertTriangle } from "lucide-react";
import type { PaccItem, PaccItemComAcao } from "@/types/pacc";
import { excluirDefinitivoItemPacc } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

type AnyPaccItem = PaccItemComAcao | PaccItem;

interface ExcluirDefinitivoItemPaccDialogProps {
  open: boolean;
  onClose: () => void;
  item: AnyPaccItem;
  onSuccess?: () => void;
}

export function ExcluirDefinitivoItemPaccDialog({
  open,
  onClose,
  item,
  onSuccess,
}: ExcluirDefinitivoItemPaccDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await excluirDefinitivoItemPacc(item.id);
      showToast(
        "success",
        `Item ${item.numero_item} excluído permanentemente.`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao excluir item.";
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
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
          className="relative w-full max-w-md rounded-2xl border border-red-200 bg-background-card shadow-2xl dark:border-red-900/50"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "modalIn 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-red-200 px-6 py-4 dark:border-red-900/50">
            <h2 className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400">
              <AlertTriangle size={20} />
              Excluir Definitivamente
            </h2>
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
            {/* Resumo do item */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  {item.numero_item}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.descricao_demanda}
                  </p>
                </div>
              </div>
            </div>

            {/* Alerta Crítico */}
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800/60 dark:bg-red-950/30">
              <div className="flex gap-3">
                <AlertTriangle size={20} className="shrink-0 text-red-500 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                  <p>
                    <strong>Tem certeza que deseja apagar este item?</strong>
                  </p>
                  <p>
                    Esta operação é exclusiva para{" "}
                    <strong>ERROS DE CADASTRO</strong> e{" "}
                    <strong className="underline">não poderá ser desfeita</strong>.
                  </p>
                  <p className="text-red-600 dark:text-red-400">
                    Se o item foi cancelado em uma revisão do PACC, utilize a opção{" "}
                    <strong>&quot;Desativar&quot;</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-red-200 px-6 py-4 dark:border-red-900/50">
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
