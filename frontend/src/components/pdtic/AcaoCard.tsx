"use client";

import { useState } from "react";
import {
  ChevronDown,
  Calendar,
  Building2,
  Hash,
  Gauge,
  DollarSign,
  Tag,
  Clock,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Trash2,
  MoreVertical,
  Sparkles,
  Archive,
} from "lucide-react";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import {
  TIPO_NECESSIDADE_LABEL,
  STATUS_ACAO_COLOR,
} from "@/types/pdtic";
import { formatarNomeRevisao } from "@/lib/formatters";

/* ── Helpers ───────────────────────────────────────────────────────────── */

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

function getRevisaoLabel(
  revisaoId: number,
  revisoes: PdticRevisao[]
): string {
  const rev = revisoes.find((r) => r.id === revisaoId);
  return rev ? formatarNomeRevisao(rev.numero_revisao) : `Rev #${revisaoId}`;
}

/* ── GUT Bar ───────────────────────────────────────────────────────────── */

function GutBar({ value }: { value: number }) {
  const pct = Math.min((value / 125) * 100, 100);
  const color =
    pct >= 70
      ? "bg-red-500"
      : pct >= 40
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground-muted">
        {value}/125
      </span>
    </div>
  );
}

/* ── Valores por ano ───────────────────────────────────────────────────── */

function ValoresGrid({
  label,
  valores,
  icon,
}: {
  label: string;
  valores: Record<string, number> | null;
  icon: React.ReactNode;
}) {
  if (!valores || Object.keys(valores).length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(valores)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([ano, valor]) => (
            <div
              key={ano}
              className="rounded-lg border border-border bg-background-secondary px-3 py-2"
            >
              <div className="text-[10px] font-medium text-foreground-muted">
                {ano}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatCurrency(valor)}
              </div>
            </div>
          ))}
      </div>
      <div className="mt-1.5 text-right text-xs font-medium text-foreground-muted">
        Total: {formatCurrency(sumValues(valores))}
      </div>
    </div>
  );
}

/* ── Campo de detalhe ──────────────────────────────────────────────────── */

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

/* ── Ação Card ─────────────────────────────────────────────────────────── */

interface AcaoCardProps {
  acao: PdticAcao;
  revisoes: PdticRevisao[];
  revisaoAtualId?: number | null;
  onEditar?: (acao: PdticAcao) => void;
  onExcluir?: (acao: PdticAcao) => void;
}

