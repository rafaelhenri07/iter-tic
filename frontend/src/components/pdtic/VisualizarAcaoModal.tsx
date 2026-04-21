"use client";

import { X } from "lucide-react";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";

/* ── Props ─────────────────────────────────────────────────────────────── */

interface VisualizarAcaoModalProps {
  open: boolean;
  onClose: () => void;
  acao: PdticAcao;
  revisoes: PdticRevisao[];
  anosRange: number[];
  onEdit?: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function formatCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sumValues(obj: Record<string, number> | null | undefined) {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function getRevisaoLabel(id: number, revisoes: PdticRevisao[]) {
  const rev = revisoes.find((r) => r.id === id);
  if (!rev) return `#${id}`;
  return rev.numero_revisao === 0
    ? "Aprovação Inicial"
    : rev.descricao || `Revisão ${rev.numero_revisao}`;
}

/* ── Componente ────────────────────────────────────────────────────────── */

export function VisualizarAcaoModal({
  open,
  onClose,
  acao,
  revisoes,
  anosRange,
  onEdit,
}: VisualizarAcaoModalProps) {
  if (!open) return null;

  const totalInv = sumValues(acao.valores_investimento);
  const totalCus = sumValues(acao.valores_custeio);
  const totalGeral = totalInv + totalCus;
  const isExcluida = acao.revisao_exclusao_id !== null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-16">
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-border bg-background-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "modalIn 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  isExcluida
                    ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                    : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                }`}
              >
                {acao.codigo_acao}
              </span>
              <h2 className="text-lg font-bold text-foreground">
                {acao.descricao}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-5 space-y-5">

            {/* Row: Código, Necessidade, Inclusão */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Código" value={acao.codigo_acao} />
              <Field label="Necessidade" value={acao.necessidade} />
              <Field
                label="Inclusão"
                value={getRevisaoLabel(acao.revisao_inclusao_id, revisoes)}
              />
            </div>

            {/* Row: Departamento, Demandante, Responsável */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Departamento" value={acao.departamento} />
              <Field label="Unidade Demandante" value={acao.unidade_demandante} />
              <Field label="Unidade Responsável" value={acao.unidade_responsavel} />
            </div>

            {/* Meta */}
            {acao.meta && <Field label="Meta" value={acao.meta} />}

            {/* Indicador */}
            {acao.indicador && <Field label="Indicador" value={acao.indicador} />}

            {/* Row: Tipo, Status */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <Field
                label="Tipo de Necessidade"
                value={
                  TIPO_NECESSIDADE_LABEL[acao.tipo_necessidade] ??
                  acao.tipo_necessidade
                }
              />
              <Field label="Status" value={acao.status} />
            </div>

            {/* Row: Quantidade, GUT */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantidade" value={acao.quantidade || "—"} />
              <Field label="Total GUT" value={String(acao.total_gut)} />
            </div>

            {/* Row: Previsões */}
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <Field
                label="Previsão de Contratação"
                value={acao.previsao_contratacao || "—"}
              />
              <Field
                label="Previsão de Renovação"
                value={acao.previsao_renovacao || "—"}
              />
            </div>

            {/* Valores financeiros */}
            {(totalInv > 0 || totalCus > 0) && (
              <div className="space-y-3 border-t border-border pt-4">
                {totalInv > 0 && (
                  <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Investimento (Capital)
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {formatCurrency(totalInv)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {anosRange.map((ano) => (
                        <div key={ano} className="text-center">
                          <div className="text-[10px] font-medium text-foreground-muted">{ano}</div>
                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(acao.valores_investimento?.[String(ano)] ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {totalCus > 0 && (
                  <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Custeio
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {formatCurrency(totalCus)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {anosRange.map((ano) => (
                        <div key={ano} className="text-center">
                          <div className="text-[10px] font-medium text-foreground-muted">{ano}</div>
                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(acao.valores_custeio?.[String(ano)] ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total geral */}
                <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-2.5 dark:bg-indigo-900/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Orçamento Total Estimado
                  </span>
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {formatCurrency(totalGeral)}
                  </span>
                </div>
              </div>
            )}

            {/* Exclusão info */}
            {isExcluida && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-800 dark:bg-red-950/20">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Excluída na revisão:{" "}
                  {getRevisaoLabel(acao.revisao_exclusao_id!, revisoes)}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-5 text-sm font-medium
                         text-foreground-muted transition-all hover:bg-background-secondary
                         hover:text-foreground"
            >
              Fechar
            </button>
            {!isExcluida && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="flex h-9 items-center gap-2 rounded-lg bg-brand-primary px-5
                           text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                           transition-all hover:bg-brand-primary-hover
                           hover:shadow-xl hover:shadow-brand-primary/30"
              >
                Editar Ação
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Field read-only ───────────────────────────────────────────────────── */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
