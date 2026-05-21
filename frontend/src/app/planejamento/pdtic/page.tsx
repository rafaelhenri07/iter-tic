"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  GitBranchPlus,
  FolderPlus,
  Pencil,
  CirclePause,
  History,
  Trash2,
  Settings,
  MoreVertical,
  PauseCircle,
  RefreshCw,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { DesativarAcaoDialog } from "@/components/pdtic/DesativarAcaoDialog";
import { ExcluirDefinitivoDialog } from "@/components/pdtic/ExcluirDefinitivoDialog";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import {
  fetchPeriodos,
  fetchPainelPdtic,
  criarPeriodoPdtic,
  gerarRevisaoPdtic,
} from "@/lib/api";
import { formatarNomeRevisao, formatMonthYear } from "@/lib/formatters";
import type {
  PdticPeriodo,
  PdticPainelResponse,
  PdticAcao,
  StatusAcao,
} from "@/types/pdtic";
import { STATUS_ACAO_COLOR } from "@/types/pdtic";
import { PdticSkeleton } from "@/components/ui/Skeleton";

/* ── Tipos ────────────────────────────────────────────────────────────── */

type FiltroAuditoria = "vigentes" | "todas" | "adicionadas" | "removidas";

const FILTRO_OPTIONS: { value: FiltroAuditoria; label: string }[] = [
  { value: "vigentes", label: "Visão Consolidada" },
  { value: "todas", label: "Histórico Completo" },
  { value: "adicionadas", label: "Adicionadas nesta Revisão" },
  { value: "removidas", label: "Removidas nesta Revisão" },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function sumValues(obj: Record<string, number> | null): number {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

const STATUS_PILL: Record<string, string> = {
  "Não iniciada": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "Em andamento": "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  "Contratada": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
};

/* ── Dropdown de ações administrativas ────────────────────────────────── */

function AdminDropdown({
  onNovoPeriodo,
  onGerarRevisao,
  hasRevisao,
}: {
  onNovoPeriodo: () => void;
  onGerarRevisao: () => void;
  hasRevisao: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border
                   bg-background-card text-foreground-muted shadow-sm transition-all
                   hover:bg-background-secondary hover:text-foreground"
        title="Ações administrativas"
      >
        <Settings size={15} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border
                     bg-background-card shadow-xl"
          style={{ animation: "modalIn 0.15s ease-out" }}
        >
          <button
            onClick={() => {
              onNovoPeriodo();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground
                       transition-colors hover:bg-background-secondary"
          >
            <FolderPlus size={15} className="text-foreground-muted" />
            Novo Período
          </button>
          {hasRevisao && (
            <button
              onClick={() => {
                onGerarRevisao();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-left text-sm text-foreground
                         transition-colors hover:bg-background-secondary"
            >
              <GitBranchPlus size={15} className="text-foreground-muted" />
              Gerar Nova Revisão
            </button>
          )}
        </div>
      )}
    </div>
  );
}


/* ── Modal de Novo Período ────────────────────────────────────────────── */

function NovoPeriodoModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [anoInicio, setAnoInicio] = useState(currentYear);
  const [anoFim, setAnoFim] = useState(currentYear + 3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (anoFim <= anoInicio) {
      showToast("error", "Ano final deve ser maior que o ano inicial.");
      return;
    }
    setSubmitting(true);
    try {
      await criarPeriodoPdtic({ ano_inicio: anoInicio, ano_fim: anoFim });
      showToast("success", `Período ${anoInicio}–${anoFim} criado com Versão Inicial!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar período.");
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
        className="w-full max-w-sm rounded-2xl border border-border bg-background-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <FolderPlus size={18} className="text-brand-primary" />
          Novo Período PDTIC
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                Ano Início
              </label>
              <input
                type="number"
                value={anoInicio}
                onChange={(e) => setAnoInicio(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background-card px-3 text-sm text-foreground outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                Ano Fim
              </label>
              <input
                type="number"
                value={anoFim}
                onChange={(e) => setAnoFim(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background-card px-3 text-sm text-foreground outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>
          <p className="text-[11px] text-foreground-muted">
            Uma <strong>Versão Inicial</strong> será criada automaticamente.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-foreground-muted hover:bg-background-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 rounded-lg bg-brand-primary px-4 text-xs font-bold text-white hover:bg-brand-primary-hover shadow-brand-primary/25 disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Criar Período"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────── */

export default function PdticPage() {
  const router = useRouter();
  const [periodos, setPeriodos] = useState<PdticPeriodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null);
  const [painel, setPainel] = useState<PdticPainelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [desativarDialogAcao, setDesativarDialogAcao] = useState<PdticAcao | null>(null);
  const [excluirDefDialogAcao, setExcluirDefDialogAcao] = useState<PdticAcao | null>(null);
  const [showNovoPeriodoModal, setShowNovoPeriodoModal] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusAcao | "todas">("todas");
  const [filtroAuditoria, setFiltroAuditoria] = useState<FiltroAuditoria>("vigentes");
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | null>(null);

  // Fetch períodos
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPeriodos();
        setPeriodos(data);
        if (data.length > 0) {
          const ativo = data.find((p) => p.ativo) ?? data[0];
          setSelectedPeriodoId(ativo.id);
        } else {
          setLoading(false);
        }
      } catch {
        setError("Erro ao carregar períodos.");
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  // Fetch painel
  useEffect(() => {
    if (selectedPeriodoId === null) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPainelPdtic(
          selectedPeriodoId!,
          selectedRevisaoId ?? undefined,
          filtroAuditoria
        );
        setPainel(data);
        if (selectedRevisaoId === null && data.revisoes.length > 0) {
          setSelectedRevisaoId(data.revisoes[data.revisoes.length - 1].id);
        }
      } catch {
        setError("Erro ao carregar painel.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedPeriodoId, selectedRevisaoId, filtroAuditoria, fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  // Filtro local (busca + status)
  const acoesFiltradas = useMemo(() => {
    if (!painel) return [];
    const todas: PdticAcao[] = [...painel.acoes_ativas, ...painel.acoes_excluidas];
    return todas
      .filter((acao) => {
        const matchSearch =
          searchTerm === "" ||
          acao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          acao.codigo_acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (acao.departamentos_rel?.map(d => d.nome).join(" ") || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (acao.unidades_demandantes_rel?.map(d => d.nome).join(" ") || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === "todas" || acao.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const numA = parseInt(a.codigo_acao.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.codigo_acao.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
  }, [painel, searchTerm, statusFilter]);

  const selectedPeriodo = periodos.find((p) => p.id === selectedPeriodoId);

  const anosRange = useMemo(() => {
    if (!selectedPeriodo) return [2024, 2025, 2026, 2027];
    const anos: number[] = [];
    for (let y = selectedPeriodo.ano_inicio; y <= selectedPeriodo.ano_fim; y++) anos.push(y);
    return anos;
  }, [selectedPeriodo]);

  const totalAtivas = painel?.acoes_ativas.length ?? 0;
  const totalExcluidas = painel?.acoes_excluidas.length ?? 0;
  const totalRevisoes = painel?.revisoes.length ?? 0;

  async function handleGerarRevisao() {
    if (!selectedPeriodoId) return;
    try {
      const novaRev = await gerarRevisaoPdtic(selectedPeriodoId);
      showToast("success", `${formatarNomeRevisao(novaRev.numero_revisao)} gerada com sucesso!`);
      setSelectedRevisaoId(novaRev.id);
      refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao gerar revisão.");
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">PDTIC</h1>
            <p className="text-sm text-foreground-muted">
              Plano Diretor de Tecnologia da Informação e Comunicação
            </p>
          </div>
        </div>

        {/* Ações do cabeçalho — apenas "Nova Ação" como primário */}
        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          {periodos.length > 0 && (
            <div className="relative">
              <select
                value={selectedPeriodoId ?? ""}
                onChange={(e) => {
                  setSelectedPeriodoId(Number(e.target.value));
                  setSelectedRevisaoId(null);
                  setPainel(null);
                }}
                className="h-9 appearance-none rounded-lg border border-border bg-background-card
                           pl-3 pr-7 text-xs font-medium text-foreground shadow-sm outline-none
                           transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {periodos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ano_inicio}–{p.ano_fim}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
            </div>
          )}

          {/* Botão primário: Nova Ação */}
          {painel && painel.revisoes.length > 0 ? (
            <Link
              href={`/planejamento/pdtic/novo?periodoId=${selectedPeriodoId}`}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-4
                         text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                         transition-all hover:bg-brand-primary-hover hover:shadow-xl
                         hover:shadow-brand-primary/30"
            >
              <Plus size={15} />
              Nova Ação
            </Link>
          ) : (
            <button
              disabled
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-4
                         text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                         opacity-50 cursor-not-allowed"
            >
              <Plus size={15} />
              Nova Ação
            </button>
          )}

          {/* Dropdown de ações administrativas (⚙️) */}
          <AdminDropdown
            onNovoPeriodo={() => setShowNovoPeriodoModal(true)}
            onGerarRevisao={handleGerarRevisao}
            hasRevisao={!!selectedPeriodoId && !!painel}
          />
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      {painel && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Ativas</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalAtivas}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Excluídas</div>
            <div className="text-xl font-bold text-red-500 dark:text-red-400">{totalExcluidas}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Revisões</div>
            <div className="text-xl font-bold text-foreground">{totalRevisoes}</div>
          </div>
        </div>
      )}

      {/* ── Segmented Control – Revisões ────────────────────────── */}
      {painel && painel.revisoes.length > 0 && (
        <div className="rounded-lg border border-border bg-background-card p-1 shadow-sm">
          <div className="flex gap-0.5 overflow-x-auto">
            {painel.revisoes.map((rev) => {
              const isSelected = rev.id === selectedRevisaoId;
              return (
                <button
                  key={rev.id}
                  onClick={() => setSelectedRevisaoId(rev.id)}
                  className={`relative min-w-max rounded-md px-4 py-2 text-xs font-medium transition-all whitespace-nowrap
                    ${
                      isSelected
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-foreground-muted hover:bg-background-secondary hover:text-foreground"
                    }`}
                >
                  {formatarNomeRevisao(rev.numero_revisao)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Barra de Filtros Unificada ──────────────────────────── */}
      {painel && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Buscar ações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background-card pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          {/* Filtro de auditoria */}
          <select
            value={filtroAuditoria}
            onChange={(e) => setFiltroAuditoria(e.target.value as FiltroAuditoria)}
            className="h-9 rounded-lg border border-border bg-background-card px-3 pr-8 text-sm text-foreground outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
          >
            {FILTRO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Filtro de status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusAcao | "todas")}
            className="h-9 rounded-lg border border-border bg-background-card px-3 pr-8 text-sm text-foreground outline-none transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
          >
            <option value="todas">Todos os status</option>
            {(Object.keys(STATUS_ACAO_COLOR) as StatusAcao[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────────── */}
      {!loading && periodos.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-center">
          <BookOpen size={36} className="text-foreground-muted mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground-muted">Nenhum período PDTIC cadastrado</p>
          <button
            onClick={() => setShowNovoPeriodoModal(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20 dark:bg-brand-primary/20"
          >
            <FolderPlus size={14} />
            Criar primeiro período
          </button>
        </div>
      ) : loading ? (
        <PdticSkeleton />
      ) : error && !painel ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-red-500">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : acoesFiltradas.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-sm text-foreground-muted">
          Nenhuma ação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 dark:bg-slate-800/40 [&>th:first-child]:rounded-tl-xl [&>th:last-child]:rounded-tr-xl">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Ação</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Departamento</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Previsão de Contratação</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Orçamento Estimado</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-center w-[144px] text-[10px] font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {acoesFiltradas.map((acao) => {
                const isExcluida = acao.revisao_exclusao_id !== null;
                const total = sumValues(acao.valores_investimento) + sumValues(acao.valores_custeio);
                return (
                  <tr
                    key={acao.id}
                    onClick={() => router.push(`/planejamento/pdtic/${acao.id}`)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isExcluida
                        ? "bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/20"
                    }`}
                  >
                    {/* Ação */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isExcluida
                            ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                            : "bg-brand-primary/10 text-brand-primary"
                        }`}>
                          {acao.codigo_acao}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isExcluida
                              ? "text-red-600 line-through dark:text-red-400"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {acao.descricao}
                        </span>
                      </div>
                    </td>

                    {/* Departamento */}
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {acao.departamentos_rel && acao.departamentos_rel.length > 0
                          ? acao.departamentos_rel.map(d => d.sigla || d.nome).join(", ")
                          : "—"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{formatMonthYear(acao.previsao_contratacao)}</span>
                    </td>

                    {/* Orçamento */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {total > 0 ? formatCurrency(total) : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_PILL[acao.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {acao.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-center">
                      {!isExcluida && (
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Tooltip content="Editar Dados">
                            <button
                              onClick={() => router.push(`/planejamento/pdtic/${acao.id}/editar`)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                            >
                              <Pencil size={15} />
                            </button>
                          </Tooltip>

                          <Tooltip content="Atualizar Revisão">
                            <button
                              onClick={() => router.push(`/planejamento/pdtic/${acao.id}/editar?revisao=true`)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                            >
                              <History size={15} />
                            </button>
                          </Tooltip>

                          <Tooltip content="Desativar">
                            <button
                              onClick={() => setDesativarDialogAcao(acao)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/20"
                            >
                              <CirclePause size={15} />
                            </button>
                          </Tooltip>

                          <Tooltip content="Excluir">
                            <button
                              onClick={() => setExcluirDefDialogAcao(acao)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                            >
                              <Trash2 size={15} />
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modais ──────────────────────────────────────────────── */}

      {showNovoPeriodoModal && (
        <NovoPeriodoModal
          onClose={() => setShowNovoPeriodoModal(false)}
          onSuccess={refresh}
        />
      )}


      {desativarDialogAcao && painel && (
        <DesativarAcaoDialog
          open={!!desativarDialogAcao}
          onClose={() => setDesativarDialogAcao(null)}
          acao={desativarDialogAcao}
          revisoes={painel.revisoes}
          onSuccess={refresh}
        />
      )}

      {excluirDefDialogAcao && (
        <ExcluirDefinitivoDialog
          open={!!excluirDefDialogAcao}
          onClose={() => setExcluirDefDialogAcao(null)}
          acao={excluirDefDialogAcao}
          onSuccess={refresh}
        />
      )}

      <ToastContainer />
    </div>
  );
}
