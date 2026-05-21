"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, X, Plus, FolderKanban, Archive, Info } from "lucide-react";
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

/* ── Página Principal ──────────────────────────────────────────────────── */

export default function NovoProjetoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");

  // Dados dinâmicos – carregados em paralelo
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loadingServidores, setLoadingServidores] = useState(true);

  const [acoesPdtic, setAcoesPdtic] = useState<PdticAcao[]>([]);
  const [loadingAcoes, setLoadingAcoes] = useState(true);

  const [itensPacc, setItensPacc] = useState<PaccItemComAcao[]>([]);
  const [loadingItens, setLoadingItens] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
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
      observacoes: "",
    },
  });

  const isLegado = watch("is_legado");
  const selectedAcoes = watch("acoes_pdtic_ids") ?? [];
  const selectedItens = watch("itens_pacc_ids") ?? [];

  // Load dados
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

  const onSubmit = async (data: ProjetoCreateFormData) => {
    setSubmitting(true);
    try {
      setSubmitPhase("Criando projeto...");
      const payload = cleanProjetoPayload(data);
      const novoProjeto = await criarProjeto(payload);

      // Projetos legados NÃO inicializam artefatos
      if (!data.is_legado) {
        setSubmitPhase("Inicializando artefatos...");
        await inicializarArtefatos(novoProjeto.id);
      }

      showToast("success", `Projeto "${data.nome}" criado com sucesso!`);
      router.push("/projetos");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao criar projeto.");
      setSubmitting(false);
      setSubmitPhase("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
        {/* ── Botão Voltar ── */}
        <button
          type="button"
          onClick={() => router.push("/projetos")}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={15} />
          Voltar para Projetos
        </button>

        {/* ── Cabeçalho ── */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <FolderKanban size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Novo Projeto</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Preencha as informações para a fase interna da contratação de TI
            </p>
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ══ TOGGLE LEGADO ══ */}
          <div className="mt-8 mb-2">
            <label
              className={`flex items-center gap-4 rounded-xl border-2 px-5 py-4 cursor-pointer transition-all ${
                isLegado
                  ? "border-amber-400 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/30"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isLegado
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
              }`}>
                <Archive size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Projeto Anterior (Contratação passada)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-start gap-1">
                  <Info size={12} className="shrink-0 mt-0.5 text-slate-400" />
                  Pula a fase de elaboração. Ideal para cadastrar contratos que já estão vigentes ou finalizados.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  {...register("is_legado")}
                  className="sr-only peer"
                />
                <div className={`h-6 w-11 rounded-full transition-colors ${
                  isLegado
                    ? "bg-amber-500"
                    : "bg-slate-300 dark:bg-slate-600"
                }`} />
                <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  isLegado ? "translate-x-5" : "translate-x-0"
                }`} />
              </div>
            </label>
          </div>

          {/* ══ Banner informativo (quando legado) ══ */}
          {isLegado && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                 style={{ animation: "modalIn 0.2s ease-out" }}>
              <Archive size={16} className="shrink-0" />
              <span>
                <strong>Modo Projeto Anterior ativo.</strong> O projeto será criado com status "Contratado" e sem artefatos obrigatórios. 
                Os campos Prioridade, Complexidade e Equipe estão ocultos.
              </span>
            </div>
          )}

          {/* ══ 1. DADOS BÁSICOS ══ */}
          <SectionTitle>Dados Básicos</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Nome do Projeto" required error={errors.nome?.message}>
              <input
                {...register("nome")}
                placeholder="Ex: Aquisição de Switches Core para o Datacenter"
                className={inputCls}
                autoFocus
              />
            </Field>

            <Field label="Processo SEI" required error={errors.processo_sei?.message}>
              <input
                {...register("processo_sei")}
                placeholder="00052-00032300/2024-09"
                className={inputCls}
              />
            </Field>

            {/* Prioridade e Complexidade — ocultos para legado */}
            {!isLegado && (
              <>
                <Field label="Prioridade" required error={errors.prioridade?.message}>
                  <select {...register("prioridade")} className={selectCls}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </Field>

                <Field label="Complexidade" required error={errors.complexidade?.message}>
                  <select {...register("complexidade")} className={selectCls}>
                    <option value="Simples">Simples</option>
                    <option value="Intermediária">Intermediária</option>
                    <option value="Complexa">Complexa</option>
                  </select>
                </Field>
              </>
            )}
          </div>

          {/* ══ 2. EQUIPE — oculta para legado ══ */}
          {!isLegado && (
            <>
              <SectionTitle>Equipe de Planejamento</SectionTitle>
              <div className="space-y-6">
                {/* ── Bloco: Integrante Requisitante ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">Integrante Requisitante</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(s => !watch("substitutos_requisitantes_ids").includes(s.id))
                          .map(s => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("integrantes_requisitantes_ids")}
                        onChange={(ids) => setValue("integrantes_requisitantes_ids", ids as number[])}
                        placeholder={loadingServidores ? "Carregando..." : "Selecione os titulares..."}
                        disabled={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(s => !watch("integrantes_requisitantes_ids").includes(s.id))
                          .map(s => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("substitutos_requisitantes_ids")}
                        onChange={(ids) => setValue("substitutos_requisitantes_ids", ids as number[])}
                        placeholder={loadingServidores ? "Carregando..." : "Selecione os substitutos..."}
                        disabled={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Bloco: Integrante Técnico ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">Integrante Técnico</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(s => !watch("substitutos_tecnicos_ids").includes(s.id))
                          .map(s => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("integrantes_tecnicos_ids")}
                        onChange={(ids) => setValue("integrantes_tecnicos_ids", ids as number[])}
                        placeholder={loadingServidores ? "Carregando..." : "Selecione os titulares..."}
                        disabled={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(s => !watch("integrantes_tecnicos_ids").includes(s.id))
                          .map(s => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("substitutos_tecnicos_ids")}
                        onChange={(ids) => setValue("substitutos_tecnicos_ids", ids as number[])}
                        placeholder={loadingServidores ? "Carregando..." : "Selecione os substitutos..."}
                        disabled={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Bloco: Integrante Administrativo ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-primary">Integrante Administrativo</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(s => !watch("substitutos_administrativos_ids").includes(s.id))
                          .map(s => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("integrantes_administrativos_ids")}
                        onChange={(ids) => setValue("integrantes_administrativos_ids", ids as number[])}
                        placeholder={loadingServidores ? "Carregando..." : "Selecione os titulares..."}
                        disabled={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectCombobox
                        options={servidores
                          .filter(s => !watch("integrantes_administrativos_ids").includes(s.id))
                          .map(s => ({ value: s.id, label: s.nome }))
                          .sort((a, b) => a.label.localeCompare(b.label))}
                        value={watch("substitutos_administrativos_ids")}
                        onChange={(ids) => setValue("substitutos_administrativos_ids", ids as number[])}
                        placeholder={loadingServidores ? "Carregando..." : "Selecione os substitutos..."}
                        disabled={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ 3. PLANEJAMENTO ESTRATÉGICO ══ */}
          <SectionTitle>Planejamento Estratégico</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* PDTIC */}
            <Field label="Ações PDTIC">
              <MultiSelectCombobox
                options={acoesPdtic
                  .map(a => ({ value: a.id, label: `${a.codigo_acao} — ${a.descricao}` }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
                value={selectedAcoes}
                onChange={(val) => setValue("acoes_pdtic_ids", val as number[])}
                placeholder={loadingAcoes ? "Carregando..." : "Selecione as ações..."}
                disabled={loadingAcoes}
              />
            </Field>

            {/* PACC */}
            <Field label="Itens PACC">
              <MultiSelectCombobox
                options={itensPacc
                  .map(i => ({ value: i.id, label: `#${i.numero_item} — ${i.descricao_demanda}` }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
                value={selectedItens}
                onChange={(val) => setValue("itens_pacc_ids", val as number[])}
                placeholder={loadingItens ? "Carregando..." : "Selecione os itens..."}
                disabled={loadingItens}
              />
            </Field>
          </div>

          {/* ══ 4. INFORMAÇÕES COMPLEMENTARES ══ */}
          <SectionTitle>Informações Complementares</SectionTitle>
          <div className="grid gap-6">
            <Field label="Observações" error={errors.observacoes?.message}>
              <textarea
                {...register("observacoes")}
                rows={4}
                placeholder="Anotações gerais e informações adicionais sobre o projeto..."
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
                onClick={() => router.push("/projetos")}
                className="h-10 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex h-10 items-center gap-2 rounded-lg px-6 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${
                  isLegado
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25"
                    : "bg-brand-primary shadow-brand-primary/25 hover:bg-brand-primary-hover"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {submitPhase}
                  </>
                ) : (
                  <>
                    {isLegado ? <Archive size={14} /> : <Plus size={14} />}
                    {isLegado ? "Cadastrar Projeto Anterior" : "Criar Projeto"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      <ToastContainer />
    </div>
  );
}
