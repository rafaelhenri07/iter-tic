"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import type { PdticRevisao, PdticPeriodo } from "@/types/pdtic";
import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";
import {
  acaoPdticSchema,
  cleanPayload,
  type AcaoPdticFormData,
} from "@/lib/validations/pdtic";
import { criarAcaoPdtic, fetchPeriodos, fetchPainelPdtic } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";

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

export default function NovaAcaoPdticPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPeriodoId = searchParams.get("periodoId");

  const [submitting, setSubmitting] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  
  // Dados de contexto
  const [periodos, setPeriodos] = useState<PdticPeriodo[]>([]);
  const [revisoes, setRevisoes] = useState<PdticRevisao[]>([]);
  const [anosRange, setAnosRange] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AcaoPdticFormData>({
    resolver: zodResolver(acaoPdticSchema),
    defaultValues: {
      periodo_id: initialPeriodoId ? Number(initialPeriodoId) : 0,
      revisao_inclusao_id: undefined,
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

  const periodoId = watch("periodo_id");
  const investimento = watch("valores_investimento") ?? {};
  const custeio = watch("valores_custeio") ?? {};

  // Carregar períodos na montagem
  useEffect(() => {
    async function loadPeriodos() {
      try {
        const data = await fetchPeriodos();
        setPeriodos(data);
        if (data.length > 0 && !periodoId) {
          const ativo = data.find((p) => p.ativo) ?? data[0];
          setValue("periodo_id", ativo.id);
        }
      } catch (err) {
        showToast("error", "Erro ao carregar períodos.");
      }
    }
    loadPeriodos();
  }, [periodoId, setValue]);

  // Quando o periodoId mudar, carregar as revisões e atualizar o range de anos
  useEffect(() => {
    async function loadRevisoesEAnos() {
      if (!periodoId) return;
      setLoadingContext(true);
      try {
        const painel = await fetchPainelPdtic(periodoId, undefined, "todas");
        setRevisoes(painel.revisoes);
        
        if (painel.revisoes.length > 0) {
          setValue("revisao_inclusao_id", painel.revisoes[0].id);
        }

        const periodoSelecionado = periodos.find((p) => p.id === periodoId);
        if (periodoSelecionado) {
          const anos: number[] = [];
          for (let y = periodoSelecionado.ano_inicio; y <= periodoSelecionado.ano_fim; y++) {
            anos.push(y);
          }
          setAnosRange(anos);
        }
      } catch (err) {
        showToast("error", "Erro ao carregar dados do período.");
      } finally {
        setLoadingContext(false);
      }
    }
    
    if (periodos.length > 0) {
      loadRevisoesEAnos();
    }
  }, [periodoId, periodos, setValue]);

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
      router.push("/planejamento/pdtic");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar ação.";
      showToast("error", msg);
      setSubmitting(false);
    }
  };

  const totalInv = Object.values(investimento).reduce((a, b) => a + b, 0);
  const totalCus = Object.values(custeio).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          href="/planejamento/pdtic"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
        >
          <ChevronLeft size={16} />
          Voltar para PDTIC
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nova Ação do PDTIC</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Preencha os dados abaixo para cadastrar uma nova ação no plano diretor.
        </p>
      </div>

      {loadingContext ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
          
          {/* ── Seção: Contexto ─────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Contexto do Plano
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Período do PDTIC" error={errors.periodo_id?.message} required>
                <select {...register("periodo_id", { valueAsNumber: true })} className={selectCls} disabled={submitting}>
                  <option value={0}>Selecione um período...</option>
                  {periodos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ano_inicio}–{p.ano_fim}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Inclusão na Revisão" error={errors.revisao_inclusao_id?.message} required>
                <select {...register("revisao_inclusao_id", { valueAsNumber: true })} className={selectCls} disabled={submitting || revisoes.length === 0}>
                  {revisoes.length === 0 && <option value="">Nenhuma revisão disponível</option>}
                  {revisoes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numero_revisao === 0 ? "Aprovação Inicial" : (r.descricao || `Revisão ${r.numero_revisao}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* ── Seção: Identificação ────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Identificação da Ação
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Código da Ação" error={errors.codigo_acao?.message} required>
                <input {...register("codigo_acao")} placeholder="Ex: A6" className={inputCls} disabled={submitting} />
              </FormField>
              
              <FormField label="Necessidade" error={errors.necessidade?.message} required>
                <input {...register("necessidade")} placeholder="Ex: N6" className={inputCls} disabled={submitting} />
              </FormField>
            </div>
            <div className="mt-6">
              <FormField label="Descrição da Ação" error={errors.descricao?.message} required>
                <textarea
                  {...register("descricao")}
                  rows={3}
                  placeholder="Descreva a ação de forma clara e objetiva..."
                  className={`${inputCls} h-auto py-3 resize-none`}
                  disabled={submitting}
                />
              </FormField>
            </div>
          </div>

          {/* ── Seção: Unidades Envolvidas ──────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Unidades Envolvidas
            </h3>
            <div className="grid gap-6 sm:grid-cols-3">
              <FormField label="Departamento" error={errors.departamento?.message} required>
                <input {...register("departamento")} placeholder="Ex: DTI" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Unidade Demandante" error={errors.unidade_demandante?.message} required>
                <input {...register("unidade_demandante")} placeholder="Ex: Divisão de Infra" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Unidade Responsável" error={errors.unidade_responsavel?.message} required>
                <input {...register("unidade_responsavel")} placeholder="Ex: Seção de Redes" className={inputCls} disabled={submitting} />
              </FormField>
            </div>
          </div>

          {/* ── Seção: Classificação e Medição ──────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Classificação e Medição
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
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

              <FormField label="Quantidade" error={errors.quantidade?.message}>
                <input {...register("quantidade")} placeholder="Ex: 24 meses" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Total GUT (0–125)" error={errors.total_gut?.message} required>
                <input type="number" {...register("total_gut", { valueAsNumber: true })} min={0} max={125} placeholder="0" className={inputCls} disabled={submitting} />
              </FormField>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
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
            </div>
          </div>

          {/* ── Seção: Prazos e Previsões ───────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Prazos e Previsões
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Previsão de Contratação" error={errors.previsao_contratacao?.message}>
                <input {...register("previsao_contratacao")} placeholder="ex: 06/2025" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Previsão de Renovação" error={errors.previsao_renovacao?.message}>
                <input {...register("previsao_renovacao")} placeholder="ex: 01/2028" className={inputCls} disabled={submitting} />
              </FormField>
            </div>
          </div>

          {/* ── Seção: Orçamento (Opcional) ─────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Planejamento Orçamentário
            </h3>
            
            <div className="space-y-6">
              {/* Investimento (Capital) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Investimento (Capital)
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total:{" "}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {totalInv.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {anosRange.map((ano) => (
                    <div key={`inv-${ano}`}>
                      <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {ano}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
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
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Custeio (Operacional)
                  </span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total:{" "}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {totalCus.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {anosRange.map((ano) => (
                    <div key={`cus-${ano}`}>
                      <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {ano}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
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
          </div>

          {/* ── Footer ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6 mt-12 dark:border-slate-800">
            <Link
              href="/planejamento/pdtic"
              className="px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
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
      )}
    </div>
  );
}
