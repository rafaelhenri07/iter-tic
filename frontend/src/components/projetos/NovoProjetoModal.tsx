"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Plus,
  Loader2,
  FileText,
  Shield,
  Hash,
  Users,
  Layers,
  ClipboardList,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { FormField, inputCls, selectCls } from "@/components/ui/FormField";
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
import type { Servidor } from "@/types/projeto";
import type { PdticAcao } from "@/types/pdtic";
import type { PaccItemComAcao } from "@/types/pacc";

/* ── Seções do formulário ──────────────────────────────────────────────── */

type Section = "basico" | "equipe" | "planejamento";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "basico", label: "Dados Básicos", icon: <FileText size={14} /> },
  { id: "equipe", label: "Equipe", icon: <Users size={14} /> },
  { id: "planejamento", label: "Planejamento", icon: <Layers size={14} /> },
];

/* ── Componente ────────────────────────────────────────────────────────── */

interface NovoProjetoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function NovoProjetoModal({ onClose, onSuccess }: NovoProjetoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("basico");
  const [submitPhase, setSubmitPhase] = useState<string>("");

  // Dados dinâmicos
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [acoesPdtic, setAcoesPdtic] = useState<PdticAcao[]>([]);
  const [itensPacc, setItensPacc] = useState<PaccItemComAcao[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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
      complexidade: "media",
      catmat: "",
      catser: "",
      integrante_requisitante_id: 0,
      integrante_tecnico_id: 0,
      integrante_administrativo_id: 0,
      acoes_pdtic_ids: [],
      itens_pacc_ids: [],
    },
  });

  const selectedAcoes = watch("acoes_pdtic_ids");
  const selectedItens = watch("itens_pacc_ids");

  // ── Load dados dinâmicos ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // Servidores
        const srvs = await fetchServidores();
        setServidores(srvs);
      } catch {
        setServidores([]);
      }

      try {
        // Ações PDTIC ativas (todas os períodos)
        const periodos = await fetchPeriodos();
        const allAcoes: PdticAcao[] = [];
        for (const p of periodos) {
          const acoes = await fetchAcoesPdticAtivas(p.id);
          allAcoes.push(...acoes);
        }
        setAcoesPdtic(allAcoes);
      } catch {
        setAcoesPdtic([]);
      }

      try {
        // Itens PACC ativos
        const exercicios = await fetchExercicios();
        const allItens: PaccItemComAcao[] = [];
        for (const ex of exercicios) {
          const painel = await fetchPainelPacc(ex.id);
          allItens.push(...painel.itens_ativos);
        }
        setItensPacc(allItens);
      } catch {
        setItensPacc([]);
      }

      setLoadingData(false);
    }
    load();
  }, []);

  // ── Toggle multi-select ──────────────────────────────────────────────
  function toggleAcao(id: number) {
    const current = selectedAcoes ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setValue("acoes_pdtic_ids", next);
  }

  function toggleItem(id: number) {
    const current = selectedItens ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    setValue("itens_pacc_ids", next);
  }

  // ── Submit: dupla chamada ─────────────────────────────────────────────
  const onSubmit = async (data: ProjetoCreateFormData) => {
    setSubmitting(true);
    try {
      // Fase 1: Criar projeto
      setSubmitPhase("Criando projeto...");
      const payload = cleanProjetoPayload(data);
      const novoProjeto = await criarProjeto(payload);

      // Fase 2: Inicializar artefatos
      setSubmitPhase("Inicializando artefatos...");
      await inicializarArtefatos(novoProjeto.id);

      showToast(
        "success",
        `Projeto "${data.nome}" criado com 5 artefatos obrigatórios!`
      );
      onSuccess();
      onClose();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao criar projeto."
      );
    } finally {
      setSubmitting(false);
      setSubmitPhase("");
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 text-white">
              <FolderKanban size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Novo Projeto
              </h2>
              <p className="text-xs text-foreground-muted">
                Cadastro de projeto de contratação
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
        <div className="flex border-b border-border px-6">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activeSection === s.id
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
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
          {/* ═══ SEÇÃO 1: DADOS BÁSICOS ═══ */}
          {activeSection === "basico" && (
            <div className="space-y-5" style={{ animation: "modalIn 0.15s ease-out" }}>
              {/* Nome */}
              <FormField
                label="Nome do Projeto"
                required
                icon={<FolderKanban size={10} />}
                error={errors.nome?.message}
              >
                <input
                  {...register("nome")}
                  placeholder="Ex: Aquisição de Switches Core para o Datacenter"
                  className={inputCls}
                />
              </FormField>

              {/* SEI + Complexidade */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Processo SEI"
                  required
                  icon={<FileText size={10} />}
                  error={errors.processo_sei?.message}
                >
                  <input
                    {...register("processo_sei")}
                    placeholder="00052-00032300/2024-09"
                    className={inputCls}
                  />
                </FormField>

                <FormField
                  label="Complexidade"
                  required
                  icon={<Shield size={10} />}
                  error={errors.complexidade?.message}
                >
                  <select {...register("complexidade")} className={selectCls}>
                    <option value="baixa">🟢 Baixa</option>
                    <option value="media">🟡 Média</option>
                    <option value="alta">🔴 Alta</option>
                  </select>
                </FormField>
              </div>

              {/* CATMAT + CATSER */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="CATMAT (Material)"
                  icon={<Hash size={10} />}
                  error={errors.catmat?.message}
                >
                  <input
                    {...register("catmat")}
                    placeholder="Código CATMAT (opcional)"
                    className={inputCls}
                  />
                </FormField>

                <FormField
                  label="CATSER (Serviço)"
                  icon={<Hash size={10} />}
                  error={errors.catser?.message}
                >
                  <input
                    {...register("catser")}
                    placeholder="Código CATSER (opcional)"
                    className={inputCls}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* ═══ SEÇÃO 2: EQUIPE ═══ */}
          {activeSection === "equipe" && (
            <div className="space-y-5" style={{ animation: "modalIn 0.15s ease-out" }}>
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400">
                <strong>Equipe de Planejamento da Contratação</strong> — selecione
                os integrantes conforme a IN 94/2022 (Requisitante, Técnico e
                Administrativo). Todos são opcionais na criação.
              </div>

              <FormField
                label="Integrante Requisitante"
                icon={<Users size={10} />}
              >
                <select
                  {...register("integrante_requisitante_id", {
                    valueAsNumber: true,
                  })}
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

              <FormField
                label="Integrante Técnico"
                icon={<Users size={10} />}
              >
                <select
                  {...register("integrante_tecnico_id", {
                    valueAsNumber: true,
                  })}
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

              <FormField
                label="Integrante Administrativo"
                icon={<Users size={10} />}
              >
                <select
                  {...register("integrante_administrativo_id", {
                    valueAsNumber: true,
                  })}
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

          {/* ═══ SEÇÃO 3: PLANEJAMENTO ESTRATÉGICO ═══ */}
          {activeSection === "planejamento" && (
            <div className="space-y-6" style={{ animation: "modalIn 0.15s ease-out" }}>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-400">
                <strong>Vínculos opcionais</strong> — associe o projeto às ações do
                PDTIC e itens do PACC já cadastrados. Isso garante rastreabilidade
                ponta a ponta com o planejamento plurianual.
              </div>

              {/* Ações PDTIC */}
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  <Layers size={10} />
                  Ações PDTIC Vinculadas
                  {(selectedAcoes?.length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                      {selectedAcoes?.length}
                    </span>
                  )}
                </div>

                {loadingData ? (
                  <div className="flex h-20 items-center justify-center text-xs text-foreground-muted">
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Carregando ações...
                  </div>
                ) : acoesPdtic.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-foreground-muted">
                    Nenhuma ação PDTIC ativa encontrada no backend.
                  </div>
                ) : (
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-background p-2">
                    {acoesPdtic.map((a) => {
                      const selected = selectedAcoes?.includes(a.id) ?? false;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAcao(a.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all ${
                            selected
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : "text-foreground-muted hover:bg-background-secondary hover:text-foreground"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              selected
                                ? "border-indigo-500 bg-indigo-500 text-white"
                                : "border-border"
                            }`}
                          >
                            {selected && <CheckCircle2 size={10} />}
                          </div>
                          <span className="font-semibold">{a.codigo_acao}</span>
                          <span className="truncate">
                            — {a.descricao.substring(0, 60)}
                            {a.descricao.length > 60 ? "…" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Itens PACC */}
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  <ClipboardList size={10} />
                  Itens PACC Vinculados
                  {(selectedItens?.length ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-teal-100 px-1.5 text-[10px] font-bold text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
                      {selectedItens?.length}
                    </span>
                  )}
                </div>

                {loadingData ? (
                  <div className="flex h-20 items-center justify-center text-xs text-foreground-muted">
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Carregando itens...
                  </div>
                ) : itensPacc.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-foreground-muted">
                    Nenhum item PACC ativo encontrado no backend.
                  </div>
                ) : (
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-background p-2">
                    {itensPacc.map((item) => {
                      const selected = selectedItens?.includes(item.id) ?? false;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all ${
                            selected
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                              : "text-foreground-muted hover:bg-background-secondary hover:text-foreground"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              selected
                                ? "border-teal-500 bg-teal-500 text-white"
                                : "border-border"
                            }`}
                          >
                            {selected && <CheckCircle2 size={10} />}
                          </div>
                          <span className="font-semibold">
                            #{item.numero_item}
                          </span>
                          <span className="truncate">
                            — {item.descricao_demanda.substring(0, 50)}
                            {item.descricao_demanda.length > 50 ? "…" : ""}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-[10px]">
                            R${" "}
                            {item.valor_estimado.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
                      ? "w-6 bg-violet-500"
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
                className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 px-5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {submitPhase}
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Criar Projeto
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
