"use client";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { Loader2, Save, Upload, Trash2, ShieldCheck } from "lucide-react";
import { useConfig } from "@/components/providers/ConfigProvider";
import { updateConfiguracao, type Configuracao } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";
import { FormField, inputCls } from "@/components/ui/FormField";

export default function ConfiguracoesPage() {
  const { config, refreshConfig } = useConfig();
  const [submitting, setSubmitting] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Configuracao>({
    defaultValues: {
      nome_orgao: "",
      cor_primaria: "#6366f1",
      logo_url: null,
    },
  });

  const corPrimaria = watch("cor_primaria");

  // Preenche o form quando a config carregar
  useEffect(() => {
    if (config) {
      setValue("nome_orgao", config.nome_orgao);
      setValue("cor_primaria", config.cor_primaria);
      setLogoBase64(config.logo_url);
    }
  }, [config, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoBase64(null);
  };

  const onSubmit = async (data: Configuracao) => {
    setSubmitting(true);
    try {
      const payload = {
        nome_orgao: data.nome_orgao,
        cor_primaria: data.cor_primaria,
        logo_url: logoBase64,
      };

      await updateConfiguracao(payload);
      await refreshConfig(); // Atualiza o layout
      showToast("success", "Configurações atualizadas com sucesso!");
    } catch (err) {
      showToast("error", "Erro ao salvar configurações.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Personalize a identidade visual e as preferências gerais da plataforma.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 self-start sm:self-center">
          <ShieldCheck size={12} />
          Área Restrita — ADMIN
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
        
        {/* ── Identidade Visual ─────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider mt-10 mb-6 border-b border-slate-200 pb-2 dark:border-slate-800">
            Identidade Visual
          </h3>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Nome do Órgão" error={errors.nome_orgao?.message} required>
              <input
                {...register("nome_orgao", { required: "Campo obrigatório" })}
                placeholder="Ex: Polícia Civil do Distrito Federal"
                className={inputCls}
                disabled={submitting}
              />
            </FormField>

            <FormField label="Cor Primária do Sistema" error={errors.cor_primaria?.message} required>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  {...register("cor_primaria", { required: "Campo obrigatório" })}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 p-1 dark:border-slate-700 bg-transparent"
                  disabled={submitting}
                />
                <input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setValue("cor_primaria", e.target.value)}
                  className={inputCls}
                  disabled={submitting}
                  placeholder="#Hexadecimal"
                />
              </div>
            </FormField>
          </div>

          <div className="mt-6">
            <FormField label="Logotipo do Órgão (Fundo Transparente)">
              <div className="mt-2 flex items-start gap-6">
                {/* Preview */}
                <div className="flex h-24 w-48 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 overflow-hidden relative group">
                  {logoBase64 ? (
                    <>
                      <img
                        src={logoBase64}
                        alt="Logotipo"
                        className="h-full w-full object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="p-2 text-white hover:text-red-400 transition-colors"
                          title="Remover Logo"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Sem Imagem</span>
                  )}
                </div>
                
                {/* Upload Action */}
                <div className="flex flex-col justify-center gap-2 pt-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    <Upload size={16} className="text-brand-primary" />
                    Escolher Arquivo
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={submitting}
                    />
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Recomendado: PNG ou SVG com fundo transparente. Máx 2MB.
                  </p>
                </div>
              </div>
            </FormField>
          </div>
        </div>

        {/* ── Footer Actions ────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6 mt-12 dark:border-slate-800">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-primary-hover focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
