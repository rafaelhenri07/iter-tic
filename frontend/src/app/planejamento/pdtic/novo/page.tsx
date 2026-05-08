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
  Check,
} from "lucide-react";
import type { PdticRevisao, PdticPeriodo } from "@/types/pdtic";
import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";
import {
  acaoPdticSchema,
  cleanPayload,
  type AcaoPdticFormData,
} from "@/lib/validations/pdtic";
import { 
  criarAcaoPdtic, fetchPeriodos, fetchPainelPdtic,
  fetchUnidadesOrganizacionais
} from "@/lib/api";
import type { UnidadeOrg } from "@/types/estrutura_organizacional";
import { showToast } from "@/components/ui/Toast";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePickerField } from "@/components/ui/DatePickerField";

const TIPOS_NECESSIDADE = Object.entries(TIPO_NECESSIDADE_LABEL) as [
  string,
  string,
][];

const STATUS_OPTIONS = [
  "Não iniciada",
  "Em andamento",
  "Contratada",
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
  
  // Dados de estrutura organizacional (tabela unificada)
  const [unidadesOrg, setUnidadesOrg] = useState<UnidadeOrg[]>([]);

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

  const periodoId = watch("periodo_id");
  const investimento = watch("valores_investimento") ?? {};
  const custeio = watch("valores_custeio") ?? {};
  const previsao_contratacao = watch("previsao_contratacao");
  const previsao_renovacao = watch("previsao_renovacao");
  const tipos_selecionados = watch("tipo_necessidade") ?? [];
  const selectedDeps = watch("departamentos_ids") ?? [];
  const selectedDems = watch("unidades_demandantes_ids") ?? [];
  const selectedResps = watch("unidades_responsaveis_ids") ?? [];

  // Handlers para multi-select de unidades
  const handleAddDep = (val: string) => {
    const id = Number(val);
    if (!id || selectedDeps.includes(id)) return;
    setValue("departamentos_ids", [...selectedDeps, id], { shouldValidate: true });
  };
  const handleRemoveDep = (id: number) => {
    setValue("departamentos_ids", selectedDeps.filter(d => d !== id), { shouldValidate: true });
  };
  const handleAddDem = (val: string) => {
    const id = Number(val);
    if (!id || selectedDems.includes(id)) return;
    setValue("unidades_demandantes_ids", [...selectedDems, id], { shouldValidate: true });
  };
  const handleRemoveDem = (id: number) => {
    setValue("unidades_demandantes_ids", selectedDems.filter(d => d !== id), { shouldValidate: true });
  };
  const handleAddResp = (val: string) => {
    const id = Number(val);
    if (!id || selectedResps.includes(id)) return;
    setValue("unidades_responsaveis_ids", [...selectedResps, id], { shouldValidate: true });
  };
  const handleRemoveResp = (id: number) => {
    setValue("unidades_responsaveis_ids", selectedResps.filter(d => d !== id), { shouldValidate: true });
  };

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
        
        // Carregar estrutura organizacional unificada
        const orgs = await fetchUnidadesOrganizacionais();
        setUnidadesOrg(orgs);

      } catch (err) {
        showToast("error", "Erro ao carregar dados iniciais.");
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
    val: number
  ) => {
    const current = tipo === "valores_investimento" ? { ...investimento } : { ...custeio };
    if (!val) {
      delete current[ano];
    } else {
      current[ano] = val;
    }
    setValue(tipo, current, { shouldValidate: true });
  };

  const handleAddTipo = (val: string) => {
    if (!val) return;
    if (!tipos_selecionados.includes(val as any)) {
      setValue("tipo_necessidade", [...tipos_selecionados, val as any], { shouldValidate: true });
    }
  };

  const handleRemoveTipo = (val: string) => {
    setValue("tipo_necessidade", tipos_selecionados.filter((t) => t !== val), { shouldValidate: true });
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6 pb-20">
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
                  rows={2}
                  placeholder="Descreva a ação de forma clara e objetiva..."
                  className={`${inputCls} h-auto py-2 resize-none`}
                  disabled={submitting}
                />
              </FormField>
            </div>
            <div className="mt-6">
              <FormField label="Meta" error={errors.meta?.message}>
                <textarea
                  {...register("meta")}
                  rows={2}
                  placeholder="Ex: Aprimorar a Estrutura de Rede..."
                  className={`${inputCls} h-auto py-2 resize-none`}
                  disabled={submitting}
                />
              </FormField>
            </div>

            <div className="mt-6">
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

          {/* ── Seção: Unidades Envolvidas ──────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Unidades Envolvidas
            </h3>
            <div className="flex flex-col gap-6">
              <FormField label="Departamentos" error={errors.departamentos_ids?.message} required>
                <div className="flex flex-col gap-2">
                  <select
                    className={selectCls}
                    disabled={submitting || loadingContext}
                    value=""
                    onChange={(e) => handleAddDep(e.target.value)}
                  >
                    <option value="">Adicionar departamento...</option>
                    {unidadesOrg
                      .filter(d => !selectedDeps.includes(d.id))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.sigla ? `${d.sigla} - ${d.nome}` : d.nome}</option>
                      ))}
                  </select>
                  {selectedDeps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDeps.map(id => {
                        const dep = unidadesOrg.find(d => d.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-500/50 dark:text-emerald-300">
                            {dep ? (dep.sigla ? `${dep.sigla} - ${dep.nome}` : dep.nome) : `ID ${id}`}
                            <button type="button" onClick={() => handleRemoveDep(id)} className="hover:text-emerald-900 dark:hover:text-emerald-100 ml-0.5">&times;</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </FormField>

              <FormField label="Unidades Demandantes" error={errors.unidades_demandantes_ids?.message} required>
                <div className="flex flex-col gap-2">
                  <select
                    className={selectCls}
                    disabled={submitting || loadingContext}
                    value=""
                    onChange={(e) => handleAddDem(e.target.value)}
                  >
                    <option value="">Adicionar unidade demandante...</option>
                    {unidadesOrg
                      .filter(d => !selectedDems.includes(d.id))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.sigla ? `${d.sigla} - ${d.nome}` : d.nome}</option>
                      ))}
                  </select>
                  {selectedDems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDems.map(id => {
                        const dem = unidadesOrg.find(d => d.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-300">
                            {dem ? (dem.sigla ? `${dem.sigla} - ${dem.nome}` : dem.nome) : `ID ${id}`}
                            <button type="button" onClick={() => handleRemoveDem(id)} className="hover:text-blue-900 dark:hover:text-blue-100 ml-0.5">&times;</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </FormField>

              <FormField label="Unidades Responsáveis" error={errors.unidades_responsaveis_ids?.message} required>
                <div className="flex flex-col gap-2">
                  <select
                    className={selectCls}
                    disabled={submitting || loadingContext}
                    value=""
                    onChange={(e) => handleAddResp(e.target.value)}
                  >
                    <option value="">Adicionar unidade responsável...</option>
                    {unidadesOrg
                      .filter(d => !selectedResps.includes(d.id))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.sigla ? `${d.sigla} - ${d.nome}` : d.nome}</option>
                      ))}
                  </select>
                  {selectedResps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedResps.map(id => {
                        const resp = unidadesOrg.find(d => d.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-xs px-2.5 py-1 rounded-full border border-violet-100 dark:bg-violet-900/30 dark:border-violet-500/50 dark:text-violet-300">
                            {resp ? (resp.sigla ? `${resp.sigla} - ${resp.nome}` : resp.nome) : `ID ${id}`}
                            <button type="button" onClick={() => handleRemoveResp(id)} className="hover:text-violet-900 dark:hover:text-violet-100 ml-0.5">&times;</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          </div>

          {/* ── Seção: Classificação e Medição ──────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800 dark:text-emerald-500">
              Classificação e Medição
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <FormField label="Tipo de Necessidade" error={errors.tipo_necessidade?.message} required>
                  <div className="flex flex-col gap-2 mt-2">
                    <select
                      className={selectCls}
                      disabled={submitting}
                      value=""
                      onChange={(e) => handleAddTipo(e.target.value)}
                    >
                      <option value="">Adicionar item...</option>
                      {TIPOS_NECESSIDADE
                        .filter(([value]) => !(tipos_selecionados as string[]).includes(value))
                        .map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>

                    {tipos_selecionados.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tipos_selecionados.map((tipo) => (
                          <span key={tipo} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-500/50 dark:text-emerald-300">
                            {TIPO_NECESSIDADE_LABEL[tipo as keyof typeof TIPO_NECESSIDADE_LABEL]}
                            <button
                              type="button"
                              onClick={() => handleRemoveTipo(tipo)}
                              className="hover:text-emerald-900 dark:hover:text-emerald-100 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </FormField>
              </div>

              <FormField label="Status" error={errors.status?.message} required>
                <select {...register("status")} className={selectCls} disabled={submitting}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Quantidade" error={errors.quantidade?.message}>
                <input {...register("quantidade")} placeholder="Ex: 1, 50, 200" className={inputCls} disabled={submitting} />
              </FormField>

              <FormField label="Total GUT (0–125)" error={errors.total_gut?.message} required>
                <input type="number" {...register("total_gut", { valueAsNumber: true })} min={0} max={125} placeholder="0" className={inputCls} disabled={submitting} />
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
                <DatePickerField
                  value={previsao_contratacao}
                  onChange={(val) => setValue("previsao_contratacao", val ?? "", { shouldValidate: true })}
                  placeholder="Selecione a data..."
                  disabled={submitting}
                />
              </FormField>

              <FormField label="Previsão de Renovação" error={errors.previsao_renovacao?.message}>
                <DatePickerField
                  value={previsao_renovacao}
                  onChange={(val) => setValue("previsao_renovacao", val ?? "", { shouldValidate: true })}
                  placeholder="Selecione a data..."
                  disabled={submitting}
                />
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
                    Investimento
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
                        <CurrencyInput
                          placeholder="0,00"
                          value={investimento[String(ano)]}
                          onChange={(val) =>
                            handleValorChange("valores_investimento", String(ano), val)
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
                    Custeio
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
                        <CurrencyInput
                          placeholder="0,00"
                          value={custeio[String(ano)]}
                          onChange={(val) =>
                            handleValorChange("valores_custeio", String(ano), val)
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
    </div>
  );
}
