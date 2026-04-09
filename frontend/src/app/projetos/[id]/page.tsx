"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  Shield,
  Users,
  Layers,
  ClipboardList,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Inbox,
  Send,
  PackageCheck,
  Trophy,
  Save,
  CalendarClock,
} from "lucide-react";
import { ArtefatoCard } from "@/components/projetos/ArtefatoCard";
import { AlterarDataArtefatoModal } from "@/components/projetos/AlterarDataArtefatoModal";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import {
  fetchPainelProjeto,
  enviarParaLicitacao,
  atualizarTramiteLicitacao,
  concluirLicitacao,
} from "@/lib/api";
import type {
  ProjetoPainelResponse,
  ProjetoComDetalhes,
  Artefato,
} from "@/types/projeto";
import {
  COMPLEXIDADE_CONFIG,
  STATUS_PROJETO_CONFIG,
} from "@/types/projeto";

/* ── Mock ──────────────────────────────────────────────────────────────── */

const MOCK_DATA: ProjetoPainelResponse = {
  projeto: {
    id: 1,
    nome: "Aquisição de Switches Core Cisco Catalyst 9300 para Modernização do Datacenter Principal",
    processo_sei: "00052-00032300/2025-01",
    complexidade: "alta",
    status: "Em elaboração",
    catmat: "443811",
    catser: null,
    criado_em: "2025-02-10T10:00:00Z",
    atualizado_em: "2025-06-01T14:30:00Z",
    integrante_requisitante_id: 1,
    integrante_tecnico_id: 2,
    integrante_administrativo_id: 3,
    data_envio_licitacao: null,
    situacao_licitacao_texto: null,
    integrante_requisitante: {
      id: 1, matricula: "1001", nome: "Carlos Mendes", cargo: "Analista de TI",
      funcao: "Chefe de Seção", lotacao: "DTI", perfil_acesso: null,
      criado_em: "2025-01-01T00:00:00Z", atualizado_em: "2025-01-01T00:00:00Z",
    },
    integrante_tecnico: {
      id: 2, matricula: "1002", nome: "Ana Beatriz Silva", cargo: "Engenheira de Redes",
      funcao: null, lotacao: "DTI", perfil_acesso: null,
      criado_em: "2025-01-01T00:00:00Z", atualizado_em: "2025-01-01T00:00:00Z",
    },
    integrante_administrativo: {
      id: 3, matricula: "1003", nome: "Roberto Alves", cargo: "Analista Administrativo",
      funcao: null, lotacao: "DAG", perfil_acesso: null,
      criado_em: "2025-01-01T00:00:00Z", atualizado_em: "2025-01-01T00:00:00Z",
    },
    acoes_pdtic: [
      { id: 1, codigo_acao: "A1", descricao: "Modernizar infraestrutura de rede", status: "Em andamento", tipo_necessidade: "hardware" },
    ],
    itens_pacc: [
      { id: 1, numero_item: "001", descricao_demanda: "Switches Core Cisco Catalyst", valor_estimado: 450000, processo_sei: null },
    ],
    artefatos: [
      { id: 1, projeto_id: 1, tipo: "DFD", status: "Concluído", data_inicio: "2025-03-01", data_conclusao: "2025-03-25", observacoes: "Documento aprovado pelo requisitante.", criado_em: "2025-02-10T10:00:00Z", atualizado_em: "2025-03-25T10:00:00Z" },
      { id: 2, projeto_id: 1, tipo: "ETP", status: "Concluído", data_inicio: "2025-03-26", data_conclusao: "2025-04-20", observacoes: null, criado_em: "2025-02-10T10:00:00Z", atualizado_em: "2025-04-20T10:00:00Z" },
      { id: 3, projeto_id: 1, tipo: "Mapa de Riscos", status: "Concluído", data_inicio: "2025-04-21", data_conclusao: "2025-05-10", observacoes: null, criado_em: "2025-02-10T10:00:00Z", atualizado_em: "2025-05-10T10:00:00Z" },
      { id: 4, projeto_id: 1, tipo: "Estimativa de Custos e Orçamento", status: "Iniciado", data_inicio: "2025-05-11", data_conclusao: null, observacoes: "Aguardando orçamento do fornecedor.", criado_em: "2025-02-10T10:00:00Z", atualizado_em: "2025-05-11T10:00:00Z" },
      { id: 5, projeto_id: 1, tipo: "TR", status: "Não iniciado", data_inicio: null, data_conclusao: null, observacoes: null, criado_em: "2025-02-10T10:00:00Z", atualizado_em: "2025-02-10T10:00:00Z" },
    ],
  },
  total_artefatos: 5,
  artefatos_concluidos: 3,
  artefatos_pendentes: 2,
  progresso_percentual: 60,
};

