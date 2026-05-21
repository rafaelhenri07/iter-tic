"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, UserCheck, Users, Plus, Trash2 } from "lucide-react";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import {
  contratoCreateSchema,
  type ContratoCreateFormData,
  cleanContratoPayload,
} from "@/lib/validations/contrato";
import {
  atualizarContrato,
  fetchServidores,
  fetchProjetosLicitados,
  fetchFornecedores,
  fetchCatalogo,
  criarContrato,
} from "@/lib/api";
import type { FornecedorResponse } from "@/types/fornecedor";
import { showToast } from "@/components/ui/Toast";
import type { Servidor, ProjetoListagem } from "@/types/projeto";
import type { ContratoResponse } from "@/types/contrato";
import type { CatalogoProduto } from "@/types/catalogo";



/* ── Bloco visual de um papel da equipe ────────────────────────────────── */

interface EquipePapelBlockProps {
  label: string;
  papelKey: string;
  servidores: Servidor[];
  titularesIds: number[];
  substitutosIds: number[];
  onTitularesChange: (ids: number[]) => void;
  onSubstitutosChange: (ids: number[]) => void;
  loading: boolean;
  error?: string;
}

function EquipePapelBlock({
  label,
  servidores,
  titularesIds,
  substitutosIds,
  onTitularesChange,
  onSubstitutosChange,
  loading,
}: EquipePapelBlockProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/20">
      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
        <UserCheck size={13} />
        {label}
      </h4>

      {/* Titular */}
      <FormField label="Titular(es)" required>
        <MultiSelectCombobox
          options={servidores
            .filter((s) => !substitutosIds.includes(s.id))
            .map((s) => ({ value: s.id, label: s.nome }))
            .sort((a, b) => a.label.localeCompare(b.label))}
          value={titularesIds}
          onChange={(val) => onTitularesChange(val as number[])}
          placeholder={loading ? "Carregando..." : "Selecione os titulares..."}
          disabled={loading}
        />
      </FormField>

      {/* Substitutos */}
      <FormField label="Substituto(s)">
        <MultiSelectCombobox
          options={servidores
            .filter((s) => !titularesIds.includes(s.id))
            .map((s) => ({ value: s.id, label: s.nome }))
            .sort((a, b) => a.label.localeCompare(b.label))}
          value={substitutosIds}
          onChange={(val) => onSubstitutosChange(val as number[])}
          placeholder={loading ? "Carregando..." : "Selecione os substitutos..."}
          disabled={loading}
        />
      </FormField>
    </div>
  );
}

/* ── Componente Principal ──────────────────────────────────────────────── */

interface EditarContratoModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Se fornecido, entra em modo edição */
  initialData?: ContratoResponse;
}

