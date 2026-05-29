"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, UserCheck, FileSignature, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import { SingleSelectCombobox } from "@/components/ui/SingleSelectCombobox";
import {
  contratoCreateSchema,
  type ContratoCreateFormData,
  cleanContratoPayload,
} from "@/lib/validations/contrato";
import {
  atualizarContrato,
  fetchContrato,
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
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
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

export default function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const contratoId = Number(id);

  const [submitting, setSubmitting] = useState(false);
  const [loadingContrato, setLoadingContrato] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [projetosLicitados, setProjetosLicitados] = useState<ProjetoListagem[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorResponse[]>([]);
  const [catalogoProdutos, setCatalogoProdutos] = useState<CatalogoProduto[]>([]);

  // Controle de etapas do Assistente (Wizard)
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = useForm<ContratoCreateFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contratoCreateSchema) as any,
    defaultValues: {
      projeto_id: 0,
      numero: "" as unknown as number,
      ano: new Date().getFullYear(),
      modalidade_contrato: "CONTRATO" as const,
      tipo_contratacao: "",
      fornecedor_id: 0,
      tipo_fornecedor_contrato: "",
      tipo_contrato: "Aquisição",
      tipo_instrumento: "CONTRATO",
      itens: [{ tipo_catalogo: "" as "" | "CATMAT" | "CATSER", codigo_catalogo: "", catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0 }],
      data_inicio_vigencia: "",
      vigencia_meses: null,
      prorrogacao_meses: 0,
      data_assinatura: "",
      data_fim_vigencia: "",
      situacao_atual: "Vigente",
      orgao_gerenciador: "",
      equipe: {
        gestor: { titulares_ids: [], substitutos_ids: [] },
        fiscal_requisitante: { titulares_ids: [], substitutos_ids: [] },
        fiscal_tecnico: { titulares_ids: [], substitutos_ids: [] },
        fiscal_administrativo: { titulares_ids: [], substitutos_ids: [] },
      },
    },
  });

  // Atualiza a maior etapa visitada pelo usuário
  useEffect(() => {
    if (currentStep > maxStepReached) {
      setMaxStepReached(currentStep);
    }
  }, [currentStep, maxStepReached]);

  // Definição das etapas
  const steps = [
    { number: 1, title: "Modalidade", desc: "Modalidade da Contratação" },
    { number: 2, title: "Tipo", desc: "Tipo de Contratação" },
    { number: 3, title: "Dados", desc: "Dados da Contratação" },
    { number: 4, title: "Itens", desc: "Itens da Contratação" },
    { number: 5, title: "Vigência", desc: "Vigência do Contrato" },
    { number: 6, title: "Fiscalização", desc: "Equipe de Fiscalização" },
    { number: 7, title: "Revisão", desc: "Revisão Final" },
  ];

  // Mapeamento de quais campos pertencem a cada etapa para validação com trigger()
  const stepFields: Record<number, (keyof ContratoCreateFormData)[]> = {
    1: ["modalidade_contrato"],
    2: ["tipo_contratacao"],
    3: [
      "projeto_id",
      "numero",
      "ano",
      "tipo_contrato",
      "fornecedor_id",
      "tipo_fornecedor_contrato",
      "situacao_atual",
      "tipo_instrumento",
      "orgao_gerenciador"
    ],
    4: ["itens"],
    5: ["data_assinatura", "data_fim_vigencia", "data_inicio_vigencia", "vigencia_meses", "prorrogacao_meses"],
    6: ["equipe"],
    7: []
  };

  // Funções de navegação do assistente

  const handleNext = async () => {
    const fields = stepFields[currentStep];
    if (fields) {
      const isValid = await trigger(fields);
      if (!isValid) {
        showToast("error", "Por favor, preencha os campos obrigatórios corretamente antes de avançar.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Previne submissão precoce ao pressionar Enter em inputs de texto normais
  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "textarea") {
      e.preventDefault();
    }
  };

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

  // Load dados auxiliares
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

  // Load contrato
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchContrato(contratoId);
        
        const buildInitialEquipe = () => {
          const equipe = data.equipe;
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

        reset({
          projeto_id: data.projeto_id,
          numero: data.numero,
          ano: data.ano,
          modalidade_contrato: data.modalidade_contrato ?? "CONTRATO",
          tipo_contratacao: data.tipo_contratacao ?? "",
          fornecedor_id: data.fornecedor_id ?? 0,
          tipo_fornecedor_contrato: (data.tipo_fornecedor_contrato as "REVENDEDOR" | "FABRICANTE" | "REVENDEDOR_E_FABRICANTE" | "") ?? "",
          tipo_contrato: data.tipo_contrato as "Aquisição" | "Serviço continuado" | "Subscrição",
          tipo_instrumento: (data.tipo_instrumento as "CONTRATO" | "NOTA_EMPENHO" | null) ?? "CONTRATO",
          itens: data.itens?.map(i => ({
            tipo_catalogo: (i.tipo_catalogo ?? "") as "" | "CATMAT" | "CATSER",
            codigo_catalogo: i.codigo_catalogo ?? "",
            catalogo_produto_id: i.catalogo_produto_id ?? 0,
            quantidade: i.quantidade,
            valor_unitario: Number(i.valor_unitario) || 0,
            data_inicio_vigencia: i.data_inicio_vigencia ?? "",
            data_fim_vigencia: i.data_fim_vigencia ?? "",
          })) ?? [{ tipo_catalogo: "" as "" | "CATMAT" | "CATSER", codigo_catalogo: "", catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0, data_inicio_vigencia: "", data_fim_vigencia: "" }],
          data_inicio_vigencia: data.data_inicio_vigencia ?? "",
          vigencia_meses: data.vigencia_meses ?? null,
          prorrogacao_meses: data.prorrogacao_meses ?? 0,
          data_assinatura: data.data_assinatura,
          data_fim_vigencia: data.data_fim_vigencia,
          situacao_atual: data.situacao_atual as "Vigente" | "Extinto" | "Extinto, mas suporte vigente",
          orgao_gerenciador: data.orgao_gerenciador ?? "",
          equipe: buildInitialEquipe(),
        });
      } catch {
        showToast("error", "Erro ao carregar os dados do contrato.");
      } finally {
        setLoadingContrato(false);
      }
    })();
  }, [contratoId, reset]);

  const onSubmit = async (data: ContratoCreateFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanContratoPayload(data);
      console.log("[EditarContrato] Payload:", JSON.stringify(payload, null, 2));
      const result = await atualizarContrato(contratoId, payload);
      console.log("[EditarContrato] Sucesso:", result);
      showToast("success", `${isARP ? 'ARP' : 'Contrato'} "${data.numero}/${data.ano}" atualizado com sucesso!`);
      setTimeout(() => router.push("/contratos"), 1000);
    } catch (err) {
      console.error("[EditarContrato] Erro:", err);
      showToast("error", err instanceof Error ? err.message : "Erro ao atualizar contrato.");
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

  if (loadingContrato) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Carregando contrato...
      </div>
    );
  }

  const watchedNumero = watch("numero");
  const watchedAno = watch("ano");
  const title = watchedNumero ? `Editar ${isARP ? 'ARP' : 'Contrato'} ${watchedNumero}/${watchedAno}` : "Editar Contrato";

  return (
    <div className="mx-auto max-w-4xl pb-20">

      {/* ── Botão Voltar ── */}
      <button
        type="button"
        onClick={() => router.push("/contratos")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={15} />
        Voltar para Contratos
      </button>

      {/* ── Cabeçalho Minimalista do Wizard ── */}
      <div className="mb-1">
        {/* Linha 1: Ícone + Título da Etapa + Indicador */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <FileSignature size={18} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex-1">
            {title} — {steps[currentStep - 1].desc}
          </h1>
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Etapa {currentStep} de 7
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-primary transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          />
        </div>

        {/* Linha 2: Subtítulo descritivo */}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {currentStep === 1 && (isARP ? "Altere a modalidade de contratação para a ARP" : "Altere a modalidade de contratação para o contrato de TI")}
          {currentStep === 2 && "Altere o tipo de contratação aplicável"}
          {currentStep === 3 && "Edite os dados principais da contratação"}
          {currentStep === 4 && "Gerencie os itens que compõem esta contratação"}
          {currentStep === 5 && "Atualize as datas e prazos de vigência"}
          {currentStep === 6 && "Atualize a equipe de fiscalização do contrato"}
          {currentStep === 7 && "Revise as informações e salve as alterações"}
        </p>
      </div>

      {/* ── Formulário com Controle de Etapas ── */}
      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={preventEnterSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* ══ ETAPA 1. MODALIDADE DA CONTRATAÇÃO ══ */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setValue("modalidade_contrato", "CONTRATO")}
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-5 text-center transition-all cursor-pointer ${
                  !isARP
                    ? "border-brand-primary bg-brand-primary/5 shadow-md ring-2 ring-brand-primary/20 dark:bg-brand-primary/5 dark:border-brand-primary"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                }`}
              >
                <span className="text-3xl mb-1">📄</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Contrato</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Contrato tradicional de TI</span>
                {!isARP && (
                  <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold shadow">✓</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setValue("modalidade_contrato", "ARP")}
                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-5 text-center transition-all cursor-pointer ${
                  isARP
                    ? "border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20 dark:bg-amber-950/30 dark:border-amber-400"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                }`}
              >
                <span className="text-3xl mb-1">📑</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Ata de Registro de Preço (ARP)</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Adesão a registro de preço</span>
                {isARP && (
                  <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shadow">✓</span>
                )}
              </button>
            </div>
            <input type="hidden" {...register("modalidade_contrato")} />
          </div>
        )}

        {/* ══ ETAPA 2. TIPO DE CONTRATAÇÃO ══ */}
        {currentStep === 2 && (
          <Controller
            name="tipo_contratacao"
            control={control}
            render={({ field }) => {
              const grupos = [
                {
                  nome: "Contratação por Licitação",
                  opcoes: ["Pregão", "Concorrência", "Concurso", "Leilão", "Diálogo Competitivo"],
                },
                {
                  nome: "Contratação Direta",
                  opcoes: ["Dispensa", "Inexigibilidade"],
                },
              ];

              // Mapeia valor para comparação (Diálogo Competitivo → Diálogo competitivo)
              const normalizeValue = (label: string) =>
                label === "Diálogo Competitivo" ? "Diálogo competitivo" : label;

              return (
                <div className="space-y-8">
                  {grupos.map((grupo) => (
                    <div key={grupo.nome}>
                      {/* Label do grupo */}
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                        {grupo.nome}
                      </p>

                      {/* Chips */}
                      <div className="flex flex-wrap gap-2">
                        {grupo.opcoes.map((opcao) => {
                          const value = normalizeValue(opcao);
                          const isSelected = field.value === value;
                          return (
                            <button
                              key={opcao}
                              type="button"
                              onClick={() => field.onChange(value)}
                              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? "border-brand-primary bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                              }`}
                            >
                              {/* Indicador dot */}
                              <span
                                className={`h-2 w-2 rounded-full transition-all ${
                                  isSelected
                                    ? "bg-white"
                                    : "bg-slate-300 dark:bg-slate-600"
                                }`}
                              />
                              {opcao}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Erro de validação */}
                  {errors.tipo_contratacao && (
                    <p className="text-xs text-red-500 font-medium">{errors.tipo_contratacao.message}</p>
                  )}
                </div>
              );
            }}
          />
        )}

        {/* ══ ETAPA 3. DADOS DA CONTRATAÇÃO ══ */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="grid gap-6">
              <Field label="Projeto de Origem" required error={errors.projeto_id?.message}>
                <Controller
                  name="projeto_id"
                  control={control}
                  render={({ field }) => (
                    <SingleSelectCombobox
                      options={projetosLicitados.map((p) => ({
                        value: p.id,
                        label: `${p.nome} — SEI: ${p.processo_sei}`,
                      }))}
                      value={field.value || undefined}
                      onChange={(val) => field.onChange(val ? Number(val) : 0)}
                      placeholder={
                        loadingData
                          ? "Carregando projetos..."
                          : projetosLicitados.length === 0
                            ? "Nenhum projeto apto para contratação"
                            : "Busque ou selecione o projeto..."
                      }
                      disabled={loadingData}
                    />
                  )}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-3">
                {/* Linha 1: Instrumento + Número + Ano */}
                <div className="flex gap-3 sm:col-span-3">
                  {!isARP && (
                    <Field label="Instrumento" required error={errors.tipo_instrumento?.message} className="w-40">
                      <select {...register("tipo_instrumento")} className={selectCls}>
                        <option value="CONTRATO">Contrato</option>
                        <option value="NOTA_EMPENHO">Nota de Empenho</option>
                      </select>
                    </Field>
                  )}
                  <Field label="Número" required error={errors.numero?.message} className="w-28">
                    <input {...register("numero")} type="number" placeholder="Ex: 42" className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
                  </Field>
                  <Field label="Ano" required error={errors.ano?.message} className="w-28">
                    <select {...register("ano", { valueAsNumber: true })} className={selectCls}>
                      {Array.from({ length: 21 }, (_, i) => 2015 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Linha 2: Tipo de Contrato + Situação Atual + Tipo Fornecedor */}
                <Field label="Tipo de Contrato" required error={errors.tipo_contrato?.message}>
                  <select {...register("tipo_contrato")} className={selectCls}>
                    <option value="Aquisição">Aquisição</option>
                    <option value="Serviço continuado">Serviço Continuado</option>
                    <option value="Subscrição">Subscrição</option>
                  </select>
                </Field>

                <Field label="Situação Atual" required error={errors.situacao_atual?.message}>
                  <select {...register("situacao_atual")} className={selectCls}>
                    <option value="Vigente">Vigente</option>
                    <option value="Extinto">Extinto</option>
                    <option value="Extinto, mas suporte vigente">Extinto c/ suporte</option>
                  </select>
                </Field>

                <Field label="Tipo de Fornecedor" error={errors.tipo_fornecedor_contrato?.message}>
                  <select {...register("tipo_fornecedor_contrato")} className={selectCls}>
                    <option value="">Não definido</option>
                    <option value="REVENDEDOR">Revendedor</option>
                    <option value="FABRICANTE">Fabricante</option>
                    <option value="REVENDEDOR_E_FABRICANTE">Revend. e Fabric.</option>
                  </select>
                </Field>

                {/* Linha 3: Fornecedor (full width) */}
                <Field label="Fornecedor" error={errors.fornecedor_id?.message} className="sm:col-span-3">
                  <Controller
                    name="fornecedor_id"
                    control={control}
                    render={({ field }) => (
                      <SingleSelectCombobox
                        options={fornecedores.map((f) => ({
                          value: f.id,
                          label: `${f.nome}${f.documento ? ` — ${f.documento}` : ""}`,
                        }))}
                        value={field.value || undefined}
                        onChange={(val) => field.onChange(val ? Number(val) : 0)}
                        placeholder={
                          loadingData
                            ? "Carregando fornecedores..."
                            : fornecedores.length === 0
                              ? "Nenhum fornecedor cadastrado"
                              : "Busque ou selecione o fornecedor..."
                        }
                        disabled={loadingData}
                      />
                    )}
                  />
                </Field>

                {/* Linha 4 (condicional): Órgão Gerenciador */}
                {isARP && (
                  <Field label="Órgão Gerenciador" error={errors.orgao_gerenciador?.message} className="sm:col-span-3">
                    <input {...register("orgao_gerenciador")} placeholder="Ex: Ministério da Economia" className={inputCls} />
                  </Field>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ ETAPA 4. ITENS DA CONTRATAÇÃO ══ */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-primary">
                Itens da Contratação
              </h3>
              <button
                type="button"
                onClick={() => appendItem({ tipo_catalogo: "", codigo_catalogo: "", catalogo_produto_id: 0, quantidade: 1, valor_unitario: 0, data_inicio_vigencia: "", data_fim_vigencia: "" })}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-primary hover:opacity-85 cursor-pointer"
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
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-12 items-start">
                      <div className="col-span-1 md:col-span-6 relative pb-5">
                        <Field label="Item do Catálogo" required>
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
                        {itemError?.catalogo_produto_id?.message && (
                          <p className="absolute bottom-0 left-0 text-xs text-red-500 font-medium">{itemError.catalogo_produto_id.message}</p>
                        )}
                      </div>
                      <div className="col-span-1 md:col-span-2 pb-5">
                        <Field label="Quantidade" required error={itemError?.quantidade?.message}>
                          <input type="number" min={1} {...register(`itens.${index}.quantidade` as const, { valueAsNumber: true })} className={inputCls + " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"} />
                        </Field>
                      </div>
                      <div className="col-span-1 md:col-span-4 pb-5">
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
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            Catálogo Governo
                          </label>
                          <select {...register(`itens.${index}.tipo_catalogo` as const)} className={selectCls}>
                            <option value="">Nenhum...</option>
                            <option value="CATMAT">CATMAT</option>
                            <option value="CATSER">CATSER</option>
                          </select>
                          {itemError?.tipo_catalogo?.message && <p className="text-xs text-red-500 font-medium">{itemError.tipo_catalogo.message}</p>}
                        </div>
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
                            <Field label="Início Suporte/Garantia" error={itemError?.data_inicio_vigencia?.message}>
                              <DatePickerField
                                value={field.value || null}
                                onChange={(d) => field.onChange(d ?? "")}
                                placeholder="Data de início"
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
                            <Field label="Fim Suporte/Garantia" error={itemError?.data_fim_vigencia?.message}>
                              <DatePickerField
                                value={field.value || null}
                                onChange={(d) => field.onChange(d ?? "")}
                                placeholder="Data de fim"
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
          </div>
        )}

        {/* ══ ETAPA 5. VIGÊNCIA DO CONTRATO ══ */}
        {currentStep === 5 && (
          <div className="space-y-6">
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

                <Field label="Prazo Previsto de Prorrogação" error={errors.prorrogacao_meses?.message}>
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
          </div>
        )}

        {/* ══ ETAPA 6. EQUIPE DE FISCALIZAÇÃO ══ */}
        {currentStep === 6 && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* ══ ETAPA 7. REVISÃO FINAL ══ */}
        {currentStep === 7 && (
          <div className="space-y-6">

            {/* Resumo visual do cadastro */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                <FileSignature size={14} className="text-brand-primary" />
                Resumo das Informações Preenchidas
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Modalidade</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {isARP ? "Ata de Registro de Preço" : "Contrato tradicional"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Identificação</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {watch("numero") ? `${watch("numero")}/${watch("ano")}` : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tipo Contratação</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {watch("tipo_contratacao") || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Projeto Origem</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {projetosLicitados.find(p => p.id === Number(watch("projeto_id")))?.nome || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fornecedor</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {fornecedores.find(f => f.id === Number(watch("fornecedor_id")))?.nome || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Valor Total</span>
                  <span className="text-sm font-bold text-brand-primary">
                    R$ {totalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Período de Vigência</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {watchedAssinatura ? new Date(watchedAssinatura + "T12:00:00").toLocaleDateString('pt-BR') : "—"} a{" "}
                    {watchedFimVigencia ? new Date(watchedFimVigencia + "T12:00:00").toLocaleDateString('pt-BR') : "—"}{" "}
                    {watch("vigencia_meses") ? `(${watch("vigencia_meses")} meses)` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navegação do Wizard (estilo referência) ── */}
        <div className="mt-10 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Lado esquerdo: Anterior */}
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
            ) : (
              <div />
            )}
          </div>

          {/* Lado direito: Próximo / Salvar */}
          <div>
            {currentStep < 7 ? (
              <button
                key="next-btn"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-brand-primary px-6 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg cursor-pointer"
              >
                Próximo
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                key="submit-btn"
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                className="inline-flex items-center gap-2 h-10 rounded-lg bg-brand-primary px-6 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" />Salvando...</>
                ) : (
                  <><FileSignature size={14} />Salvar Alterações</>
                )}
              </button>
            )}
          </div>
        </div>

      </form>
      <ToastContainer />
    </div>
  );
}
