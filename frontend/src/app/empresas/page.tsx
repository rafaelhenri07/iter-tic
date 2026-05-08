"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Search,
  Plus,
  AlertCircle,
  Inbox,
  Pencil,
  Trash2,
} from "lucide-react";
import { fetchEmpresas, excluirEmpresa } from "@/lib/api";
import type { Empresa } from "@/lib/api";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import { CardListSkeleton } from "@/components/ui/Skeleton";

/* ── Badges de serviço ──────────────────────────────────────────────────── */

function ServicoBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
      {label}
    </span>
  );
}

/* ── Página ─────────────────────────────────────────────────────────────── */

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchEmpresas();
        setEmpresas(data);
        setUsingMock(false);
      } catch {
        setEmpresas([]);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchKey]);

  const refresh = () => setFetchKey((k) => k + 1);

  const filtered = useMemo(() => {
    if (!search.trim()) return empresas;
    const q = search.toLowerCase();
    return empresas.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) ||
        e.cnpj.includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.contato_nome ?? "").toLowerCase().includes(q)
    );
  }, [empresas, search]);

  const handleExcluir = async (id: number, nome: string) => {
    if (!confirm(`Deseja excluir a empresa "${nome}"? Esta ação não poderá ser desfeita.`)) return;
    setDeletingId(id);
    try {
      await excluirEmpresa(id);
      showToast("success", `Empresa "${nome}" excluída com sucesso.`);
      refresh();
    } catch {
      showToast("error", "Erro ao excluir empresa.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Empresas</h1>
            <p className="text-xs text-foreground-muted">
              Catálogo de fornecedores e empresas contratadas
            </p>
          </div>
        </div>

        <Link
          href="/empresas/novo"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:brightness-110"
        >
          <Plus size={16} />
          Nova Empresa
        </Link>
      </div>

      {/* ── Banner mock ── */}
      {usingMock && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle size={16} />
          Back-end indisponível — nenhuma empresa carregada.
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Total de Empresas
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{empresas.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Com Serviços Cadastrados
          </div>
          <div className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {empresas.filter((e) => e.servicos_ofertados?.length > 0).length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Exibindo
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{filtered.length}</div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
        />
        <input
          id="busca-empresa"
          type="text"
          placeholder="Buscar por nome, CNPJ, e-mail ou contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background-card pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
        />
      </div>

      {/* ── Data Table ── */}
      {loading ? (
        <CardListSkeleton cards={5} />
      ) : filtered.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <Inbox size={36} className="text-foreground-muted mb-2" />
          <p className="text-sm font-medium text-foreground-muted">
            {empresas.length === 0
              ? "Nenhuma empresa cadastrada"
              : "Nenhuma empresa encontrada com os filtros aplicados"}
          </p>
          {empresas.length === 0 && (
            <Link
              href="/empresas/novo"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400"
            >
              <Plus size={14} />
              Cadastrar primeira empresa
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 dark:bg-slate-800/40">
                {["EMPRESA", "CNPJ", "CONTATO PRINCIPAL", "E-MAIL", "SERVIÇOS OFERTADOS", "AÇÕES"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 last:text-center"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => router.push(`/empresas/${e.id}`)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/20"
                >
                  {/* Empresa */}
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {e.nome}
                    </span>
                    {e.site && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {e.site}
                      </div>
                    )}
                  </td>

                  {/* CNPJ */}
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {e.cnpj}
                    </span>
                  </td>

                  {/* Contato */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {e.contato_nome}
                    </span>
                    <div className="text-xs text-slate-400 mt-0.5">{e.telefone}</div>
                  </td>

                  {/* E-mail */}
                  <td className="px-5 py-3.5">
                    <a
                      href={`mailto:${e.email}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="text-sm text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {e.email}
                    </a>
                  </td>

                  {/* Serviços */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                      {e.servicos_ofertados?.length > 0 ? (
                        e.servicos_ofertados.map((s) => (
                          <ServicoBadge key={s} label={s} />
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/empresas/${e.id}/editar`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20"
                        title="Editar empresa"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleExcluir(e.id, e.nome); }}
                        disabled={deletingId === e.id}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 disabled:opacity-50"
                        title="Excluir empresa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
