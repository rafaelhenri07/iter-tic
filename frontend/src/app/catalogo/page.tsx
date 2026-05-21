"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Check,
  X,
  Search,
  ShoppingBag,
  Wrench,
  Building2,
  FileCheck2,
  Users,
} from "lucide-react";
import {
  fetchCatalogo,
  criarItemCatalogo,
  atualizarItemCatalogo,
  excluirItemCatalogo,
} from "@/lib/api";
import type { CatalogoProduto } from "@/types/catalogo";
import { showToast } from "@/components/ui/Toast";

/* ────────────────────────────────────────────────────────────────────────────
 * Modal de Detalhes
 * ────────────────────────────────────────────────────────────────────────── */

function CatalogoDetalhesDialog({
  item,
  onClose,
}: {
  item: CatalogoProduto;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-border bg-background-card shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{item.nome}</h2>
              <span
                className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  item.tipo === "SERVICO"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}
              >
                {item.tipo === "SERVICO" ? <Wrench size={10} /> : <ShoppingBag size={10} />}
                {item.tipo === "SERVICO" ? "Serviço" : "Produto"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-background-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Seção 1: Histórico de Contratações */}
          <div>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">
              <FileCheck2 size={14} className="text-emerald-500" />
              Histórico de Contratações
            </h3>
            {item.ja_contratado ? (
              <div className="space-y-1.5">
                {item.fornecedores_contratados.map((nome, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                  >
                    <Building2 size={14} className="shrink-0 text-emerald-500" />
                    {nome}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background-hover/50 px-4 py-5 text-center text-sm text-foreground-muted">
                Nenhum contrato firmado para este item até o momento.
              </div>
            )}
          </div>

          {/* Seção 2: Empresas que Fornecem (Portfólio) */}
          <div>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">
              <Users size={14} className="text-brand-primary" />
              Empresas que Fornecem (Portfólio)
            </h3>
            {item.fornecedores_vinculados.length > 0 ? (
              <div className="space-y-1.5">
                {item.fornecedores_vinculados.map((nome, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 text-sm text-brand-primary dark:border-brand-primary/30 dark:bg-brand-primary/10"
                  >
                    <Building2 size={14} className="shrink-0 text-brand-primary" />
                    {nome}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background-hover/50 px-4 py-5 text-center text-sm text-foreground-muted">
                Nenhum fornecedor cadastrou este item em seu portfólio.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background-hover transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Página Principal do Catálogo
 * ────────────────────────────────────────────────────────────────────────── */

export default function CatalogoPage() {
  const [items, setItems] = useState<CatalogoProduto[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Criar
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"PRODUTO" | "SERVICO">("PRODUTO");
  const [adicionando, setAdicionando] = useState(false);

  // Editar inline
  const [editId, setEditId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTipo, setEditTipo] = useState<"PRODUTO" | "SERVICO">("PRODUTO");

  // Modal de detalhes
  const [detailItem, setDetailItem] = useState<CatalogoProduto | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const reload = useCallback(async () => {
    try {
      setItems(await fetchCatalogo(debouncedSearch || undefined));
    } catch {
      showToast("error", "Erro ao carregar catálogo.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleAdd = async () => {
    if (!novoNome.trim()) return;
    setAdicionando(true);
    try {
      await criarItemCatalogo({ nome: novoNome.trim(), tipo: novoTipo });
      setNovoNome("");
      setNovoTipo("PRODUTO");
      showToast("success", "Item adicionado ao catálogo!");
      await reload();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao adicionar.");
    } finally {
      setAdicionando(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !editNome.trim()) return;
    try {
      await atualizarItemCatalogo(editId, { nome: editNome.trim(), tipo: editTipo });
      setEditId(null);
      showToast("success", "Item atualizado!");
      await reload();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await excluirItemCatalogo(id);
      showToast("success", "Item excluído.");
      await reload();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao excluir.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Catálogo de Produtos e Serviços
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Dicionário oficial de produtos e serviços de TI — com inteligência de relacionamento de fornecedores e contratações.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por nome do produto ou serviço..."
          className="w-full rounded-xl border border-border bg-background-card pl-10 pr-4 py-2.5 text-sm text-foreground transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      {/* Adicionar novo */}
      <div className="rounded-xl border border-border bg-background-card p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">
          Adicionar Novo Item
        </h3>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Nome do produto ou serviço..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="w-full sm:w-44 space-y-1 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value as "PRODUTO" | "SERVICO")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="PRODUTO">🛒 Produto</option>
              <option value="SERVICO">🔧 Serviço</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={adicionando || !novoNome.trim()}
            className="flex h-[38px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg disabled:opacity-50 shrink-0"
          >
            {adicionando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Adicionar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-brand-primary" size={32} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-foreground-muted">
            {debouncedSearch
              ? `Nenhum item encontrado para \u201c${debouncedSearch}\u201d.`
              : "Nenhum item no catálogo. Adicione o primeiro acima."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Nome
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-muted w-28">
                  Tipo
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-muted w-32">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-muted w-36">
                  Portfólio
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-muted w-32">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => editId !== item.id && setDetailItem(item)}
                  className={`group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${editId !== item.id ? "cursor-pointer" : ""}`}
                >
                  {/* Nome */}
                  <td className="px-4 py-3">
                    {editId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveEdit()
                          }
                          className="flex-1 rounded border border-brand-primary bg-background-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          autoFocus
                        />
                        <select
                          value={editTipo}
                          onChange={(e) =>
                            setEditTipo(
                              e.target.value as "PRODUTO" | "SERVICO"
                            )
                          }
                          className="rounded border border-brand-primary bg-background-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        >
                          <option value="PRODUTO">Produto</option>
                          <option value="SERVICO">Serviço</option>
                        </select>
                        <button
                          onClick={handleSaveEdit}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-foreground">
                        {item.nome}
                      </span>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3 text-center">
                    {editId !== item.id && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          item.tipo === "SERVICO"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}
                      >
                        {item.tipo === "SERVICO" ? (
                          <Wrench size={10} />
                        ) : (
                          <ShoppingBag size={10} />
                        )}
                        {item.tipo === "SERVICO" ? "Serviço" : "Produto"}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {editId !== item.id && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          item.ja_contratado
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.ja_contratado ? "Contratado" : "Sem contratos"}
                      </span>
                    )}
                  </td>

                  {/* Portfólio */}
                  <td className="px-4 py-3 text-center">
                    {editId !== item.id && (
                      <span className="text-xs text-foreground-muted">
                        {item.fornecedores_vinculados.length > 0
                          ? `${item.fornecedores_vinculados.length} empresa${item.fornecedores_vinculados.length !== 1 ? "s" : ""} ${item.fornecedores_vinculados.length === 1 ? "fornece" : "fornecem"}`
                          : "—"}
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3 text-right">
                    {editId !== item.id && (
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditId(item.id);
                            setEditNome(item.nome);
                            setEditTipo(item.tipo as "PRODUTO" | "SERVICO");
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-xs text-foreground-muted text-center">
        {items.length} {items.length === 1 ? "item" : "itens"} no catálogo
      </div>

      {/* Modal de Detalhes */}
      {detailItem && (
        <CatalogoDetalhesDialog
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
