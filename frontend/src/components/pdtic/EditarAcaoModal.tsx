"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Pencil,
  Check,
  Save,
} from "lucide-react";
import { TIPO_NECESSIDADE_LABEL } from "@/types/pdtic";
import type { PdticAcao, PdticRevisao } from "@/types/pdtic";
import {
  FormField,
  inputCls,
  selectCls,
  TIPOS_NECESSIDADE,
  STATUS_OPTIONS,
} from "@/components/ui/FormField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { DatePickerField } from "@/components/ui/DatePickerField";
import {
  acaoPdticUpdateSchema,
  cleanUpdatePayload,
  type AcaoPdticUpdateFormData,
} from "@/lib/validations/pdtic";
import { 
  atualizarAcaoPdtic, fetchUnidadesOrganizacionais 
} from "@/lib/api";
import type { UnidadeOrg } from "@/types/estrutura_organizacional";
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

  const [unidadesOrg, setUnidadesOrg] = useState<UnidadeOrg[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingContext(true);
      try {
        const orgs = await fetchUnidadesOrganizacionais();
        setUnidadesOrg(orgs);
      } catch (e) {
        showToast("error", "Erro ao carregar estrutura organizacional.");
      } finally {
        setLoadingContext(false);
      }
    }
    load();
  }, []);

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
      departamentos_ids: acao.departamentos_rel?.map(d => d.id) ?? [],
      unidades_demandantes_ids: acao.unidades_demandantes_rel?.map(d => d.id) ?? [],
      unidades_responsaveis_ids: acao.unidades_responsaveis_rel?.map(d => d.id) ?? [],
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
        departamentos_ids: acao.departamentos_rel?.map(d => d.id) ?? [],
        unidades_demandantes_ids: acao.unidades_demandantes_rel?.map(d => d.id) ?? [],
        unidades_responsaveis_ids: acao.unidades_responsaveis_rel?.map(d => d.id) ?? [],
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
  const previsao_contratacao = watch("previsao_contratacao");
  const previsao_renovacao = watch("previsao_renovacao");
  const tipos_selecionados = watch("tipo_necessidade") ?? [];
  const selectedDeps = watch("departamentos_ids") ?? [];
  const selectedDems = watch("unidades_demandantes_ids") ?? [];
  const selectedResps = watch("unidades_responsaveis_ids") ?? [];

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
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <FormField
                label="Revisão da Alteração"
                required
                error={
                  selectedRevisaoId === "" ? "Selecione a revisão que motiva esta alteração." : undefined
                }
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
                      {r.numero_revisao === 0 ? "Aprovação Inicial" : (r.descricao || `Revisão ${r.numero_revisao}`)}
                    </option>
                  ))}
                </select>
              </FormField>
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                ⚠ A revisão selecionada será usada para fechar a versão atual e criar a nova versão.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Código" error={errors.codigo_acao?.message} required>
                <input {...register("codigo_acao")} className={inputCls} disabled={submitting} />
              </FormField>
              <FormField label="Necessidade" error={errors.necessidade?.message} required>
                <input {...register("necessidade")} className={inputCls} disabled={submitting} />
              </FormField>
              <div /> {/* spacer */}
            </div>

            <div className="flex flex-col gap-4">
              <FormField label="Departamentos" error={errors.departamentos_ids?.message} required>
                <div className="flex flex-col gap-2">
                  <select className={selectCls} disabled={submitting || loadingContext} value="" onChange={(e) => handleAddDep(e.target.value)}>
                    <option value="">Adicionar departamento...</option>
                    {unidadesOrg.filter(d => !selectedDeps.includes(d.id)).map(d => (
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
                  <select className={selectCls} disabled={submitting || loadingContext} value="" onChange={(e) => handleAddDem(e.target.value)}>
                    <option value="">Adicionar unidade demandante...</option>
                    {unidadesOrg.filter(d => !selectedDems.includes(d.id)).map(d => (
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
                  <select className={selectCls} disabled={submitting || loadingContext} value="" onChange={(e) => handleAddResp(e.target.value)}>
                    <option value="">Adicionar unidade responsável...</option>
                    {unidadesOrg.filter(d => !selectedResps.includes(d.id)).map(d => (
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

            <FormField label="Descrição da Ação" error={errors.descricao?.message} required>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 border-t border-border pt-4 mt-4">
              <FormField label="Quantidade" error={errors.quantidade?.message}>
                <input {...register("quantidade")} placeholder="Ex: 1, 50, 200" className={inputCls} disabled={submitting} />
              </FormField>
              <FormField label="Total GUT (0–125)" error={errors.total_gut?.message} required>
                <input type="number" {...register("total_gut", { valueAsNumber: true })} min={0} max={125} className={inputCls} disabled={submitting} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border pt-4 mt-4">
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

            <div className="space-y-4 border-t border-border pt-4 mt-4">
              {/* Investimento */}
              <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Investimento
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
                        <CurrencyInput
                          placeholder="0,00"
                          value={investimento[String(ano)]}
                          onChange={(val) => handleValorChange("valores_investimento", String(ano), val)}
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
                        <CurrencyInput
                          placeholder="0,00"
                          value={custeio[String(ano)]}
                          onChange={(val) => handleValorChange("valores_custeio", String(ano), val)}
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
