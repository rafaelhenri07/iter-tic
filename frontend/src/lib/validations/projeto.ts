/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod v4 para Projeto
 * Espelha as regras do Pydantic no backend (ProjetoCreate)
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";

const RE_PROCESSO_SEI = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;

/* ── Schema de criação ─────────────────────────────────────────────────── */

export const projetoCreateSchema = z.object({
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

  prioridade: z.enum(["baixa", "media", "alta"], {
    error: "Selecione a prioridade.",
  }),

  complexidade: z.enum(["Simples", "Intermediária", "Complexa"], {
    error: "Selecione a complexidade.",
  }),

  /* Equipe */
  integrante_requisitante_id: z
    .number()
    .int()
    .optional()
    .or(z.literal(0)),

  integrante_tecnico_id: z
    .number()
    .int()
    .optional()
    .or(z.literal(0)),

  integrante_administrativo_id: z
    .number()
    .int()
    .optional()
    .or(z.literal(0)),

  /* Planejamento Estratégico (listas — default [] no form) */
  acoes_pdtic_ids: z.array(z.number().int()),
  itens_pacc_ids: z.array(z.number().int()),
});

export type ProjetoCreateFormData = z.infer<typeof projetoCreateSchema>;

/* ── Limpeza de payload para envio à API ─────────────────────────────── */

export function cleanProjetoPayload(
  data: ProjetoCreateFormData
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data };

  // Servidor IDs 0 → null (select não selecionado)
  if (!cleaned.integrante_requisitante_id)
    cleaned.integrante_requisitante_id = null;
  if (!cleaned.integrante_tecnico_id)
    cleaned.integrante_tecnico_id = null;
  if (!cleaned.integrante_administrativo_id)
    cleaned.integrante_administrativo_id = null;

  return cleaned;
}
