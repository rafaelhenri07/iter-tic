"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  fetchUnidadesOrganizacionais,
  criarUnidadeOrganizacional,
  excluirUnidadeOrganizacional,
  atualizarUnidadeOrganizacional,
} from "@/lib/api";
import type { UnidadeOrg, UnidadeOrgCreatePayload } from "@/types/estrutura_organizacional";
import { formatDate } from "@/lib/formatters";

function isDescendant(parent: UnidadeOrg, possibleDescendant: UnidadeOrg, allItems: UnidadeOrg[]): boolean {
  let currentId: number | null = possibleDescendant.unidade_pai_id;
  while (currentId !== null) {
    if (currentId === parent.id) {
      return true;
    }
    const next = allItems.find((u) => u.id === currentId);
    currentId = next ? next.unidade_pai_id : null;
  }
  return false;
}

export default function EstruturaOrganizacionalPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<UnidadeOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [unidadePaiId, setUnidadePaiId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<UnidadeOrg | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [isAdmin, router]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchUnidadesOrganizacionais());
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: UnidadeOrg) => {
    setEditingItem(item);
    setNome(item.nome);
    setSigla(item.sigla || "");
    setUnidadePaiId(item.unidade_pai_id ? item.unidade_pai_id.toString() : "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: UnidadeOrgCreatePayload = {
        nome: nome.trim(),
        sigla: sigla.trim() || null,
        unidade_pai_id: unidadePaiId ? parseInt(unidadePaiId) : null,
      };

      if (editingItem) {
        await atualizarUnidadeOrganizacional(editingItem.id, payload);
      } else {
        await criarUnidadeOrganizacional(payload);
      }

      setNome("");
      setSigla("");
      setUnidadePaiId("");
      setEditingItem(null);
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(
        editingItem
          ? "Erro ao atualizar registro. Verifique se há conflito de nome."
          : "Erro ao criar registro. Verifique se o nome já existe."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, itemNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir '${itemNome}'? Todas as subunidades vinculadas também serão removidas.`)) return;

    try {
      await excluirUnidadeOrganizacional(id);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao excluir. O registro pode estar em uso por Servidores ou PDTIC.");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Unidades Organizacionais
            </h1>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Cadastro hierárquico de todas as unidades do organograma — suportando infinitos níveis de profundidade.
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <ShieldCheck size={12} />
          Área Restrita — ADMIN
        </span>
      </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              {loading ? "Carregando..." : `${items.length} unidade${items.length !== 1 ? "s" : ""} cadastrada${items.length !== 1 ? "s" : ""}`}
            </p>
            {!showForm && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setNome("");
                  setSigla("");
                  setUnidadePaiId("");
                  setShowForm(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
              >
                <Plus size={16} />
                Adicionar Unidade
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {showForm && (
            <div className="rounded-xl border border-border bg-background-card p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2">
                  {editingItem ? "Editar Unidade Organizacional" : "Nova Unidade Organizacional"}
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: DIVISÃO DE TECNOLOGIA"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none uppercase"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="w-full sm:w-32 space-y-1.5 shrink-0">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                      Sigla (Opcional)
                    </label>
                    <input
                      type="text"
                      value={sigla}
                      onChange={(e) => setSigla(e.target.value)}
                      placeholder="Ex: DTI"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none uppercase"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                    Órgão Superior (Opcional)
                  </label>
                  <select
                    value={unidadePaiId}
                    onChange={(e) => setUnidadePaiId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    disabled={submitting}
                  >
                    <option value="">— Nenhum (Raiz do Organograma) —</option>
                    {items
                      .filter((u) => !editingItem || (u.id !== editingItem.id && !isDescendant(editingItem, u, items)))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.caminho_completo}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setNome("");
                      setSigla("");
                      setUnidadePaiId("");
                      setEditingItem(null);
                    }}
                    disabled={submitting}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background-hover"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !nome.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background-card/50 px-6 py-12 text-center">
              <Building2 className="mx-auto h-8 w-8 text-foreground-muted/50 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhuma unidade organizacional cadastrada</p>
              <p className="text-sm text-foreground-muted mt-1">Clique em &quot;Adicionar Unidade&quot; para começar.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-background-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background-hover">
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-foreground-muted">Hierarquia</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-foreground-muted w-32">Sigla</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-foreground-muted w-40 text-right">Cadastrado em</th>
                    <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground-muted w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => {
                    const pathParts = item.caminho_completo.split(" / ");
                    const depth = pathParts.length - 1;
                    const parentPath = pathParts.slice(0, -1);
                    const currentName = pathParts[pathParts.length - 1];

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-background-hover/50 group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
                            {depth > 0 && (
                              <ChevronRight size={12} className="text-foreground-muted/40 shrink-0" />
                            )}
                            <div>
                              <span className="font-medium text-foreground">{currentName}</span>
                              {parentPath.length > 0 && (
                                <span className="ml-2 text-[11px] text-foreground-muted">
                                  ({parentPath.join(" › ")})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-foreground-muted">
                          {item.sigla ? (
                            <span className="inline-flex rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium">
                              {item.sigla}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-foreground-muted text-xs">
                          {formatDate(item.criado_em)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.nome)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
    </div>
  );
}
