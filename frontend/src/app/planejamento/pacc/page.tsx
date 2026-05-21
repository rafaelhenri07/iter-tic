"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  ChevronDown,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  GitBranchPlus,
  FolderPlus,
  Pencil,
  CirclePause,
  Trash2,
  Settings,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { EditarItemPaccModal } from "@/components/pacc/EditarItemPaccModal";
import { DesativarItemPaccDialog } from "@/components/pacc/DesativarItemPaccDialog";
import { ExcluirDefinitivoItemPaccDialog } from "@/components/pacc/ExcluirDefinitivoItemPaccDialog";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import {
  fetchExercicios,
  fetchPainelPacc,
  criarExercicioPacc,
  gerarRevisaoPacc,
} from "@/lib/api";
import { formatarNomeRevisao, formatCurrency } from "@/lib/formatters";
import type {
  PaccExercicio,
  PaccPainelResponse,
  PaccItemComAcao,
  PaccItem,
} from "@/types/pacc";
import { PaccSkeleton } from "@/components/ui/Skeleton";

/* ── Tipos ────────────────────────────────────────────────────────────── */

type FiltroAuditoria = "vigentes" | "todas" | "adicionadas" | "removidas";

const FILTRO_OPTIONS: { value: FiltroAuditoria; label: string }[] = [
  { value: "vigentes", label: "Visão Consolidada" },
  { value: "todas", label: "Histórico Completo" },
  { value: "adicionadas", label: "Adicionados nesta Revisão" },
  { value: "removidas", label: "Removidos nesta Revisão" },
];

/* ── Dropdown de ações administrativas ────────────────────────────────── */