/* ── Página ────────────────────────────────────────────────────────────── */

export default function ProjetoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projetoId = Number(id);

  const [data, setData] = useState<ProjetoPainelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Modal state
  const [alterarDataArtefato, setAlterarDataArtefato] = useState<Artefato | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const painel = await fetchPainelProjeto(projetoId);
        setData(painel);
        setUsingMock(false);
      } catch {
        console.warn("Backend indisponível — usando dados mock");
        setData(MOCK_DATA);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projetoId, fetchKey]);

  const refresh = () => setFetchKey((k) => k + 1);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <Inbox size={40} className="text-foreground-muted mb-3" />
        <h2 className="text-lg font-bold text-foreground">Projeto não encontrado</h2>
        <Link href="/projetos" className="mt-3 text-sm text-brand-primary hover:underline">
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const projeto = data.projeto;
  const complexidade = COMPLEXIDADE_CONFIG[projeto.complexidade];
  const statusCfg = STATUS_PROJETO_CONFIG[projeto.status];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back + Header */}
      <div>
        <Link
          href="/projetos"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar à lista de projetos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/25">
              <FolderKanban size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {projeto.nome}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                <FileText size={11} />
                <span className="font-mono">{projeto.processo_sei}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusCfg.cls}`}
            >
              {statusCfg.icon} {projeto.status}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${complexidade.cls}`}
            >
              <Shield size={11} />
              {complexidade.label}
            </span>
          </div>
        </div>
      </div>

      {/* Mock banner */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle size={16} />
          Back-end indisponível — exibindo dados de demonstração.
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Artefatos
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {data.total_artefatos}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Concluídos
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.artefatos_concluidos}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Pendentes
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.artefatos_pendentes}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Progresso
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold text-foreground">
              {data.progresso_percentual}%
            </span>
            <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  data.progresso_percentual === 100
                    ? "bg-emerald-500"
                    : data.progresso_percentual >= 50
                      ? "bg-amber-400"
                      : "bg-blue-400"
                }`}
                style={{ width: `${data.progresso_percentual}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info panel: equipe + vínculos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Equipe */}
        <div className="rounded-xl border border-border bg-background-card p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">
            <Users size={12} />
            Equipe de Planejamento
          </h3>
          <div className="space-y-2">
            {([
              { label: "Requisitante", pessoa: projeto.integrante_requisitante },
              { label: "Técnico", pessoa: projeto.integrante_tecnico },
              { label: "Administrativo", pessoa: projeto.integrante_administrativo },
            ] as const).map(({ label, pessoa }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-[10px] font-bold uppercase text-foreground-muted">
                  {label}
                </span>
                <span className="font-medium text-foreground">
                  {pessoa ? `${pessoa.nome} — ${pessoa.cargo}` : (
                    <span className="text-foreground-muted italic">Não definido</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vínculos */}
        <div className="rounded-xl border border-border bg-background-card p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">
            <Layers size={12} />
            Planejamento Estratégico
          </h3>

          {/* PDTIC */}
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase text-indigo-500 mb-1">
              Ações PDTIC ({projeto.acoes_pdtic.length})
            </div>
            {projeto.acoes_pdtic.length > 0 ? (
              <div className="space-y-1">
                {projeto.acoes_pdtic.map((a) => (
                  <div key={a.id} className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                    <strong>{a.codigo_acao}</strong> — {a.descricao.substring(0, 60)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-foreground-muted italic">Sem vínculos PDTIC</p>
            )}
          </div>

          {/* PACC */}
          <div>
            <div className="text-[10px] font-bold uppercase text-teal-500 mb-1">
              Itens PACC ({projeto.itens_pacc.length})
            </div>
            {projeto.itens_pacc.length > 0 ? (
              <div className="space-y-1">
                {projeto.itens_pacc.map((i) => (
                  <div key={i.id} className="rounded-md bg-teal-50 px-2 py-1 text-[11px] text-teal-700 dark:bg-teal-900/20 dark:text-teal-300">
                    <strong>#{i.numero_item}</strong> — {i.descricao_demanda.substring(0, 50)}
                    <span className="ml-1 font-mono">
                      R$ {i.valor_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-foreground-muted italic">Sem vínculos PACC</p>
            )}
          </div>
        </div>
      </div>

      {/* Artefatos title */}
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-violet-500" />
        <h2 className="text-lg font-bold text-foreground">
          Artefatos da Fase Interna
        </h2>
      </div>

      {/* Artefatos grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projeto.artefatos
          .sort((a, b) => a.id - b.id)
          .map((art) => (
            <ArtefatoCard
              key={art.id}
              artefato={art}
              onRefresh={refresh}
              onAlterarData={(a) => setAlterarDataArtefato(a)}
            />
          ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
       * FASE EXTERNA (LICITAÇÃO)
       * ═══════════════════════════════════════════════════════════════════ */}
      <FaseExternaSection
        projeto={projeto}
        onRefresh={refresh}
        usingMock={usingMock}
      />

      {/* Modal de compliance */}
      {alterarDataArtefato && (
        <AlterarDataArtefatoModal
          artefato={alterarDataArtefato}
          onClose={() => setAlterarDataArtefato(null)}
          onSuccess={refresh}
        />
      )}

      <ToastContainer />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
 * Componente: Fase Externa (Licitação)
 * Renderização condicional baseada no status do projeto
 * ═══════════════════════════════════════════════════════════════════════════ */

function FaseExternaSection({
  projeto,
  onRefresh,
  usingMock,
}: {
  projeto: ProjetoComDetalhes;
  onRefresh: () => void;
  usingMock: boolean;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [tramiteTexto, setTramiteTexto] = useState(
    projeto.situacao_licitacao_texto ?? ""
  );
  const [savingTramite, setSavingTramite] = useState(false);

  // Sync tramiteTexto when project data changes
  useEffect(() => {
    setTramiteTexto(projeto.situacao_licitacao_texto ?? "");
  }, [projeto.situacao_licitacao_texto]);

  /* ── Handlers ────────────────────────────────────────────────────────── */

  async function handleEnviar() {
    if (usingMock) {
      showToast("info", "Ação indisponível no modo demonstração.");
      return;
    }
    setActionLoading(true);
    try {
      await enviarParaLicitacao(projeto.id);
      showToast("success", "Projeto enviado para licitação com sucesso!");
      onRefresh();
    } catch (err: any) {
      showToast("error", err.message ?? "Erro ao enviar para licitação.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSalvarTramite() {
    if (!tramiteTexto.trim()) {
      showToast("error", "Preencha a situação da licitação.");
      return;
    }
    if (usingMock) {
      showToast("info", "Ação indisponível no modo demonstração.");
      return;
    }
    setSavingTramite(true);
    try {
      await atualizarTramiteLicitacao(projeto.id, tramiteTexto.trim());
      showToast("success", "Tramitação atualizada com sucesso!");
      onRefresh();
    } catch (err: any) {
      showToast("error", err.message ?? "Erro ao salvar tramitação.");
    } finally {
      setSavingTramite(false);
    }
  }

  async function handleConcluir() {
    if (usingMock) {
      showToast("info", "Ação indisponível no modo demonstração.");
      return;
    }
    setActionLoading(true);
    try {
      await concluirLicitacao(projeto.id);
      showToast("success", "Licitação concluída com sucesso!");
      onRefresh();
    } catch (err: any) {
      showToast("error", err.message ?? "Erro ao concluir licitação.");
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Formatação de data ──────────────────────────────────────────────── */

  function formatDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  /* ── Não exibir a seção se não estiver em um dos 3 estados ──────────── */

  const showSection =
    projeto.status === "Pronto para contratação" ||
    projeto.status === "Em licitação" ||
    projeto.status === "Licitação concluída";

  if (!showSection) return null;

  /* ── ESTADO 1: Pronto para contratação ──────────────────────────────── */

  if (projeto.status === "Pronto para contratação") {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 p-6 dark:border-violet-700 dark:from-violet-950/30 dark:to-purple-950/20">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 dark:bg-violet-700/10" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              <Send size={16} />
            </div>
            <h3 className="text-sm font-bold text-violet-800 dark:text-violet-300">
              Fase Externa — Licitação
            </h3>
          </div>

          <p className="text-sm text-violet-700/80 dark:text-violet-400/80 mb-4 max-w-xl">
            Todos os artefatos da fase interna foram concluídos. O projeto está
            pronto para ser enviado à área de compras/licitação.
          </p>

          <button
            onClick={handleEnviar}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Enviar Projeto para Licitação
          </button>
        </div>
      </div>
    );
  }

  /* ── ESTADO 2: Em licitação ─────────────────────────────────────────── */

  if (projeto.status === "Em licitação") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-violet-200 bg-background-card p-6 shadow-sm dark:border-violet-800">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            <PackageCheck size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Fase Externa — Em Licitação
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted mt-0.5">
              <CalendarClock size={11} />
              Enviado em{" "}
              <strong>{formatDate(projeto.data_envio_licitacao)}</strong>
            </div>
          </div>
        </div>

        {/* Tramitação textarea */}
        <div className="mb-4">
          <label
            htmlFor="tramite-licitacao"
            className="block text-xs font-bold uppercase tracking-wider text-foreground-muted mb-1.5"
          >
            Situação Atual da Licitação
          </label>
          <textarea
            id="tramite-licitacao"
            value={tramiteTexto}
            onChange={(e) => setTramiteTexto(e.target.value)}
            rows={3}
            placeholder="Ex: Processo encaminhado à Procuradoria Jurídica para análise..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition-colors resize-none"
          />
          <button
            onClick={handleSalvarTramite}
            disabled={savingTramite || !tramiteTexto.trim()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 transition-all hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
          >
            {savingTramite ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            Salvar Tramitação
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-foreground-muted">
            Quando o processo licitatório for finalizado, conclua a licitação
            para avançar o projeto.
          </p>
          <button
            onClick={handleConcluir}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {actionLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trophy size={16} />
            )}
            Concluir Licitação
          </button>
        </div>
      </div>
    );
  }

  /* ── ESTADO 3: Licitação concluída ──────────────────────────────────── */

  if (projeto.status === "Licitação concluída") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 dark:border-emerald-800 dark:from-emerald-950/20 dark:to-teal-950/15">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/30 dark:bg-emerald-700/10" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Trophy size={16} />
            </div>
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Licitação Concluída com Sucesso
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70 mb-1">
                Data de Envio
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <CalendarClock size={13} />
                {formatDate(projeto.data_envio_licitacao)}
              </div>
            </div>

            {projeto.situacao_licitacao_texto && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70 mb-1">
                  Último Registro de Tramitação
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {projeto.situacao_licitacao_texto}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-100/50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Projeto pronto para geração de Contrato.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
