"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, X, Save, FolderKanban, Archive } from "lucide-react";
import {
  projetoCreateSchema,
  type ProjetoCreateFormData,
  cleanProjetoPayload,
} from "@/lib/validations/projeto";
import {
  atualizarProjeto,
  fetchPainelProjeto,
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

export default function EditarProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const projetoId = Number(id);

  const [submitting, setSubmitting] = useState(false);
  const [loadingProjeto, setLoadingProjeto] = useState(true);

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
    reset,
  } = useForm<ProjetoCreateFormData>({
    resolver: zodResolver(projetoCreateSchema),
    defaultValues: {
      nome: "",
      processo_sei: "",
      prioridade: "media",
      complexidade: "Simples",
      is_legado: false,
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
        const p = await fetchPainelProjeto(projetoId);
        const data = p.projeto;
        reset({
          nome: data.nome,
          processo_sei: data.processo_sei || "",
          prioridade: data.prioridade || "media",
          complexidade: data.complexidade || "Simples",
          is_legado: data.is_legado ?? false,
          integrantes_requisitantes_ids: data.integrantes_requisitantes?.map(s => s.id) || [],
          integrantes_tecnicos_ids: data.integrantes_tecnicos?.map(s => s.id) || [],
          integrantes_administrativos_ids: data.integrantes_administrativos?.map(s => s.id) || [],
          substitutos_requisitantes_ids: data.substitutos_requisitantes?.map(s => s.id) || [],
          substitutos_tecnicos_ids: data.substitutos_tecnicos?.map(s => s.id) || [],
          substitutos_administrativos_ids: data.substitutos_administrativos?.map(s => s.id) || [],
          acoes_pdtic_ids: data.acoes_pdtic?.map((a) => a.id) || [],
          itens_pacc_ids: data.itens_pacc?.map((i) => i.id) || [],
          observacoes: data.observacoes || "",
        });
      } catch {
        showToast("error", "Erro ao carregar os dados do projeto.");
      } finally {
        setLoadingProjeto(false);
      }
    })();

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
  }, [projetoId, reset]);

  const onSubmit = async (data: ProjetoCreateFormData) => {
    setSubmitting(true);
    try {
      const payload = cleanProjetoPayload(data);
      await atualizarProjeto(projetoId, payload);
      showToast("success", `Projeto "${data.nome}" atualizado com sucesso!`);
      setTimeout(() => router.push("/projetos"), 1000);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao atualizar projeto.");
      setSubmitting(false);
    }
  };

  if (loadingProjeto) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Carregando projeto...
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Editar Projeto</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Atualize as informações do projeto
            </p>
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ══ Banner Projeto Anterior ══ */}
          {isLegado && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <Archive size={16} className="shrink-0" />
              <span>
                <strong>Editando Projeto Anterior.</strong> Os campos Prioridade, Complexidade e Equipe de Planejamento não se aplicam e estão ocultos.
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
              />
            </Field>

            <Field label="Processo SEI" required error={errors.processo_sei?.message}>
              <input
                {...register("processo_sei")}
                placeholder="00052-00032300/2024-09"
                className={inputCls}
              />
            </Field>

            {/* Prioridade e Complexidade — ocultos para Projeto Anterior */}
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

          {/* ══ 2. EQUIPE — oculta para Projeto Anterior ══ */}
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
                className="flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-6 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Salvar Alterações
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