function AdminDropdown({
  onNovoExercicio,
  onGerarRevisao,
  hasRevisao,
}: {
  onNovoExercicio: () => void;
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
            onClick={() => { onNovoExercicio(); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground
                       transition-colors hover:bg-background-secondary"
          >
            <FolderPlus size={15} className="text-foreground-muted" />
            Novo Exercício
          </button>
          {hasRevisao && (
            <button
              onClick={() => { onGerarRevisao(); setOpen(false); }}
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

/* ── Modal de Novo Exercício ──────────────────────────────────────────── */

function NovoExercicioModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await criarExercicioPacc({ ano });
      showToast("success", `Exercício ${ano} criado com Versão Inicial!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar exercício.");
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
        className="w-full max-w-xs rounded-2xl border border-border bg-background-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <FolderPlus size={18} className="text-brand-primary" />
          Novo Exercício PACC
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Ano
            </label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background-card px-3 text-sm text-foreground outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
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
              {submitting ? "Criando..." : "Criar Exercício"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────── */

export default function PaccPage() {
  const router = useRouter();
  const [exercicios, setExercicios] = useState<PaccExercicio[]>([]);
  const [selectedExercicioId, setSelectedExercicioId] = useState<number | null>(null);
  const [painel, setPainel] = useState<PaccPainelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [fetchKey, setFetchKey] = useState(0);
  const [showNovoExercicioModal, setShowNovoExercicioModal] = useState(false);
  const [editandoItem, setEditandoItem] = useState<PaccItemComAcao | PaccItem | null>(null);
  const [desativarItem, setDesativarItem] = useState<PaccItemComAcao | PaccItem | null>(null);
  const [excluirDefItem, setExcluirDefItem] = useState<PaccItemComAcao | PaccItem | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroAuditoria, setFiltroAuditoria] = useState<FiltroAuditoria>("vigentes");
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | null>(null);

  // Fetch exercícios
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchExercicios();
        setExercicios(data);
        if (data.length > 0) {
          const ativo = data.find((e) => e.ativo) ?? data[0];
          setSelectedExercicioId(ativo.id);
        } else {
          setLoading(false);
        }
      } catch {
        setError("Erro ao carregar exercícios.");
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  // Fetch painel
  useEffect(() => {
    if (selectedExercicioId === null) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPainelPacc(
          selectedExercicioId!,
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
  }, [selectedExercicioId, selectedRevisaoId, filtroAuditoria, fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  // Filtro local (busca)
  const itensFiltrados = useMemo(() => {
    if (!painel) return [];
    const todos = [...painel.itens_ativos, ...painel.itens_excluidos] as (PaccItemComAcao | PaccItem)[];
    if (!searchTerm.trim()) return todos;
    const term = searchTerm.toLowerCase();
    return todos.filter((item) => {
      const desc = item.descricao_demanda.toLowerCase();
      const num = item.numero_item.toLowerCase();
      const sei = (item.processo_sei ?? "").toLowerCase();
      const acaoPdtic = "acao_pdtic" in item ? (item as PaccItemComAcao).acao_pdtic : null;
      const acaoCodigo = acaoPdtic ? acaoPdtic.codigo_acao.toLowerCase() : "";
      return desc.includes(term) || num.includes(term) || sei.includes(term) || acaoCodigo.includes(term);
    });
  }, [painel, searchTerm]);

  // Stats
  const totalAtivos = painel?.itens_ativos.length ?? 0;
  const totalExcluidos = painel?.itens_excluidos.length ?? 0;
  const totalRevisoes = painel?.revisoes.length ?? 0;
  const valorTotal = (painel?.itens_ativos ?? []).reduce(
    (acc, item) => acc + Number(item.valor_estimado || 0), 0
  );

  // Gerar nova revisão
  async function handleGerarRevisao() {
    if (!selectedExercicioId) return;
    try {
      const novaRev = await gerarRevisaoPacc(selectedExercicioId);
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
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">PACC</h1>
            <p className="text-sm text-foreground-muted">Plano Anual de Contratações</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de exercício */}
          {exercicios.length > 0 && (
            <div className="relative">
              <select
                value={selectedExercicioId ?? ""}
                onChange={(e) => {
                  setSelectedExercicioId(Number(e.target.value));
                  setSelectedRevisaoId(null);
                }}
                className="h-9 appearance-none rounded-lg border border-border bg-background-card
                           pl-3 pr-7 text-xs font-medium text-foreground shadow-sm outline-none
                           transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {exercicios.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.ano}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
            </div>
          )}

          {/* Botão primário: Novo Item */}
          {painel && painel.revisoes.length > 0 ? (
            <Link
              href={`/planejamento/pacc/novo?exercicioId=${selectedExercicioId}`}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-4
                         text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                         transition-all hover:bg-brand-primary-hover hover:shadow-xl
                         hover:shadow-brand-primary/30"
            >
              <Plus size={15} />
              Novo Item
            </Link>
          ) : (
            <button
              disabled
              className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-4
                         text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                         opacity-50 cursor-not-allowed"
            >
              <Plus size={15} />
              Novo Item
            </button>
          )}

          {/* Dropdown ⚙️ */}
          <AdminDropdown
            onNovoExercicio={() => setShowNovoExercicioModal(true)}
            onGerarRevisao={handleGerarRevisao}
            hasRevisao={!!selectedExercicioId && !!painel}
          />
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      {painel && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Itens Ativos</div>
            <div className="text-xl font-bold text-foreground">{totalAtivos}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Excluídos</div>
            <div className="text-xl font-bold text-red-500 dark:text-red-400">{totalExcluidos}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Revisões</div>
            <div className="text-xl font-bold text-foreground">{totalRevisoes}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-card px-4 py-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">Valor Total</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(valorTotal)}</div>
          </div>
        </div>
      )}

      {/* ── Segmented Control — Revisões ────────────────────────── */}
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
                    ${isSelected
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-foreground-muted hover:bg-background-secondary hover:text-foreground"
                    }`}
                >
                  {formatarNomeRevisao(rev.numero_revisao)}
                  {rev.data_aprovacao && (
                    <span className={`ml-1.5 ${isSelected ? "text-white/70" : "text-foreground-muted/60"}`}>
                      {rev.data_aprovacao}
                    </span>
                  )}
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
              placeholder="Buscar itens..."
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
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────────── */}
      {!loading && exercicios.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-center">
          <ClipboardList size={36} className="text-foreground-muted mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground-muted">Nenhum exercício PACC cadastrado</p>
          <button
            onClick={() => setShowNovoExercicioModal(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20 dark:bg-brand-primary/20"
          >
            <FolderPlus size={14} />
            Criar primeiro exercício
          </button>
        </div>
      ) : loading ? (
        <PaccSkeleton />
      ) : error && !painel ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-red-500">
          <AlertCircle size={32} />
          <p className="text-sm">{error}</p>
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-background-card text-sm text-foreground-muted">
          Nenhum item encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 dark:bg-slate-800/40">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Item</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Processo SEI</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Quantidade</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Valor Estimado</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Vínculo PDTIC</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {itensFiltrados.map((item) => {
                const isExcluido = item.revisao_exclusao_id !== null;
                const acaoPdtic = "acao_pdtic" in item ? (item as PaccItemComAcao).acao_pdtic : null;
                return (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/planejamento/pacc/${item.id}`)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isExcluido
                        ? "bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/20"
                    }`}
                  >
                    {/* Item */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isExcluido
                            ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                            : "bg-brand-primary/10 text-brand-primary"
                        }`}>
                          {item.numero_item}
                        </span>
                        <span
                          className={`text-left text-sm font-medium ${
                            isExcluido
                              ? "text-red-600 line-through dark:text-red-400"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {item.descricao_demanda}
                        </span>
                      </div>
                    </td>

                    {/* Processo SEI */}
                    <td className="px-5 py-3.5">
                      {item.processo_sei ? (
                        <div className="flex flex-col gap-0.5">
                          {item.processo_sei.split("\n").map((sei, idx) => (
                            <span key={idx} className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {sei}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Quantidade */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item.quantidade || "—"}</span>
                    </td>

                    {/* Valor Estimado */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.valor_estimado > 0 ? formatCurrency(item.valor_estimado) : "—"}
                      </span>
                    </td>

                    {/* Vínculo PDTIC */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {acaoPdtic ? (
                        <span className="inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                          {acaoPdtic.codigo_acao}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-center">
                      {!isExcluido && (
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Tooltip content="Editar Dados">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditandoItem(item); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                            >
                              <Pencil size={15} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Desativar">
                            <button
                              onClick={(e) => { e.stopPropagation(); setDesativarItem(item); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/20"
                            >
                              <CirclePause size={15} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Excluir">
                            <button
                              onClick={(e) => { e.stopPropagation(); setExcluirDefItem(item); }}
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

      {showNovoExercicioModal && (
        <NovoExercicioModal
          onClose={() => setShowNovoExercicioModal(false)}
          onSuccess={refresh}
        />
      )}



      {editandoItem && painel && (
        <EditarItemPaccModal
          item={editandoItem}
          revisoes={painel.revisoes}
          onClose={() => setEditandoItem(null)}
          onSuccess={refresh}
        />
      )}

      {desativarItem && painel && (
        <DesativarItemPaccDialog
          open={!!desativarItem}
          item={desativarItem}
          revisoes={painel.revisoes}
          onClose={() => setDesativarItem(null)}
          onSuccess={refresh}
        />
      )}

      {excluirDefItem && (
        <ExcluirDefinitivoItemPaccDialog
          open={!!excluirDefItem}
          item={excluirDefItem}
          onClose={() => setExcluirDefItem(null)}
          onSuccess={refresh}
        />
      )}

      <ToastContainer />
    </div>
  );
}
