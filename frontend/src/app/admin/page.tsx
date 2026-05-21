"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Users,
  ScrollText,
  Plus,
  UserX,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getUsuarios,
  criarUsuario,
  desativarUsuario,
  getAuditoriaLogs,
  getServidores,
  type UsuarioAdmin,
  type AuditoriaLog,
  type UsuarioCreatePayload,
  type ServidorItem,
} from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────

function acaoBadge(acao: string) {
  const map: Record<string, { label: string; cls: string }> = {
    CREATE: { label: "Criação", cls: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" },
    UPDATE: { label: "Edição", cls: "bg-blue-500/15 text-blue-400 ring-blue-500/20" },
    DELETE: { label: "Exclusão", cls: "bg-red-500/15 text-red-400 ring-red-500/20" },
  };
  const entry = map[acao?.toUpperCase()] ?? {
    label: acao,
    cls: "bg-slate-500/15 text-slate-400 ring-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

function formatDateTime(ts: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

// ── Modal de Concessão de Acesso ──────────────────────────────────────────

function ConcederAcessoModal({
  servidores,
  onClose,
  onSuccess,
}: {
  servidores: ServidorItem[];
  onClose: () => void;
  onSuccess: (u: UsuarioAdmin) => void;
}) {
  const [form, setForm] = useState<Omit<UsuarioCreatePayload, "senha"> & { senha?: string }>({
    nome: "",
    email: "",
    role: "COMUM",
    servidor_id: null,
  });
  const [servidorSearch, setServidorSearch] = useState("");
  const [servidorDropdownOpen, setServidorDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServidorDropdownOpen(false);
      }
    }
    if (servidorDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [servidorDropdownOpen]);

  const servidorSelecionado = servidores.find((s) => s.id === form.servidor_id) ?? null;
  const hasServidor = !!servidorSelecionado;

  const filteredServidores = servidores
    .filter((s) => {
      const q = servidorSearch.toLowerCase();
      return s.nome.toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q);
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const handleSelectServidor = (servidor: ServidorItem) => {
    setForm((prev) => ({
      ...prev,
      servidor_id: servidor.id,
      nome: servidor.nome,
      email: servidor.email_funcional ?? "",
    }));
    setServidorSearch("");
    setServidorDropdownOpen(false);
  };

  const handleClearServidor = () => {
    setForm((prev) => ({
      ...prev,
      servidor_id: null,
      nome: "",
      email: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nome.trim() || !form.email.trim()) {
      setError("Selecione um servidor para preencher nome e e-mail.");
      return;
    }
    setLoading(true);
    try {
      const payload: UsuarioCreatePayload = {
        nome: form.nome,
        email: form.email,
        senha: "",
        role: form.role,
        servidor_id: form.servidor_id,
      };
      const novoUsuario = await criarUsuario(payload);
      onSuccess(novoUsuario);
      onClose();
    } catch (err: unknown) {
      console.error("[ConcederAcesso] Erro ao criar usuário:", err);
      if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "NetworkError when attempting to reach resource.")) {
        setError("Erro de conexão com o servidor. Verifique se o backend está rodando.");
      } else {
        setError(err instanceof Error ? err.message : "Erro ao criar usuário. Verifique os dados ou o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputReadonlyCls =
    "w-full rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-400 outline-none cursor-not-allowed";
  const inputEditableCls =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Conceder Acesso</h2>
              <p className="text-xs text-slate-400">Vincular servidor e criar acesso ao sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Servidor Vinculado (PRIMEIRO — combobox com busca) */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Servidor Vinculado *
            </label>
            {hasServidor ? (
              <div className="flex items-center gap-2">
                <div className={`${inputReadonlyCls} flex-1 flex items-center justify-between`}>
                  <span className="truncate">{servidorSelecionado.nome}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-slate-500">
                    Mat. {servidorSelecionado.matricula}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearServidor}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                  title="Limpar seleção"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome ou matrícula..."
                  value={servidorSearch}
                  onChange={(e) => {
                    setServidorSearch(e.target.value);
                    setServidorDropdownOpen(true);
                  }}
                  onFocus={() => setServidorDropdownOpen(true)}
                  className={inputEditableCls}
                />
                {servidorDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1.5 max-h-48 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-800 shadow-xl">
                    {filteredServidores.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-slate-500">
                        Nenhum servidor encontrado
                      </div>
                    ) : (
                      filteredServidores.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectServidor(s)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary uppercase">
                            {s.nome.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white">{s.nome}</div>
                            <div className="text-[11px] text-slate-500">
                              {s.cargo} · Mat. {s.matricula}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Nome Completo (autopreenchido e bloqueado) */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nome Completo
            </label>
            <input
              type="text"
              value={form.nome}
              readOnly
              tabIndex={-1}
              placeholder={hasServidor ? "" : "Preenchido ao selecionar servidor"}
              className={inputReadonlyCls}
            />
          </div>

          {/* 3. E-mail Institucional (autopreenchido e bloqueado) */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              E-mail Institucional
            </label>
            <input
              type="email"
              value={form.email}
              readOnly
              tabIndex={-1}
              placeholder={hasServidor ? "" : "Preenchido ao selecionar servidor"}
              className={inputReadonlyCls}
            />
          </div>

          {/* 4. Nível de Acesso */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nível de Acesso *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="COMUM">COMUM</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {/* Informativo sobre link de ativação */}
          <div className="flex items-start gap-2 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-3 py-2.5 text-[12px] text-brand-primary">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-brand-primary" />
            <span>
              O acesso será criado e um <strong>link de ativação</strong> será enviado para o e-mail
              institucional do servidor.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !hasServidor}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-brand-primary/25 transition hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Conceder Acesso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Aba: Acessos do Sistema ───────────────────────────────────────────────

function AbaAcessos() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [servidores, setServidores] = useState<ServidorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [desativando, setDesativando] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usrs, srvs] = await Promise.all([
        getUsuarios(),
        getServidores().catch(() => [] as ServidorItem[]),
      ]);
      setUsuarios(usrs);
      setServidores(srvs);
    } catch {
      setError("Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDesativar = async (id: number) => {
    if (!confirm("Deseja realmente desativar este acesso? O usuário não conseguirá mais fazer login.")) return;
    setDesativando(id);
    try {
      await desativarUsuario(id);
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, is_active: false } : u));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao desativar usuário");
    } finally {
      setDesativando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-red-400">
        <AlertCircle size={18} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {usuarios.length} {usuarios.length === 1 ? "usuário cadastrado" : "usuários cadastrados"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={13} />
            Atualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            <Plus size={14} />
            Conceder Acesso
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-background-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-slate-50 dark:bg-white/5">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Nome</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">E-mail</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Nível</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Servidor Vinculado</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {usuarios.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                {/* Nome */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary uppercase">
                      {u.nome.charAt(0)}
                    </div>
                    <span className="font-medium text-foreground">{u.nome}</span>
                  </div>
                </td>
                {/* Email */}
                <td className="px-4 py-3 text-foreground-muted">{u.email}</td>
                {/* Role */}
                <td className="px-4 py-3">
                  {u.role === "ADMIN" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
                      <ShieldCheck size={10} />
                      ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-500/20">
                      COMUM
                    </span>
                  )}
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 size={14} /> Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <XCircle size={14} /> Inativo
                    </span>
                  )}
                </td>
                {/* Servidor */}
                <td className="px-4 py-3 text-foreground-muted">
                  {u.servidor ? (
                    <span title={`${u.servidor.cargo} — ${u.servidor.lotacao}`}>
                      {u.servidor.nome}
                    </span>
                  ) : (
                    <span className="text-slate-600 italic">Não vinculado</span>
                  )}
                </td>
                {/* Ações */}
                <td className="px-4 py-3 text-center">
                  {u.id === currentUser?.id ? (
                    <span className="text-xs text-slate-600 italic">Você</span>
                  ) : u.is_active ? (
                    <button
                      onClick={() => handleDesativar(u.id)}
                      disabled={desativando === u.id}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      title="Desativar acesso"
                    >
                      {desativando === u.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <UserX size={13} />
                      )}
                      Desativar
                    </button>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <ConcederAcessoModal
          servidores={servidores}
          onClose={() => setShowModal(false)}
          onSuccess={(novoUser) => setUsuarios((prev) => [novoUser, ...prev])}
        />
      )}
    </div>
  );
}

// ── Aba: Logs de Auditoria ───────────────────────────────────────────────

function AbaAuditoria() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 100;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditoriaLogs(0, LIMIT);
      setLogs(data.items);
      setTotal(data.total);
    } catch {
      setError("Falha ao carregar logs de auditoria.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-red-400">
        <AlertCircle size={18} /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Exibindo {logs.length} de {total} registros (mais recentes primeiro)
        </p>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 text-sm text-foreground-muted">
          <ScrollText size={24} className="opacity-40" />
          Nenhuma ação registrada ainda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background-card">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border/60 bg-slate-50 dark:bg-slate-900">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Usuário</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Ação</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Módulo</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">IP</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Rota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground-muted">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {log.user_email ?? <span className="italic text-slate-500">Sistema</span>}
                    </td>
                    <td className="px-4 py-2.5">{acaoBadge(log.acao)}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {(log.rota?.includes("/projetos/servidores") || log.rota?.includes("/equipe"))
                        ? "Equipe"
                        : log.entidade}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground-muted">
                      {log.ip_address ?? "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 font-mono text-xs text-slate-500" title={log.rota ?? ""}>
                      {log.rota ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────

type Tab = "acessos" | "auditoria";

function AdminPageContent() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab;
  const activeTab = (tabParam === "acessos" || tabParam === "auditoria") ? tabParam : "acessos";

  // Guard: redireciona não-admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const headerIcon = activeTab === "acessos" ? <Users size={22} /> : <ScrollText size={22} />;
  const headerTitle = activeTab === "acessos" ? "Acessos do Sistema" : "Logs de Auditoria";
  const headerDesc = activeTab === "acessos"
    ? "Gestão de privilégios e permissões de usuários"
    : "Trilha de auditoria e rastreabilidade de operações";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          {headerIcon}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{headerTitle}</h1>
          <p className="text-sm text-foreground-muted">
            {headerDesc}
          </p>
        </div>
        {/* Admin badge */}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <ShieldCheck size={12} />
          Área Restrita — ADMIN
        </span>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "acessos" && <AbaAcessos />}
        {activeTab === "auditoria" && <AbaAuditoria />}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-primary" />
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
