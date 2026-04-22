"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  Users,
  User,
  Layers,
  ClipboardList,
  BarChart3,
  Check,
  Clock,
  FileText,
  Send as SendIcon,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import {
  fetchPainelProjeto,
  enviarParaLicitacao,
  adicionarTramitacaoLicitacao,
  concluirLicitacao,
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type {
  ProjetoPainelResponse,
  ProjetoComDetalhes,
  Artefato,
  AcaoPdticResumo,
  ItemPaccResumo,
  StatusProjeto,
} from "@/types/projeto";
import {
  STATUS_PROJETO_CONFIG,
  COMPLEXIDADE_CONFIG,
  STATUS_ARTEFATO_CONFIG,
} from "@/types/projeto";

/* ── Tabs ──────────────────────────────────────────────────────────────── */

type Tab = "geral" | "licitacao";

/* ── Helper ────────────────────────────────────────────────────────────── */

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

/* ── Props ─────────────────────────────────────────────────────────────── */

interface DetalhesProjetoModalProps {
  projetoId: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export function DetalhesProjetoModal({
  projetoId,
  onClose,
  onRefresh,
}: DetalhesProjetoModalProps) {
  const [data, setData] = useState<ProjetoPainelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("geral");

  // Fase Externa state
  const [novaTramitacao, setNovaTramitacao] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetchPainelProjeto(projetoId);
      setData(r);
    } catch {
      setError("Erro ao carregar projeto.");
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    load();
  }, [load]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const projeto = data?.projeto;
  const statusCfg = projeto ? STATUS_PROJETO_CONFIG[projeto.status as StatusProjeto] : null;
  const complexCfg = projeto ? COMPLEXIDADE_CONFIG[projeto.complexidade] : null;

  /* ── Licitação actions ─────────────────────────────────────────────── */
  const handleEnviarLicitacao = async () => {
    setActionLoading(true);
    try {
      await enviarParaLicitacao(projetoId);
      showToast("success", "Projeto enviado para licitação!");
      await load();
      onRefresh?.();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSalvarTramitacao = async () => {
    if (!novaTramitacao.trim()) return;
    setActionLoading(true);
    try {
      await adicionarTramitacaoLicitacao(projetoId, novaTramitacao.trim());
      showToast("success", "Tramitação registrada na linha do tempo!");
      setNovaTramitacao("");
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConcluirLicitacao = async () => {
    setActionLoading(true);
    try {
      await concluirLicitacao(projetoId);
      showToast("success", "Licitação concluída com sucesso!");
      await load();
      onRefresh?.();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Licitação availability ────────────────────────────────────────── */
  const canEnviar = projeto?.status === "Pronto para contratação";
  const isEmLicitacao = projeto?.status === "Em licitação";
  const isLicitacaoConcluida = projeto?.status === "Licitação concluída";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="min-w-0 flex-1">
            {projeto ? (
              <>
                <h2 className="text-sm font-bold text-foreground line-clamp-1">
                  {projeto.nome}
                </h2>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] text-foreground-muted font-mono">
                    <FileText size={10} />
                    {projeto.processo_sei}
                  </span>
                  {statusCfg && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusCfg.cls}`}>
                      {projeto.status}
                    </span>
                  )}
                  {complexCfg && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${complexCfg.cls}`}>
                      {complexCfg.label}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="h-8" />
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-0 border-b border-border px-6 shrink-0">
          {([
            { key: "geral" as Tab, label: "Dados Gerais" },
            { key: "licitacao" as Tab, label: "Fase Externa (Licitação)" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-red-500">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : projeto && data ? (
            activeTab === "geral" ? (
              <TabGeral projeto={projeto} data={data} />
            ) : (
              <TabLicitacao
                projeto={projeto}
                canEnviar={canEnviar}
                isEmLicitacao={isEmLicitacao}
                isLicitacaoConcluida={isLicitacaoConcluida}
                novaTramitacao={novaTramitacao}
                setNovaTramitacao={setNovaTramitacao}
                actionLoading={actionLoading}
                onEnviar={handleEnviarLicitacao}
                onSalvarTramitacao={handleSalvarTramitacao}
                onConcluir={handleConcluirLicitacao}
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TabGeral({
  projeto,
  data,
}: {
  projeto: ProjetoComDetalhes;
  data: ProjetoPainelResponse;
}) {
  return (
    <div className="space-y-0 divide-y divide-border">
      {/* ── 1. Artefatos (Grid alinhado) ──────────────────────────────── */}
      <div className="px-6 py-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
          <BarChart3 size={11} /> Artefatos
        </h3>
        <div>
          {projeto.artefatos.map((a: Artefato) => {
            const sCfg = STATUS_ARTEFATO_CONFIG[a.status];
            return (
              <div
                key={a.id}
                className="grid grid-cols-[110px_1fr_auto] items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                {/* Status badge — largura fixa */}
                <div className="flex justify-center">
                  <span className={`inline-flex items-center justify-center gap-0.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold whitespace-nowrap ${sCfg.cls}`}>
                    {a.status === "Concluído" && <Check size={8} className="shrink-0" />}
                    {a.status}
                  </span>
                </div>
                {/* Nome do artefato */}
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {a.tipo}
                </span>
                {/* Datas */}
                <div className="flex items-center gap-2 text-[11px] text-foreground-muted whitespace-nowrap">
                  <span>{formatDate(a.data_inicio)}</span>
                  <span className="text-slate-300 dark:text-slate-600">→</span>
                  <span>{formatDate(a.data_conclusao)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Vínculos Estratégicos ──────────────────────────────────── */}
      <div className="px-6 py-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
          <Layers size={11} /> Vínculos Estratégicos
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* PDTIC */}
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
              <Layers size={9} /> PDTIC ({projeto.acoes_pdtic.length})
            </div>
            {projeto.acoes_pdtic.length > 0 ? (
              <div className="space-y-1">
                {projeto.acoes_pdtic.map((a: AcaoPdticResumo) => (
                  <div key={a.id} className="text-[11px] text-foreground">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{a.codigo_acao}</span>
                    {" — "}
                    <span className="text-foreground-muted">{a.descricao}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-foreground-muted italic">Nenhum vínculo</p>
            )}
          </div>

          {/* PACC */}
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
              <ClipboardList size={9} /> PACC ({projeto.itens_pacc.length})
            </div>
            {projeto.itens_pacc.length > 0 ? (
              <div className="space-y-1">
                {projeto.itens_pacc.map((i: ItemPaccResumo) => (
                  <div key={i.id} className="text-[11px] text-foreground">
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{i.numero_item}</span>
                    {" — "}
                    <span className="text-foreground-muted">{i.descricao_demanda}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-foreground-muted italic">Nenhum vínculo</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Equipe ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
          <Users size={11} /> Equipe
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: "Requisitante", data: projeto.integrante_requisitante },
            { label: "Técnico", data: projeto.integrante_tecnico },
            { label: "Administrativo", data: projeto.integrante_administrativo },
          ] as const).map((m) => (
            <div key={m.label} className="rounded-lg border border-border px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted">
                {m.label}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-foreground">
                <User size={10} className="shrink-0" />
                {m.data?.nome ?? <span className="italic text-foreground-muted">Não designado</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Timestamps ────────────────────────────────────────────────── */}
      <div className="px-6 py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-foreground-muted">
          <span>
            <Clock size={10} className="mr-1 inline" />
            Criado: <strong className="text-foreground">{formatDate(projeto.criado_em)}</strong>
          </span>
          <span>ID: <strong className="font-mono text-foreground">#{projeto.id}</strong></span>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Fase Externa (Licitação) ─────────────────────────────────────── */

function TabLicitacao({
  projeto,
  canEnviar,
  isEmLicitacao,
  isLicitacaoConcluida,
  novaTramitacao,
  setNovaTramitacao,
  actionLoading,
  onEnviar,
  onSalvarTramitacao,
  onConcluir,
}: {
  projeto: ProjetoComDetalhes;
  canEnviar: boolean;
  isEmLicitacao: boolean;
  isLicitacaoConcluida: boolean;
  novaTramitacao: string;
  setNovaTramitacao: (v: string) => void;
  actionLoading: boolean;
  onEnviar: () => void;
  onSalvarTramitacao: () => void;
  onConcluir: () => void;
}) {
  const showNenhuma = !canEnviar && !isEmLicitacao && !isLicitacaoConcluida;

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Enviar para licitação */}
      {canEnviar && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
            ✅ Projeto Pronto para Contratação
          </h3>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/60 mb-3">
            Todos os artefatos foram concluídos. Envie para a área de licitações.
          </p>
          <button
            onClick={onEnviar}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <SendIcon size={13} />}
            Enviar para Licitação
          </button>
        </div>
      )}

      {/* Em licitação */}
      {isEmLicitacao && (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-4 dark:border-violet-800 dark:bg-violet-950/20">
            <h3 className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-1">
              📤 Projeto em Processo Licitatório
            </h3>
            <p className="text-[11px] text-violet-600/80 dark:text-violet-400/60">
              Enviado em: <strong>{formatDate(projeto.data_envio_licitacao)}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
              Nova Tramitação
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={novaTramitacao}
                onChange={(e) => setNovaTramitacao(e.target.value)}
                placeholder="Descreva o andamento da licitação..."
                className="flex-1 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSalvarTramitacao()}
              />
              <button
                onClick={onSalvarTramitacao}
                disabled={actionLoading || !novaTramitacao.trim()}
                className="flex items-center rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-violet-700 disabled:opacity-40 shrink-0"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline (Aparece tanto Em Licitação quanto Concluída) */}
      {(isEmLicitacao || isLicitacaoConcluida) && (
        <div className="mt-2 pt-2">
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
            Linha do Tempo (Log de Auditoria)
          </h4>
          
          {projeto.tramitacoes && projeto.tramitacoes.length > 0 ? (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-4 pb-2">
              {projeto.tramitacoes.map((t) => (
                <div key={t.id} className="relative pl-5">
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {t.observacao}
                  </p>
                  <div className="mt-1 flex gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
                    <span>{new Date(t.data_hora).toLocaleString("pt-BR", {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}</span>
                    <span>•</span>
                    <span>{t.autor}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhuma movimentação registrada nesta fase.</p>
          )}
        </div>
      )}

      {/* Concluir Licitacao isolate */}
      {isEmLicitacao && (
        <div className="pt-4 border-t border-border mt-4 flex justify-end">
          <button
            onClick={onConcluir}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Concluir Licitação
          </button>
        </div>
      )}

      {/* Licitação concluída */}
      {isLicitacaoConcluida && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 px-4 py-4 dark:border-cyan-800 dark:bg-cyan-950/20 mt-4">
          <h3 className="text-xs font-bold text-cyan-700 dark:text-cyan-400 mb-1">
            🏆 Licitação Concluída
          </h3>
          <p className="text-[11px] text-cyan-600/80 dark:text-cyan-400/60">
            O processo licitatório foi finalizado. O projeto está apto para geração de contrato.
          </p>
        </div>
      )}

      {/* Sem ação disponível */}
      {showNenhuma && (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <ExternalLink size={20} className="mx-auto mb-2 text-foreground-muted" />
          <p className="text-xs text-foreground-muted">
            Nenhuma ação de licitação disponível no status atual.
            <br />
            <span className="text-[10px]">O projeto precisa ter todos os artefatos concluídos para avançar.</span>
          </p>
        </div>
      )}
    </div>
  );
}