export function EditarContratoModal({ onClose, onSuccess, initialData }: EditarContratoModalProps) {
  const isEditMode = !!initialData;
  const [submitting, setSubmitting] = useState(false);

  // Dados dinâmicos
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [projetosLicitados, setProjetosLicitados] = useState<ProjetoListagem[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorResponse[]>([]);
  const [catalogoProdutos, setCatalogoProdutos] = useState<CatalogoProduto[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Helper: extrair equipe do initialData
  const buildInitialEquipe = () => {
    const equipe = initialData?.equipe;
    return {
      gestor: {
        titulares_ids: equipe?.gestor?.titulares?.map((s) => s.id) ?? [],
        substitutos_ids: equipe?.gestor?.substitutos?.map((s) => s.id) ?? [],
      },
      fiscal_requisitante: {
        titulares_ids: equipe?.fiscal_requisitante?.titulares?.map((s) => s.id) ?? [],
        substitutos_ids:
          equipe?.fiscal_requisitante?.substitutos?.map((s) => s.id) ?? [],
      },
      fiscal_tecnico: {
        titulares_ids: equipe?.fiscal_tecnico?.titulares?.map((s) => s.id) ?? [],
        substitutos_ids:
          equipe?.fiscal_tecnico?.substitutos?.map((s) => s.id) ?? [],
      },
      fiscal_administrativo: {
        titulares_ids: equipe?.fiscal_administrativo?.titulares?.map((s) => s.id) ?? [],
        substitutos_ids:
          equipe?.fiscal_administrativo?.substitutos?.map((s) => s.id) ?? [],
      },
    };
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContratoCreateFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contratoCreateSchema) as any,
    defaultValues: initialData
      ? {
          projeto_id: initialData.projeto_id,
          numero: initialData.numero,
          ano: initialData.ano,
          modalidade_contrato: initialData.modalidade_contrato ?? "CONTRATO",

          fornecedor_id: initialData.fornecedor_id ?? 0,
          tipo_fornecedor_contrato: (initialData.tipo_fornecedor_contrato as any) ?? "",
          tipo_contrato: initialData.tipo_contrato as "Aquisição" | "Serviço continuado" | "Subscrição",
          tipo_instrumento: (initialData as any).tipo_instrumento ?? "CONTRATO",
          itens: initialData.itens?.map(i => ({
            catalogo_produto_id: i.catalogo_produto_id ?? 0,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
            data_inicio_vigencia: i.data_inicio_vigencia ?? "",
            data_fim_vigencia: i.data_fim_vigencia ?? "",
          })) ?? [{ catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0, data_inicio_vigencia: "", data_fim_vigencia: "" }],
          data_inicio_vigencia: initialData.data_inicio_vigencia ?? "",
          vigencia_meses: initialData.vigencia_meses ?? null,
          prorrogacao_meses: initialData.prorrogacao_meses ?? 0,
          data_assinatura: initialData.data_assinatura,
          data_fim_vigencia: initialData.data_fim_vigencia,
          situacao_atual: initialData.situacao_atual as "Vigente" | "Extinto" | "Extinto, mas suporte vigente",
          observacoes: initialData.observacoes ?? "",
          orgao_gerenciador: initialData.orgao_gerenciador ?? "",
          equipe: buildInitialEquipe(),
        }
      : {
          projeto_id: 0,
          numero: "" as unknown as number,
          ano: new Date().getFullYear(),
          modalidade_contrato: "CONTRATO" as const,

          fornecedor_id: 0,
          tipo_fornecedor_contrato: "",
          tipo_contrato: "Aquisição",
          tipo_instrumento: "CONTRATO",
          itens: [{ catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0, data_inicio_vigencia: "", data_fim_vigencia: "" }],
          data_inicio_vigencia: "",
          vigencia_meses: null,
          prorrogacao_meses: 0,
          data_assinatura: "",
          data_fim_vigencia: "",
          situacao_atual: "Vigente",
          observacoes: "",
          orgao_gerenciador: "",
          equipe: {
            gestor: { titulares_ids: [], substitutos_ids: [] },
            fiscal_requisitante: { titulares_ids: [], substitutos_ids: [] },
            fiscal_tecnico: { titulares_ids: [], substitutos_ids: [] },
            fiscal_administrativo: { titulares_ids: [], substitutos_ids: [] },
          },
        },
  });

  // Watch equipe for controlled components
  const equipeValues = watch("equipe");

  // ── Itens Dinâmicos ──────────────────────────────────────────────────────
  const { fields: itensFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "itens",
  });
  const watchedItens = useWatch({ control, name: "itens" }) || [];
  const totalItens = watchedItens.reduce((acc, curr) => acc + (Number(curr?.quantidade) || 0) * (Number(curr?.valor_unitario) || 0), 0);

  // ── Cálculo automático de vigência (meses) ─────────────────────────────
  const watchedAssinatura = useWatch({ control, name: "data_assinatura" });
  const watchedInicioVigencia = useWatch({ control, name: "data_inicio_vigencia" });
  const watchedFimVigencia = useWatch({ control, name: "data_fim_vigencia" });

  const calcVigenciaMeses = useCallback(() => {
    const fimStr = watchedFimVigencia;
    const inicioStr = watchedInicioVigencia || watchedAssinatura;
    if (!fimStr || !inicioStr) return;
    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return;
    const meses =
      (fim.getFullYear() - inicio.getFullYear()) * 12 +
      (fim.getMonth() - inicio.getMonth());
    setValue("vigencia_meses", Math.max(0, meses));
  }, [watchedFimVigencia, watchedInicioVigencia, watchedAssinatura, setValue]);

  useEffect(() => {
    calcVigenciaMeses();
  }, [calcVigenciaMeses]);

  // ── Load dados dinâmicos ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [srvs, projs, forns, cat] = await Promise.all([
          fetchServidores(),
          fetchProjetosLicitados(),
          fetchFornecedores(),
          fetchCatalogo(),
        ]);
        setServidores(srvs);
        setProjetosLicitados(projs);
        setFornecedores(forns);
        setCatalogoProdutos(cat);
      } catch {
        setServidores([]);
        setProjetosLicitados([]);
        setCatalogoProdutos([]);
      }
      setLoadingData(false);
    }
    load();
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────
  const onSubmit = async (data: ContratoCreateFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanContratoPayload(data);
      if (isEditMode && initialData) {
        await atualizarContrato(initialData.id, payload);
        showToast("success", `${isARP ? 'ARP' : 'Contrato'} "${data.numero}/${data.ano}" atualizado com sucesso!`);
      } else {
        await criarContrato(payload);
        showToast("success", `${isARP ? 'ARP' : 'Contrato'} "${data.numero}/${data.ano}" criado com sucesso!`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : isEditMode ? "Erro ao atualizar contrato." : "Erro ao criar contrato."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Papéis da equipe ──────────────────────────────────────────────────
  const papeis = [
    { key: "gestor" as const, label: "Gestor do Contrato" },
    { key: "fiscal_requisitante" as const, label: "Fiscal Requisitante" },
    { key: "fiscal_tecnico" as const, label: "Fiscal Técnico" },
    { key: "fiscal_administrativo" as const, label: "Fiscal Administrativo" },
  ];

  const watchedModalidade = watch("modalidade_contrato");
  const isARP = watchedModalidade === "ARP";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-background-card shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-base font-bold text-foreground">
            {isEditMode
              ? `Editar ${initialData?.modalidade_contrato === 'ARP' ? 'ARP' : 'Contrato'} ${initialData?.numero}/${initialData?.ano}`
              : isARP ? "Nova ARP" : "Novo Contrato"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-0 scrollbar-thin">

            {/* ═══ 0. MODALIDADE ═══ */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-3">Modalidade</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("modalidade_contrato", "CONTRATO")}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-center transition-all ${
                    !isARP
                      ? "border-teal-500 bg-teal-50/60 shadow-sm ring-2 ring-teal-500/20 dark:bg-teal-950/30 dark:border-teal-400"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <span className="text-lg">📄</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Contrato</span>
                  {!isARP && <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-white text-[9px]">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setValue("modalidade_contrato", "ARP")}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-center transition-all ${
                    isARP
                      ? "border-amber-500 bg-amber-50/60 shadow-sm ring-2 ring-amber-500/20 dark:bg-amber-950/30 dark:border-amber-400"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <span className="text-lg">📑</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">ARP</span>
                  {isARP && <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[9px]">✓</span>}
                </button>
              </div>
              <input type="hidden" {...register("modalidade_contrato")} />
            </div>

            {/* ═══ 1. PROJETO DE ORIGEM ═══ */}
            <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
              1. Projeto de Origem
            </h3>

            <FormField
              label="Projeto de Origem"
              required
              error={errors.projeto_id?.message}
            >
              <select
                {...register("projeto_id", { valueAsNumber: true })}
                className={selectCls}
              >
                <option value={0}>
                  {loadingData
                    ? "Carregando projetos..."
                    : projetosLicitados.length === 0
                      ? "Nenhum projeto apto para contratação"
                      : "Selecione o projeto correspondente..."}
                </option>
                {projetosLicitados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — SEI: {p.processo_sei}
                  </option>
                ))}
              </select>
            </FormField>

            {/* ═══ 2. DADOS DA CONTRATAÇÃO ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
                2. Dados da Contratação
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-4">
              {!isARP && (
                <FormField label="Instrumento" required error={errors.tipo_instrumento?.message} className="w-40">
                  <select {...register("tipo_instrumento")} className={selectCls}>
                    <option value="CONTRATO">Contrato</option>
                    <option value="NOTA_EMPENHO">Nota de Empenho</option>
                  </select>
                </FormField>
              )}
              <FormField label="Número" required error={errors.numero?.message} className="flex-1">
                <input {...register("numero")} type="number" placeholder="Ex: 42" className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
              </FormField>
              <FormField label="Ano" required error={errors.ano?.message} className="w-32">
                <select {...register("ano", { valueAsNumber: true })} className={selectCls}>
                  {Array.from({ length: 21 }, (_, i) => 2015 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </FormField>
            </div>

              <FormField
                label="Tipo de Contrato"
                required
                error={errors.tipo_contrato?.message}
              >
                <select {...register("tipo_contrato")} className={selectCls}>
                  <option value="Aquisição">Aquisição</option>
                  <option value="Serviço continuado">Serviço Continuado</option>
                  <option value="Subscrição">Subscrição</option>
                </select>
              </FormField>
            </div>

            <div className="mt-4">
              <FormField
                label="Fornecedor"
                error={(errors as any).fornecedor_id?.message}
              >
                <select
                  {...register("fornecedor_id" as any, { valueAsNumber: true })}
                  className={selectCls}
                >
                  <option value={0}>
                    {loadingData
                      ? "Carregando fornecedores..."
                      : fornecedores.length === 0
                        ? "Nenhum fornecedor cadastrado"
                        : "Selecione o fornecedor..."}
                  </option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}{f.documento ? ` — ${f.documento}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {isARP && (
              <div className="mt-4">
                <FormField label="Órgão Gerenciador" error={errors.orgao_gerenciador?.message}>
                  <input {...register("orgao_gerenciador")} placeholder="Ex: Ministério da Economia" className={inputCls} />
                </FormField>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mt-4">
              <FormField
                label="Tipo de Fornecedor"
                error={(errors as any).tipo_fornecedor_contrato?.message}
              >
                <select
                  {...register("tipo_fornecedor_contrato" as any)}
                  className={selectCls}
                >
                  <option value="">Não definido</option>
                  <option value="REVENDEDOR">Revendedor</option>
                  <option value="FABRICANTE">Fabricante</option>
                  <option value="REVENDEDOR_E_FABRICANTE">Revendedor e Fabricante</option>
                </select>
              </FormField>

            </div>

            {/* ═══ 2.5. ITENS DA CONTRATAÇÃO ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
                2.5. Itens da Contratação
              </h3>
              <button
                type="button"
                onClick={() => appendItem({ catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0, data_inicio_vigencia: "", data_fim_vigencia: "" })}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
              >
                <Plus size={14} /> Adicionar Item
              </button>
            </div>

            <div className="space-y-4 mb-4">
              {itensFields.map((field, index) => {
                const itemError = errors.itens?.[index];
                const qtd = watchedItens[index]?.quantidade || 0;
                const val = watchedItens[index]?.valor_unitario || 0;
                const subtotal = qtd * val;

                return (
                  <div key={field.id} className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/20">
                    {itensFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-12 items-end">
                      <div className="col-span-1 md:col-span-6">
                        <FormField label="Item do Catálogo" required error={(itemError as any)?.catalogo_produto_id?.message}>
                          <select
                            {...register(`itens.${index}.catalogo_produto_id` as const, { valueAsNumber: true })}
                            className={selectCls}
                          >
                            <option value={0}>Selecione um item do catálogo...</option>
                            {catalogoProdutos.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.nome}</option>
                            ))}
                          </select>
                        </FormField>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <FormField label="Quantidade" required error={itemError?.quantidade?.message}>
                          <input type="number" min={1} {...register(`itens.${index}.quantidade` as const, { valueAsNumber: true })} className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
                        </FormField>
                      </div>
                      <div className="col-span-1 md:col-span-4">
                        <FormField label="Valor Unitário" required error={itemError?.valor_unitario?.message}>
                          <Controller
                            control={control}
                            name={`itens.${index}.valor_unitario` as const}
                            render={({ field }) => (
                              <CurrencyInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="0,00"
                                className={inputCls}
                              />
                            )}
                          />
                        </FormField>
                      </div>

                      {/* Segunda linha do Grid: Detalhes opcionais e Datas */}
                      <div className="col-span-1 md:col-span-2">
                        <FormField label="Catálogo Governo" error={itemError?.tipo_catalogo?.message}>
                          <select {...register(`itens.${index}.tipo_catalogo` as const)} className={selectCls}>
                            <option value="">Nenhum...</option>
                            <option value="CATMAT">CATMAT</option>
                            <option value="CATSER">CATSER</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <FormField label="Código Governo" error={itemError?.codigo_catalogo?.message}>
                          <input {...register(`itens.${index}.codigo_catalogo` as const)} placeholder="Ex: 4501002" className={inputCls} />
                        </FormField>
                      </div>
                      <div className="col-span-1 md:col-span-4">
                        <Controller
                          name={`itens.${index}.data_inicio_vigencia` as const}
                          control={control}
                          render={({ field }) => (
                            <FormField label="INÍCIO DO SUPORTE/GARANTIA" error={itemError?.data_inicio_vigencia?.message}>
                              <DatePickerField
                                value={field.value || null}
                                onChange={(d) => field.onChange(d ?? "")}
                                placeholder="Selecione a data de início"
                                id={`modal_item_inicio_${index}`}
                              />
                            </FormField>
                          )}
                        />
                      </div>
                      <div className="col-span-1 md:col-span-4">
                        <Controller
                          name={`itens.${index}.data_fim_vigencia` as const}
                          control={control}
                          render={({ field }) => (
                            <FormField label="FIM DO SUPORTE/GARANTIA" error={itemError?.data_fim_vigencia?.message}>
                              <DatePickerField
                                value={field.value || null}
                                onChange={(d) => field.onChange(d ?? "")}
                                placeholder="Selecione a data de fim"
                                id={`modal_item_fim_${index}`}
                              />
                            </FormField>
                          )}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end border-t border-slate-200 pt-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Subtotal deste item: <span className="ml-1 font-mono text-sm font-bold text-teal-600 dark:text-teal-400">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}

              {errors.itens?.root && (
                <p className="text-sm text-red-500 font-medium">{errors.itens.root.message}</p>
              )}

              <div className="flex justify-end rounded-xl bg-teal-50 px-5 py-4 dark:bg-teal-900/20 mt-2 border border-teal-100 dark:border-teal-900">
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-600/70 dark:text-teal-400/70">Valor Total</div>
                  <div className="mt-1 font-mono text-xl font-extrabold text-teal-700 dark:text-teal-300">
                    R$ {totalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ 3. VIGÊNCIA E SITUAÇÃO ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
                3. Vigência do Contrato e Situação
              </h3>
            </div>

            <div className="space-y-4">
              {/* LINHA 1: Linha do Tempo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name="data_assinatura"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="Data de Assinatura"
                      required
                      error={errors.data_assinatura?.message}
                    >
                      <DatePickerField
                        value={field.value || null}
                        onChange={(d) => field.onChange(d ?? "")}
                        placeholder="Selecione a data de assinatura"
                        id="data_assinatura_modal"
                      />
                    </FormField>
                  )}
                />

                <Controller
                  name="data_inicio_vigencia"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="Data de Início da Vigência"
                      error={errors.data_inicio_vigencia?.message}
                    >
                      <DatePickerField
                        value={field.value || null}
                        onChange={(d) => field.onChange(d ?? "")}
                        placeholder="Se diferente da assinatura"
                        id="data_inicio_vigencia_modal"
                      />
                    </FormField>
                  )}
                />

                <Controller
                  name="data_fim_vigencia"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label={isARP ? "Validade da Ata" : "Data Fim de Vigência"}
                      required
                      error={errors.data_fim_vigencia?.message}
                    >
                      <DatePickerField
                        value={field.value || null}
                        onChange={(d) => field.onChange(d ?? "")}
                        placeholder="Selecione a data fim"
                        id="data_fim_vigencia_modal"
                      />
                    </FormField>
                  )}
                />
              </div>

              {/* LINHA 2: Controle e Situação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="Vigência"
                  error={errors.vigencia_meses?.message}
                >
                  {/* Campo hidden mantém o número para a API */}
                  <input type="hidden" {...register("vigencia_meses", { valueAsNumber: true })} />
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={watchedFimVigencia ? `${watch("vigencia_meses") ?? 0} meses` : ""}
                    className={inputCls + " cursor-not-allowed opacity-70"}
                    placeholder="Calculado automaticamente"
                  />
                </FormField>

                <FormField
                  label="Prorrogação"
                  error={errors.prorrogacao_meses?.message}
                >
                  <select {...register("prorrogacao_meses", { valueAsNumber: true })} className={selectCls}>
                    <option value={0}>Não há prorrogação</option>
                    {Array.from({ length: 120 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} {m === 1 ? "mês" : "meses"}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Situação Atual"
                  required
                  error={errors.situacao_atual?.message}
                >
                  <select {...register("situacao_atual")} className={selectCls}>
                    <option value="Vigente">Vigente</option>
                    <option value="Extinto">Extinto</option>
                    <option value="Extinto, mas suporte vigente">Extinto, mas suporte vigente</option>
                  </select>
                </FormField>
              </div>


            </div>

            {/* ═══ 4. EQUIPE DE FISCALIZAÇÃO ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Users size={15} />
                4. Equipe de Fiscalização
              </h3>
              <p className="text-xs text-foreground-muted mb-4 -mt-2">
                Para cada função, selecione 1 Titular (obrigatório) e, opcionalmente, um ou mais Substitutos.
              </p>
            </div>

            <div className="space-y-4">
              {papeis.map((papel) => (
                <Controller
                  key={papel.key}
                  name={`equipe.${papel.key}`}
                  control={control}
                  render={({ field }) => (
                    <EquipePapelBlock
                      label={papel.label}
                      papelKey={papel.key}
                      servidores={servidores}
                      titularesIds={field.value?.titulares_ids ?? []}
                      substitutosIds={field.value?.substitutos_ids ?? []}
                      onTitularesChange={(ids) =>
                        field.onChange({
                          ...field.value,
                          titulares_ids: ids,
                        })
                      }
                      onSubstitutosChange={(ids) =>
                        field.onChange({
                          ...field.value,
                          substitutos_ids: ids,
                        })
                      }
                      loading={loadingData}
                    />
                  )}
                />
              ))}
            </div>

            {/* ═══ 5. INFORMAÇÕES COMPLEMENTARES ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                5. Informações Complementares
              </h3>
            </div>
            
            <div className="col-span-full mb-4">
              <FormField
                label="Observações"
                error={errors.observacoes?.message}
              >
                <textarea
                  {...register("observacoes")}
                  rows={4}
                  placeholder="Anotações gerais e informações adicionais sobre o contrato..."
                  className={inputCls + " h-auto py-2 resize-y"}
                />
              </FormField>
            </div>

            {/* Spacer para garantir que o último campo não fique colado no footer */}
            <div className="h-2" />
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-background-card px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 px-5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {isEditMode ? "Salvando..." : "Criando..."}
                </>
              ) : (
                isEditMode ? "Salvar Alterações" : "Criar Contrato"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
