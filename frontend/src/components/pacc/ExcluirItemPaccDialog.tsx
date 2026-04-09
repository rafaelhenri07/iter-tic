"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  Layers,
} from "lucide-react";
import { selectCls } from "@/components/ui/FormField";
import { excluirItemPacc } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { PaccRevisao, PaccItem, PaccItemComAcao } from "@/types/pacc";

type AnyPaccItem = PaccItemComAcao | PaccItem;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

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

  // Filtrar revisões que podem motivar exclusão (não pode ser a de inclusão)
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.id !== item.revisao_inclusao_id
  );

  const handleConfirm = async () => {
    if (!revisaoExclusaoId) {
      showToast("error", "Selecione a Revisão da Exclusão.");
      return;
    }

    setSubmitting(true);
    try {
      await excluirItemPacc(item.id, revisaoExclusaoId);
      showToast("success", "Item excluído logicamente com sucesso!");
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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Excluir Item
              </h2>
              <p className="text-xs text-foreground-muted">
                Exclusão lógica — o item permanecerá no histórico.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5">
          {/* Resumo do item */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-sm font-bold text-red-600 dark:bg-red-900/50 dark:text-red-400">
                {item.numero_item}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {item.descricao_demanda.substring(0, 80)}
                  {item.descricao_demanda.length > 80 ? "…" : ""}
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {formatCurrency(item.valor_estimado)} · Qtd: {item.quantidade}
                </p>
              </div>
            </div>
          </div>

          {/* Aviso */}
          <p className="text-sm text-foreground-muted">
            Tem certeza que deseja excluir o item{" "}
            <strong className="text-foreground">#{item.numero_item}</strong>? Ele
            será{" "}
            <strong className="text-red-600 dark:text-red-400">
              marcado como excluído
            </strong>{" "}
            no histórico e aparecerá riscado na timeline.
          </p>

          {/* Revisão da exclusão */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              <Layers size={10} />
              Revisão da Exclusão
              <span className="text-red-500">*</span>
            </label>
            <select
              value={revisaoExclusaoId}
              onChange={(e) => setRevisaoExclusaoId(Number(e.target.value))}
              className={selectCls}
            >
              <option value={0}>Selecione a revisão...</option>
              {revisoesDisponiveis.map((r) => (
                <option key={r.id} value={r.id}>
                  Rev {r.numero_revisao}
                  {r.data_aprovacao
                    ? ` (${new Date(r.data_aprovacao + "T00:00:00").toLocaleDateString("pt-BR")})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !revisaoExclusaoId}
            className="flex h-9 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-700 hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}
