"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Play,
  CheckCircle2,
  Loader2,
  Clock,
  Send,
  MessageSquare,
  User,
} from "lucide-react";
import {
  atualizarArtefato,
  listarComentariosArtefato,
  adicionarComentarioArtefato,
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { ArtefatoResumo, ComentarioArtefato } from "@/types/projeto";

/* ── Short labels ──────────────────────────────────────────────────────── */

const ARTEFATO_FULL: Record<string, string> = {
  DFD: "Documento de Formalização da Demanda",
  ETP: "Estudo Técnico Preliminar",
  "Mapa de Riscos": "Mapa de Gerenciamento de Riscos",
  "Estimativa de Custos e Orçamento": "Estimativa de Custos e Orçamento",
  TR: "Termo de Referência",
};

/* ── Data formatting helpers ───────────────────────────────────────────── */

function formatDateTimeRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHrs < 24) return `há ${diffHrs}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimeFull(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR") +
    " às " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

/* ── Props ─────────────────────────────────────────────────────────────── */

interface GerenciarArtefatoModalProps {
  projetoId: number;
  artefato: ArtefatoResumo;
  onClose: () => void;
  onSuccess: () => void;
}

export function GerenciarArtefatoModal({
  projetoId,
  artefato,
  onClose,
  onSuccess,
}: GerenciarArtefatoModalProps) {
  const [loading, setLoading] = useState(false);
  const [novoComentario, setNovoComentario] = useState("");
  const [comentarios, setComentarios] = useState<ComentarioArtefato[]>([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const artefatoId = artefato.id;
  const isIniciado = artefato.status === "Iniciado";
  const isConcluido = artefato.status === "Concluído";
  const isNaoIniciado = artefato.status === "Não iniciado";

  /* ── Carregar comentários ─────────────────────────────────────────────── */

  const carregarComentarios = useCallback(async () => {
    if (!artefatoId) return;
    setLoadingComentarios(true);
    try {
      const data = await listarComentariosArtefato(artefatoId);
      setComentarios(data);
    } catch {
      /* silent */
    } finally {
      setLoadingComentarios(false);
    }
  }, [artefatoId]);

  useEffect(() => {
    carregarComentarios();
  }, [carregarComentarios]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ── Ações ────────────────────────────────────────────────────────────── */

  const handleIniciar = async () => {
    if (!artefatoId) return;
    setLoading(true);
    try {
      await atualizarArtefato(artefatoId, { status: "Iniciado" });
      if (novoComentario.trim()) {
        await adicionarComentarioArtefato(artefatoId, novoComentario.trim());
        setNovoComentario("");
      }
      showToast("success", `${artefato.tipo} iniciado com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao iniciar artefato.");
    } finally {
      setLoading(false);
    }
  };

  const handleConcluir = async () => {
    if (!artefatoId) return;
    setLoading(true);
    try {
      await atualizarArtefato(artefatoId, { status: "Concluído" });
      if (novoComentario.trim()) {
        await adicionarComentarioArtefato(artefatoId, novoComentario.trim());
        setNovoComentario("");
      }
      showToast("success", `${artefato.tipo} concluído com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao concluir artefato.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarComentario = async () => {
    if (!artefatoId || !novoComentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await adicionarComentarioArtefato(artefatoId, novoComentario.trim());
      setNovoComentario("");
      showToast("success", "Comentário adicionado.");
      await carregarComentarios();
      onSuccess(); // refresh parent
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setEnviandoComentario(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarComentario();
    }
  };

  /* ── Status pill ─────────────────────────────────────────────────────── */
  const statusCls = isConcluido
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    : isIniciado
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg flex-col rounded-2xl border border-border bg-background-card shadow-2xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">{artefato.tipo}</h2>
            <p className="text-[11px] text-foreground-muted">
              {ARTEFATO_FULL[artefato.tipo] ?? artefato.tipo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status + Dias */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusCls}`}>
              {artefato.status}
            </span>
            {artefato.dias_decorridos != null && (
              <span className="flex items-center gap-1 text-xs text-foreground-muted">
                <Clock size={11} />
                {artefato.dias_decorridos}d {isConcluido ? "total" : "em andamento"}
              </span>
            )}
          </div>

          {/* Ações rápidas */}
          {!isConcluido && (
            <div className="flex gap-2">
              {isNaoIniciado && (
                <button
                  onClick={handleIniciar}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  Iniciar Artefato
                </button>
              )}
              {isIniciado && (
                <button
                  onClick={handleConcluir}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Concluir Artefato
                </button>
              )}
            </div>
          )}

          {/* ── Novo Comentário ────────────────────────────────────────── */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              <MessageSquare size={10} />
              Novo Comentário
            </label>
            <div className="flex gap-2">
              <textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Adicione um comentário ou observação..."
                rows={2}
                className="flex-1 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 resize-none focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              />
              <button
                onClick={handleEnviarComentario}
                disabled={enviandoComentario || !novoComentario.trim()}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center self-end rounded-lg bg-violet-600 text-white shadow-md transition-all hover:bg-violet-700 disabled:opacity-40"
                title="Enviar comentário (Enter)"
              >
                {enviandoComentario ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>

          {/* ── Timeline de Comentários ────────────────────────────────── */}
          <div>
            <label className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              <Clock size={10} />
              Histórico ({comentarios.length})
            </label>

            {loadingComentarios ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-violet-500" />
              </div>
            ) : comentarios.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <MessageSquare size={20} className="mb-1 text-slate-300 dark:text-slate-600" />
                <span className="text-xs text-foreground-muted">
                  Nenhum comentário ainda.
                </span>
              </div>
            ) : (
              <div className="relative space-y-0">
                {/* Linha vertical da timeline */}
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />

                {comentarios.map((c) => (
                  <div key={c.id} className="relative flex gap-3 py-2">
                    {/* Nó da timeline */}
                    <div className="relative z-10 mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                      <User size={12} />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 rounded-lg border border-border bg-background-secondary/50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-foreground">
                          {c.autor}
                        </span>
                        <span
                          className="text-[10px] text-foreground-muted shrink-0"
                          title={formatDateTimeFull(c.criado_em)}
                        >
                          {formatDateTimeRelative(c.criado_em)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                        {c.conteudo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
