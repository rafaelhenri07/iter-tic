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
  Shield,
} from "lucide-react";
import { ServidorModal } from "@/components/equipe/ServidorModal";
import { ToastContainer, showToast } from "@/components/ui/Toast";
import { fetchServidores, excluirServidor } from "@/lib/api";
import type { Servidor } from "@/types/projeto";
import { CardListSkeleton } from "@/components/ui/Skeleton";

/* ── Badge de perfil ──────────────────────────────────────────────────── */

const PERFIL_CONFIG: Record<string, { icon: string; cls: string }> = {
  Administrador: {
    icon: "🔴",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  },
  Gestor: {
    icon: "🔵",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  Visualizador: {
    icon: "🟢",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
};

/* ── Página ────────────────────────────────────────────────────────────── */

export default function EquipePage() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingServidor, setEditingServidor] = useState<Servidor | null>(null);

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
        s.lotacao.toLowerCase().includes(q)
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

  // Open edit
  function openEdit(s: Servidor) {
    setEditingServidor(s);
    setShowModal(true);
  }

  // Open create
  function openCreate() {
    setEditingServidor(null);
    setShowModal(true);
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gestão de Equipe
            </h1>
            <p className="text-xs text-foreground-muted">
              Cadastro de servidores da PCDF
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
        >
          <Plus size={16} />
          Novo Servidor
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            Administradores
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {servidores.filter((s) => s.perfil_acesso === "Administrador").length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-card px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Gestores
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {servidores.filter((s) => s.perfil_acesso === "Gestor").length}
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

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
        />
        <input
          type="text"
          placeholder="Buscar por nome, matrícula, cargo ou lotação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background-card pl-10 pr-4 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
        />
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
            <button
              onClick={openCreate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
            >
              <Plus size={14} />
              Cadastrar primeiro servidor
            </button>
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
                      <Shield size={10} />
                      Perfil
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => {
                  const perfilCfg = s.perfil_acesso
                    ? PERFIL_CONFIG[s.perfil_acesso]
                    : null;

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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white">
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
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <Building size={10} />
                          {s.lotacao}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {perfilCfg ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${perfilCfg.cls}`}
                          >
                            {perfilCfg.icon} {s.perfil_acesso}
                          </span>
                        ) : (
                          <span className="text-[11px] text-foreground-muted italic">
                            Não definido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
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
                              className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
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

      {/* Modal */}
      {showModal && (
        <ServidorModal
          servidor={editingServidor}
          onClose={() => {
            setShowModal(false);
            setEditingServidor(null);
          }}
          onSuccess={refresh}
        />
      )}

      <ToastContainer />
    </div>
  );
}
