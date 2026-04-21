"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  X,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import type { PdticRevisao } from "@/types/pdtic";
import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";
import {
  acaoPdticSchema,
  cleanPayload,
  type AcaoPdticFormData,
} from "@/lib/validations/pdtic";
import { criarAcaoPdtic } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

/* ── Enums para selects ────────────────────────────────────────────────── */

const TIPOS_NECESSIDADE = Object.entries(TIPO_NECESSIDADE_LABEL) as [
  string,
  string,
][];

const STATUS_OPTIONS = [
  "Não iniciada",
  "Em andamento",
  "Contratada",
  "Contrato vigente",
  "Contrato a ser renovado",
] as const;

/* ── Props ─────────────────────────────────────────────────────────────── */

interface NovaAcaoModalProps {
  open: boolean;
  onClose: () => void;
  periodoId: number;
  revisoes: PdticRevisao[];
  anosRange: number[]; // ex: [2024, 2025, 2026, 2027]
  onSuccess?: () => void;
}

/* ── Input reutilizável ────────────────────────────────────────────────── */

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground " +
  "placeholder:text-foreground-muted outline-none transition-all " +
  "focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const selectCls =
  "h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 text-sm text-foreground " +
  "outline-none transition-all " +
  "focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

/* ── Componente principal ──────────────────────────────────────────────── */

export function NovaAcaoModal({
  open,
  onClose,
  periodoId,
  revisoes,
  anosRange,
  onSuccess,
}: NovaAcaoModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AcaoPdticFormData>({
    resolver: zodResolver(acaoPdticSchema),
    defaultValues: {
      periodo_id: periodoId,
      revisao_inclusao_id: revisoes.length > 0 ? revisoes[0].id : undefined,
      codigo_acao: "",
      departamento: "",
      unidade_demandante: "",
      unidade_responsavel: "",
      necessidade: "",
      descricao: "",
      tipo_necessidade: undefined,
      status: "Não iniciada",
      meta: "",
      indicador: "",
      quantidade: "",
      total_gut: 0,
      previsao_contratacao: "",
      previsao_renovacao: "",
      valores_investimento: {},
      valores_custeio: {},
    },
  });

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
      if (!isNaN(parsed)) {
        current[ano] = parsed;
      }
    }
    setValue(tipo, current, { shouldValidate: true });
  };

  const onSubmit = async (data: AcaoPdticFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanPayload(data);
      await criarAcaoPdtic(payload);
      showToast("success", "Ação PDTIC criada com sucesso!");
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao criar ação.";
      showToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      onClose();
    }
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
          className="relative w-full max-w-3xl rounded-2xl border border-border
                     bg-background-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "modalIn 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Nova Ação PDTIC {anosRange.length > 0 ? `${anosRange[0]} - ${anosRange[anosRange.length - 1]}` : ""}
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg p-2 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Código" error={errors.codigo_acao?.message} required>
                <input {...register("codigo_acao")} placeholder="Ex: A6" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Necessidade" error={errors.necessidade?.message} required>
                <input {...register("necessidade")} placeholder="Ex: N6" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Inclusão" error={errors.revisao_inclusao_id?.message} required>
                <select {...register("revisao_inclusao_id", { valueAsNumber: true })} className={selectCls} disabled={submitting}>
                  {revisoes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numero_revisao === 0 ? "Aprovação Inicial" : (r.descricao || `Revisão ${r.numero_revisao}`)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Departamento" error={errors.departamento?.message} required>
                <input {...register("departamento")} placeholder="Ex: DTI" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Unidade Demandante" error={errors.unidade_demandante?.message} required>
                <input {...register("unidade_demandante")} placeholder="Ex: Divisão de Infraestrutura" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Unidade Responsável" error={errors.unidade_responsavel?.message} required>
                <input {...register("unidade_responsavel")} placeholder="Ex: Seção de Redes" className={inputCls} disabled={submitting} />
              </FormField>
            </div>

            <FormField label="Descrição da Ação" error={errors.descricao?.message} required>
              <textarea
                {...register("descricao")}
                rows={2}
                placeholder="Descreva a ação de forma clara e objetiva..."
                className={`${inputCls} h-auto py-2 resize-none`}
                disabled={submitting}
              />
            </FormField>

            <FormField label="Meta" error={errors.meta?.message}>
              <textarea
                {...register("meta")}
                rows={2}
                placeholder="Ex: Aprimorar a Estrutura de Rede..."
                className={`${inputCls} h-auto py-2 resize-none`}
                disabled={submitting}
              />
            </FormField>

            <FormField label="Indicador" error={errors.indicador?.message}>
              <textarea
                {...register("indicador")}
                rows={2}
                placeholder="Ex: Índice de disponibilidade..."
                className={`${inputCls} h-auto py-2 resize-none`}
                disabled={submitting}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tipo de Necessidade" error={errors.tipo_necessidade?.message} required>
                <select {...register("tipo_necessidade")} className={selectCls} disabled={submitting}>
                  <option value="">Selecione...</option>
                  {TIPOS_NECESSIDADE.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Status" error={errors.status?.message} required>
                <select {...register("status")} className={selectCls} disabled={submitting}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 border-t border-border pt-4 mt-4">
              <FormField label="Quantidade" error={errors.quantidade?.message}>
                <input {...register("quantidade")} placeholder="Ex: 24" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Total GUT (0–125)" error={errors.total_gut?.message} required>
                <input type="number" {...register("total_gut", { valueAsNumber: true })} min={0} max={125} placeholder="0" className={inputCls} disabled={submitting} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border pt-4 mt-4">
              <FormField label="Previsão de Contratação" error={errors.previsao_contratacao?.message}>
                <input {...register("previsao_contratacao")} placeholder="ex: 06/2025" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Previsão de Renovação" error={errors.previsao_renovacao?.message}>
                <input {...register("previsao_renovacao")} placeholder="ex: 01/2028" className={inputCls} disabled={submitting} />
              </FormField>
            </div>

            <div className="space-y-4 border-t border-border pt-4 mt-4">
              {/* Investimento (Capital) */}
              <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Investimento (Capital)
                  </span>
                  <span className="text-xs font-medium text-foreground-muted">
                    Total:{" "}
                    <span className="font-bold text-foreground">
                      {totalInv.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {anosRange.map((ano) => (
                    <div key={`inv-${ano}`}>
                      <label className="mb-1 block text-[10px] font-medium text-foreground-muted">
                        {ano}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={investimento[String(ano)] ?? ""}
                          onChange={(e) =>
                            handleValorChange("valores_investimento", String(ano), e.target.value)
                          }
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
                    Total:{" "}
                    <span className="font-bold text-foreground">
                      {totalCus.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {anosRange.map((ano) => (
                    <div key={`cus-${ano}`}>
                      <label className="mb-1 block text-[10px] font-medium text-foreground-muted">
                        {ano}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={custeio[String(ano)] ?? ""}
                          onChange={(e) =>
                            handleValorChange("valores_custeio", String(ano), e.target.value)
                          }
                          className={`${inputCls} pl-9`}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5 mt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="h-10 rounded-lg border border-border px-5 text-sm font-medium
                           text-foreground-muted transition-all hover:bg-background-secondary
                           hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-6
                           text-sm font-semibold text-white shadow-lg shadow-brand-primary/25
                           transition-all hover:bg-brand-primary-hover
                           hover:shadow-xl hover:shadow-brand-primary/30
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Ação
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