export function AcaoCard({ acao, revisoes, revisaoAtualId, onEditar, onExcluir }: AcaoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isExcluida = acao.revisao_exclusao_id !== null;
  const isAtiva = !isExcluida;

  const totalInvestimento = sumValues(acao.valores_investimento);
  const totalCusteio = sumValues(acao.valores_custeio);
  const totalGeral = totalInvestimento + totalCusteio;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300
        ${
          isExcluida
            ? "border-red-300 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
            : "border-border bg-background-card hover:border-border-hover hover:shadow-md"
        }`}
    >
      {/* Borda lateral colorida */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          isExcluida
            ? "bg-red-500"
            : "bg-gradient-to-b from-brand-primary to-indigo-400"
        }`}
      />

      {/* Header do card — sempre visível */}
      <div className="flex w-full items-start gap-4 px-5 py-4">
        {/* Código */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold
            ${
              isExcluida
                ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            }`}
        >
          {acao.codigo_acao}
        </button>

        {/* Info principal — clicável */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-semibold ${
                isExcluida
                  ? "text-red-700 line-through dark:text-red-400"
                  : "text-foreground"
              }`}
            >
              {acao.descricao}
            </h3>

            {/* Badge: retirada na revisão selecionada */}
            {isExcluida && acao.revisao_exclusao_id === revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                <Archive size={9} />
                Retirada na {getRevisaoLabel(acao.revisao_exclusao_id!, revisoes)}
              </span>
            )}

            {/* Badge: excluída em outra revisão */}
            {isExcluida && acao.revisao_exclusao_id !== revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                <AlertTriangle size={9} />
                Excluída
              </span>
            )}

            {/* Badge: adicionada na revisão selecionada */}
            {!isExcluida && acao.revisao_inclusao_id === revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Sparkles size={9} />
                Adicionada na {getRevisaoLabel(acao.revisao_inclusao_id, revisoes)}
              </span>
            )}

            {/* Badge: herdada */}
            {!isExcluida && revisaoAtualId && acao.revisao_inclusao_id !== revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                Herdada da {getRevisaoLabel(acao.revisao_inclusao_id, revisoes)}
              </span>
            )}

            {acao.acao_pai_id && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400">
                <RefreshCw size={9} />
                Revisada
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_ACAO_COLOR[acao.status]}`}
            >
              {acao.status}
            </span>
            {acao.tipo_necessidade?.map((tipo) => (
              <span key={tipo} className="rounded-full bg-background-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground-muted">
                {TIPO_NECESSIDADE_LABEL[tipo]}
              </span>
            ))}
            <span className="text-[11px] text-foreground-muted">
              <Building2 size={11} className="mr-0.5 inline" />
              {acao.unidade_demandante}
            </span>
            {totalGeral > 0 && (
              <span className="text-[11px] font-medium text-foreground-muted">
                <DollarSign size={11} className="mr-0.5 inline" />
                {formatCurrency(totalGeral)}
              </span>
            )}
          </div>
        </button>

        {/* GUT + Actions + Chevron */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <GutBar value={acao.total_gut} />

            {/* Context menu — only for active actions */}
            {isAtiva && (onEditar || onExcluir) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted
                             transition-all hover:bg-background-secondary hover:text-foreground"
                  title="Ações"
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen && (
                  <>
                    {/* Click-away */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                    />
                    {/* Dropdown */}
                    <div
                      className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border
                                 bg-background-card shadow-xl"
                      style={{ animation: "modalIn 0.15s ease-out" }}
                    >
                      {onEditar && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onEditar(acao);
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground
                                     transition-colors hover:bg-background-secondary"
                        >
                          <Pencil size={14} className="text-amber-500" />
                          Editar
                        </button>
                      )}
                      {onExcluir && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onExcluir(acao);
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600
                                     transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5"
          >
            <ChevronDown
              size={16}
              className={`text-foreground-muted transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border px-5 py-4 space-y-5">
          {/* Grid de detalhes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField
              label="Necessidade"
              value={acao.necessidade}
              icon={<Hash size={10} />}
            />
            <DetailField
              label="Departamento"
              value={acao.departamento}
              icon={<Building2 size={10} />}
            />
            <DetailField
              label="Unidade Responsável"
              value={acao.unidade_responsavel}
              icon={<Building2 size={10} />}
            />
            <DetailField
              label="Meta"
              value={acao.meta}
              icon={<Tag size={10} />}
            />
            <DetailField
              label="Indicador"
              value={acao.indicador}
              icon={<Gauge size={10} />}
            />
            <DetailField
              label="Quantidade"
              value={acao.quantidade}
              icon={<Hash size={10} />}
            />
            <DetailField
              label="Previsão de Contratação"
              value={acao.previsao_contratacao}
              icon={<Calendar size={10} />}
            />
            <DetailField
              label="Previsão de Renovação"
              value={acao.previsao_renovacao}
              icon={<Clock size={10} />}
            />
          </div>

          {/* Valores financeiros */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ValoresGrid
              label="Investimento"
              valores={acao.valores_investimento}
              icon={<DollarSign size={10} />}
            />
            <ValoresGrid
              label="Custeio"
              valores={acao.valores_custeio}
              icon={<DollarSign size={10} />}
            />
          </div>

          {/* Rastreabilidade */}
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Rastreabilidade
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground-muted">
              <span>
                <span className="font-medium text-foreground">Incluída em:</span>{" "}
                {getRevisaoLabel(acao.revisao_inclusao_id, revisoes)}
              </span>
              {acao.revisao_exclusao_id && (
                <span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Excluída em:
                  </span>{" "}
                  {getRevisaoLabel(acao.revisao_exclusao_id, revisoes)}
                </span>
              )}
              {acao.acao_pai_id && (
                <span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    Versão anterior:
                  </span>{" "}
                  #{acao.acao_pai_id}
                </span>
              )}
              <span>
                <span className="font-medium text-foreground">ID:</span> #{acao.id}
              </span>
            </div>
          </div>

          {/* Quick action buttons inside expanded view */}
          {isAtiva && (onEditar || onExcluir) && (
            <div className="flex items-center gap-2 pt-1">
              {onEditar && (
                <button
                  onClick={() => onEditar(acao)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3
                             text-xs font-medium text-amber-700 transition-all hover:bg-amber-100
                             dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40"
                >
                  <Pencil size={12} />
                  Editar Ação
                </button>
              )}
              {onExcluir && (
                <button
                  onClick={() => onExcluir(acao)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3
                             text-xs font-medium text-red-700 transition-all hover:bg-red-100
                             dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <Trash2 size={12} />
                  Excluir Ação
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
