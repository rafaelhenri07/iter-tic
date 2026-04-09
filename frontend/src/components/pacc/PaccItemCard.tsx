"use client";

import { useState } from "react";
import {
  ChevronDown,
  Hash,
  DollarSign,
  FileText,
  Building2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Link2,
  Package,
  Tag,
  Sparkles,
  Archive,
} from "lucide-react";
import type { PaccItemComAcao, PaccItem, PaccRevisao } from "@/types/pacc";
import { TIPO_NECESSIDADE_LABEL, STATUS_ACAO_COLOR } from "@/types/pdtic";
import type { StatusAcao, TipoNecessidade } from "@/types/pdtic";
import { formatarNomeRevisao, formatCurrency } from "@/lib/formatters";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function getRevisaoLabel(revisaoId: number, revisoes: PaccRevisao[]): string {
  const rev = revisoes.find((r) => r.id === revisaoId);
  return rev ? formatarNomeRevisao(rev.numero_revisao) : `Rev #${revisaoId}`;
}

/* ── DetailField ───────────────────────────────────────────────────────── */

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

/* ── PaccItemCard ──────────────────────────────────────────────────────── */

type AnyPaccItem = PaccItemComAcao | PaccItem;

interface PaccItemCardProps {
  item: AnyPaccItem;
  revisoes: PaccRevisao[];
  revisaoAtualId?: number | null;
  onEditar?: (item: AnyPaccItem) => void;
  onExcluir?: (item: AnyPaccItem) => void;
}

