"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Save,
  Hash,
  Building2,
  FileText,
  Tag,
  Gauge,
  Calendar,
  DollarSign,
  Pencil,
} from "lucide-react";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import {
  FormField,
  inputCls,
  selectCls,
  TIPOS_NECESSIDADE,
  STATUS_OPTIONS,
} from "@/components/ui/FormField";
import {
  acaoPdticUpdateSchema,
  cleanUpdatePayload,
  type AcaoPdticUpdateFormData,
} from "@/lib/validations/pdtic";
import { atualizarAcaoPdtic } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

/* ── Props ─────────────────────────────────────────────────────────────── */

interface EditarAcaoModalProps {
  open: boolean;
  onClose: () => void;
  acao: PdticAcao;
  revisoes: PdticRevisao[];
  anosRange: number[];
  onSuccess?: () => void;
}

/* ── Componente ────────────────────────────────────────────────────────── */

export function EditarAcaoModal({
  open,
  onClose,
  acao,
  revisoes,
  anosRange,
  onSuccess,
}: EditarAcaoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | "">("");

  // Revisões válidas para alteração: qualquer revisão DIFERENTE da inclusão original
  const revisoesDisponiveis = revisoes.filter(
    (r) => r.id !== acao.revisao_inclusao_id
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AcaoPdticUpdateFormData>({
    resolver: zodResolver(acaoPdticUpdateSchema),
    defaultValues: {
      codigo_acao: acao.codigo_acao,
      departamento: acao.departamento,
      unidade_demandante: acao.unidade_demandante,
      unidade_responsavel: acao.unidade_responsavel,
      necessidade: acao.necessidade,
      descricao: acao.descricao,
      tipo_necessidade: acao.tipo_necessidade,
      status: acao.status,
      meta: acao.meta ?? "",
      indicador: acao.indicador ?? "",
      quantidade: acao.quantidade ?? "",
      total_gut: acao.total_gut,
      previsao_contratacao: acao.previsao_contratacao ?? "",
      previsao_renovacao: acao.previsao_renovacao ?? "",
      valores_investimento: acao.valores_investimento ?? {},
      valores_custeio: acao.valores_custeio ?? {},
    },
  });

  // Reset when acao changes
  useEffect(() => {
    if (open) {
      reset({
        codigo_acao: acao.codigo_acao,
        departamento: acao.departamento,
        unidade_demandante: acao.unidade_demandante,
        unidade_responsavel: acao.unidade_responsavel,
        necessidade: acao.necessidade,
        descricao: acao.descricao,
        tipo_necessidade: acao.tipo_necessidade,
        status: acao.status,
        meta: acao.meta ?? "",
        indicador: acao.indicador ?? "",
        quantidade: acao.quantidade ?? "",
        total_gut: acao.total_gut,
        previsao_contratacao: acao.previsao_contratacao ?? "",
        previsao_renovacao: acao.previsao_renovacao ?? "",
        valores_investimento: acao.valores_investimento ?? {},
        valores_custeio: acao.valores_custeio ?? {},
      });
      setSelectedRevisaoId(
        revisoesDisponiveis.length > 0
          ? revisoesDisponiveis[revisoesDisponiveis.length - 1].id
          : ""
      );
    }
  }, [open, acao.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const investimento = watch("valores_investimento") ?? {};
  const custeio = watch("valores_custeio") ?? {};

  const handleValorChange = (
    tipo: "valores_investimento" | "valores_custeio",
    ano: string,
    rawValue: string
  ) => {
    const current = tipo === "valores_investimento" ? { ...investimento } : { ...custeio };
    if (rawValue === "" || rawValue === undefined) {
      delete current[ano];
    } else {
      const parsed = parseFloat(rawValue);
      if (!isNaN(parsed)) current[ano] = parsed;
    }
    setValue(tipo, current, { shouldValidate: true });
  };

  const onSubmit = async (data: AcaoPdticUpdateFormData) => {
    if (!selectedRevisaoId) {
      showToast("error", "Selecione a revisão que motiva esta alteração.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = cleanUpdatePayload(data);
      await atualizarAcaoPdtic(acao.id, Number(selectedRevisaoId), payload);
      showToast("success", `Ação ${acao.codigo_acao} atualizada com sucesso! Nova versão criada.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar ação.";
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  if (!open) return null;

  const totalInv = Object.values(investimento).reduce((a, b) => a + b, 0);
  const totalCus = Object.values(custeio).reduce((a, b) => a + b, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-16">
        <div
          className="relative w-full max-w-3xl rounded-2xl border border-border bg-background-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "modalIn 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <Pencil size={16} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Editar Ação {acao.codigo_acao}
                </h2>
                <p className="text-xs text-foreground-muted">
                  SCD: a versão atual será fechada e uma nova versão será criada.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg p-2 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">
            {/* ── Revisão da alteração (obrigatório) ───────────────── */}
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <FormField
                label="Revisão da Alteração"
                required
                error={
                  selectedRevisaoId === "" ? "Selecione a revisão que motiva esta alteração." : undefined
                }
                icon={<FileText size={10} />}
              >
                <select
                  value={selectedRevisaoId}
                  onChange={(e) => setSelectedRevisaoId(e.target.value ? Number(e.target.value) : "")}
                  className={selectCls}
                  disabled={submitting}
                >
                  <option value="">Selecione a revisão...</option>
                  {revisoesDisponiveis.map((r) => (
                    <option key={r.id} value={r.id}>
                      Rev {r.numero_revisao}
                      {r.descricao ? ` — ${r.descricao}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                ⚠ A revisão selecionada será usada para fechar a versão atual e criar a nova versão.
              </p>
            </div>

            {/* ── Seção 1: Identificação ────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Hash size={14} className="text-brand-primary" />
                Identificação
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Código" error={errors.codigo_acao?.message} required icon={<Hash size={10} />}>
                  <input {...register("codigo_acao")} className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Necessidade" error={errors.necessidade?.message} required icon={<Tag size={10} />}>
                  <input {...register("necessidade")} className={inputCls} disabled={submitting} />
                </FormField>
                <div /> {/* spacer */}
              </div>
            </div>

            {/* ── Seção 2: Unidades ────────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Building2 size={14} className="text-brand-primary" />
                Unidades
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Departamento" error={errors.departamento?.message} required icon={<Building2 size={10} />}>
                  <input {...register("departamento")} className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Unidade Demandante" error={errors.unidade_demandante?.message} required icon={<Building2 size={10} />}>
                  <input {...register("unidade_demandante")} className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Unidade Responsável" error={errors.unidade_responsavel?.message} required icon={<Building2 size={10} />}>
                  <input {...register("unidade_responsavel")} className={inputCls} disabled={submitting} />
                </FormField>
              </div>
            </div>

            {/* ── Seção 3: Descrição e Classificação ────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <FileText size={14} className="text-brand-primary" />
                Descrição e Classificação
              </h3>
              <FormField label="Descrição da Ação" error={errors.descricao?.message} required icon={<FileText size={10} />}>
                <textarea
                  {...register("descricao")}
                  rows={3}
                  className={`${inputCls} h-auto py-2 resize-none`}
                  disabled={submitting}
                />
              </FormField>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Tipo de Necessidade" error={errors.tipo_necessidade?.message} required icon={<Tag size={10} />}>
                  <select {...register("tipo_necessidade")} className={selectCls} disabled={submitting}>
                    {TIPOS_NECESSIDADE.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Status" error={errors.status?.message} required icon={<Tag size={10} />}>
                  <select {...register("status")} className={selectCls} disabled={submitting}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* ── Seção 4: Metas e GUT ─────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Gauge size={14} className="text-brand-primary" />
                Metas, Indicadores e GUT
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Meta" error={errors.meta?.message} icon={<Tag size={10} />}>
                  <input {...register("meta")} className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Indicador" error={errors.indicador?.message} icon={<Gauge size={10} />}>
                  <input {...register("indicador")} className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Quantidade" error={errors.quantidade?.message} icon={<Hash size={10} />}>
                  <input {...register("quantidade")} className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Total GUT (0–125)" error={errors.total_gut?.message} required icon={<Gauge size={10} />}>
                  <input type="number" {...register("total_gut", { valueAsNumber: true })} min={0} max={125} className={inputCls} disabled={submitting} />
                </FormField>
              </div>
            </div>

            {/* ── Seção 5: Previsões ───────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Calendar size={14} className="text-brand-primary" />
                Previsões
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Previsão de Contratação" error={errors.previsao_contratacao?.message} icon={<Calendar size={10} />}>
                  <input {...register("previsao_contratacao")} placeholder="MM/YYYY" className={inputCls} disabled={submitting} />
                </FormField>
                <FormField label="Previsão de Renovação" error={errors.previsao_renovacao?.message} icon={<Calendar size={10} />}>
                  <input {...register("previsao_renovacao")} placeholder="MM/YYYY" className={inputCls} disabled={submitting} />
                </FormField>
              </div>
            </div>

            {/* ── Seção 6: Valores financeiros ─────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <DollarSign size={14} className="text-brand-primary" />
                Valores Financeiros por Ano
              </h3>
              <div className="space-y-4">
                {/* Investimento */}
                <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                      Investimento (Capital)
                    </span>
                    <span className="text-xs font-medium text-foreground-muted">
                      Total: <span className="font-bold text-foreground">
                        {totalInv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {anosRange.map((ano) => (
                      <div key={`inv-${ano}`}>
                        <label className="mb-1 block text-[10px] font-medium text-foreground-muted">{ano}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">R$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={investimento[String(ano)] ?? ""}
                            onChange={(e) => handleValorChange("valores_investimento", String(ano), e.target.value)}
                            className={`${inputCls} pl-9`}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custeio */}
                <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                      Custeio
                    </span>
                    <span className="text-xs font-medium text-foreground-muted">
                      Total: <span className="font-bold text-foreground">
                        {totalCus.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {anosRange.map((ano) => (
                      <div key={`cus-${ano}`}>
                        <label className="mb-1 block text-[10px] font-medium text-foreground-muted">{ano}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">R$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={custeio[String(ano)] ?? ""}
                            onChange={(e) => handleValorChange("valores_custeio", String(ano), e.target.value)}
                            className={`${inputCls} pl-9`}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Rodapé ───────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="h-10 rounded-lg border border-border px-5 text-sm font-medium text-foreground-muted transition-all hover:bg-background-secondary hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || selectedRevisaoId === ""}
                className="flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-6 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Alteração
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
