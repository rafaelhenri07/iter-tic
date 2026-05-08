"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  fetchUnidadesOrganizacionais,
  criarUnidadeOrganizacional,
  excluirUnidadeOrganizacional,
} from "@/lib/api";
import type { UnidadeOrg, UnidadeOrgCreatePayload } from "@/types/estrutura_organizacional";
import { formatDate } from "@/lib/formatters";

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
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: UnidadeOrgCreatePayload = {
        nome: nome.trim(),
        sigla: sigla.trim() || null,
      };
      await criarUnidadeOrganizacional(payload);
      setNome("");
      setSigla("");
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError("Erro ao criar registro. Verifique se o nome já existe.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, itemNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir '${itemNome}'?`)) return;

    try {
      await excluirUnidadeOrganizacional(id);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao excluir. O registro pode estar em uso.");
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:from-indigo-500/20 dark:to-indigo-500/10 dark:text-indigo-400">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Unidades Organizacionais
            </h1>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Cadastro unificado de todas as unidades do organograma — departamentos, demandantes e responsáveis.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background p-8">
        <div className="mx-auto max-w-4xl space-y-6">

          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              {loading ? "Carregando..." : `${items.length} unidade${items.length !== 1 ? "s" : ""} cadastrada${items.length !== 1 ? "s" : ""}`}
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
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
              <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
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
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setNome("");
                      setSigla("");
                    }}
                    disabled={submitting}
                    className="flex-1 sm:flex-none rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background-hover"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !nome.trim()}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
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
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-foreground-muted">Nome</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-foreground-muted w-32">Sigla</th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-foreground-muted w-40 text-right">Cadastrado em</th>
                    <th className="px-5 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-background-hover/50 group">
                      <td className="px-5 py-3 font-medium text-foreground">{item.nome}</td>
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
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDelete(item.id, item.nome)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 rounded-md"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
