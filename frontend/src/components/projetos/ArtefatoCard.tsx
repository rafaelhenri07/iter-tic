"use client";

import { useState } from "react";
import {
  FileText,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  Pencil,
  MessageSquare,
  Loader2,
  Save,
  X,
} from "lucide-react";
import type { Artefato, StatusArtefato } from "@/types/projeto";
import { STATUS_ARTEFATO_CONFIG } from "@/types/projeto";
import { atualizarArtefato } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

/* ── Ícone por tipo de artefato ────────────────────────────────────────── */

const TIPO_ICONS: Record<string, { emoji: string; color: string }> = {
  DFD: { emoji: "📋", color: "from-blue-500 to-blue-600" },
  ETP: { emoji: "📊", color: "from-indigo-500 to-indigo-600" },
  "Mapa de Riscos": { emoji: "🛡️", color: "from-rose-500 to-rose-600" },
  "Estimativa de Custos e Orçamento": {
    emoji: "💰",
    color: "from-emerald-500 to-emerald-600",
  },
  TR: { emoji: "📝", color: "from-violet-500 to-violet-600" },
};

/* ── Componente ────────────────────────────────────────────────────────── */

interface ArtefatoCardProps {
  artefato: Artefato;
  onRefresh: () => void;
  onAlterarData: (artefato: Artefato) => void;
}

export function ArtefatoCard({
  artefato,
  onRefresh,
  onAlterarData,
}: ArtefatoCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [editingObs, setEditingObs] = useState(false);
  const [obsText, setObsText] = useState(artefato.observacoes ?? "");

  const cfg = STATUS_ARTEFATO_CONFIG[artefato.status as StatusArtefato];
  const icon = TIPO_ICONS[artefato.tipo] ?? { emoji: "📄", color: "from-gray-500 to-gray-600" };

  const isNaoIniciado = artefato.status === "Não iniciado";
  const isIniciado = artefato.status === "Iniciado";
  const isConcluido = artefato.status === "Concluído";

  const formatDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  /* ── Ações de status ─────────────────────────────────────────────────── */

  const handleIniciar = async () => {
    setLoadingAction("iniciar");
    try {
      await atualizarArtefato(artefato.id, { status: "Iniciado" });
      showToast("success", `${artefato.tipo} iniciado com sucesso.`);
      onRefresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConcluir = async () => {
    setLoadingAction("concluir");
    try {
      await atualizarArtefato(artefato.id, { status: "Concluído" });
      showToast("success", `${artefato.tipo} concluído! 🎉`);
      onRefresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro");
    } finally {
      setLoadingAction(null);
    }
  };

  /* ── Salvar observações ──────────────────────────────────────────────── */

  const handleSaveObs = async () => {
    setLoadingAction("obs");
    try {
      await atualizarArtefato(artefato.id, {
        observacoes: obsText.trim() || null,
      });
      showToast("info", "Observações atualizadas.");
      setEditingObs(false);
      onRefresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl border bg-background-card shadow-sm transition-all hover:shadow-md ${
        isConcluido
          ? "border-emerald-200 dark:border-emerald-900/40"
          : "border-border"
      }`}
    >
      <div className="p-5">
        {/* Row 1: Tipo + Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${icon.color} text-white text-lg shadow-md`}
            >
              {icon.emoji}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {artefato.tipo}
              </h3>
              <span
                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg?.cls ?? ""}`}
              >
                {isConcluido && <CheckCircle2 size={10} />}
                {isIniciado && <Clock size={10} />}
                {artefato.status}
              </span>
            </div>
          </div>

          {/* Botão alterar datas */}
          {!isNaoIniciado && (
            <button
              onClick={() => onAlterarData(artefato)}
              className="flex h-7 items-center gap-1 rounded-lg border border-amber-300 px-2.5 text-[10px] font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
              title="Alterar datas (com justificativa)"
            >
              <Calendar size={10} />
              Alterar Datas
            </button>
          )}
        </div>

        {/* Row 2: Datas */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-background-secondary px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted">
              Data de Início
            </div>
            <div className="mt-0.5 text-sm font-semibold text-foreground font-mono">
              {formatDate(artefato.data_inicio)}
            </div>
          </div>
          <div className="rounded-lg bg-background-secondary px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted">
              Data de Conclusão
            </div>
            <div className="mt-0.5 text-sm font-semibold text-foreground font-mono">
              {formatDate(artefato.data_conclusao)}
            </div>
          </div>
        </div>

        {/* Row 3: Observações */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground-muted">
              <MessageSquare size={9} />
              Observações
            </span>
            {!editingObs && (
              <button
                onClick={() => setEditingObs(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-foreground-muted hover:text-foreground transition-colors"
              >
                <Pencil size={9} />
                Editar
              </button>
            )}
          </div>

          {editingObs ? (
            <div className="space-y-2">
              <textarea
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                placeholder="Ex: Servidor responsável em férias até 15/08..."
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-foreground-muted outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingObs(false);
                    setObsText(artefato.observacoes ?? "");
                  }}
                  className="flex h-6 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium text-foreground-muted"
                >
                  <X size={9} />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveObs}
                  disabled={loadingAction === "obs"}
                  className="flex h-6 items-center gap-1 rounded-md bg-brand-primary px-2 text-[10px] font-semibold text-white disabled:opacity-50"
                >
                  {loadingAction === "obs" ? (
                    <Loader2 size={9} className="animate-spin" />
                  ) : (
                    <Save size={9} />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-foreground-muted italic leading-relaxed">
              {artefato.observacoes || "Nenhuma observação."}
            </p>
          )}
        </div>

        {/* Row 4: Action buttons */}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          {isNaoIniciado && (
            <button
              onClick={handleIniciar}
              disabled={loadingAction === "iniciar"}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loadingAction === "iniciar" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              Iniciar Artefato
            </button>
          )}

          {isIniciado && (
            <button
              onClick={handleConcluir}
              disabled={loadingAction === "concluir"}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loadingAction === "concluir" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Concluir Artefato
            </button>
          )}

          {isConcluido && (
            <div className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <CheckCircle2 size={12} />
              Artefato Concluído
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
