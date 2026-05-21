"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useMemo, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Save,
  AlertCircle,
  Pencil,
} from "lucide-react";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";
import {
  acaoPdticUpdateSchema,
  cleanUpdatePayload,
  type AcaoPdticUpdateFormData,
} from "@/lib/validations/pdtic";
import {
  obterAcaoPdtic,
  atualizarAcaoPdtic,
  editarSimplesAcaoPdtic,
  fetchPainelPdtic,
  fetchUnidadesOrganizacionais,
} from "@/lib/api";
import type { UnidadeOrg } from "@/types/estrutura_organizacional";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import {
  FormField,
  inputCls,
  selectCls,
  TIPOS_NECESSIDADE,
  STATUS_OPTIONS,
} from "@/components/ui/FormField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

import { MonthYearPicker } from "@/components/ui/MonthYearPicker";
import { DynamicSelectArray } from "@/components/ui/DynamicSelectArray";

/* ── Página de Edição ───────────────────────────────────────────────────── */

export default function EditarAcaoPdticPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const acaoId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRevisao = searchParams.get("revisao") === "true";

  /* ── State ─────────────────────────────────────────────────────────────── */
  const [acao, setAcao] = useState<PdticAcao | null>(null);
  const [revisoes, setRevisoes] = useState<PdticRevisao[]>([]);
  const [anosRange, setAnosRange] = useState<number[]>([]);
  const [unidadesOrg, setUnidadesOrg] = useState<UnidadeOrg[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRevisaoId, setSelectedRevisaoId] = useState<number | "">("");

  /* ── Carregar dados ────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        // 1. Buscar ação com histórico
        const acaoData = await obterAcaoPdtic(acaoId);
        setAcao(acaoData);

        // 2. Buscar painel do período (para revisões e anos)
        const painelData = await fetchPainelPdtic(acaoData.periodo_id);
        setRevisoes(painelData.revisoes);

        // Calcular anosRange a partir do período
        const anos: number[] = [];
        for (let y = painelData.periodo.ano_inicio; y <= painelData.periodo.ano_fim; y++) {
          anos.push(y);
        }
        setAnosRange(anos);

        // Pré-selecionar última revisão válida (diferente da revisão de inclusão)
        const disponiveis = painelData.revisoes.filter(
          (r) => r.id !== acaoData.revisao_inclusao_id
        );
        if (disponiveis.length > 0) {
          setSelectedRevisaoId(disponiveis[disponiveis.length - 1].id);
        }

        // 3. Buscar unidades organizacionais
        const orgs = await fetchUnidadesOrganizacionais();
        setUnidadesOrg(orgs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar dados da ação."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [acaoId]);

  /* ── Revisões disponíveis (exceto a de inclusão original) ──────────────── */
  const revisoesDisponiveis = useMemo(
    () => revisoes.filter((r) => r.id !== acao?.revisao_inclusao_id),
    [revisoes, acao?.revisao_inclusao_id]
  );

  /* ── React Hook Form ──────────────────────────────────────────────────── */
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
      codigo_acao: "",
      departamentos_ids: [],
      unidades_demandantes_ids: [],
      unidades_responsaveis_ids: [],
      necessidade: "",
      descricao: "",
      tipo_necessidade: [],
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

  // Reset form when acao is loaded
  useEffect(() => {
    if (!acao) return;
    reset({
      codigo_acao: acao.codigo_acao,
      departamentos_ids: acao.departamentos_rel?.map((d) => d.id) ?? [],
      unidades_demandantes_ids:
        acao.unidades_demandantes_rel?.map((d) => d.id) ?? [],
      unidades_responsaveis_ids:
        acao.unidades_responsaveis_rel?.map((d) => d.id) ?? [],
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
  }, [acao, reset]);

  /* ── Watched values ───────────────────────────────────────────────────── */
  const investimento = watch("valores_investimento") ?? {};
  const custeio = watch("valores_custeio") ?? {};
  const previsao_contratacao = watch("previsao_contratacao");
  const previsao_renovacao = watch("previsao_renovacao");
  const tipos_selecionados = watch("tipo_necessidade") ?? [];
  const selectedDeps = watch("departamentos_ids") ?? [];
  const selectedDems = watch("unidades_demandantes_ids") ?? [];
  const selectedResps = watch("unidades_responsaveis_ids") ?? [];

  const totalInv = Object.values(investimento).reduce((a, b) => a + b, 0);
  const totalCus = Object.values(custeio).reduce((a, b) => a + b, 0);

  const handleValorChange = (
    tipo: "valores_investimento" | "valores_custeio",
    ano: string,
    val: number
  ) => {
    const current =
      tipo === "valores_investimento" ? { ...investimento } : { ...custeio };
    if (!val) {
      delete current[ano];
    } else {
      current[ano] = val;
    }
    setValue(tipo, current, { shouldValidate: true });
  };

  /* ── Submit ───────────────────────────────────────────────────────────── */
  const onSubmit = async (data: AcaoPdticUpdateFormData) => {
    if (isRevisao && !selectedRevisaoId) {
      showToast("error", "Selecione a revisão que motiva esta alteração.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = cleanUpdatePayload(data);
      if (isRevisao) {
        await atualizarAcaoPdtic(acaoId, Number(selectedRevisaoId), payload);
        showToast(
          "success",
          `Ação ${data.codigo_acao} atualizada com sucesso! Nova versão criada.`
        );
      } else {
        await editarSimplesAcaoPdtic(acaoId, payload);
        showToast(
          "success",
          `Ação ${data.codigo_acao} corrigida com sucesso!`
        );
      }
      setTimeout(() => {
        router.push("/planejamento/pdtic");
      }, 1500);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao atualizar ação.";
      showToast("error", msg);
      setSubmitting(false);
    }
  };

  const onError = (errs: any) => {
    console.error("VALIDATION ERRORS:", errs);
    showToast(
      "error",
      "Existem campos obrigatórios não preenchidos. Verifique as mensagens em vermelho no formulário."
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const safeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      handleSubmit(onSubmit, onError)(e).catch((err) => {
        console.error("Hook form async error:", err);
      });
    } catch (err: any) {
      console.error("Hook form sync error:", err);
    }
  };

  /* ── Loading State ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="mb-8">
          <Link
            href="/planejamento/pdtic"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ChevronLeft size={16} />
            Voltar para PDTIC
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Editar Ação
          </h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </div>
    );
  }

  /* ── Error State ──────────────────────────────────────────────────────── */
  if (error || !acao) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="mb-8">
          <Link
            href="/planejamento/pdtic"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ChevronLeft size={16} />
            Voltar para PDTIC
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Editar Ação
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <AlertCircle size={36} className="text-red-400" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {error || "Ação não encontrada."}
          </p>
          <Link
            href="/planejamento/pdtic"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
          >
            <ChevronLeft size={14} />
            Voltar para a listagem
          </Link>
        </div>
        <ToastContainer />
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/planejamento/pdtic"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft size={16} />
          Voltar para PDTIC
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isRevisao
              ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
              : "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/10 dark:text-brand-primary"
          }`}>
            <Pencil size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {isRevisao ? "Atualizar Revisão" : "Editar Ação"} {acao.codigo_acao}
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={safeSubmit} className="space-y-6">
        {/* ── Revisão da Alteração (apenas modo Atualizar Revisão) ──── */}
        {isRevisao && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <FormField
              label="Revisão da Alteração"
              required
              error={
                selectedRevisaoId === ""
                  ? "Selecione a revisão que motiva esta alteração."
                  : undefined
              }
            >
              <select
                value={selectedRevisaoId}
                onChange={(e) =>
                  setSelectedRevisaoId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className={selectCls}
                disabled={submitting}
              >
                <option value="">Selecione a revisão...</option>
                {revisoesDisponiveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.numero_revisao === 0
                      ? "Aprovação Inicial"
                      : r.descricao || `Revisão ${r.numero_revisao}`}
                  </option>
                ))}
              </select>
            </FormField>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠ A revisão selecionada será usada para fechar a versão atual e
              criar a nova versão.
            </p>
          </div>
        )}

        {/* ── Identificação ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            label="Código"
            error={errors.codigo_acao?.message}
            required
          >
            <input
              {...register("codigo_acao")}
              className={inputCls}
              disabled={submitting}
            />
          </FormField>
          <FormField
            label="Necessidade"
            error={errors.necessidade?.message}
            required
          >
            <input
              {...register("necessidade")}
              className={inputCls}
              disabled={submitting}
            />
          </FormField>
          <div /> {/* spacer */}
        </div>

        {/* ── Dynamic Arrays (Departamentos / Demandantes / Responsáveis) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FormField
            label="Departamentos"
            error={errors.departamentos_ids?.message}
            required
          >
            <DynamicSelectArray
              options={unidadesOrg.map((d) => ({
                value: d.id,
                label: d.caminho_completo,
              }))}
              value={selectedDeps}
              onChange={(val) =>
                setValue("departamentos_ids", val, { shouldValidate: true })
              }
              placeholder="Selecionar departamento..."
              disabled={submitting}
            />
          </FormField>
          <FormField
            label="Unidades Demandantes"
            error={errors.unidades_demandantes_ids?.message}
            required
          >
            <DynamicSelectArray
              options={unidadesOrg.map((d) => ({
                value: d.id,
                label: d.caminho_completo,
              }))}
              value={selectedDems}
              onChange={(val) =>
                setValue("unidades_demandantes_ids", val, {
                  shouldValidate: true,
                })
              }
              placeholder="Selecionar unidade demandante..."
              disabled={submitting}
            />
          </FormField>
          <FormField
            label="Unidades Responsáveis"
            error={errors.unidades_responsaveis_ids?.message}
            required
          >
            <DynamicSelectArray
              options={unidadesOrg.map((d) => ({
                value: d.id,
                label: d.caminho_completo,
              }))}
              value={selectedResps}
              onChange={(val) =>
                setValue("unidades_responsaveis_ids", val, {
                  shouldValidate: true,
                })
              }
              placeholder="Selecionar unidade responsável..."
              disabled={submitting}
            />
          </FormField>
        </div>

        {/* ── Descrição e Meta/Indicador ──────────────────────────────── */}
        <FormField
          label="Descrição da Ação"
          error={errors.descricao?.message}
          required
        >
          <textarea
            {...register("descricao")}
            rows={2}
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

        {/* ── Tipo Necessidade + Status ───────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <FormField
              label="Tipo de Necessidade"
              error={errors.tipo_necessidade?.message}
              required
            >
              <DynamicSelectArray
                options={TIPOS_NECESSIDADE.map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={tipos_selecionados as string[]}
                onChange={(val) =>
                  setValue("tipo_necessidade", val as any, {
                    shouldValidate: true,
                  })
                }
                placeholder="Selecionar tipo..."
                disabled={submitting}
              />
            </FormField>
          </div>
          <FormField label="Status" error={errors.status?.message} required>
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

        {/* ── Quantidade + GUT ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          <FormField label="Quantidade" error={errors.quantidade?.message}>
            <input
              {...register("quantidade")}
              placeholder="Ex: 1, 50, 200"
              className={inputCls}
              disabled={submitting}
            />
          </FormField>
          <FormField
            label="Total GUT (0–125)"
            error={errors.total_gut?.message}
            required
          >
            <input
              type="number"
              {...register("total_gut", { valueAsNumber: true })}
              min={0}
              max={125}
              className={inputCls}
              disabled={submitting}
            />
          </FormField>
        </div>

        {/* ── Datas ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          <FormField
            label="Previsão de Contratação"
            error={errors.previsao_contratacao?.message}
          >
            <MonthYearPicker
              value={previsao_contratacao}
              onChange={(val) =>
                setValue("previsao_contratacao", val ?? "", {
                  shouldValidate: true,
                })
              }
              placeholder="Selecione o mês/ano..."
              disabled={submitting}
            />
          </FormField>
          <FormField
            label="Previsão de Renovação"
            error={errors.previsao_renovacao?.message}
          >
            <MonthYearPicker
              value={previsao_renovacao}
              onChange={(val) =>
                setValue("previsao_renovacao", val ?? "", {
                  shouldValidate: true,
                })
              }
              placeholder="Selecione o mês/ano..."
              disabled={submitting}
            />
          </FormField>
        </div>

        {/* ── Valores Financeiros ────────────────────────────────────── */}
        <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          {/* Investimento */}
          <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Investimento
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
                    <CurrencyInput
                      placeholder="0,00"
                      value={investimento[String(ano)]}
                      onChange={(val) =>
                        handleValorChange(
                          "valores_investimento",
                          String(ano),
                          val
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
                    <CurrencyInput
                      placeholder="0,00"
                      value={custeio[String(ano)]}
                      onChange={(val) =>
                        handleValorChange(
                          "valores_custeio",
                          String(ano),
                          val
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

        {/* ── Botões de Ação ──────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-6 mt-4">
          <button
            type="button"
            onClick={() => router.push("/planejamento/pdtic")}
            disabled={submitting}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || (isRevisao && selectedRevisaoId === "")}
            className={`flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
              isRevisao
                ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25 hover:shadow-amber-500/30"
                : "bg-brand-primary hover:bg-brand-primary-hover shadow-brand-primary/25 hover:shadow-brand-primary/30"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                {isRevisao ? "Salvar Alteração" : "Salvar Correção"}
              </>
            )}
          </button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}
