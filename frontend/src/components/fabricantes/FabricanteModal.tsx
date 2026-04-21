"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Fabricante, FabricantePayload } from "@/lib/api";

interface FabricanteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FabricantePayload) => Promise<void>;
  fabricante?: Fabricante | null;
}

const EMPTY: FabricantePayload = {
  nome: "",
  site: "",
  contato_nome: "",
  contato_cargo: "",
  contato_telefone1: "",
  contato_telefone2: "",
  contato_email: "",
};

export default function FabricanteModal({
  open,
  onClose,
  onSave,
  fabricante,
}: FabricanteModalProps) {
  const [form, setForm] = useState<FabricantePayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  const isEdit = !!fabricante;

  useEffect(() => {
    if (fabricante) {
      setForm({
        nome: fabricante.nome,
        site: fabricante.site ?? "",
        contato_nome: fabricante.contato_nome,
        contato_cargo: fabricante.contato_cargo,
        contato_telefone1: fabricante.contato_telefone1,
        contato_telefone2: fabricante.contato_telefone2 ?? "",
        contato_email: fabricante.contato_email,
      });
    } else {
      setForm(EMPTY);
    }
  }, [fabricante, open]);

  if (!open) return null;

  function set(field: keyof FabricantePayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? "Editar Fabricante" : "Novo Fabricante"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — Scroll form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
            {/* ── Seção 1: Dados da Empresa ─────────────────────── */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dados da Empresa
              </p>
              <div className="space-y-4">
                <Field
                  label="Nome do Fabricante"
                  value={form.nome}
                  onChange={(v) => set("nome", v)}
                  required
                  placeholder="Ex: Microsoft Informática Ltda"
                />
                <Field
                  label="Site"
                  value={form.site ?? ""}
                  onChange={(v) => set("site", v)}
                  placeholder="https://www.exemplo.com.br"
                />
              </div>
            </div>

            {/* ── Seção 2: Contato Principal ────────────────────── */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Contato Principal
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Nome do Contato"
                    value={form.contato_nome}
                    onChange={(v) => set("contato_nome", v)}
                    required
                    placeholder="Nome completo"
                  />
                  <Field
                    label="Cargo"
                    value={form.contato_cargo}
                    onChange={(v) => set("contato_cargo", v)}
                    required
                    placeholder="Ex: Gerente Comercial"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Telefone 1"
                    value={form.contato_telefone1}
                    onChange={(v) => set("contato_telefone1", v)}
                    required
                    placeholder="(61) 99999-0000"
                  />
                  <Field
                    label="Telefone 2"
                    value={form.contato_telefone2 ?? ""}
                    onChange={(v) => set("contato_telefone2", v)}
                    placeholder="Opcional"
                  />
                </div>
                <Field
                  label="E-mail"
                  value={form.contato_email}
                  onChange={(v) => set("contato_email", v)}
                  required
                  type="email"
                  placeholder="contato@fabricante.com.br"
                />
              </div>
            </div>
          </div>

          {/* Footer fixo */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Campo reutilizável ───────────────────────────────────────────────── */

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
    </div>
  );
}
