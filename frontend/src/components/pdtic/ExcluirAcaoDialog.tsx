"use client";

import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import { selectCls } from "@/components/ui/FormField";
import { excluirDefinitivoAcaoPdtic } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

interface ExcluirAcaoDialogProps {
  open: boolean;
  onClose: () => void;
  acao: PdticAcao;
  revisoes: PdticRevisao[];
  onSuccess?: () => void;
}

/* ── Helper ────────────────────────────────────────────────────────────── */

function getRevisaoLabel(id: number, revisoes: PdticRevisao[]) {
  const rev = revisoes.find((r) => r.id === id);
  if (!rev) return `#${id}`;
  return rev.numero_revisao === 0
    ? "Aprovação Inicial"
    : rev.descricao || `Revisão ${rev.numero_revisao}`;
}

/* ── Componente ────────────────────────────────────────────────────────── */

export function ExcluirAcaoDialog({
  open,
  onClose,
  acao,
  revisoes,
  onSuccess,
}: ExcluirAcaoDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | "">("");

  // Revisões válidas para exclusão: somente revisões POSTERIORES à de inclusão
  const revisaoInclusao = revisoes.find((r) => r.id === acao.revisao_inclusao_id);
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.numero_revisao > (revisaoInclusao?.numero_revisao ?? -1)
  );

  const handleConfirm = async () => {
    if (!selectedRevisaoId) {
      showToast("error", "Selecione a revisão que motiva esta exclusão.");
      return;
    }

    setSubmitting(true);
    try {
      await excluirDefinitivoAcaoPdtic(acao.id);
      showToast(
        "success",
        `Ação ${acao.codigo_acao} excluída com sucesso.`
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
            <h2 className="text-lg font-bold text-foreground">Excluir Ação</h2>
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
            <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  {acao.codigo_acao}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {acao.descricao}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Inclusão: {getRevisaoLabel(acao.revisao_inclusao_id, revisoes)}
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
              e permanecerá no histórico para rastreabilidade.
            </p>

            {/* Seletor de revisão */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Em qual revisão essa ação foi excluída? <span className="text-red-500">*</span>
              </label>
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
                    {r.numero_revisao === 0
                      ? "Aprovação Inicial"
                      : r.descricao || `Revisão ${r.numero_revisao}`}
                  </option>
                ))}
              </select>
            </div>
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
              disabled={submitting || selectedRevisaoId === ""}
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
