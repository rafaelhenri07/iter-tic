"use client";

import { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { selectCls } from "@/components/ui/FormField";
import { excluirItemPacc } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { PaccRevisao, PaccItem, PaccItemComAcao } from "@/types/pacc";

type AnyPaccItem = PaccItemComAcao | PaccItem;

/* ── Helper ────────────────────────────────────────────────────────────── */

function getRevisaoLabel(id: number, revisoes: PaccRevisao[]) {
  const rev = revisoes.find((r) => r.id === id);
  if (!rev) return `#${id}`;
  return rev.numero_revisao === 0
    ? "Aprovação Inicial"
    : rev.descricao || `Revisão ${rev.numero_revisao}`;
}

/* ── Componente ────────────────────────────────────────────────────────── */

interface ExcluirItemPaccDialogProps {
  item: AnyPaccItem;
  revisoes: PaccRevisao[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ExcluirItemPaccDialog({
  item,
  revisoes,
  onClose,
  onSuccess,
}: ExcluirItemPaccDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [revisaoExclusaoId, setRevisaoExclusaoId] = useState<number>(0);

  // Revisões válidas para exclusão: somente revisões POSTERIORES à de inclusão
  const revisaoInclusao = revisoes.find((r) => r.id === item.revisao_inclusao_id);
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.numero_revisao > (revisaoInclusao?.numero_revisao ?? -1)
  );

  const handleConfirm = async () => {
    if (!revisaoExclusaoId) {
      showToast("error", "Selecione a revisão que motiva esta exclusão.");
      return;
    }

    setSubmitting(true);
    try {
      await excluirItemPacc(item.id, revisaoExclusaoId);
      showToast("success", "Item excluído com sucesso!");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao excluir item."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">Excluir Item</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Resumo do item */}
          <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                {item.numero_item}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {item.descricao_demanda.substring(0, 80)}
                  {item.descricao_demanda.length > 80 ? "…" : ""}
                </p>
                <p className="text-xs text-foreground-muted">
                  Inclusão: {getRevisaoLabel(item.revisao_inclusao_id, revisoes)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-foreground-muted">
            Tem certeza que deseja excluir o item{" "}
            <strong className="text-foreground">{item.numero_item}</strong>?
            Ele será{" "}
            <strong className="text-red-600 dark:text-red-400">
              marcado como excluído
            </strong>{" "}
            e permanecerá no histórico para rastreabilidade.
          </p>

          {/* Seletor de revisão */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Em qual revisão esse item foi excluído? <span className="text-red-500">*</span>
            </label>
            <select
              value={revisaoExclusaoId}
              onChange={(e) => setRevisaoExclusaoId(Number(e.target.value))}
              className={selectCls}
              disabled={submitting}
            >
              <option value={0}>Selecione a revisão...</option>
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
            onClick={onClose}
            disabled={submitting}
            className="h-9 rounded-lg border border-border px-5 text-sm font-medium text-foreground-muted transition-all hover:bg-background-secondary hover:text-foreground disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !revisaoExclusaoId}
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
  );
}
