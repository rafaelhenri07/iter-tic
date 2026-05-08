"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, UserCheck, Users, Plus, Trash2 } from "lucide-react";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
import {
  contratoCreateSchema,
  type ContratoCreateFormData,
  cleanContratoPayload,
} from "@/lib/validations/contrato";
import {
  criarContrato,
  atualizarContrato,
  fetchServidores,
  fetchProjetosLicitados,
  fetchFabricantes,
  fetchEmpresas,
} from "@/lib/api";
import type { Fabricante, Empresa } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { Servidor, ProjetoListagem } from "@/types/projeto";
import type { ContratoResponse } from "@/types/contrato";

/* ── Multi-select de Substitutos ───────────────────────────────────────── */

interface MultiSelectSubstitutosProps {
  servidores: Servidor[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  titularId?: number;
  loading?: boolean;
}

function MultiSelectSubstitutos({
  servidores,
  selectedIds,
  onChange,
  titularId,
  loading,
}: MultiSelectSubstitutosProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filtrar: não mostrar o titular como opção de substituto
  const opcoes = servidores.filter((s) => s.id !== (titularId || 0));

  const toggleServidor = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedServidores = servidores.filter((s) =>
    selectedIds.includes(s.id)
  );

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${selectCls} text-left flex items-center justify-between min-h-[38px] h-auto`}
      >
        <span className="flex flex-wrap gap-1 flex-1">
          {selectedServidores.length === 0 ? (
            <span className="text-foreground-muted/60 text-sm">
              {loading ? "Carregando..." : "Selecione substituto(s)..."}
            </span>
          ) : (
            selectedServidores.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
              >
                {s.nome}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleServidor(s.id);
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-teal-200 dark:hover:bg-teal-800"
                >
                  <X size={10} />
                </button>
              </span>
            ))
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-background-card shadow-xl scrollbar-thin">
            {opcoes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-foreground-muted italic">
                Nenhum servidor disponível
              </div>
            ) : (
              opcoes.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleServidor(s.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-background-secondary ${
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/30"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-teal-500 bg-teal-500 text-white"
                          : "border-border"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {s.nome}
                      </div>
                      <div className="text-[11px] text-foreground-muted">
                        {s.cargo}
                      </div>
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

/* ── Bloco visual de um papel da equipe ────────────────────────────────── */

interface EquipePapelBlockProps {
  label: string;
  papelKey: string;
  servidores: Servidor[];
  titularValue: number;
  substitutosValue: number[];
  onTitularChange: (val: number) => void;
  onSubstitutosChange: (ids: number[]) => void;
  loading: boolean;
  error?: string;
}

function EquipePapelBlock({
  label,
  servidores,
  titularValue,
  substitutosValue,
  onTitularChange,
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
      <FormField label="Titular" required>
        <select
          value={titularValue}
          onChange={(e) => onTitularChange(Number(e.target.value))}
          className={selectCls}
        >
          <option value={0}>
            {loading ? "Carregando..." : "Selecione o titular..."}
          </option>
          {servidores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} — {s.cargo}
            </option>
          ))}
        </select>
      </FormField>

      {/* Substitutos */}
      <FormField label="Substituto(s)">
        <MultiSelectSubstitutos
          servidores={servidores}
          selectedIds={substitutosValue}
          onChange={onSubstitutosChange}
          titularId={titularValue}
          loading={loading}
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
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Helper: extrair equipe do initialData
  const buildInitialEquipe = () => {
    const equipe = initialData?.equipe;
    return {
      gestor: {
        titular_id: equipe?.gestor?.titular?.id ?? 0,
        substitutos_ids: equipe?.gestor?.substitutos?.map((s) => s.id) ?? [],
      },
      fiscal_requisitante: {
        titular_id: equipe?.fiscal_requisitante?.titular?.id ?? 0,
        substitutos_ids:
          equipe?.fiscal_requisitante?.substitutos?.map((s) => s.id) ?? [],
      },
      fiscal_tecnico: {
        titular_id: equipe?.fiscal_tecnico?.titular?.id ?? 0,
        substitutos_ids:
          equipe?.fiscal_tecnico?.substitutos?.map((s) => s.id) ?? [],
      },
      fiscal_administrativo: {
        titular_id: equipe?.fiscal_administrativo?.titular?.id ?? 0,
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
          empresa_id: initialData.empresa_id ?? 0,
          fabricante_id: initialData.fabricante_id ?? 0,
          tipo_contrato: initialData.tipo_contrato as "Aquisição" | "Serviço continuado" | "Subscrição",
          itens: initialData.itens?.map(i => ({
            objeto_contratado: i.objeto_contratado,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario
          })) ?? [{ objeto_contratado: "", quantidade: 1, valor_unitario: 0 }],
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
          empresa_id: 0,
          fabricante_id: 0,
          tipo_contrato: "Aquisição",
          itens: [{ objeto_contratado: "", quantidade: 1, valor_unitario: 0 }],
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
              <FormField label={isARP ? "Número da Ata" : "Número do Contrato"} required error={errors.numero?.message} className="flex-1">
                <input {...register("numero")} type="number" placeholder="Ex: 42" className={inputCls} />
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
                label="Empresa Contratada"
                required
                error={errors.empresa_id?.message}
              >
                <select
                  {...register("empresa_id", { valueAsNumber: true })}
                  className={selectCls}
                >
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
                label="Fabricante"
                error={errors.fabricante_id?.message}
              >
                <select
                  {...register("fabricante_id", { valueAsNumber: true })}
                  className={selectCls}
                >
                  <option value={0}>
                    {loadingData ? "Carregando..." : "Selecione o fabricante..."}
                  </option>
                  {fabricantes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
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
                onClick={() => appendItem({ objeto_contratado: "", quantidade: 1, valor_unitario: 0 })}
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
                    <div className="grid gap-4 sm:grid-cols-12 items-start">
                      <div className="sm:col-span-6">
                        <FormField label="Objeto Contratado" required error={itemError?.objeto_contratado?.message}>
                          <input {...register(`itens.${index}.objeto_contratado` as const)} placeholder="Ex: Licença Microsoft 365" className={inputCls} />
                        </FormField>
                      </div>
                      <div className="sm:col-span-2">
                        <FormField label="Qtd" required error={itemError?.quantidade?.message}>
                          <input type="number" min={1} {...register(`itens.${index}.quantidade` as const, { valueAsNumber: true })} className={inputCls} />
                        </FormField>
                      </div>
                      <div className="sm:col-span-4">
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
                3. Vigência e Situação
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4 mt-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
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

            <div className="mt-4">
              <FormField
                label="Observações"
                error={errors.observacoes?.message}
              >
                <textarea
                  {...register("observacoes")}
                  rows={2}
                  placeholder="Informações adicionais..."
                  className={inputCls + " h-auto py-2 resize-none"}
                />
              </FormField>
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
                      titularValue={field.value?.titular_id ?? 0}
                      substitutosValue={field.value?.substitutos_ids ?? []}
                      onTitularChange={(val) =>
                        field.onChange({
                          ...field.value,
                          titular_id: val,
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