export function PaccItemCard({
  item,
  revisoes,
  revisaoAtualId,
  onEditar,
  onExcluir,
}: PaccItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isExcluido = item.revisao_exclusao_id !== null;
  const isAtivo = !isExcluido;

  // Type guard for nested acao_pdtic
  const acaoPdtic = "acao_pdtic" in item ? item.acao_pdtic : null;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300
        ${
          isExcluido
            ? "border-rose-200 bg-rose-50/40 opacity-75 dark:border-rose-900 dark:bg-rose-950/20"
            : "border-border bg-background-card hover:border-border-hover hover:shadow-md"
        }`}
    >
      {/* Borda lateral */}
      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          isExcluido
            ? "bg-rose-400"
            : "bg-gradient-to-b from-teal-500 to-cyan-400"
        }`}
      />

      {/* Header — sempre visível */}
      <div className="flex w-full items-start gap-4 px-5 py-4">
        {/* Número do item */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold
            ${
              isExcluido
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
            }`}
        >
          {item.numero_item}
        </button>

        {/* Info principal — clicável */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-semibold ${
                isExcluido
                  ? "text-rose-700 line-through dark:text-rose-400"
                  : "text-foreground"
              }`}
            >
              {item.descricao_demanda}
            </h3>

            {/* ── Soft Badges de rastreabilidade ── */}

            {/* Retirado nesta revisão */}
            {isExcluido && item.revisao_exclusao_id === revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                <Archive size={9} />
                Retirado na {getRevisaoLabel(item.revisao_exclusao_id!, revisoes)}
              </span>
            )}

            {/* Excluído em outra revisão */}
            {isExcluido && item.revisao_exclusao_id !== revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                <AlertTriangle size={9} />
                Excluído
              </span>
            )}

            {/* Adicionado nesta revisão */}
            {!isExcluido && item.revisao_inclusao_id === revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Sparkles size={9} />
                Adicionado na {getRevisaoLabel(item.revisao_inclusao_id, revisoes)}
              </span>
            )}

            {/* Herdado */}
            {!isExcluido && revisaoAtualId && item.revisao_inclusao_id !== revisaoAtualId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                Herdado da {getRevisaoLabel(item.revisao_inclusao_id, revisoes)}
              </span>
            )}

            {/* Revisado (SCD) */}
            {item.item_pai_id && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-400">
                <RefreshCw size={9} />
                Revisado
              </span>
            )}
          </div>

          {/* Badges e info rápida */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Valor estimado */}
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <DollarSign size={11} className="mr-0.5 inline" />
              {formatCurrency(item.valor_estimado)}
            </span>

            {/* Quantidade */}
            <span className="rounded-full bg-background-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground-muted">
              <Package size={11} className="mr-0.5 inline" />
              Qtd: {item.quantidade}
            </span>

            {/* Processo SEI */}
            {item.processo_sei && (
              <span className="text-[11px] text-foreground-muted">
                <FileText size={11} className="mr-0.5 inline" />
                SEI {item.processo_sei}
              </span>
            )}

            {/* Vínculo PDTIC */}
            {acaoPdtic && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400">
                <Link2 size={11} />
                PDTIC {acaoPdtic.codigo_acao}
              </span>
            )}
          </div>
        </button>

        {/* Actions + Chevron */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* Context menu — only for active items */}
            {isAtivo && (onEditar || onExcluir) && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-all hover:bg-background-secondary hover:text-foreground"
                  title="Ações"
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                    />
                    <div
                      className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-background-card shadow-xl"
                      style={{ animation: "modalIn 0.15s ease-out" }}
                    >
                      {onEditar && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onEditar(item);
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background-secondary"
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
                            onExcluir(item);
                          }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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

          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
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
          expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border px-5 py-4 space-y-5">
          {/* Vínculo PDTIC — seção destacada */}
          {acaoPdtic && (
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Link2 size={10} />
                Ação PDTIC Vinculada
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  {acaoPdtic.codigo_acao}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {acaoPdtic.descricao}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_ACAO_COLOR[acaoPdtic.status as StatusAcao] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {acaoPdtic.status}
                    </span>
                    <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                      {TIPO_NECESSIDADE_LABEL[acaoPdtic.tipo_necessidade as TipoNecessidade] ?? acaoPdtic.tipo_necessidade}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      <Building2 size={10} className="mr-0.5 inline" />
                      {acaoPdtic.unidade_demandante}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid de detalhes do item */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField
              label="Descrição da Demanda"
              value={item.descricao_demanda}
              icon={<FileText size={10} />}
            />
            <DetailField
              label="Quantidade"
              value={item.quantidade}
              icon={<Hash size={10} />}
            />
            <DetailField
              label="Valor Estimado"
              value={formatCurrency(item.valor_estimado)}
              icon={<DollarSign size={10} />}
            />
            <DetailField
              label="Processo SEI"
              value={item.processo_sei}
              icon={<FileText size={10} />}
            />
            <DetailField
              label="Ação PDTIC (ID)"
              value={`#${item.acao_pdtic_id}`}
              icon={<Tag size={10} />}
            />
          </div>

          {/* Rastreabilidade */}
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Rastreabilidade
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground-muted">
              <span>
                <span className="font-medium text-foreground">Incluído em:</span>{" "}
                {getRevisaoLabel(item.revisao_inclusao_id, revisoes)}
              </span>
              {item.revisao_exclusao_id && (
                <span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Excluído em:
                  </span>{" "}
                  {getRevisaoLabel(item.revisao_exclusao_id, revisoes)}
                </span>
              )}
              {item.item_pai_id && (
                <span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    Versão anterior:
                  </span>{" "}
                  #{item.item_pai_id}
                </span>
              )}
              <span>
                <span className="font-medium text-foreground">ID:</span> #{item.id}
              </span>
            </div>
          </div>

          {/* Quick action buttons */}
          {isAtivo && (onEditar || onExcluir) && (
            <div className="flex items-center gap-2 pt-1">
              {onEditar && (
                <button
                  onClick={() => onEditar(item)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40"
                >
                  <Pencil size={12} />
                  Editar Item
                </button>
              )}
              {onExcluir && (
                <button
                  onClick={() => onExcluir(item)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition-all hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <Trash2 size={12} />
                  Excluir Item
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
