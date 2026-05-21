"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, UserCheck, X, FileSignature, Trash2, Plus } from "lucide-react";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import {
  contratoCreateSchema,
  type ContratoCreateFormData,
  cleanContratoPayload,
} from "@/lib/validations/contrato";
import {
  criarContrato,
  fetchServidores,
  fetchProjetosLicitados,
  fetchFornecedores,
  fetchCatalogo,
} from "@/lib/api";
import type { FornecedorResponse } from "@/types/fornecedor";
import { showToast } from "@/components/ui/Toast";
import { ToastContainer } from "@/components/ui/Toast";
import type { Servidor, ProjetoListagem } from "@/types/projeto";
import type { CatalogoProduto } from "@/types/catalogo";

/* ── Estilos base ───────────────────────────────────────────────────────── */

const inputCls = "w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
const selectCls = "w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

/* ── Label + Erro ───────────────────────────────────────────────────────── */

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Título de Seção ────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-10 mb-6 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-brand-primary dark:border-slate-700">
      {children}
    </h3>
  );
}



/* ── Bloco de Papel da Equipe ───────────────────────────────────────────── */

function EquipePapelBlock({
  label,
  servidores,
  titularesIds,
  substitutosIds,
  onTitularesChange,
  onSubstitutosChange,
  loading,
}: {
  label: string;
  papelKey: string;
  servidores: Servidor[];
  titularesIds: number[];
  substitutosIds: number[];
  onTitularesChange: (ids: number[]) => void;
  onSubstitutosChange: (ids: number[]) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/20">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary">
        <UserCheck size={12} />
        {label}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular(es)">
          <MultiSelectCombobox
            options={servidores
              .filter(s => !substitutosIds.includes(s.id))
              .map(s => ({ value: s.id, label: s.nome }))
              .sort((a, b) => a.label.localeCompare(b.label))}
            value={titularesIds}
            onChange={(val) => onTitularesChange(val as number[])}
            placeholder={loading ? "Carregando..." : "Selecione os titulares..."}
            disabled={loading}
          />
        </Field>
        <Field label="Substituto(s)">
          <MultiSelectCombobox
            options={servidores
              .filter(s => !titularesIds.includes(s.id))
              .map(s => ({ value: s.id, label: s.nome }))
              .sort((a, b) => a.label.localeCompare(b.label))}
            value={substitutosIds}
            onChange={(val) => onSubstitutosChange(val as number[])}
            placeholder={loading ? "Carregando..." : "Selecione os substitutos..."}
            disabled={loading}
          />
        </Field>
      </div>
    </div>
  );
}

/* ── Página Principal ──────────────────────────────────────────────────── */

