"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  Search,
  Plus,
  AlertCircle,
  Inbox,
  Filter,
  Pencil,
  Trash2,
  ChevronDown,
  X,
} from "lucide-react";


import { ToastContainer, showToast } from "@/components/ui/Toast";
import { fetchContratos, excluirContrato } from "@/lib/api";
import { formatarMoedaBRL } from "@/lib/formatters";
import type { ContratoListagem } from "@/types/contrato";
import { MODALIDADE_CONTRATO_CONFIG, COMPLEXIDADE_CONTRATO_CONFIG } from "@/types/contrato";
import { CardListSkeleton } from "@/components/ui/Skeleton";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const A_VENCER_DAYS = 180;

function diasAteVencimento(dataFim: string): number {
  const fim = new Date(dataFim + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function isAVencer(c: ContratoListagem): boolean {
  return ["Vigente", "Vigente com execução suspensa", "Vigente prorrogado"].includes(c.situacao_atual) && diasAteVencimento(c.data_fim_vigencia) <= A_VENCER_DAYS && diasAteVencimento(c.data_fim_vigencia) > 0;
}

const SITUACAO_PILL: Record<string, string> = {
  Vigente: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  "Vigente com execução suspensa": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  "Vigente prorrogado": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  "A Vencer": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  Extinto: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "contrato extinto com obrigações remanescentes": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
};

const TIPO_PILL: Record<string, string> = {
  "Aquisição": "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  "Serviço continuado": "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  "Subscrição": "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
};

/* ── Página ────────────────────────────────────────────────────────────── */

export default function ContratosPage() {
  const router = useRouter();
  const [contratos, setContratos] = useState<ContratoListagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState<string>("todos");
  const [filterModalidade, setFilterModalidade] = useState<string>("todos");
  const [filterComplexidade, setFilterComplexidade] = useState<string>("todos");
  const [filterTipoContratacao, setFilterTipoContratacao] = useState<string>("todos");
  const [filterAno, setFilterAno] = useState<string>("todos");
  const [filterTipoContrato, setFilterTipoContrato] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterSituacao !== "todos") count++;
    if (filterModalidade !== "todos") count++;
    if (filterComplexidade !== "todos") count++;
    if (filterTipoContratacao !== "todos") count++;
    if (filterAno !== "todos") count++;
    if (filterTipoContrato !== "todos") count++;
    return count;
  }, [filterSituacao, filterModalidade, filterComplexidade, filterTipoContratacao, filterAno, filterTipoContrato]);

  const clearAllFilters = () => {
    setFilterSituacao("todos");
    setFilterModalidade("todos");
    setFilterComplexidade("todos");
    setFilterTipoContratacao("todos");
    setFilterAno("todos");
    setFilterTipoContrato("todos");
  };

  // Modals

  const handleEditar = (id: number) => {
    router.push(`/execucao/contratos/${id}/editar`);
  };

  const handleExcluir = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este contrato? Esta ação é irreversível.")) return;
    try {
      await excluirContrato(id);
      showToast("success", "Contrato excluído com sucesso.");
      refresh();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao excluir contrato.");
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchContratos();
        setContratos(data);
        setUsingMock(false);
      } catch {
        console.warn("Backend indisponível — lista vazia");
        setContratos([]);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  const refresh = () => setFetchKey((k) => k + 1);

  // ── Opções dinâmicas de filtro ─────────────────────────────────────────
  const anosDisponiveis = useMemo(() => {
    const anos = [...new Set(contratos.map((c) => c.ano))].sort((a, b) => b - a);
    return anos;
  }, [contratos]);

  const tiposContratacaoDisponiveis = useMemo(() => {
    const tipos = [...new Set(contratos.map((c) => c.tipo_contratacao).filter(Boolean))] as string[];
    return tipos.sort();
  }, [contratos]);

  // ── Filtros aplicados ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = contratos;

    // Busca textual
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.numero}/${c.ano}`.includes(q) ||
          (c.fornecedor_nome ?? "").toLowerCase().includes(q) ||
          (c.projeto_nome ?? "").toLowerCase().includes(q) ||
          (c.nome_gestor ?? "").toLowerCase().includes(q)
      );
    }

    // Filtro por situação
    if (filterSituacao === "a_vencer") {
      result = result.filter((c) => isAVencer(c));
    } else if (filterSituacao !== "todos") {
      result = result.filter((c) => c.situacao_atual === filterSituacao);
    }

    // Filtro por modalidade
    if (filterModalidade !== "todos") {
      result = result.filter((c) => c.modalidade_contrato === filterModalidade);
    }

    // Filtro por complexidade
    if (filterComplexidade !== "todos") {
      result = result.filter((c) => c.complexidade === filterComplexidade);
    }

    // Filtro por tipo de contratação
    if (filterTipoContratacao !== "todos") {
      result = result.filter((c) => c.tipo_contratacao === filterTipoContratacao);
    }

    // Filtro por ano
    if (filterAno !== "todos") {
      result = result.filter((c) => String(c.ano) === filterAno);
    }

    // Filtro por tipo de contrato
    if (filterTipoContrato !== "todos") {
      result = result.filter((c) => c.tipo_contrato === filterTipoContrato);
    }

    return result;
  }, [contratos, search, filterSituacao, filterModalidade, filterComplexidade, filterTipoContratacao, filterAno, filterTipoContrato]);

  // ── Métricas rápidas ──────────────────────────────────────────────────
  const totalVigentes = contratos.filter((c) => ["Vigente", "Vigente com execução suspensa", "Vigente prorrogado"].includes(c.situacao_atual)).length;
  const totalAVencer = contratos.filter((c) => isAVencer(c)).length;
  const totalValor = contratos.reduce((sum, c) => sum + (typeof c.valor_total === "string" ? parseFloat(c.valor_total) : (c.valor_total || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <FileSignature size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Contratos
            </h1>
            <p className="text-xs text-foreground-muted">
              Execução e fiscalização de contratos de TI
            </p>
          </div>
        </div>

        <Link
          href="/execucao/contratos/novo"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-primary/25 transition-all hover:shadow-xl hover:shadow-brand-primary/30 hover:bg-brand-primary-hover"
        >
          <Plus size={16} />
          Novo Contrato
        </Link>
      </div>

      {/* Mock Banner */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle size={16} />
          Back-end indisponível — nenhum contrato carregado.
        </div>
      )}

      {/* KPI Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Total de Contratos
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {contratos.length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Vigentes
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalVigentes}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Valor Total Investido
          </div>
          <div className="mt-1 text-lg font-bold text-foreground font-mono">
            {formatarMoedaBRL(totalValor)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            A Vencer ({'<'} 180 dias)
          </div>
          <div className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
            {totalAVencer}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Exibindo
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {filtered.length}
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        {/* Row: Search + Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              type="text"
              placeholder="Buscar por nº contrato, fornecedor, projeto ou gestor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background-card pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 h-10 text-sm font-medium transition-all ${
              showFilters || activeFilterCount > 0
                ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                : "border-border bg-background-card text-foreground-muted hover:border-slate-300 hover:text-foreground"
            }`}
          >
            <Filter size={15} />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="rounded-xl border border-border bg-background-card p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Filtrar por
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-primary-hover transition-colors"
                >
                  <X size={12} />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Situação */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Situação
                </label>
                <select
                  value={filterSituacao}
                  onChange={(e) => setFilterSituacao(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="todos">Todas</option>
                  <option value="Vigente">Vigente</option>
                  <option value="Vigente com execução suspensa">Exec. suspensa</option>
                  <option value="Vigente prorrogado">Prorrogado</option>
                  <option value="a_vencer">A Vencer (180d)</option>
                  <option value="Extinto">Extinto</option>
                  <option value="contrato extinto com obrigações remanescentes">Ext. c/ obrigações</option>
                </select>
              </div>

              {/* Modalidade */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Modalidade
                </label>
                <select
                  value={filterModalidade}
                  onChange={(e) => setFilterModalidade(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="todos">Todas</option>
                  <option value="CONTRATO">Contrato</option>
                  <option value="ARP">ARP</option>
                </select>
              </div>

              {/* Complexidade */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Complexidade
                </label>
                <select
                  value={filterComplexidade}
                  onChange={(e) => setFilterComplexidade(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="todos">Todas</option>
                  <option value="simples">Simples</option>
                  <option value="intermediaria">Intermediária</option>
                  <option value="complexa">Complexa</option>
                </select>
              </div>

              {/* Tipo de Contratação */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Tipo Contratação
                </label>
                <select
                  value={filterTipoContratacao}
                  onChange={(e) => setFilterTipoContratacao(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="todos">Todos</option>
                  {tiposContratacaoDisponiveis.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Ano
                </label>
                <select
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="todos">Todos</option>
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={String(ano)}>{ano}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Contrato */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Tipo Contrato
                </label>
                <select
                  value={filterTipoContrato}
                  onChange={(e) => setFilterTipoContrato(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="todos">Todos</option>
                  <option value="Aquisição">Aquisição</option>
                  <option value="Serviço continuado">Serviço continuado</option>
                  <option value="Subscrição">Subscrição</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Data Table ────────────────────────────────────────────── */}
      {loading ? (
        <CardListSkeleton cards={6} />
      ) : filtered.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Inbox size={36} className="text-foreground-muted mb-2" />
          <p className="text-sm font-medium text-foreground-muted">
            {contratos.length === 0
              ? "Nenhum contrato cadastrado"
              : "Nenhum contrato encontrado com os filtros aplicados"}
          </p>
          {contratos.length === 0 && (
            <Link
              href="/execucao/contratos/novo"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
            >
              <Plus size={14} />
              Cadastrar primeiro contrato
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 dark:bg-slate-800/40">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Contrato e Fornecedor
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Projeto de Origem
                </th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Vigência
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Valor Total
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/execucao/contratos/${c.id}`)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/20"
                >
                  {/* Contrato e Fornecedor */}
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {String(c.numero).padStart(3, '0')}/{c.ano}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {(() => {
                        const modCfg = MODALIDADE_CONTRATO_CONFIG[c.modalidade_contrato] ?? MODALIDADE_CONTRATO_CONFIG.CONTRATO;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${modCfg.cls}`}>
                            {modCfg.icon} {modCfg.label}
                          </span>
                        );
                      })()}
                      {c.complexidade && (() => {
                        const compCfg = COMPLEXIDADE_CONTRATO_CONFIG[c.complexidade];
                        if (!compCfg) return null;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${compCfg.cls}`}>
                            {compCfg.icon} {compCfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.fornecedor_nome ?? "—"}
                    </div>
                  </td>

                  {/* Projeto de Origem */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {c.projeto_nome || "—"}
                    </span>
                  </td>

                  {/* Vigência */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {fmtDate(c.data_assinatura)} a {fmtDate(c.data_fim_vigencia)}
                    </span>
                  </td>

                  {/* Valor Total */}
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
                      {formatarMoedaBRL(c.valor_total)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {(() => {
                        const aVencer = isAVencer(c);
                        const label = aVencer ? "A VENCER" : c.situacao_atual.toUpperCase();
                        const pillCls = aVencer
                          ? SITUACAO_PILL["A Vencer"]
                          : (SITUACAO_PILL[c.situacao_atual] ?? "bg-slate-100 text-slate-600");
                        return (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${pillCls}`}>
                            {label}
                          </span>
                        );
                      })()}
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${TIPO_PILL[c.tipo_contrato] ?? "bg-slate-100 text-slate-600"}`}>
                        {c.tipo_contrato.toUpperCase()}
                      </span>
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditar(c.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                        title="Editar contrato"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleExcluir(c.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                        title="Excluir contrato"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Criação via página dedicada: /execucao/contratos/novo */}





      <ToastContainer />
    </div>
  );
}
