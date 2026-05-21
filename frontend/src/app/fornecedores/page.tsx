"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, Loader2, Search, Briefcase, Pencil, Trash2, User, Building2,
} from "lucide-react";
import { fetchFornecedores } from "@/lib/api";
import type { FornecedorResponse } from "@/types/fornecedor";
import { showToast } from "@/components/ui/Toast";
import { ExcluirFornecedorDialog } from "@/components/fornecedores/ExcluirFornecedorDialog";

const NATUREZA_LABELS: Record<string, { label: string; icon: typeof User; cls: string }> = {
  PESSOA_FISICA: { label: "Pessoa Física", icon: User, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  PESSOA_JURIDICA: { label: "Pessoa Jurídica", icon: Building2, cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
};

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<FornecedorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState<FornecedorResponse | null>(null);

  const reload = async () => {
    try {
      setFornecedores(await fetchFornecedores());
    } catch {
      showToast("error", "Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const filtrados = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.documento && f.documento.includes(busca))
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Base de Fornecedores
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Cadastro unificado de fornecedores de soluções e serviços de TI.
            </p>
          </div>
        </div>
        <Link
          href="/fornecedores/novo"
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover hover:shadow-lg"
        >
          <Plus size={16} />
          Novo Fornecedor
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} />
        <input
          type="text"
          placeholder="Buscar por nome ou documento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border border-border bg-background-card py-2.5 pl-10 pr-4 text-sm text-foreground transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-primary" size={32} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-border bg-background-card py-16 text-center text-sm text-foreground-muted">
          {busca ? "Nenhum fornecedor encontrado para esta busca." : "Nenhum fornecedor cadastrado."}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Documento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Natureza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Portfólio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-muted w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((f) => {
                const nat = NATUREZA_LABELS[f.natureza];
                const NatIcon = nat?.icon ?? User;
                return (
                  <tr key={f.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <Link href={`/fornecedores/${f.id}/editar`} className="font-medium text-foreground hover:text-brand-primary transition-colors">
                        {f.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted font-mono text-xs">
                      {f.documento || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${nat?.cls}`}>
                        <NatIcon size={12} />
                        {nat?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted text-xs">
                      {f.portfolio.length > 0
                        ? f.portfolio.map((p) => p.nome).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/fornecedores/${f.id}/editar`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => setFornecedorParaExcluir(f)}
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

      <div className="text-xs text-foreground-muted text-center">
        {filtrados.length} {filtrados.length === 1 ? "fornecedor" : "fornecedores"}
      </div>

      {fornecedorParaExcluir && (
        <ExcluirFornecedorDialog
          open={true}
          onClose={() => setFornecedorParaExcluir(null)}
          fornecedor={fornecedorParaExcluir}
          onSuccess={reload}
        />
      )}
    </div>
  );
}
