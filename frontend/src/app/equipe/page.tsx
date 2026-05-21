"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Inbox,
  Pencil,
  Trash2,
  Hash,
  Building,
  Briefcase,
  ShieldCheck,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import { fetchServidores, excluirServidor } from "@/lib/api";
import type { Servidor } from "@/types/projeto";
import { CardListSkeleton } from "@/components/ui/Skeleton";

/* ── Página ────────────────────────────────────────────────────────────── */

export default function EquipePage() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);



  // Busca
  const [search, setSearch] = useState("");

  // Confirmação de exclusão
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchServidores();
        setServidores(data);
      } catch {
        setServidores([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  const refresh = () => setFetchKey((k) => k + 1);

  // Filtro
  const filtered = useMemo(() => {
    if (!search.trim()) return servidores;
    const q = search.toLowerCase();
    return servidores.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) ||
        s.matricula.toLowerCase().includes(q) ||
        s.cargo.toLowerCase().includes(q) ||
        (s.lotacao?.sigla || "").toLowerCase().includes(q) ||
        (s.lotacao?.nome || "").toLowerCase().includes(q) ||
        (s.email_funcional || "").toLowerCase().includes(q)
    );
  }, [servidores, search]);

  // Excluir
  async function handleDelete(id: number) {
    try {
      await excluirServidor(id);
      showToast("success", "Servidor removido com sucesso!");
      setDeletingId(null);
      refresh();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erro ao remover servidor."
      );
    }
  }

  // Edit is handled via Link to /equipe/[id]/editar

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Cadastro de agentes públicos do órgão
            </h1>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <ShieldCheck size={12} />
          Área Restrita — ADMIN
        </span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Total de Servidores
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {servidores.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Exibindo
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {filtered.length}
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula, cargo ou lotação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background-card pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <Link
          href="/equipe/novo"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg w-full sm:w-auto"
        >
          <Plus size={16} />
          Novo Servidor
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <CardListSkeleton cards={6} />
      ) : filtered.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Inbox size={36} className="text-foreground-muted mb-2" />
          <p className="text-sm font-medium text-foreground-muted">
            {servidores.length === 0
              ? "Nenhum servidor cadastrado"
              : "Nenhum servidor encontrado"}
          </p>
          {servidores.length === 0 && (
            <Link
              href="/equipe/novo"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary/10 px-4 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary/20"
            >
              <Plus size={14} />
              Cadastrar primeiro servidor
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    <div className="flex items-center gap-1">
                      <Hash size={10} />
                      Matrícula
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Servidor
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    <div className="flex items-center gap-1">
                      <Briefcase size={10} />
                      Cargo / Função
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    <div className="flex items-center gap-1">
                      <Building size={10} />
                      Lotação
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    <div className="flex items-center gap-1">
                      <Mail size={10} />
                      E-mail
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-background-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {s.matricula}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                            {s.nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">
                            {s.nome}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground text-xs font-medium">
                          {s.cargo}
                        </div>
                        {s.funcao && (
                          <div className="text-[11px] text-foreground-muted">
                            {s.funcao}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <Building size={10} />
                            {s.lotacao?.caminho_completo || s.lotacao?.sigla || s.lotacao?.nome || "N/I"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.email_funcional ? (
                          <span className="text-xs text-foreground-muted">
                            {s.email_funcional}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground-muted/50">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/equipe/${s.id}/editar`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </Link>
                          {deletingId === s.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-600"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="rounded-lg px-2 py-1 text-[10px] font-bold text-foreground-muted hover:text-foreground"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(s.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}



      <ToastContainer />
    </div>
  );
}
