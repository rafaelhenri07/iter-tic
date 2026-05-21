/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod v4 para Projeto
 * Espelha as regras do Pydantic no backend (ProjetoCreate)
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";

const RE_PROCESSO_SEI = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;

/* ── Schema de criação ─────────────────────────────────────────────────── */

export const projetoCreateSchema = z
  .object({
    /* Dados Básicos */
    nome: z
      .string({ error: "Nome do projeto é obrigatório." })
      .min(1, "Nome não pode ser vazio.")
      .max(500, "Nome deve ter no máximo 500 caracteres."),

    processo_sei: z
      .string({ error: "Processo SEI é obrigatório." })
      .min(1, "Processo SEI não pode ser vazio.")
      .regex(
        RE_PROCESSO_SEI,
        "Formato inválido. Use NNNNN-NNNNNNNN/YYYY-NN (ex: 00052-00032300/2024-09)."
      ),

    /* Flag de projeto legado */
    is_legado: z.boolean(),

    /* Classificação — opcionais para projetos legados */
    prioridade: z
      .enum(["baixa", "media", "alta"])
      .optional()
      .nullable(),

    complexidade: z
      .enum(["Simples", "Intermediária", "Complexa"])
      .optional()
      .nullable(),

    /* Equipe — Titulares */
    integrantes_requisitantes_ids: z.array(z.number().int()),
    integrantes_tecnicos_ids: z.array(z.number().int()),
    integrantes_administrativos_ids: z.array(z.number().int()),

    /* Equipe — Substitutos */
    substitutos_requisitantes_ids: z.array(z.number().int()),
    substitutos_tecnicos_ids: z.array(z.number().int()),
    substitutos_administrativos_ids: z.array(z.number().int()),

    /* Planejamento Estratégico (listas — default [] no form) */
    acoes_pdtic_ids: z.array(z.number().int()),
    itens_pacc_ids: z.array(z.number().int()),
    observacoes: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Para projetos NÃO legados, prioridade e complexidade são obrigatórios
    if (!data.is_legado) {
      if (!data.prioridade) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione a prioridade.",
          path: ["prioridade"],
        });
      }
      if (!data.complexidade) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione a complexidade.",
          path: ["complexidade"],
        });
      }
    }
  });

export type ProjetoCreateFormData = z.infer<typeof projetoCreateSchema>;

/* ── Limpeza de payload para envio à API ─────────────────────────────── */

export function cleanProjetoPayload(
  data: ProjetoCreateFormData
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data };

  // Equipe é garantida de ser array por default no zod

  // Para legados, nullifica classificação se não definida
  if (data.is_legado) {
    if (!cleaned.prioridade) cleaned.prioridade = null;
    if (!cleaned.complexidade) cleaned.complexidade = null;
  }

  // Limpar strings vazias → null
  if (cleaned.observacoes === "") {
    cleaned.observacoes = null;
  }

  return cleaned;
}
