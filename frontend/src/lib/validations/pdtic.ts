/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod v4 para Ação PDTIC
 * Espelha as regras do Pydantic no backend (PdticAcaoCreate)
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";



export const acaoPdticSchema = z.object({
  /* ── Campos de ciclo de vida ────────────────────────────────────────── */
  periodo_id: z
    .number({ error: "Período é obrigatório." })
    .int(),
  revisao_inclusao_id: z
    .number({ error: "Revisão de inclusão é obrigatória." })
    .int(),

  /* ── Identificação ──────────────────────────────────────────────────── */
  codigo_acao: z
    .string({ error: "Código é obrigatório." })
    .min(1, "Código não pode ser vazio.")
    .max(20, "Código deve ter no máximo 20 caracteres."),

  departamentos_ids: z
    .array(z.number().int())
    .min(1, "Selecione ao menos um departamento."),

  unidades_demandantes_ids: z
    .array(z.number().int())
    .min(1, "Selecione ao menos uma unidade demandante."),

  unidades_responsaveis_ids: z
    .array(z.number().int())
    .min(1, "Selecione ao menos uma unidade responsável."),

  necessidade: z
    .string({ error: "Necessidade é obrigatória." })
    .min(1, "Necessidade não pode ser vazia.")
    .max(20),

  descricao: z
    .string({ error: "Descrição é obrigatória." })
    .min(1, "Descrição não pode ser vazia."),

  /* ── Classificação ──────────────────────────────────────────────────── */
  tipo_necessidade: z.array(z.enum(
    ["hardware", "software", "servico", "comunicacao", "capacitacao", "outros"]
  )).min(1, "Selecione ao menos um tipo de necessidade."),

  status: z.enum(
    [
      "Não iniciada",
      "Em andamento",
      "Contratada",
    ],
    { error: "Status é obrigatório." }
  ),

  /* ── Detalhes opcionais ─────────────────────────────────────────────── */
  meta: z.string().max(500).optional().or(z.literal("")),
  indicador: z.string().max(500).optional().or(z.literal("")),
  quantidade: z.string().max(100).optional().or(z.literal("")),

  /* ── GUT ─────────────────────────────────────────────────────────────── */
  total_gut: z
    .number({ error: "Total GUT é obrigatório." })
    .int("GUT deve ser um número inteiro.")
    .min(0, "GUT mínimo é 0.")
    .max(125, "GUT máximo é 125."),

  /* ── Previsões (ISO date: YYYY-MM-DD) ─────────────────────────────────── */
  previsao_contratacao: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM.")
    .optional()
    .or(z.literal("")),

  previsao_renovacao: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM.")
    .optional()
    .or(z.literal("")),

  /* ── Valores financeiros por ano ────────────────────────────────────── */
  valores_investimento: z.record(
    z.string().regex(/^\d{4}$/, "Chave deve ser um ano YYYY."),
    z.number().min(0, "Valor não pode ser negativo.")
  ).optional(),

  valores_custeio: z.record(
    z.string().regex(/^\d{4}$/, "Chave deve ser um ano YYYY."),
    z.number().min(0, "Valor não pode ser negativo.")
  ).optional(),
});

export type AcaoPdticFormData = z.infer<typeof acaoPdticSchema>;

/**
 * Limpa os campos opcionais vazios antes de enviar para a API.
 * Converte strings vazias em null/undefined.
 */
export function cleanPayload(data: AcaoPdticFormData): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data };

  // Strings opcionais → null se vazias
  for (const key of [
    "meta",
    "indicador",
    "quantidade",
  ]) {
    if (cleaned[key] === "" || cleaned[key] === undefined) {
      cleaned[key] = null;
    }
  }

  // Datas: converter para null se vazio/undefined
  for (const key of ["previsao_contratacao", "previsao_renovacao"]) {
    if (!cleaned[key]) {
      cleaned[key] = null;
    }
  }

  // Objetos financeiros → null se vazios
  for (const key of ["valores_investimento", "valores_custeio"]) {
    const val = cleaned[key] as Record<string, number> | undefined;
    if (!val || Object.keys(val).length === 0) {
      cleaned[key] = null;
    }
  }

  return cleaned;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Schema para EDIÇÃO (PdticAcaoUpdate — campos de negócio opcionais)
 * ────────────────────────────────────────────────────────────────────────── */

export const acaoPdticUpdateSchema = z.object({
  codigo_acao: z
    .string()
    .min(1, "Código não pode ser vazio.")
    .max(20, "Código deve ter no máximo 20 caracteres."),

  departamentos_ids: z.array(z.number().int()).min(1, "Selecione ao menos um departamento."),
  unidades_demandantes_ids: z.array(z.number().int()).min(1, "Selecione ao menos uma unidade demandante."),
  unidades_responsaveis_ids: z.array(z.number().int()).min(1, "Selecione ao menos uma unidade responsável."),
  necessidade: z.string().min(1, "Necessidade não pode ser vazia.").max(20),
  descricao: z.string().min(1, "Descrição não pode ser vazia."),

  tipo_necessidade: z.array(z.enum(
    ["hardware", "software", "servico", "comunicacao", "capacitacao", "outros"]
  )).min(1, "Selecione ao menos um tipo de necessidade."),

  status: z.enum(
    ["Não iniciada", "Em andamento", "Contratada"],
    { error: "Status é obrigatório." }
  ),

  meta: z.string().max(500).optional().or(z.literal("")),
  indicador: z.string().max(500).optional().or(z.literal("")),
  quantidade: z.string().max(100).optional().or(z.literal("")),

  total_gut: z
    .number({ error: "Total GUT é obrigatório." })
    .int("GUT deve ser um número inteiro.")
    .min(0, "GUT mínimo é 0.")
    .max(125, "GUT máximo é 125."),

  previsao_contratacao: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM.")
    .optional()
    .or(z.literal("")),

  previsao_renovacao: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Formato inválido. Use YYYY-MM.")
    .optional()
    .or(z.literal("")),

  valores_investimento: z.record(
    z.string().regex(/^\d{4}$/, "Chave deve ser um ano YYYY."),
    z.number().min(0, "Valor não pode ser negativo.")
  ).optional(),

  valores_custeio: z.record(
    z.string().regex(/^\d{4}$/, "Chave deve ser um ano YYYY."),
    z.number().min(0, "Valor não pode ser negativo.")
  ).optional(),
});

export type AcaoPdticUpdateFormData = z.infer<typeof acaoPdticUpdateSchema>;

export function cleanUpdatePayload(data: AcaoPdticUpdateFormData): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data };

  for (const key of ["meta", "indicador", "quantidade"]) {
    if (cleaned[key] === "" || cleaned[key] === undefined) {
      cleaned[key] = null;
    }
  }

  // Datas: converter para null se vazio/undefined
  for (const key of ["previsao_contratacao", "previsao_renovacao"]) {
    if (!cleaned[key]) {
      cleaned[key] = null;
    }
  }

  for (const key of ["valores_investimento", "valores_custeio"]) {
    const val = cleaned[key] as Record<string, number> | undefined;
    if (!val || Object.keys(val).length === 0) {
      cleaned[key] = null;
    }
  }

  return cleaned;
}
