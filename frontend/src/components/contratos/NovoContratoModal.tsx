"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, UserCheck, Users } from "lucide-react";
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
} from "@/lib/api";
import type { Fabricante } from "@/lib/api";
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

interface NovoContratoModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Se fornecido, entra em modo edição */
  initialData?: ContratoResponse;
}

export function NovoContratoModal({ onClose, onSuccess, initialData }: NovoContratoModalProps) {
  const isEditMode = !!initialData;
  const [submitting, setSubmitting] = useState(false);

  // Dados dinâmicos
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [projetosLicitados, setProjetosLicitados] = useState<ProjetoListagem[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
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
          numero_contrato: initialData.numero_contrato,
          empresa_contratada: initialData.empresa_contratada,
          fabricante_id: initialData.fabricante_id ?? 0,
          tipo_contrato: initialData.tipo_contrato as "Aquisição" | "Serviço continuado" | "Subscrição",
          quantidade: Number(initialData.quantidade),
          tecnologia_utilizada: initialData.tecnologia_utilizada ?? "",
          valor_investimento: Number(initialData.valor_investimento),
          valor_custeio: Number(initialData.valor_custeio),
          prazo: initialData.prazo ?? "",
          data_assinatura: initialData.data_assinatura,
          data_fim_vigencia: initialData.data_fim_vigencia,
          situacao_atual: initialData.situacao_atual as "Vigente" | "Extinto" | "Extinto, mas suporte vigente",
          observacoes: initialData.observacoes ?? "",
          equipe: buildInitialEquipe(),
        }
      : {
          projeto_id: 0,
          numero_contrato: "",
          empresa_contratada: "",
          fabricante_id: 0,
          tipo_contrato: "Aquisição",
          quantidade: 1,
          tecnologia_utilizada: "",
          valor_investimento: 0,
          valor_custeio: 0,
          prazo: "",
          data_assinatura: "",
          data_fim_vigencia: "",
          situacao_atual: "Vigente",
          observacoes: "",
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

  // ── Load dados dinâmicos ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [srvs, projs, fabs] = await Promise.all([
          fetchServidores(),
          fetchProjetosLicitados(),
          fetchFabricantes(),
        ]);
        setServidores(srvs);
        setProjetosLicitados(projs);
        setFabricantes(fabs);
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
        showToast("success", `Contrato "${data.numero_contrato}" atualizado com sucesso!`);
      } else {
        await criarContrato(payload);
        showToast("success", `Contrato "${data.numero_contrato}" criado com sucesso!`);
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
            {isEditMode ? `Editar Contrato ${initialData?.numero_contrato}` : "Novo Contrato"}
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
                      ? "Nenhum projeto com licitação concluída"
                      : "Selecione o projeto..."}
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
              <FormField
                label="Número do Contrato"
                required
                error={errors.numero_contrato?.message}
              >
                <input
                  {...register("numero_contrato")}
                  placeholder="Ex: 42/2025"
                  className={inputCls}
                />
              </FormField>

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
                error={errors.empresa_contratada?.message}
              >
                <input
                  {...register("empresa_contratada")}
                  placeholder="Razão social completa"
                  className={inputCls}
                />
              </FormField>
            </div>

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

              <FormField
                label="Quantidade"
                required
                error={errors.quantidade?.message}
              >
                <input
                  type="number"
                  {...register("quantidade", { valueAsNumber: true })}
                  min={1}
                  className={inputCls}
                />
              </FormField>

              <FormField
                label="Tecnologia"
                error={errors.tecnologia_utilizada?.message}
              >
                <input
                  {...register("tecnologia_utilizada")}
                  placeholder="Ex: Catalyst 9300"
                  className={inputCls}
                />
              </FormField>
            </div>

            {/* ═══ 3. VALORES E VIGÊNCIA ═══ */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-6 pt-4">
              <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide mb-4">
                3. Valores e Vigência
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Investimento (R$)"
                required
                error={errors.valor_investimento?.message}
              >
                <input
                  type="number"
                  step="0.01"
                  {...register("valor_investimento", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </FormField>

              <FormField
                label="Custeio (R$)"
                required
                error={errors.valor_custeio?.message}
              >
                <input
                  type="number"
                  step="0.01"
                  {...register("valor_custeio", { valueAsNumber: true })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField
                label="Data de Assinatura"
                required
                error={errors.data_assinatura?.message}
              >
                <input
                  type="date"
                  {...register("data_assinatura")}
                  className={inputCls}
                />
              </FormField>

              <FormField
                label="Data Fim de Vigência"
                required
                error={errors.data_fim_vigencia?.message}
              >
                <input
                  type="date"
                  {...register("data_fim_vigencia")}
                  className={inputCls}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormField
                label="Prazo"
                error={errors.prazo?.message}
              >
                <input
                  {...register("prazo")}
                  placeholder="Ex: 12 meses"
                  className={inputCls}
                />
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
