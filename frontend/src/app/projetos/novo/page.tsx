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
import type { Servidor } from "@/types/projeto";
import type { PdticAcao } from "@/types/pdtic";
import type { PaccItemComAcao } from "@/types/pacc";

/* ── Estilos base ───────────────────────────────────────────────────────── */

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

const selectCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/* ── Multi-select de Servidores ─────────────────────────────────────────── */

function MultiSelectServidores({
  servidores,
  selectedIds,
  onChange,
  excludeIds = [],
  placeholder = "Nenhum selecionado",
  loading,
}: {
  servidores: Servidor[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  excludeIds?: number[];
  placeholder?: string;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const opcoes = servidores.filter((s) => !excludeIds.includes(s.id));
  const opcoesFiltradas = opcoes.filter((s) => s.nome.toLowerCase().includes(busca.toLowerCase()));
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
              {loading ? "Carregando..." : placeholder}
            </span>
          ) : (
            selected.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
              >
                {s.nome}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800"
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
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 flex flex-col">
            <div className="sticky top-0 z-10 bg-white p-2 border-b border-slate-100 dark:bg-slate-800 dark:border-slate-700/60">
              <input
                type="text"
                placeholder="Buscar servidor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900/50"
              />
            </div>
            {opcoesFiltradas.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 italic text-center">Nenhum servidor encontrado.</div>
            ) : (
              opcoesFiltradas.map((s) => {
                const sel = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${sel ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${sel ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"}`}>
                      {sel && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{s.nome}</div>
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
    <h3 className="mt-10 mb-6 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-indigo-600 dark:border-slate-700 dark:text-indigo-400">
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
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-md shadow-violet-500/20">
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
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Integrante Requisitante</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectServidores
                        servidores={servidores}
                        selectedIds={watch("integrantes_requisitantes_ids")}
                        onChange={(ids) => setValue("integrantes_requisitantes_ids", ids)}
                        placeholder="Selecione os titulares..."
                        loading={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectServidores
                        servidores={servidores}
                        selectedIds={watch("substitutos_requisitantes_ids")}
                        onChange={(ids) => setValue("substitutos_requisitantes_ids", ids)}
                        placeholder="Selecione os substitutos..."
                        loading={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Bloco: Integrante Técnico ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Integrante Técnico</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectServidores
                        servidores={servidores}
                        selectedIds={watch("integrantes_tecnicos_ids")}
                        onChange={(ids) => setValue("integrantes_tecnicos_ids", ids)}
                        placeholder="Selecione os titulares..."
                        loading={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectServidores
                        servidores={servidores}
                        selectedIds={watch("substitutos_tecnicos_ids")}
                        onChange={(ids) => setValue("substitutos_tecnicos_ids", ids)}
                        placeholder="Selecione os substitutos..."
                        loading={loadingServidores}
                      />
                    </Field>
                  </div>
                </div>

                {/* ── Bloco: Integrante Administrativo ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Integrante Administrativo</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Titular(es)">
                      <MultiSelectServidores
                        servidores={servidores}
                        selectedIds={watch("integrantes_administrativos_ids")}
                        onChange={(ids) => setValue("integrantes_administrativos_ids", ids)}
                        placeholder="Selecione os titulares..."
                        loading={loadingServidores}
                      />
                    </Field>
                    <Field label="Substituto(s)">
                      <MultiSelectServidores
                        servidores={servidores}
                        selectedIds={watch("substitutos_administrativos_ids")}
                        onChange={(ids) => setValue("substitutos_administrativos_ids", ids)}
                        placeholder="Selecione os substitutos..."
                        loading={loadingServidores}
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
              <select
                className={selectCls}
                disabled={loadingAcoes}
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id && !selectedAcoes.includes(id)) {
                    setValue("acoes_pdtic_ids", [...selectedAcoes, id]);
                  }
                  e.target.value = "";
                }}
              >
                <option value="">{loadingAcoes ? "Carregando..." : "Adicionar ação..."}</option>
                {acoesPdtic
                  .filter((a) => !selectedAcoes.includes(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo_acao} — {a.descricao}
                    </option>
                  ))}
              </select>
              {selectedAcoes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAcoes.map((id) => {
                    const acao = acoesPdtic.find((a) => a.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50"
                      >
                        {acao?.codigo_acao ?? id}
                        <button
                          type="button"
                          onClick={() => setValue("acoes_pdtic_ids", selectedAcoes.filter((x) => x !== id))}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* PACC */}
            <Field label="Itens PACC">
              <select
                className={selectCls}
                disabled={loadingItens}
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id && !selectedItens.includes(id)) {
                    setValue("itens_pacc_ids", [...selectedItens, id]);
                  }
                  e.target.value = "";
                }}
              >
                <option value="">{loadingItens ? "Carregando..." : "Adicionar item..."}</option>
                {itensPacc
                  .filter((i) => !selectedItens.includes(i.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.numero_item} — {item.descricao_demanda}
                    </option>
                  ))}
              </select>
              {selectedItens.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItens.map((id) => {
                    const item = itensPacc.find((i) => i.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 border border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50"
                      >
                        #{item?.numero_item ?? id}
                        <button
                          type="button"
                          onClick={() => setValue("itens_pacc_ids", selectedItens.filter((x) => x !== id))}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
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
                    : "bg-gradient-to-r from-violet-600 to-purple-500 shadow-violet-500/25"
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
      </div>

      <ToastContainer />
    </div>
  );
}
