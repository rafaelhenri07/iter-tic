"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
  icon,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {icon}
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
      revisao_inclusao_id: revisoes.length > 0 ? revisoes[revisoes.length - 1].id : undefined,
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
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
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
                Nova Ação PDTIC
              </h2>
              <p className="text-xs text-foreground-muted">
                Preencha os dados para registrar uma nova ação no planejamento.
              </p>
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
            {/* ── Seção 1: Identificação ────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Hash size={14} className="text-brand-primary" />
                Identificação
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  label="Código"
                  error={errors.codigo_acao?.message}
                  required
                  icon={<Hash size={10} />}
                >
                  <input
                    {...register("codigo_acao")}
                    placeholder="Ex: A6"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Necessidade"
                  error={errors.necessidade?.message}
                  required
                  icon={<Tag size={10} />}
                >
                  <input
                    {...register("necessidade")}
                    placeholder="Ex: N6"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Revisão de Inclusão"
                  error={errors.revisao_inclusao_id?.message}
                  required
                  icon={<FileText size={10} />}
                >
                  <select
                    {...register("revisao_inclusao_id", { valueAsNumber: true })}
                    className={selectCls}
                    disabled={submitting}
                  >
                    <option value="">Selecione...</option>
                    {revisoes.map((r) => (
                      <option key={r.id} value={r.id}>
                        Rev {r.numero_revisao}
                        {r.descricao ? ` — ${r.descricao}` : ""}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* ── Seção 2: Unidades ────────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <Building2 size={14} className="text-brand-primary" />
                Unidades
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  label="Departamento"
                  error={errors.departamento?.message}
                  required
                  icon={<Building2 size={10} />}
                >
                  <input
                    {...register("departamento")}
                    placeholder="Ex: DTI"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Unidade Demandante"
                  error={errors.unidade_demandante?.message}
                  required
                  icon={<Building2 size={10} />}
                >
                  <input
                    {...register("unidade_demandante")}
                    placeholder="Ex: Divisão de Infraestrutura"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Unidade Responsável"
                  error={errors.unidade_responsavel?.message}
                  required
                  icon={<Building2 size={10} />}
                >
                  <input
                    {...register("unidade_responsavel")}
                    placeholder="Ex: Seção de Redes"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>
              </div>
            </div>

            {/* ── Seção 3: Descrição ───────────────────────────────── */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                <FileText size={14} className="text-brand-primary" />
                Descrição e Classificação
              </h3>

              <FormField
                label="Descrição da Ação"
                error={errors.descricao?.message}
                required
                icon={<FileText size={10} />}
              >
                <textarea
                  {...register("descricao")}
                  rows={3}
                  placeholder="Descreva a ação de forma clara e objetiva..."
                  className={`${inputCls} h-auto py-2 resize-none`}
                  disabled={submitting}
                />
              </FormField>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Tipo de Necessidade"
                  error={errors.tipo_necessidade?.message}
                  required
                  icon={<Tag size={10} />}
                >
                  <select
                    {...register("tipo_necessidade")}
                    className={selectCls}
                    disabled={submitting}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_NECESSIDADE.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Status"
                  error={errors.status?.message}
                  required
                  icon={<Tag size={10} />}
                >
                  <select
                    {...register("status")}
                    className={selectCls}
                    disabled={submitting}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
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
                <FormField
                  label="Meta"
                  error={errors.meta?.message}
                  icon={<Tag size={10} />}
                >
                  <input
                    {...register("meta")}
                    placeholder="Ex: 100% até 2025"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Indicador"
                  error={errors.indicador?.message}
                  icon={<Gauge size={10} />}
                >
                  <input
                    {...register("indicador")}
                    placeholder="Ex: % de avanço"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Quantidade"
                  error={errors.quantidade?.message}
                  icon={<Hash size={10} />}
                >
                  <input
                    {...register("quantidade")}
                    placeholder="Ex: 24"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Total GUT (0–125)"
                  error={errors.total_gut?.message}
                  required
                  icon={<Gauge size={10} />}
                >
                  <input
                    type="number"
                    {...register("total_gut", { valueAsNumber: true })}
                    min={0}
                    max={125}
                    placeholder="0"
                    className={inputCls}
                    disabled={submitting}
                  />
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
                <FormField
                  label="Previsão de Contratação"
                  error={errors.previsao_contratacao?.message}
                  icon={<Calendar size={10} />}
                >
                  <input
                    {...register("previsao_contratacao")}
                    placeholder="MM/YYYY (ex: 06/2025)"
                    className={inputCls}
                    disabled={submitting}
                  />
                </FormField>

                <FormField
                  label="Previsão de Renovação"
                  error={errors.previsao_renovacao?.message}
                  icon={<Calendar size={10} />}
                >
                  <input
                    {...register("previsao_renovacao")}
                    placeholder="MM/YYYY (ex: 01/2028)"
                    className={inputCls}
                    disabled={submitting}
                  />
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
                              handleValorChange(
                                "valores_investimento",
                                String(ano),
                                e.target.value
                              )
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
                              handleValorChange(
                                "valores_custeio",
                                String(ano),
                                e.target.value
                              )
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
            </div>

            {/* ── Rodapé do formulário ──────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
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
