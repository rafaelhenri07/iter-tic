"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, UserCheck, X, FileSignature, Trash2, Plus } from "lucide-react";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  contratoCreateSchema,
  type ContratoCreateFormData,
  cleanContratoPayload,
} from "@/lib/validations/contrato";
import {
  criarContrato,
  fetchServidores,
  fetchProjetosLicitados,
  fetchFabricantes,
  fetchEmpresas,
} from "@/lib/api";
import type { Fabricante, Empresa } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { ToastContainer } from "@/components/ui/Toast";
import type { Servidor, ProjetoListagem } from "@/types/projeto";

/* ── Estilos base ───────────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

const selectCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

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
    <h3 className="mt-10 mb-6 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-teal-600 dark:border-slate-700 dark:text-teal-400">
      {children}
    </h3>
  );
}

/* ── Multi-select de Substitutos ────────────────────────────────────────── */

function MultiSelectSubstitutos({
  servidores,
  selectedIds,
  onChange,
  titularId,
  loading,
}: {
  servidores: Servidor[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  titularId?: number;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const opcoes = servidores.filter((s) => s.id !== (titularId || 0));
  const toggle = (id: number) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  const selected = servidores.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${selectCls} text-left flex items-center justify-between min-h-[38px] h-auto`}
      >
        <span className="flex flex-wrap gap-1 flex-1">
          {selected.length === 0 ? (
            <span className="text-slate-400 text-sm">
              {loading ? "Carregando..." : "Nenhum substituto selecionado"}
            </span>
          ) : (
            selected.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
              >
                {s.nome}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-teal-200 dark:hover:bg-teal-800"
                >
                  <X size={9} />
                </button>
              </span>
            ))
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {opcoes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic">Nenhum servidor disponível</div>
            ) : (
              opcoes.map((s) => {
                const sel = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${sel ? "bg-teal-50 dark:bg-teal-950/30" : ""}`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${sel ? "border-teal-500 bg-teal-500 text-white" : "border-slate-300"}`}>
                      {sel && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{s.nome}</div>
                      <div className="text-[11px] text-slate-500">{s.cargo}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Bloco de Papel da Equipe ───────────────────────────────────────────── */

function EquipePapelBlock({
  label,
  servidores,
  titularValue,
  substitutosValue,
  onTitularChange,
  onSubstitutosChange,
  loading,
}: {
  label: string;
  papelKey: string;
  servidores: Servidor[];
  titularValue: number;
  substitutosValue: number[];
  onTitularChange: (v: number) => void;
  onSubstitutosChange: (ids: number[]) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/20">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
        <UserCheck size={12} />
        {label}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titular">
          <select
            value={titularValue}
            onChange={(e) => onTitularChange(Number(e.target.value))}
            className={selectCls}
          >
            <option value={0}>{loading ? "Carregando..." : "Selecione o titular..."}</option>
            {servidores.map((s) => (
              <option key={s.id} value={s.id}>{s.nome} — {s.cargo}</option>
            ))}
          </select>
        </Field>
        <Field label="Substituto(s)">
          <MultiSelectSubstitutos
            servidores={servidores}
            selectedIds={substitutosValue}
            onChange={onSubstitutosChange}
            titularId={titularValue}
            loading={loading}
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
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
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
      empresa_id: 0,
      fabricante_id: 0,
      tipo_contrato: "Aquisição",
      itens: [{ tipo_catalogo: "", codigo_catalogo: "", objeto_contratado: "", quantidade: 1, valor_unitario: 0 }],
      data_inicio_vigencia: "",
      vigencia_meses: null,
      prorrogacao_meses: 0,
      data_assinatura: "",
      data_fim_vigencia: "",
      situacao_atual: "Vigente",
      observacoes: "",
      orgao_gerenciador: "",
      equipe: {
        gestor: { titular_id: 0, substitutos_ids: [] },
        fiscal_requisitante: { titular_id: 0, substitutos_ids: [] },
        fiscal_tecnico: { titular_id: 0, substitutos_ids: [] },
        fiscal_administrativo: { titular_id: 0, substitutos_ids: [] },
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
        const [srvs, projs, fabs, emps] = await Promise.all([
          fetchServidores(),
          fetchProjetosLicitados(),
          fetchFabricantes(),
          fetchEmpresas(),
        ]);
        setServidores(srvs);
        setProjetosLicitados(projs);
        setFabricantes(fabs);
        setEmpresas(emps);
      } catch {
        setServidores([]);
        setProjetosLicitados([]);
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
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">

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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/20">
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
                  ? "border-teal-500 bg-teal-50/60 shadow-md ring-2 ring-teal-500/20 dark:bg-teal-950/30 dark:border-teal-400"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">📄</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Contrato</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Contrato tradicional de TI</span>
              {!isARP && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white text-xs">✓</span>
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
              <Field label={isARP ? "Número da Ata" : "Número do Contrato"} required error={errors.numero?.message} className="flex-1">
                <input {...register("numero")} type="number" placeholder="Ex: 42" className={inputCls} />
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

            <Field label="Empresa Contratada" required error={errors.empresa_id?.message} className="sm:col-span-2">
              <select {...register("empresa_id", { valueAsNumber: true })} className={selectCls}>
                <option value={0}>
                  {loadingData
                    ? "Carregando empresas..."
                    : empresas.length === 0
                      ? "Nenhuma empresa cadastrada"
                      : "Selecione a empresa contratada..."}
                </option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} — CNPJ: {e.cnpj}
                  </option>
                ))}
              </select>
            </Field>

            {isARP && (
              <Field label="Órgão Gerenciador" error={errors.orgao_gerenciador?.message} className="sm:col-span-2">
                <input {...register("orgao_gerenciador")} placeholder="Ex: Ministério da Economia" className={inputCls} />
              </Field>
            )}

            <Field label="Fabricante" error={errors.fabricante_id?.message}>
              <select {...register("fabricante_id", { valueAsNumber: true })} className={selectCls}>
                <option value={0}>{loadingData ? "Carregando..." : "Selecione o fabricante..."}</option>
                {fabricantes.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Itens da Contratação
            </h3>
            <button
              type="button"
              onClick={() => appendItem({ tipo_catalogo: "", codigo_catalogo: "", objeto_contratado: "", quantidade: 1, valor_unitario: 0 })}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
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
                  <div className="grid gap-4 sm:grid-cols-12 items-start">
                    <div className="sm:col-span-2">
                      <Field label="Catálogo" error={itemError?.tipo_catalogo?.message}>
                        <select {...register(`itens.${index}.tipo_catalogo` as const)} className={selectCls}>
                          <option value="">Selecione...</option>
                          <option value="CATMAT">CATMAT</option>
                          <option value="CATSER">CATSER</option>
                        </select>
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Código" error={itemError?.codigo_catalogo?.message}>
                        <input {...register(`itens.${index}.codigo_catalogo` as const)} placeholder="Ex: 4501002" className={inputCls} />
                      </Field>
                    </div>
                    <div className="sm:col-span-4">
                      <Field label="Objeto Contratado" required error={itemError?.objeto_contratado?.message}>
                        <input {...register(`itens.${index}.objeto_contratado` as const)} placeholder="Ex: Licença Microsoft 365" className={inputCls} />
                      </Field>
                    </div>
                    <div className="sm:col-span-1">
                      <Field label="Qtd" required error={itemError?.quantidade?.message}>
                        <input type="number" min={1} {...register(`itens.${index}.quantidade` as const, { valueAsNumber: true })} className={inputCls} />
                      </Field>
                    </div>
                    <div className="sm:col-span-3">
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
                  </div>
                  <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Subtotal deste item: <span className="ml-1 font-mono text-sm font-bold text-teal-600 dark:text-teal-400">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}

            {errors.itens?.root && (
              <p className="text-sm text-red-500 font-medium">{errors.itens.root.message}</p>
            )}

            <div className="flex justify-end rounded-xl bg-teal-50 px-5 py-4 dark:bg-teal-900/20">
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-teal-600/70 dark:text-teal-400/70">Valor Total</div>
                <div className="mt-1 font-mono text-xl font-extrabold text-teal-700 dark:text-teal-300">
                  R$ {totalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* ══ 3. VIGÊNCIA ══ */}
          <SectionTitle>Vigência</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
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

            <div className="sm:col-span-2">
              <Field label="Observações" error={errors.observacoes?.message}>
                <textarea
                  {...register("observacoes")}
                  rows={3}
                  placeholder="Informações adicionais sobre o contrato..."
                  className={inputCls + " h-auto resize-none"}
                />
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
                    titularValue={field.value?.titular_id ?? 0}
                    substitutosValue={field.value?.substitutos_ids ?? []}
                    onTitularChange={(val) => field.onChange({ ...field.value, titular_id: val })}
                    onSubstitutosChange={(ids) => field.onChange({ ...field.value, substitutos_ids: ids })}
                    loading={loadingData}
                  />
                )}
              />
            ))}
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
                className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 px-6 text-sm font-bold text-white shadow-md shadow-cyan-500/25 transition-all hover:brightness-110 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      <ToastContainer />
    </div>
  );
}
