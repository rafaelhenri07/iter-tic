"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X, FileText } from "lucide-react";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import { FormField, selectCls } from "@/components/ui/FormField";
import { excluirAcaoPdtic } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

interface ExcluirAcaoDialogProps {
  open: boolean;
  onClose: () => void;
  acao: PdticAcao;
  revisoes: PdticRevisao[];
  onSuccess?: () => void;
}

export function ExcluirAcaoDialog({
  open,
  onClose,
  acao,
  revisoes,
  onSuccess,
}: ExcluirAcaoDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | "">("");

  // Revisões válidas para exclusão
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.id !== acao.revisao_inclusao_id
  );

  const handleConfirm = async () => {
    if (!selectedRevisaoId) {
      showToast("error", "Selecione a revisão que motiva esta exclusão.");
      return;
    }

    setSubmitting(true);
    try {
      await excluirAcaoPdtic(acao.id, Number(selectedRevisaoId));
      showToast(
        "success",
        `Ação ${acao.codigo_acao} excluída logicamente com sucesso.`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao excluir ação.";
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedRevisaoId("");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-2xl border border-border bg-background-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "modalIn 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Excluir Ação
                </h2>
                <p className="text-xs text-foreground-muted">
                  Exclusão lógica — a ação permanecerá no histórico.
                </p>
              </div>
            </div>
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
            {/* Resumo da ação */}
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-sm font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  {acao.codigo_acao}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {acao.descricao}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {acao.unidade_demandante} · GUT {acao.total_gut}/125
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground-muted">
              Tem certeza que deseja excluir a ação{" "}
              <strong className="text-foreground">{acao.codigo_acao}</strong>?
              Ela será{" "}
              <strong className="text-red-600 dark:text-red-400">
                marcada como excluída
              </strong>{" "}
              no histórico e aparecerá riscada na timeline.
            </p>

            {/* Seletor de revisão */}
            <FormField
              label="Revisão da Exclusão"
              required
              error={
                selectedRevisaoId === ""
                  ? undefined // Só mostra erro ao tentar confirmar
                  : undefined
              }
              icon={<FileText size={10} />}
            >
              <select
                value={selectedRevisaoId}
                onChange={(e) =>
                  setSelectedRevisaoId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className={selectCls}
                disabled={submitting}
              >
                <option value="">Selecione a revisão...</option>
                {revisoesDisponiveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    Rev {r.numero_revisao}
                    {r.descricao ? ` — ${r.descricao}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="h-10 rounded-lg border border-border px-5 text-sm font-medium text-foreground-muted transition-all hover:bg-background-secondary hover:text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || selectedRevisaoId === ""}
              className="flex h-10 items-center gap-2 rounded-lg bg-red-600 px-6 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
