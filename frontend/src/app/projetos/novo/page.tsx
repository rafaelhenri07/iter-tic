"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Loader2,
  FolderKanban,
  Archive,
  ChevronLeft,
  ChevronRight,
  Layers,
  Users,
  CheckCircle,
  FileText,
  Info,
} from "lucide-react";
import {
  projetoCreateSchema,
  type ProjetoCreateFormData,
  cleanProjetoPayload,
} from "@/lib/validations/projeto";
import {
  criarProjeto,
  inicializarArtefatos,
  fetchServidores,
  fetchPeriodos,
  fetchAcoesPdticAtivas,
  fetchExercicios,
  fetchPainelPacc,
} from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { ToastContainer } from "@/components/ui/Toast";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import type { Servidor } from "@/types/projeto";
import type { PdticAcao } from "@/types/pdtic";
import type { PaccItemComAcao } from "@/types/pacc";

/* ── Estilos base ───────────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

const selectCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/* ── Definição de Etapas ────────────────────────────────────────────────── */

interface StepDef {
  key: string;
  title: string;
  desc: string;
}

const ALL_STEPS: StepDef[] = [
  { key: "modalidade", title: "Modalidade", desc: "Tipo do Projeto" },
  { key: "dados", title: "Dados", desc: "Dados Básicos" },
  { key: "planejamento", title: "Planejamento", desc: "Planejamento Estratégico" },
  { key: "equipe", title: "Equipe", desc: "Equipe de Planejamento" },
  { key: "revisao", title: "Revisão", desc: "Observações & Revisão" },
];

const LEGADO_STEPS: StepDef[] = ALL_STEPS.filter((s) => s.key !== "equipe");

const STEP_SUBTITLES: Record<string, string> = {
  modalidade:
    "Defina se este é um novo projeto ou um projeto de contratação anterior.",
  dados: "Informe os dados de identificação do projeto.",
  planejamento:
    "Vincule o projeto às ações do PDTIC e itens do PACC.",
  equipe:
    "Designe os integrantes da equipe de planejamento da contratação.",
  revisao:
    "Revise as informações preenchidas e finalize o cadastro.",
};

const COMPLEXIDADE_INFO = {
  Simples: {
    title: "Prazos estipulados para a complexidade Simples:",
    prazos: [
      { name: "DFD", value: "15 dias" },
      { name: "Riscos", value: "15 dias" },
      { name: "Custos", value: "30 dias" },
      { name: "TR", value: "60 dias" },
      { name: "ETP", value: "90 dias" },
    ],
    example: "Projetos de baixo esforço e execução rápida, como renovação de licenças de software.",
    colorCls: "border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-300",
    badgeCls: "bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40",
  },
  Intermediária: {
    title: "Prazos estipulados para a complexidade Intermediária:",
    prazos: [
      { name: "DFD", value: "15 dias" },
      { name: "Riscos", value: "15 dias" },
      { name: "Custos", value: "30 dias" },
      { name: "TR", value: "60 dias" },
      { name: "ETP", value: "120 dias" },
    ],
    example: "Projetos de esforço e prazos moderados.",
    colorCls: "border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300",
    badgeCls: "bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40",
  },
  Complexa: {
    title: "Prazos estipulados para a complexidade Complexa:",
    prazos: [
      { name: "DFD", value: "15 dias" },
      { name: "Riscos", value: "20 dias" },
      { name: "Custos", value: "60 dias" },
      { name: "TR", value: "90 dias" },
      { name: "ETP", value: "180 dias" },
    ],
    example: "Projetos robustos, de longa duração ou com muitos envolvidos, como contratação de serviços de manutenção de software em grande escala.",
    colorCls: "border-violet-500/30 bg-violet-50/20 dark:bg-violet-950/10 text-violet-800 dark:text-violet-300",
    badgeCls: "bg-violet-100/50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/40",
  },
};

/* ── Componente de Campo ────────────────────────────────────────────────── */

