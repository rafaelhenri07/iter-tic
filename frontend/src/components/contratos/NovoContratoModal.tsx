"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Plus,
  Loader2,
  FileSignature,
  Building2,
  DollarSign,
  Calendar,
  Users,
  FolderKanban,
  Hash,
  Settings,
} from "lucide-react";
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
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import type { Servidor, ProjetoListagem } from "@/types/projeto";
import type { ContratoResponse } from "@/types/contrato";

/* ── Seções do formulário ──────────────────────────────────────────────── */

type Section = "projeto" | "contratacao" | "valores" | "equipe";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "projeto", label: "Projeto", icon: <FolderKanban size={14} /> },
  { id: "contratacao", label: "Contratação", icon: <Building2 size={14} /> },
  { id: "valores", label: "Valores e Vigência", icon: <DollarSign size={14} /> },
  { id: "equipe", label: "Equipe", icon: <Users size={14} /> },
];

/* ── Componente ────────────────────────────────────────────────────────── */

interface NovoContratoModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Se fornecido, entra em modo edição */
  initialData?: ContratoResponse;
}

export function NovoContratoModal({ onClose, onSuccess, initialData }: NovoContratoModalProps) {
  const isEditMode = !!initialData;
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(isEditMode ? "contratacao" : "projeto");

  // Dados dinâmicos
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [projetosLicitados, setProjetosLicitados] = useState<ProjetoListagem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContratoCreateFormData>({
    resolver: zodResolver(contratoCreateSchema),
    defaultValues: initialData
      ? {
          projeto_id: initialData.projeto_id,
          numero_contrato: initialData.numero_contrato,
          empresa_contratada: initialData.empresa_contratada,
          fabricante: initialData.fabricante ?? "",
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
          gestor_id: initialData.gestor_id ?? 0,
          fiscal_requisitante_id: initialData.fiscal_requisitante_id ?? 0,
          fiscal_tecnico_id: initialData.fiscal_tecnico_id ?? 0,
          fiscal_administrativo_id: initialData.fiscal_administrativo_id ?? 0,
        }
      : {
          projeto_id: 0,
          numero_contrato: "",
          empresa_contratada: "",
          fabricante: "",
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
          gestor_id: 0,
          fiscal_requisitante_id: 0,
          fiscal_tecnico_id: 0,
          fiscal_administrativo_id: 0,
        },
  });

  // ── Load dados dinâmicos ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [srvs, projs] = await Promise.all([
          fetchServidores(),
          fetchProjetosLicitados(),
        ]);
        setServidores(srvs);
        setProjetosLicitados(projs);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-background-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
              <FileSignature size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditMode ? `Editar Contrato ${initialData?.numero_contrato}` : "Novo Contrato"}
              </h2>
              <p className="text-xs text-foreground-muted">
                {isEditMode ? "Alterar dados do contrato" : "Cadastro de contrato de TI"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-border px-6 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeSection === s.id
                  ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
          {/* ═══ SEÇÃO 1: PROJETO DE ORIGEM ═══ */}
          {activeSection === "projeto" && (
            <div className="space-y-5" style={{ animation: "modalIn 0.15s ease-out" }}>
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs text-violet-700 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-400">
                <strong>Seleção do Projeto</strong> — Apenas projetos com status
                &quot;Licitação concluída&quot; estão disponíveis para vinculação.
              </div>

              <FormField
                label="Projeto de Origem"
                required
                icon={<FolderKanban size={10} />}
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
            </div>
          )}

          {/* ═══ SEÇÃO 2: DADOS DA CONTRATAÇÃO ═══ */}
          {activeSection === "contratacao" && (
            <div className="space-y-5" style={{ animation: "modalIn 0.15s ease-out" }}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Número do Contrato"
                  required
                  icon={<Hash size={10} />}
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
                  icon={<Settings size={10} />}
                  error={errors.tipo_contrato?.message}
                >
                  <select {...register("tipo_contrato")} className={selectCls}>
                    <option value="Aquisição">📦 Aquisição</option>
                    <option value="Serviço continuado">🔄 Serviço Continuado</option>
                    <option value="Subscrição">🔑 Subscrição</option>
                  </select>
                </FormField>
              </div>

              <FormField
                label="Empresa Contratada"
                required
                icon={<Building2 size={10} />}
                error={errors.empresa_contratada?.message}
              >
                <input
                  {...register("empresa_contratada")}
                  placeholder="Razão social completa"
                  className={inputCls}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Fabricante"
                  icon={<Building2 size={10} />}
                  error={errors.fabricante?.message}
                >
                  <input
                    {...register("fabricante")}
                    placeholder="Ex: Cisco, Microsoft..."
                    className={inputCls}
                  />
                </FormField>

                <FormField
                  label="Quantidade"
                  required
                  icon={<Hash size={10} />}
                  error={errors.quantidade?.message}
                >
                  <input
                    type="number"
                    {...register("quantidade", { valueAsNumber: true })}
                    min={1}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <FormField
                label="Tecnologia Utilizada"
                icon={<Settings size={10} />}
                error={errors.tecnologia_utilizada?.message}
              >
                <input
                  {...register("tecnologia_utilizada")}
                  placeholder="Ex: Switches Catalyst 9300, Azure DevOps..."
                  className={inputCls}
                />
              </FormField>
            </div>
          )}

          {/* ═══ SEÇÃO 3: VALORES E VIGÊNCIA ═══ */}
          {activeSection === "valores" && (
            <div className="space-y-5" style={{ animation: "modalIn 0.15s ease-out" }}>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400">
                <strong>Valores financeiros</strong> — Informe os valores de
                investimento (CAPEX) e custeio (OPEX). O valor total será
                calculado automaticamente pelo sistema.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Valor de Investimento (R$)"
                  required
                  icon={<DollarSign size={10} />}
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
                  label="Valor de Custeio (R$)"
                  required
                  icon={<DollarSign size={10} />}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Data de Assinatura"
                  required
                  icon={<Calendar size={10} />}
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
                  icon={<Calendar size={10} />}
                  error={errors.data_fim_vigencia?.message}
                >
                  <input
                    type="date"
                    {...register("data_fim_vigencia")}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Prazo"
                  icon={<Calendar size={10} />}
                  error={errors.prazo?.message}
                >
                  <input
                    {...register("prazo")}
                    placeholder="Ex: 12 meses; 24 meses com suporte"
                    className={inputCls}
                  />
                </FormField>

                <FormField
                  label="Situação Atual"
                  required
                  error={errors.situacao_atual?.message}
                >
                  <select {...register("situacao_atual")} className={selectCls}>
                    <option value="Vigente">✅ Vigente</option>
                    <option value="Extinto">⛔ Extinto</option>
                    <option value="Extinto, mas suporte vigente">⚠️ Extinto, mas suporte vigente</option>
                  </select>
                </FormField>
              </div>

              <FormField
                label="Observações"
                error={errors.observacoes?.message}
              >
                <textarea
                  {...register("observacoes")}
                  rows={3}
                  placeholder="Informações adicionais sobre o contrato..."
                  className={inputCls + " h-auto py-2 resize-none"}
                />
              </FormField>
            </div>
          )}

          {/* ═══ SEÇÃO 4: EQUIPE DE FISCALIZAÇÃO ═══ */}
          {activeSection === "equipe" && (
            <div className="space-y-5" style={{ animation: "modalIn 0.15s ease-out" }}>
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs text-teal-700 dark:border-teal-900 dark:bg-teal-950/20 dark:text-teal-400">
                <strong>Equipe de Fiscalização</strong> — Designe o Gestor do
                Contrato e os Fiscais (Requisitante, Técnico e Administrativo)
                conforme normativo vigente. Todos os campos são opcionais na
                criação.
              </div>

              <FormField label="Gestor do Contrato" icon={<Users size={10} />}>
                <select
                  {...register("gestor_id", { valueAsNumber: true })}
                  className={selectCls}
                >
                  <option value={0}>
                    {loadingData ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Fiscal Requisitante" icon={<Users size={10} />}>
                <select
                  {...register("fiscal_requisitante_id", { valueAsNumber: true })}
                  className={selectCls}
                >
                  <option value={0}>
                    {loadingData ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Fiscal Técnico" icon={<Users size={10} />}>
                <select
                  {...register("fiscal_tecnico_id", { valueAsNumber: true })}
                  className={selectCls}
                >
                  <option value={0}>
                    {loadingData ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Fiscal Administrativo" icon={<Users size={10} />}>
                <select
                  {...register("fiscal_administrativo_id", { valueAsNumber: true })}
                  className={selectCls}
                >
                  <option value={0}>
                    {loadingData ? "Carregando..." : "Selecione..."}
                  </option>
                  {servidores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.cargo}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            {/* Section navigation dots */}
            <div className="flex items-center gap-1.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`h-2 rounded-full transition-all ${
                    activeSection === s.id
                      ? "w-6 bg-cyan-500"
                      : "w-2 bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
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
                  <>
                    <Plus size={14} />
                    {isEditMode ? "Salvar Alterações" : "Criar Contrato"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