export default function NovoContratoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [projetosLicitados, setProjetosLicitados] = useState<ProjetoListagem[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorResponse[]>([]);
  const [catalogoProdutos, setCatalogoProdutos] = useState<CatalogoProduto[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
    defaultValues: {
      projeto_id: 0,
      numero: "" as unknown as number,
      ano: new Date().getFullYear(),
      modalidade_contrato: "CONTRATO" as const,
      fornecedor_id: 0,
      tipo_fornecedor_contrato: "",
      tipo_contrato: "Aquisição",
      tipo_instrumento: "CONTRATO",
      itens: [{ tipo_catalogo: "", codigo_catalogo: "", catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0 }],
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
  }, [watchedFimVigencia, watchedInicioVigencia, watchedAssinatura]);

  useEffect(() => {
    calcVigenciaMeses();
  }, [calcVigenciaMeses]);

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

  const onSubmit = async (data: ContratoCreateFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanContratoPayload(data);
      console.log("[NovoContrato] Payload:", JSON.stringify(payload, null, 2));
      const result = await criarContrato(payload);
      console.log("[NovoContrato] Sucesso:", result);
      showToast("success", `${isARP ? 'ARP' : 'Contrato'} "${data.numero}/${data.ano}" criado com sucesso!`);
      router.push("/contratos");
    } catch (err) {
      console.error("[NovoContrato] Erro:", err);
      showToast("error", err instanceof Error ? err.message : "Erro ao criar contrato.");
    } finally {
      setSubmitting(false);
    }
  };

  const papeis = [
    { key: "gestor" as const, label: "Gestor do Contrato" },
    { key: "fiscal_requisitante" as const, label: "Fiscal Requisitante" },
    { key: "fiscal_tecnico" as const, label: "Fiscal Técnico" },
    { key: "fiscal_administrativo" as const, label: "Fiscal Administrativo" },
  ];

  const watchedModalidade = watch("modalidade_contrato");
  const isARP = watchedModalidade === "ARP";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">

        {/* ── Botão Voltar ── */}
        <button
          type="button"
          onClick={() => router.push("/contratos")}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          Voltar para Contratos
        </button>

        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <FileSignature size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isARP ? "Nova Ata de Registro de Preço" : "Novo Contrato"}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Preencha as informações para o cadastro {isARP ? "da ARP" : "do contrato de TI"}
            </p>
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ══ 0. MODALIDADE DA CONTRATAÇÃO ══ */}
          <SectionTitle>Modalidade da Contratação</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setValue("modalidade_contrato", "CONTRATO")}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-5 text-center transition-all ${
                !isARP
                  ? "border-brand-primary bg-brand-primary/5 shadow-md ring-2 ring-brand-primary/20 dark:bg-brand-primary/5 dark:border-brand-primary"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">📄</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Contrato</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Contrato tradicional de TI</span>
              {!isARP && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white text-xs">✓</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setValue("modalidade_contrato", "ARP")}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-5 text-center transition-all ${
                isARP
                  ? "border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20 dark:bg-amber-950/30 dark:border-amber-400"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">📑</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Ata de Registro de Preço (ARP)</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Adesão a registro de preço</span>
              {isARP && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">✓</span>
              )}
            </button>
          </div>
          <input type="hidden" {...register("modalidade_contrato")} />

          {/* ══ 1. PROJETO DE ORIGEM ══ */}
          <SectionTitle>Projeto de Origem</SectionTitle>
          <div className="grid gap-6">
            <Field label="Projeto de Origem" required error={errors.projeto_id?.message}>
              <select {...register("projeto_id", { valueAsNumber: true })} className={selectCls}>
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
            </Field>
          </div>

          {/* ══ 2. DADOS DA CONTRATAÇÃO ══ */}
          <SectionTitle>Dados da Contratação</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex gap-4">
              {!isARP && (
                <Field label="Instrumento" required error={errors.tipo_instrumento?.message} className="w-44">
                  <select {...register("tipo_instrumento")} className={selectCls}>
                    <option value="CONTRATO">Contrato</option>
                    <option value="NOTA_EMPENHO">Nota de Empenho</option>
                  </select>
                </Field>
              )}
              <Field label="Número" required error={errors.numero?.message} className="flex-1">
                <input {...register("numero")} type="number" placeholder="Ex: 42" className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
              </Field>
              <Field label="Ano" required error={errors.ano?.message} className="w-32">
                <select {...register("ano", { valueAsNumber: true })} className={selectCls}>
                  {Array.from({ length: 21 }, (_, i) => 2015 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Tipo de Contrato" required error={errors.tipo_contrato?.message}>
              <select {...register("tipo_contrato")} className={selectCls}>
                <option value="Aquisição">Aquisição</option>
                <option value="Serviço continuado">Serviço Continuado</option>
                <option value="Subscrição">Subscrição</option>
              </select>
            </Field>

            <Field label="Fornecedor" error={(errors as any).fornecedor_id?.message} className="sm:col-span-2">
              <select {...register("fornecedor_id", { valueAsNumber: true })} className={selectCls}>
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
            </Field>

            {isARP && (
              <Field label="Órgão Gerenciador" error={errors.orgao_gerenciador?.message} className="sm:col-span-2">
                <input {...register("orgao_gerenciador")} placeholder="Ex: Ministério da Economia" className={inputCls} />
              </Field>
            )}

            <Field label="Tipo de Fornecedor" error={(errors as any).tipo_fornecedor_contrato?.message}>
              <select {...register("tipo_fornecedor_contrato")} className={selectCls}>
                <option value="">Não definido</option>
                <option value="REVENDEDOR">Revendedor</option>
                <option value="FABRICANTE">Fabricante</option>
                <option value="REVENDEDOR_E_FABRICANTE">Revendedor e Fabricante</option>
              </select>
            </Field>

            <Field label="Situação Atual" required error={errors.situacao_atual?.message}>
              <select {...register("situacao_atual")} className={selectCls}>
                <option value="Vigente">Vigente</option>
                <option value="Extinto">Extinto</option>
                <option value="Extinto, mas suporte vigente">Extinto, mas suporte vigente</option>
              </select>
            </Field>
          </div>

          {/* ══ 2.5. ITENS DA CONTRATAÇÃO ══ */}
          <div className="mt-10 mb-6 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
              Itens da Contratação
            </h3>
            <button
              type="button"
              onClick={() => appendItem({ tipo_catalogo: "", codigo_catalogo: "", catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0, data_inicio_vigencia: "", data_fim_vigencia: "" })}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-primary hover:opacity-85"
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>

          <div className="space-y-4">
            {itensFields.map((field, index) => {
              const itemError = errors.itens?.[index];
              const qtd = watchedItens[index]?.quantidade || 0;
              const val = watchedItens[index]?.valor_unitario || 0;
              const subtotal = qtd * val;

              return (
                <div key={field.id} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
                      <Field label="Item do Catálogo" required error={(itemError as any)?.catalogo_produto_id?.message}>
                        <select
                          {...register(`itens.${index}.catalogo_produto_id` as const, { valueAsNumber: true })}
                          className={selectCls}
                        >
                          <option value={0}>Selecione um item do catálogo...</option>
                          {catalogoProdutos.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Field label="Quantidade" required error={itemError?.quantidade?.message}>
                        <input type="number" min={1} {...register(`itens.${index}.quantidade` as const, { valueAsNumber: true })} className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
                      </Field>
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <Field label="Valor Unitário" required error={itemError?.valor_unitario?.message}>
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
                      </Field>
                    </div>

                    {/* Segunda linha do Grid: Detalhes opcionais e Datas */}
                    <div className="col-span-1 md:col-span-2">
                      <Field label="Catálogo Governo" error={itemError?.tipo_catalogo?.message}>
                        <select {...register(`itens.${index}.tipo_catalogo` as const)} className={selectCls}>
                          <option value="">Nenhum...</option>
                          <option value="CATMAT">CATMAT</option>
                          <option value="CATSER">CATSER</option>
                        </select>
                      </Field>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Field label="Código Governo" error={itemError?.codigo_catalogo?.message}>
                        <input {...register(`itens.${index}.codigo_catalogo` as const)} placeholder="Ex: 4501002" className={inputCls} />
                      </Field>
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <Controller
                        name={`itens.${index}.data_inicio_vigencia` as const}
                        control={control}
                        render={({ field }) => (
                          <Field label="INÍCIO DO SUPORTE/GARANTIA" error={itemError?.data_inicio_vigencia?.message}>
                            <DatePickerField
                              value={field.value || null}
                              onChange={(d) => field.onChange(d ?? "")}
                              placeholder="Selecione a data de início"
                              id={`item_inicio_${index}`}
                            />
                          </Field>
                        )}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <Controller
                        name={`itens.${index}.data_fim_vigencia` as const}
                        control={control}
                        render={({ field }) => (
                          <Field label="FIM DO SUPORTE/GARANTIA" error={itemError?.data_fim_vigencia?.message}>
                            <DatePickerField
                              value={field.value || null}
                              onChange={(d) => field.onChange(d ?? "")}
                              placeholder="Selecione a data de fim"
                              id={`item_fim_${index}`}
                            />
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Subtotal deste item: <span className="ml-1 font-mono text-sm font-bold text-brand-primary">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}

            {errors.itens?.root && (
              <p className="text-sm text-red-500 font-medium">{errors.itens.root.message}</p>
            )}

            <div className="flex justify-end rounded-xl bg-brand-primary/5 px-5 py-4">
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-brand-primary/80">Valor Total</div>
                <div className="mt-1 font-mono text-xl font-extrabold text-brand-primary">
                  R$ {totalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* ══ 3. VIGÊNCIA DO CONTRATO ══ */}
          <SectionTitle>Vigência do Contrato</SectionTitle>
          <div className="space-y-4">
            
            {/* LINHA 1: Linha do Tempo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Controller
                name="data_assinatura"
                control={control}
                render={({ field }) => (
                  <Field label="Data de Assinatura" required error={errors.data_assinatura?.message}>
                    <DatePickerField
                      value={field.value || null}
                      onChange={(d) => field.onChange(d ?? "")}
                      placeholder="Selecione a data de assinatura"
                      id="data_assinatura"
                    />
                  </Field>
                )}
              />

              <Controller
                name="data_inicio_vigencia"
                control={control}
                render={({ field }) => (
                  <Field label="Data de Início da Vigência" error={errors.data_inicio_vigencia?.message}>
                    <DatePickerField
                      value={field.value || null}
                      onChange={(d) => field.onChange(d ?? "")}
                      placeholder="Se diferente da assinatura"
                      id="data_inicio_vigencia"
                    />
                  </Field>
                )}
              />

              <Controller
                name="data_fim_vigencia"
                control={control}
                render={({ field }) => (
                  <Field label={isARP ? "Validade da Ata" : "Data Fim de Vigência"} required error={errors.data_fim_vigencia?.message}>
                    <DatePickerField
                      value={field.value || null}
                      onChange={(d) => field.onChange(d ?? "")}
                      placeholder="Selecione a data fim"
                      id="data_fim_vigencia"
                    />
                  </Field>
                )}
              />
            </div>

            {/* LINHA 2: Controle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Vigência" error={errors.vigencia_meses?.message}>
                {/* Campo hidden mantém o número para a API */}
                <input type="hidden" {...register("vigencia_meses", { valueAsNumber: true })} />
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={watchedFimVigencia ? `${watch("vigencia_meses") ?? 0} meses` : ""}
                  className={inputCls + " cursor-not-allowed bg-slate-100 dark:bg-slate-700/50 text-slate-500"}
                  placeholder="Calculado automaticamente"
                />
              </Field>

              <Field label="Prorrogação" error={errors.prorrogacao_meses?.message}>
                <select {...register("prorrogacao_meses", { valueAsNumber: true })} className={selectCls}>
                  <option value={0}>Não há prorrogação</option>
                  {Array.from({ length: 120 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? "mês" : "meses"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>


          </div>

          {/* ══ 4. EQUIPE DE FISCALIZAÇÃO ══ */}
          <SectionTitle>Equipe de Fiscalização</SectionTitle>
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
                    onTitularesChange={(ids) => field.onChange({ ...field.value, titulares_ids: ids })}
                    onSubstitutosChange={(ids) => field.onChange({ ...field.value, substitutos_ids: ids })}
                    loading={loadingData}
                  />
                )}
              />
            ))}
          </div>

          {/* ══ 5. INFORMAÇÕES COMPLEMENTARES ══ */}
          <SectionTitle>Informações Complementares</SectionTitle>
          <div className="grid gap-6">
            <Field label="Observações" error={errors.observacoes?.message}>
              <textarea
                {...register("observacoes")}
                rows={4}
                placeholder="Anotações gerais e informações adicionais sobre o contrato..."
                className={inputCls + " h-auto resize-y"}
              />
            </Field>
          </div>

          {/* ══ AÇÕES ══ */}
          <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              Campos com <span className="text-red-500">*</span> são obrigatórios
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/contratos")}
                className="h-10 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-6 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" />Criando...</>
                ) : (
                  <><FileSignature size={14} />Criar Contrato</>
                )}
              </button>
            </div>
          </div>

        </form>
      <ToastContainer />
    </div>
  );
}
