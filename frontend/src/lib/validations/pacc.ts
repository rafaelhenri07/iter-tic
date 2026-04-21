/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod v4 para Item PACC
 * Espelha as regras do Pydantic no backend (PaccItemCreate / PaccItemUpdate)
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";

const RE_PROCESSO_SEI = /^\d{5}-\d{8}\/\d{4}-\d{2}$/;

/* ── Schema de criação ─────────────────────────────────────────────────── */

export const itemPaccCreateSchema = z.object({
  /* Ciclo de vida */
  exercicio_id: z
    .number({ error: "Exercício é obrigatório." })
    .int(),
  revisao_inclusao_id: z
    .number({ error: "Revisão de inclusão é obrigatória." })
    .int(),
  acao_pdtic_id: z
    .number({ error: "Ação PDTIC vinculada é obrigatória." })
    .int()
    .min(1, "Selecione uma Ação PDTIC."),

  /* Campos de negócio */
  numero_item: z
    .string({ error: "Número do item é obrigatório." })
    .min(1, "Número do item não pode ser vazio.")
    .max(20, "Número deve ter no máximo 20 caracteres."),

  descricao_demanda: z
    .string({ error: "Descrição da demanda é obrigatória." })
    .min(1, "Descrição não pode ser vazia."),

  quantidade: z
    .string({ error: "Quantidade é obrigatória." })
    .min(1, "Quantidade não pode ser vazia.")
    .max(100, "Quantidade deve ter no máximo 100 caracteres."),

  valor_estimado: z
    .number({ error: "Valor estimado é obrigatório." })
    .min(0, "Valor estimado não pode ser negativo."),

  processo_sei: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val) return true;
        const parts = val.split(/[,\s;]+/).filter((p) => p.trim() !== "");
        return parts.every((p) => RE_PROCESSO_SEI.test(p));
      },
      {
        message: "Formato inválido. Use NNNNN-NNNNNNNN/YYYY-NN.",
      }
    ),
});

export type ItemPaccCreateFormData = z.infer<typeof itemPaccCreateSchema>;

/* ── Schema de edição (campos de negócio — sem ciclo de vida) ──────────── */

export const itemPaccUpdateSchema = z.object({
  numero_item: z
    .string()
    .min(1, "Número do item não pode ser vazio.")
    .max(20, "Número deve ter no máximo 20 caracteres."),

  descricao_demanda: z
    .string()
    .min(1, "Descrição não pode ser vazia."),

  quantidade: z
    .string()
    .min(1, "Quantidade não pode ser vazia.")
    .max(100),

  valor_estimado: z
    .number({ error: "Valor estimado é obrigatório." })
    .min(0, "Valor estimado não pode ser negativo."),

  processo_sei: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val) return true;
        const parts = val.split(/[,\s;]+/).filter((p) => p.trim() !== "");
        return parts.every((p) => RE_PROCESSO_SEI.test(p));
      },
      {
        message: "Formato inválido. Use NNNNN-NNNNNNNN/YYYY-NN.",
      }
    ),

  acao_pdtic_id: z
    .number({ error: "Ação PDTIC vinculada é obrigatória." })
    .int()
    .min(1, "Selecione uma Ação PDTIC."),
});

export type ItemPaccUpdateFormData = z.infer<typeof itemPaccUpdateSchema>;

/* ── Limpeza de payload ────────────────────────────────────────────────── */

export function cleanItemPaccPayload(
  data: ItemPaccCreateFormData | ItemPaccUpdateFormData
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data };

  // processo_sei vazio → null
  if (cleaned.processo_sei === "" || cleaned.processo_sei === undefined) {
    cleaned.processo_sei = null;
  }

  return cleaned;
}