function Field({
  label,
  required,
  description,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <div className="flex flex-col">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {description && (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
            {description}
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/* ── Página Principal ──────────────────────────────────────────────────── */

export default function NovoProjetoPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");

  /* ── Dados dinâmicos ── */
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loadingServidores, setLoadingServidores] = useState(true);

  const [acoesPdtic, setAcoesPdtic] = useState<PdticAcao[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(true);

  const [itensPacc, setItensPacc] = useState<PaccItemComAcao[]>([]);
  const [loadingItens, setLoadingItens] = useState(true);

  /* ── Formulário ── */
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<ProjetoCreateFormData>({
    resolver: zodResolver(projetoCreateSchema),
    defaultValues: {
      nome: "",
      processo_sei: "",
      is_legado: false,
      prioridade: "media",
      complexidade: "Simples",
      integrantes_requisitantes_ids: [],
      integrantes_tecnicos_ids: [],
      integrantes_administrativos_ids: [],
      substitutos_requisitantes_ids: [],
      substitutos_tecnicos_ids: [],
      substitutos_administrativos_ids: [],
      acoes_pdtic_ids: [],
      itens_pacc_ids: [],
    },
  });

  const isLegado = watch("is_legado");
  const selectedAcoes = watch("acoes_pdtic_ids") ?? [];
  const selectedItens = watch("itens_pacc_ids") ?? [];
  const selectedComplexidade = watch("complexidade") || "Simples";

  /* ── Etapas dinâmicas ── */
  const steps = isLegado ? LEGADO_STEPS : ALL_STEPS;
  const totalSteps = steps.length;
  const currentStepKey = steps[currentStep - 1]?.key ?? "modalidade";

  /* ── Carregamento de dados ── */
  useEffect(() => {
    (async () => {
      try {
        setServidores(await fetchServidores());
      } catch {
        setServidores([]);
      } finally {
        setLoadingServidores(false);
      }
    })();

    (async () => {
      try {
        const periodos = await fetchPeriodos();
        const all: PdticAcao[] = [];
        for (const p of periodos) all.push(...(await fetchAcoesPdticAtivas(p.id)));
        setAcoesPdtic(all);
      } catch {
        setAcoesPdtic([]);
      } finally {
        setLoadingAcoes(false);
      }
    })();

    (async () => {
      try {
        const exercicios = await fetchExercicios();
        const all: PaccItemComAcao[] = [];
        for (const ex of exercicios) {
          const painel = await fetchPainelPacc(ex.id);
          all.push(...painel.itens_ativos);
        }
        setItensPacc(all);
      } catch {
        setItensPacc([]);
      } finally {
        setLoadingItens(false);
      }
    })();
  }, []);

  /* ── Seleção de modalidade ── */
  function handleModalidadeSelect(legado: boolean) {
    setValue("is_legado", legado);
    if (legado) {
      setValue("prioridade", null);
      setValue("complexidade", null);
      setValue("integrantes_requisitantes_ids", []);
      setValue("integrantes_tecnicos_ids", []);
      setValue("integrantes_administrativos_ids", []);
      setValue("substitutos_requisitantes_ids", []);
      setValue("substitutos_tecnicos_ids", []);
      setValue("substitutos_administrativos_ids", []);
    } else {
      setValue("prioridade", "media");
      setValue("complexidade", "Simples");
    }
  }

  /* ── Navegação entre etapas ── */
  async function handleNext() {
    let valid = true;

    if (currentStepKey === "dados") {
      const fields: (keyof ProjetoCreateFormData)[] = ["nome", "processo_sei"];
      if (!isLegado) fields.push("prioridade", "complexidade");
      valid = await trigger(fields);
    }

    if (!valid) {
      showToast(
        "error",
        "Por favor, preencha os campos obrigatórios corretamente antes de avançar."
      );
      return;
    }

    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    setCurrentStep((s) => s - 1);
  }

  /* ── Prevenção de Enter ── */
  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (
      e.key === "Enter" &&
      e.target instanceof HTMLInputElement &&
      (e.target as HTMLInputElement).type !== "textarea"
    ) {
      e.preventDefault();
    }
  };

  /* ── Submissão ── */
  const onSubmit = async (data: ProjetoCreateFormData) => {
    setSubmitting(true);
    try {
      setSubmitPhase("Criando projeto...");
      const payload = cleanProjetoPayload(data);
      const novoProjeto = await criarProjeto(payload);

      if (!data.is_legado) {
        setSubmitPhase("Inicializando artefatos...");
        await inicializarArtefatos(novoProjeto.id);
      }

      showToast("success", `Projeto "${data.nome}" criado com sucesso!`);
      router.push("/projetos");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao criar projeto."
      );
      setSubmitting(false);
      setSubmitPhase("");
    }
  };

  /* ── Helpers de exibição para a Revisão ── */
  const resolveNames = (ids: number[]) =>
    ids
      .map((id) => servidores.find((s) => s.id === id)?.nome)
      .filter(Boolean)
      .join(", ") || "Nenhum designado";

  const resolvedAcoes = selectedAcoes
    .map((id) => acoesPdtic.find((a) => a.id === id))
    .filter(Boolean);

  const resolvedItens = selectedItens
    .map((id) => itensPacc.find((i) => i.id === id))
    .filter(Boolean);

  /* ════════════════════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* ── Botão Voltar ── */}
      <button
        type="button"
        onClick={() => router.push("/projetos")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={15} />
        Voltar para Projetos
      </button>

      {/* ── Stepper Header ── */}
      <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isLegado
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-brand-primary/10 text-brand-primary"
              }`}
            >
              {isLegado ? <Archive size={20} /> : <FolderKanban size={20} />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {steps[currentStep - 1]?.desc}
              </h1>
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground-muted tabular-nums">
            Etapa {currentStep} de {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-background-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isLegado ? "bg-amber-500" : "bg-brand-primary"
            }`}
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Subtitle */}
        <p className="mt-3 text-sm text-foreground-muted">
          {STEP_SUBTITLES[currentStepKey]}
        </p>
      </div>

      {/* ── Formulário ── */}
      <form onKeyDown={preventEnterSubmit} onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-border bg-background-card p-6 shadow-sm min-h-[320px]">
          {/* ══════════════════════════════════════════════════════════════
           *  ETAPA 1 — MODALIDADE
           * ══════════════════════════════════════════════════════════════ */}
          {currentStepKey === "modalidade" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Card: Novo Projeto */}
                <button
                  type="button"
                  onClick={() => handleModalidadeSelect(false)}
                  className={`relative text-left rounded-2xl border-2 p-6 transition-all duration-200 ${
                    !isLegado
                      ? "border-brand-primary bg-brand-primary/5 shadow-lg shadow-brand-primary/10 ring-2 ring-brand-primary/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                  }`}
                >
                  {!isLegado && (
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold shadow-md">
                      ✓
                    </div>
                  )}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                      !isLegado
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                    }`}
                  >
                    <FolderKanban size={24} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">
                    Novo Projeto
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Projeto com fase interna completa. Inclui elaboração de
                    artefatos (DFD, ETP, TR, etc.) e designação de equipe de
                    planejamento.
                  </p>
                </button>

                {/* Card: Projeto Anterior */}
                <button
                  type="button"
                  onClick={() => handleModalidadeSelect(true)}
                  className={`relative text-left rounded-2xl border-2 p-6 transition-all duration-200 ${
                    isLegado
                      ? "border-amber-400 bg-amber-50/80 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/20 dark:border-amber-700 dark:bg-amber-950/30"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                  }`}
                >
                  {isLegado && (
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shadow-md">
                      ✓
                    </div>
                  )}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                      isLegado
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                    }`}
                  >
                    <Archive size={24} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">
                    Projeto Anterior
                  </h3>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Contratação passada. Pula a fase de elaboração. Ideal para
                    cadastrar contratos que já estão vigentes ou finalizados.
                  </p>
                </button>
              </div>

              {/* Banner informativo */}
              {isLegado && (
                <div
                  className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                  style={{ animation: "modalIn 0.2s ease-out" }}
                >
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>Modo Projeto Anterior ativo.</strong> O projeto será
                    criado com status &quot;Contratado&quot; e sem artefatos
                    obrigatórios. Os campos Prioridade, Complexidade e Equipe
                    serão omitidos.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
           *  ETAPA 2 — DADOS BÁSICOS
           * ══════════════════════════════════════════════════════════════ */}
          {currentStepKey === "dados" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label="Nome do Projeto"
                  required
                  error={errors.nome?.message}
                  className="sm:col-span-2"
                >
                  <input
                    {...register("nome")}
                    placeholder="Ex: Aquisição de Switches Core para o Datacenter"
                    className={inputCls}
                    autoFocus
                  />
                </Field>

                <Field
                  label="Processo SEI"
                  required
                  error={errors.processo_sei?.message}
                  className="sm:col-span-2"
                >
                  <input
                    {...register("processo_sei")}
                    placeholder="00052-00032300/2024-09"
                    className={inputCls}
                  />
                </Field>

                {!isLegado && (
                  <>
                    <Field
                      label="Prioridade de Urgência"
                      required
                      error={errors.prioridade?.message}
                    >
                      <select
                        {...register("prioridade")}
                        className={selectCls}
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </Field>

                    <Field
                      label="Complexidade"
                      required
                      description="A complexidade define o prazo máximo estipulado pela chefia para a entrega dos artefatos. Escolha com base no esforço e tempo necessários para o projeto."
                      error={errors.complexidade?.message}
                      className="sm:col-span-2"
                    >
                      <select
                        {...register("complexidade")}
                        className={selectCls}
                      >
                        <option value="Simples">Simples</option>
                        <option value="Intermediária">Intermediária</option>
                        <option value="Complexa">Complexa</option>
                      </select>
                    </Field>

                    {selectedComplexidade && COMPLEXIDADE_INFO[selectedComplexidade as keyof typeof COMPLEXIDADE_INFO] && (
                      <div className={`sm:col-span-2 rounded-xl border p-4 transition-all duration-300 ${COMPLEXIDADE_INFO[selectedComplexidade as keyof typeof COMPLEXIDADE_INFO].colorCls}`}>
                        <div className="text-[11px] font-bold uppercase tracking-wider mb-2.5">
                          {COMPLEXIDADE_INFO[selectedComplexidade as keyof typeof COMPLEXIDADE_INFO].title}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                          {COMPLEXIDADE_INFO[selectedComplexidade as keyof typeof COMPLEXIDADE_INFO].prazos.map((prazo) => (
                            <div
                              key={prazo.name}
                              className={`rounded-lg p-2 text-center transition-all ${COMPLEXIDADE_INFO[selectedComplexidade as keyof typeof COMPLEXIDADE_INFO].badgeCls}`}
                            >
                              <div className="text-[9px] font-bold uppercase tracking-wider opacity-75 mb-0.5">
                                {prazo.name}
                              </div>
                              <div className="text-xs font-extrabold tabular-nums">
                                {prazo.value}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs border-t border-current/10 pt-2.5 leading-relaxed opacity-90">
                          <strong>Exemplo:</strong> {COMPLEXIDADE_INFO[selectedComplexidade as keyof typeof COMPLEXIDADE_INFO].example}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
           *  ETAPA 3 — PLANEJAMENTO ESTRATÉGICO
           * ══════════════════════════════════════════════════════════════ */}
          {currentStepKey === "planejamento" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Ações PDTIC">
                  <MultiSelectCombobox
                    options={acoesPdtic
                      .map((a) => ({
                        value: a.id,
                        label: `${a.codigo_acao} — ${a.descricao}`,
                      }))
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    value={selectedAcoes}
                    onChange={(val) =>
                      setValue("acoes_pdtic_ids", val as number[])
                    }
                    placeholder={
                      loadingAcoes
                        ? "Carregando..."
                        : "Selecione as ações..."
                    }
                    disabled={loadingAcoes}
                  />
                </Field>

                <Field label="Itens PACC">
                  <MultiSelectCombobox
                    options={itensPacc
                      .map((i) => ({
                        value: i.id,
                        label: `#${i.numero_item} — ${i.descricao_demanda}`,
                      }))
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    value={selectedItens}
                    onChange={(val) =>
                      setValue("itens_pacc_ids", val as number[])
                    }
                    placeholder={
                      loadingItens
                        ? "Carregando..."
                        : "Selecione os itens..."
                    }
                    disabled={loadingItens}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
           *  ETAPA 4 — EQUIPE DE PLANEJAMENTO (apenas projetos normais)
           * ══════════════════════════════════════════════════════════════ */}
          {currentStepKey === "equipe" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2">
              <div className="space-y-6">
                {/* Integrante Requisitante */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">
                    Integrante Requisitante
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(
                            (s) =>
                              !(watch("substitutos_requisitantes_ids") ?? []).includes(s.id)
                          )
                          .map((s) => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("integrantes_requisitantes_ids")}
                        onChange={(ids) =>
                          setValue(
                            "integrantes_requisitantes_ids",
                            ids as number[]
                          )
                        }
                        placeholder={
                          loadingServidores
                            ? "Carregando..."
                            : "Selecione os titulares..."
                        }
                        disabled={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(
                            (s) =>
                              !(watch("integrantes_requisitantes_ids") ?? []).includes(s.id)
                          )
                          .map((s) => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("substitutos_requisitantes_ids")}
                        onChange={(ids) =>
                          setValue(
                            "substitutos_requisitantes_ids",
                            ids as number[]
                          )
                        }
                        placeholder={
                          loadingServidores
                            ? "Carregando..."
                            : "Selecione os substitutos..."
                        }
                        disabled={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>

                {/* Integrante Técnico */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">
                    Integrante Técnico
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(
                            (s) =>
                              !(watch("substitutos_tecnicos_ids") ?? []).includes(s.id)
                          )
                          .map((s) => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("integrantes_tecnicos_ids")}
                        onChange={(ids) =>
                          setValue(
                            "integrantes_tecnicos_ids",
                            ids as number[]
                          )
                        }
                        placeholder={
                          loadingServidores
                            ? "Carregando..."
                            : "Selecione os titulares..."
                        }
                        disabled={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(
                            (s) =>
                              !(watch("integrantes_tecnicos_ids") ?? []).includes(s.id)
                          )
                          .map((s) => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("substitutos_tecnicos_ids")}
                        onChange={(ids) =>
                          setValue(
                            "substitutos_tecnicos_ids",
                            ids as number[]
                          )
                        }
                        placeholder={
                          loadingServidores
                            ? "Carregando..."
                            : "Selecione os substitutos..."
                        }
                        disabled={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>

                {/* Integrante Administrativo */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">
                    Integrante Administrativo
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(
                            (s) =>
                              !(watch("substitutos_administrativos_ids") ?? []).includes(s.id)
                          )
                          .map((s) => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("integrantes_administrativos_ids")}
                        onChange={(ids) =>
                          setValue(
                            "integrantes_administrativos_ids",
                            ids as number[]
                          )
                        }
                        placeholder={
                          loadingServidores
                            ? "Carregando..."
                            : "Selecione os titulares..."
                        }
                        disabled={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(
                            (s) =>
                              !(watch("integrantes_administrativos_ids") ?? []).includes(s.id)
                          )
                          .map((s) => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("substitutos_administrativos_ids")}
                        onChange={(ids) =>
                          setValue(
                            "substitutos_administrativos_ids",
                            ids as number[]
                          )
                        }
                        placeholder={
                          loadingServidores
                            ? "Carregando..."
                            : "Selecione os substitutos..."
                        }
                        disabled={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
           *  ETAPA 5 — REVISÃO
           * ══════════════════════════════════════════════════════════════ */}
          {currentStepKey === "revisao" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-2">


              {/* Painel de Resumo */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Resumo do Cadastro
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {/* Tipo */}
                  <div>
                    <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Tipo
                    </span>
                    <div className="mt-1 font-semibold text-foreground flex items-center gap-2">
                      {isLegado ? (
                        <>
                          <Archive size={14} className="text-amber-500" />
                          Projeto Anterior
                        </>
                      ) : (
                        <>
                          <FolderKanban size={14} className="text-brand-primary" />
                          Novo Projeto
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="sm:col-span-2">
                    <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Nome do Projeto
                    </span>
                    <div className="mt-1 font-semibold text-foreground">
                      {watch("nome") || (
                        <span className="italic text-foreground-muted">
                          Não informado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Processo SEI */}
                  <div>
                    <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Processo SEI
                    </span>
                    <div className="mt-1 font-mono font-medium text-foreground">
                      {watch("processo_sei") || (
                        <span className="italic text-foreground-muted font-sans">
                          Não informado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prioridade & Complexidade */}
                  {!isLegado && (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                          Prioridade de Urgência
                        </span>
                        <div className="mt-1 font-semibold text-foreground capitalize">
                          {watch("prioridade") === "media"
                            ? "Média"
                            : watch("prioridade") === "baixa"
                            ? "Baixa"
                            : watch("prioridade") === "alta"
                            ? "Alta"
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                          Complexidade
                        </span>
                        <div className="mt-1 font-semibold text-foreground">
                          {watch("complexidade") || "—"}
                        </div>
                      </div>
                    </>
                  )}

                  {/* PDTIC */}
                  <div>
                    <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Ações PDTIC
                    </span>
                    <div className="mt-1">
                      {resolvedAcoes.length > 0 ? (
                        <div className="space-y-1">
                          {resolvedAcoes.map((a) => (
                            <div
                              key={a!.id}
                              className="text-xs font-medium text-foreground"
                            >
                              <span className="font-bold text-brand-primary">
                                {a!.codigo_acao}
                              </span>{" "}
                              — {a!.descricao}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-foreground-muted">
                          Nenhuma ação vinculada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PACC */}
                  <div>
                    <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      Itens PACC
                    </span>
                    <div className="mt-1">
                      {resolvedItens.length > 0 ? (
                        <div className="space-y-1">
                          {resolvedItens.map((i) => (
                            <div
                              key={i!.id}
                              className="text-xs font-medium text-foreground"
                            >
                              <span className="font-bold text-brand-primary">
                                #{i!.numero_item}
                              </span>{" "}
                              — {i!.descricao_demanda}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-foreground-muted">
                          Nenhum item vinculado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Equipe */}
                  {!isLegado && (
                    <div className="sm:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                      <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                        Equipe de Planejamento
                      </span>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800/50">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
                            Requisitante
                          </div>
                          <div className="text-xs text-foreground">
                            <div>
                              <span className="text-foreground-muted">
                                Titular:{" "}
                              </span>
                              {resolveNames(
                                watch("integrantes_requisitantes_ids")
                              )}
                            </div>
                            <div>
                              <span className="text-foreground-muted">
                                Substituto:{" "}
                              </span>
                              {resolveNames(
                                watch("substitutos_requisitantes_ids")
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800/50">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
                            Técnico
                          </div>
                          <div className="text-xs text-foreground">
                            <div>
                              <span className="text-foreground-muted">
                                Titular:{" "}
                              </span>
                              {resolveNames(
                                watch("integrantes_tecnicos_ids")
                              )}
                            </div>
                            <div>
                              <span className="text-foreground-muted">
                                Substituto:{" "}
                              </span>
                              {resolveNames(
                                watch("substitutos_tecnicos_ids")
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800/50">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-brand-primary mb-1">
                            Administrativo
                          </div>
                          <div className="text-xs text-foreground">
                            <div>
                              <span className="text-foreground-muted">
                                Titular:{" "}
                              </span>
                              {resolveNames(
                                watch("integrantes_administrativos_ids")
                              )}
                            </div>
                            <div>
                              <span className="text-foreground-muted">
                                Substituto:{" "}
                              </span>
                              {resolveNames(
                                watch("substitutos_administrativos_ids")
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Navegação ── */}
        <div className="mt-6 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground-muted transition-colors hover:bg-background-secondary hover:text-foreground"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className={`inline-flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 ${
                isLegado
                  ? "bg-amber-500 shadow-amber-500/25 hover:bg-amber-600"
                  : "bg-brand-primary shadow-brand-primary/25 hover:bg-brand-primary-hover"
              }`}
            >
              Próximo
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              key="finalizar-projeto-btn"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${
                isLegado
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25"
                  : "bg-brand-primary shadow-brand-primary/25 hover:bg-brand-primary-hover"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {submitPhase}
                </>
              ) : (
                <>
                  {isLegado ? (
                    <Archive size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {isLegado
                    ? "Cadastrar Projeto Anterior"
                    : "Finalizar Cadastro"}
                </>
              )}
            </button>
          )}
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}
