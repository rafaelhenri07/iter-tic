"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  AlertTriangle,
  Loader2,
  FileWarning,
} from "lucide-react";
import { alterarDataArtefato } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { Artefato, TipoDataAlterada } from "@/types/projeto";

interface AlterarDataArtefatoModalProps {
  artefato: Artefato;
  onClose: () => void;
  onSuccess: () => void;
}

export function AlterarDataArtefatoModal({
  artefato,
  onClose,
  onSuccess,
}: AlterarDataArtefatoModalProps) {
  const [tipoData, setTipoData] = useState<TipoDataAlterada>("data_inicio");
  const [novaData, setNovaData] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dataAtual =
    tipoData === "data_inicio"
      ? artefato.data_inicio
      : artefato.data_conclusao;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataAtual) {
      showToast("error", "O artefato não possui a data selecionada para alterar.");
      return;
    }
    if (!novaData) {
      showToast("error", "Informe a nova data.");
      return;
    }
    if (justificativa.trim().length < 10) {
      showToast("error", "A justificativa deve ter no mínimo 10 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      await alterarDataArtefato(artefato.id, {
        artefato_id: artefato.id,
        tipo_data_alterada: tipoData,
        data_antiga: dataAtual,
        data_nova: novaData,
        justificativa: justificativa.trim(),
      });
      showToast("success", "Data alterada com sucesso. Registro de auditoria criado.");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao alterar data."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-amber-300 bg-background-card shadow-2xl dark:border-amber-800"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* Header — amber compliance warning */}
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50/50 px-6 py-4 rounded-t-2xl dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <FileWarning size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Alterar Data — {artefato.tipo}
              </h2>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Esta ação será registrada no histórico de auditoria
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              <strong>Atenção:</strong> Alterações de datas em artefatos de
              licitação exigem justificativa para compliance. O registro ficará
              disponível permanentemente no histórico de auditoria.
            </span>
          </div>

          {/* Tipo de data */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              <Calendar size={10} />
              Qual data alterar? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoData("data_inicio")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  tipoData === "data_inicio"
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                    : "border-border text-foreground-muted hover:border-foreground/30"
                }`}
              >
                📅 Data de Início
              </button>
              <button
                type="button"
                onClick={() => setTipoData("data_conclusao")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  tipoData === "data_conclusao"
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                    : "border-border text-foreground-muted hover:border-foreground/30"
                }`}
              >
                🏁 Data de Conclusão
              </button>
            </div>
          </div>

          {/* Data atual (read-only) */}
          <div>
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Data Atual
            </label>
            <div className="h-9 flex items-center rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground-muted font-mono">
              {dataAtual
                ? new Date(dataAtual + "T00:00:00").toLocaleDateString("pt-BR")
                : "— Sem data definida —"}
            </div>
            {!dataAtual && (
              <p className="mt-1 text-[11px] text-red-500">
                Esta data ainda não foi preenchida. Inicie/conclua o artefato primeiro.
              </p>
            )}
          </div>

          {/* Nova data */}
          <div>
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Nova Data *
            </label>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="h-9 w-full rounded-lg border border-amber-300 bg-background px-3 text-sm text-foreground outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-800"
              required
            />
          </div>

          {/* Justificativa (campo obrigatório de compliance) */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <AlertTriangle size={10} />
              Justificativa (Obrigatória — mín. 10 caracteres) *
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: Servidor responsável entrou de férias no período, necessitando reprogramação do cronograma..."
              rows={3}
              className="w-full rounded-lg border border-amber-300 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none dark:border-amber-800"
              required
              minLength={10}
            />
            <div className="mt-1 flex justify-between text-[10px]">
              <span
                className={
                  justificativa.trim().length >= 10
                    ? "text-emerald-500"
                    : "text-foreground-muted"
                }
              >
                {justificativa.trim().length}/10 caracteres mínimos
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !dataAtual}
              className="flex h-9 items-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <FileWarning size={14} />
                  Alterar com Justificativa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
