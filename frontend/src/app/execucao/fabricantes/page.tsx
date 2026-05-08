"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Factory,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchFabricantes,
  excluirFabricante,
} from "@/lib/api";
import type { Fabricante } from "@/lib/api";


/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function daysAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* ── Página ────────────────────────────────────────────────────────────── */

export default function FabricantesPage() {
  const router = useRouter();
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fetchKey, setFetchKey] = useState(0);



  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Fabricante | null>(null);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    fetchFabricantes()
      .then(setFabricantes)
      .catch(() => setFabricantes([]))
      .finally(() => setLoading(false));
  }, [fetchKey]);

  /* Filtro local */
  const filtered = fabricantes.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.nome.toLowerCase().includes(q) ||
      f.contato_nome.toLowerCase().includes(q) ||
      f.contato_email.toLowerCase().includes(q)
    );
  });

  /* KPIs */
  const totalFabricantes = fabricantes.length;
  const recentes = fabricantes.filter((f) => daysAgo(f.create_time) <= 30).length;



  async function handleDelete() {
    if (!deleteTarget) return;
    await excluirFabricante(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/25">
            <Factory size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fabricantes</h1>
            <p className="text-sm text-foreground-muted">
              Cadastro de fornecedores e fabricantes de soluções de TI
            </p>
          </div>
        </div>

        <Link
          href="/execucao/fabricantes/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
        >
          <Plus size={16} />
          Novo Fabricante
        </Link>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 max-w-xl">
        <KpiCard
          title="Total de Fabricantes"
          value={String(totalFabricantes)}
          icon={<Factory size={18} />}
          color="indigo"
        />
        <KpiCard
          title="Adicionados Recentemente"
          value={String(recentes)}
          subtitle="Últimos 30 dias"
          icon={<CalendarPlus size={18} />}
          color="emerald"
        />
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Buscar fabricante, contato ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background-card py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* ── Data Table ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-background-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 dark:bg-slate-800/40">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Fabricante
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Contato Principal
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Telefone
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  E-mail
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Site
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-foreground-muted">
                    Carregando fabricantes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-foreground-muted">
                    {search
                      ? "Nenhum fabricante encontrado para a busca."
                      : "Nenhum fabricante cadastrado."}
                  </td>
                </tr>
              ) : (
                filtered.map((fab) => (
                  <tr
                    key={fab.id}
                    onClick={() => router.push(`/execucao/fabricantes/${fab.id}/editar`)}
                    className="group cursor-pointer border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                  >
                    {/* Fabricante */}
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {fab.nome}
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Cadastrado em {formatDate(fab.create_time)}
                      </p>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-medium text-foreground">
                        {fab.contato_nome}
                      </span>
                      <p className="text-[11px] text-slate-400">{fab.contato_cargo}</p>
                    </td>

                    {/* Telefone */}
                    <td className="px-4 py-3.5 text-[13px] text-foreground">
                      {fab.contato_telefone1}
                      {fab.contato_telefone2 && (
                        <span className="block text-[11px] text-slate-400">
                          {fab.contato_telefone2}
                        </span>
                      )}
                    </td>

                    {/* E-mail */}
                    <td className="px-4 py-3.5">
                      <a
                        href={`mailto:${fab.contato_email}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="text-[13px] text-indigo-600 transition-colors hover:underline dark:text-indigo-400"
                      >
                        {fab.contato_email}
                      </a>
                    </td>

                    {/* Site */}
                    <td className="px-4 py-3.5">
                      {fab.site ? (
                        <a
                          href={fab.site}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[13px] text-cyan-600 transition-colors hover:underline dark:text-cyan-400"
                        >
                          Acessar
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-[13px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/execucao/fabricantes/${fab.id}/editar`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(fab); }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* ── Delete Confirmation ───────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Excluir Fabricante
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {deleteTarget.nome}
              </span>
              ? Esta ação pode ser revertida pelo administrador.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────────────── */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const map: Record<string, { gradient: string; glow: string }> = {
    indigo: { gradient: "from-indigo-500 to-blue-500", glow: "shadow-indigo-500/25" },
    emerald: { gradient: "from-emerald-500 to-green-500", glow: "shadow-emerald-500/25" },
  };
  const c = map[color] ?? map.indigo;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-background-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
            {title}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-foreground tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-foreground-muted">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-lg ${c.glow}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
