"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Inbox,
  Filter,
} from "lucide-react";
import { ProjetoRow } from "@/components/projetos/ProjetoRow";
import { DetalhesProjetoModal } from "@/components/projetos/DetalhesProjetoModal";
import { GerenciarArtefatoModal } from "@/components/projetos/GerenciarArtefatoModal";
import { ToastContainer } from "@/components/ui/Toast";
import { fetchProjetos } from "@/lib/api";
import type { ProjetoListagem, StatusProjeto, ArtefatoResumo } from "@/types/projeto";
import { ProjetosSkeleton } from "@/components/ui/Skeleton";

/* ── Dados mock ────────────────────────────────────────────────────────── */

const MOCK_PROJETOS: ProjetoListagem[] = [
  {
    id: 1,
    nome: "Aquisição de Switches Core Cisco Catalyst 9300 para Modernização do Datacenter Principal",
    processo_sei: "00052-00032300/2025-01",
    complexidade: "alta",
    status: "Em elaboração",
    criado_em: "2025-02-10T10:00:00Z",
    qtd_acoes_pdtic: 2,
    qtd_itens_pacc: 1,
    qtd_artefatos_total: 5,
    qtd_artefatos_concluidos: 3,
    artefatos_resumo: [
      { id: 101, tipo: "DFD", status: "Concluído", dias_decorridos: 12, ultimo_comentario: "Validado pelo requisitante em reunião presencial.", total_comentarios: 1, data_inicio: "2025-02-12", data_conclusao: "2025-02-24", comentarios: [] },
      { id: 102, tipo: "ETP", status: "Concluído", dias_decorridos: 18, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-02-25", data_conclusao: "2025-03-15" },
      { id: 103, tipo: "Mapa de Riscos", status: "Concluído", dias_decorridos: 8, ultimo_comentario: "Risco de dependência de fornecedor único identificado.", total_comentarios: 1, data_inicio: "2025-03-16", data_conclusao: "2025-03-24" },
      { id: 104, tipo: "Estimativa de Custos e Orçamento", status: "Iniciado", dias_decorridos: 5, ultimo_comentario: "Aguardando cotação da empresa X.", total_comentarios: 1, data_inicio: "2025-03-25", data_conclusao: null },
      { id: 105, tipo: "TR", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
    ],
    nome_requisitante: "Carlos Mendes",
    nome_tecnico: "Ana Beatriz Silva",
    nome_administrativo: "Roberto Alves",
    data_envio_licitacao: null,
    situacao_licitacao_texto: null,
    tramitacoes_resumo: [],
    total_tramitacoes: 0,
  },
  {
    id: 2,
    nome: "Contratação de Serviço de Sustentação e Evolução dos Sistemas Legados",
    processo_sei: "00052-00045100/2025-03",
    complexidade: "media",
    status: "Pronto para contratação",
    criado_em: "2025-01-15T10:00:00Z",
    qtd_acoes_pdtic: 1,
    qtd_itens_pacc: 1,
    qtd_artefatos_total: 5,
    qtd_artefatos_concluidos: 5,
    artefatos_resumo: [
      { id: 201, tipo: "DFD", status: "Concluído", dias_decorridos: 10, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-04-01", data_conclusao: "2025-04-11" },
      { id: 202, tipo: "ETP", status: "Concluído", dias_decorridos: 14, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-04-12", data_conclusao: "2025-04-26" },
      { id: 203, tipo: "Mapa de Riscos", status: "Concluído", dias_decorridos: 7, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-04-27", data_conclusao: "2025-05-04" },
      { id: 204, tipo: "Estimativa de Custos e Orçamento", status: "Concluído", dias_decorridos: 9, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-05-05", data_conclusao: "2025-05-14" },
      { id: 205, tipo: "TR", status: "Concluído", dias_decorridos: 20, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-05-15", data_conclusao: "2025-06-04" },
    ],
    nome_requisitante: "Fernando Costa",
    nome_tecnico: "Juliana Martins",
    nome_administrativo: "Patricia Rocha",
    data_envio_licitacao: null,
    situacao_licitacao_texto: null,
    tramitacoes_resumo: [],
    total_tramitacoes: 0,
  },
  {
    id: 3,
    nome: "Aquisição de Solução SIEM/SOC Gerenciado com Monitoramento 24x7",
    processo_sei: "00052-00078900/2025-06",
    complexidade: "alta",
    status: "Em elaboração",
    criado_em: "2025-06-10T10:00:00Z",
    qtd_acoes_pdtic: 1,
    qtd_itens_pacc: 1,
    qtd_artefatos_total: 5,
    qtd_artefatos_concluidos: 1,
    artefatos_resumo: [
      { id: 301, tipo: "DFD", status: "Concluído", dias_decorridos: 15, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-06-12", data_conclusao: "2025-06-27" },
      { id: 302, tipo: "ETP", status: "Iniciado", dias_decorridos: 3, ultimo_comentario: "Em análise pela equipe técnica.", total_comentarios: 1, data_inicio: "2025-06-28", data_conclusao: null },
      { id: 303, tipo: "Mapa de Riscos", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 304, tipo: "Estimativa de Custos e Orçamento", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 305, tipo: "TR", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
    ],
    nome_requisitante: "Lucas Ferreira",
    nome_tecnico: "Marcos Souza",
    nome_administrativo: null,
    data_envio_licitacao: null,
    situacao_licitacao_texto: null,
    tramitacoes_resumo: [],
    total_tramitacoes: 0,
  },
  {
    id: 4,
    nome: "Capacitação em ITIL v4 e COBIT para Equipe de Governança de TI",
    processo_sei: "00052-00091200/2025-08",
    complexidade: "baixa",
    status: "Em elaboração",
    criado_em: "2025-08-01T10:00:00Z",
    qtd_acoes_pdtic: 1,
    qtd_itens_pacc: 0,
    qtd_artefatos_total: 5,
    qtd_artefatos_concluidos: 0,
    artefatos_resumo: [
      { id: 401, tipo: "DFD", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 402, tipo: "ETP", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 403, tipo: "Mapa de Riscos", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 404, tipo: "Estimativa de Custos e Orçamento", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 405, tipo: "TR", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
    ],
    nome_requisitante: "Amanda Ribeiro",
    nome_tecnico: null,
    nome_administrativo: null,
    data_envio_licitacao: null,
    situacao_licitacao_texto: null,
    tramitacoes_resumo: [],
    total_tramitacoes: 0,
  },
  {
    id: 5,
    nome: "Contratação de Link MPLS Dedicado para Interligação das Unidades Remotas",
    processo_sei: "00052-00056700/2025-04",
    complexidade: "media",
    status: "Suspenso",
    criado_em: "2025-04-20T10:00:00Z",
    qtd_acoes_pdtic: 0,
    qtd_itens_pacc: 0,
    qtd_artefatos_total: 5,
    qtd_artefatos_concluidos: 2,
    artefatos_resumo: [
      { id: 501, tipo: "DFD", status: "Concluído", dias_decorridos: 11, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-04-22", data_conclusao: "2025-05-03" },
      { id: 502, tipo: "ETP", status: "Concluído", dias_decorridos: 16, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-05-04", data_conclusao: "2025-05-20" },
      { id: 503, tipo: "Mapa de Riscos", status: "Iniciado", dias_decorridos: 4, ultimo_comentario: null, total_comentarios: 0, data_inicio: "2025-05-21", data_conclusao: null },
      { id: 504, tipo: "Estimativa de Custos e Orçamento", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
      { id: 505, tipo: "TR", status: "Não iniciado", dias_decorridos: null, ultimo_comentario: null, total_comentarios: 0, data_inicio: null, data_conclusao: null },
    ],
    nome_requisitante: "Diego Oliveira",
    nome_tecnico: "Camila Nascimento",
    nome_administrativo: "Paulo Henrique",
    data_envio_licitacao: null,
    situacao_licitacao_texto: null,
    tramitacoes_resumo: [],
    total_tramitacoes: 0,
  },
];

/* ── Filtros de status ─────────────────────────────────────────────────── */

const STATUS_TABS: { label: string; value: StatusProjeto | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "Em elaboração", value: "Em elaboração" },
  { label: "Pronto para contratação", value: "Pronto para contratação" },
  { label: "Em licitação", value: "Em licitação" },
  { label: "Licitação concluída", value: "Licitação concluída" },
  { label: "Suspenso", value: "Suspenso" },
  { label: "Cancelado", value: "Cancelado" },
];

/* ── Página principal ──────────────────────────────────────────────────── */

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<ProjetoListagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Modais
  const [selectedProjetoId, setSelectedProjetoId] = useState<number | null>(null);
  const [artefatoModal, setArtefatoModal] = useState<{ projetoId: number; artefato: ArtefatoResumo } | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusProjeto | "todos">(
    "todos"
  );

  // Fetch
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProjetos();
        setProjetos(data);
      } catch {
        console.warn("Backend indisponível — usando dados mock");
        setProjetos(MOCK_PROJETOS);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  // Filtragem
  const projetosFiltrados = useMemo(() => {
    let resultado = projetos;

    if (statusFilter !== "todos") {
      resultado = resultado.filter((p) => p.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.processo_sei.toLowerCase().includes(term) ||
          (p.nome_requisitante ?? "").toLowerCase().includes(term) ||
          (p.nome_tecnico ?? "").toLowerCase().includes(term)
      );
    }

    return resultado;
  }, [projetos, statusFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = projetos.length;
    const emElaboracao = projetos.filter(
      (p) => p.status === "Em elaboração"
    ).length;
    const emLicitacao = projetos.filter(
      (p) => p.status === "Em licitação"
    ).length;
    const licitacaoConcluida = projetos.filter(
      (p) => p.status === "Licitação concluída"
    ).length;
    return { total, emElaboracao, emLicitacao, licitacaoConcluida };
  }, [projetos]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/25">
            <FolderKanban size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Meus Projetos
            </h1>
            <p className="text-sm text-foreground-muted">
              Projetos de contratação e artefatos da fase interna
            </p>
          </div>
        </div>

        <Link
          href="/projetos/novo"
          className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
        >
          <Plus size={16} />
          Novo Projeto
        </Link>
      </div>

      {/* Banner mock */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle size={16} />
          Back-end indisponível — exibindo dados de demonstração.
        </div>
      )}

      {/* Stats */}
      {!loading && projetos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-200">
              {stats.total}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Em Elaboração
            </div>
            <div className="mt-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.emElaboracao}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Em Licitação
            </div>
            <div className="mt-1 text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.emLicitacao}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Licitação Concluída
            </div>
            <div className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.licitacaoConcluida}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && projetos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SEI ou membro da equipe..."
              className="h-9 w-full rounded-lg border border-border bg-background-card pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background-card p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all
                  ${statusFilter === tab.value
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-foreground-muted hover:text-foreground hover:bg-background-secondary"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ProjetosSkeleton />
      ) : projetos.length === 0 ? (
        /* Empty state */
        <div className="flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-500 dark:bg-violet-900/30 dark:text-violet-400 mb-4">
            <Inbox size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            Nenhum projeto cadastrado
          </h3>
          <p className="text-sm text-foreground-muted max-w-sm text-center">
            Crie seu primeiro projeto de contratação para começar a gerenciar os
            artefatos da fase interna da licitação.
          </p>
          <Link
            href="/projetos/novo"
            className="mt-5 flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-violet-500/30"
          >
            <Plus size={16} />
            Criar Primeiro Projeto
          </Link>
        </div>
      ) : projetosFiltrados.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-sm text-foreground-muted">
          <Filter size={16} className="mr-2" />
          Nenhum projeto encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm">
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Projeto
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Esteira de Artefatos
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status do Projeto
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Prioridade
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {projetosFiltrados.map((p) => (
                  <ProjetoRow
                    key={p.id}
                    projeto={p}
                    onVerDetalhes={(id) => setSelectedProjetoId(id)}
                    onEditProjeto={(proj) => alert(`Editar: ${proj.nome} (ID: ${proj.id})`)}
                    onArtefatoClick={(pid, a) => setArtefatoModal({ projetoId: pid, artefato: a })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      {selectedProjetoId !== null && (
        <DetalhesProjetoModal
          projetoId={selectedProjetoId}
          onClose={() => setSelectedProjetoId(null)}
          onRefresh={() => setFetchKey((k) => k + 1)}
        />
      )}

      {artefatoModal && (
        <GerenciarArtefatoModal
          projetoId={artefatoModal.projetoId}
          artefato={artefatoModal.artefato}
          onClose={() => setArtefatoModal(null)}
          onSuccess={() => setFetchKey((k) => k + 1)}
        />
      )}

      <ToastContainer />
    </div>
  );
}
