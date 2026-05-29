/* ──────────────────────────────────────────────────────────────────────────
 * ITER TIC — Schema de validação Zod para Contrato
 * Espelha as regras do Pydantic no backend (ContratoCreate)
 *
 * Equipe de Fiscalização: cada papel aceita 1 titular_id + N substitutos_ids.
 * ────────────────────────────────────────────────────────────────────────── */

import { z } from "zod";



/* ── Sub-schema: Itens do contrato ────────────── */

const itemContratoSchema = z.object({
  quantidade: z
    .number({ error: "Quantidade é obrigatória." })
    .int("Deve ser inteiro.")
    .min(1, "Mínimo 1."),
  valor_unitario: z
    .number({ error: "Valor unitário é obrigatório." })
    .min(0, "Não pode ser negativo."),
  tipo_catalogo: z.enum(["CATMAT", "CATSER", ""]).optional().or(z.literal(null)),
  codigo_catalogo: z.string().optional().or(z.literal(null)),
  catalogo_produto_id: z.number({ error: "Item do catálogo é obrigatório." }).min(1, "Item do catálogo é obrigatório."),
  data_inicio_vigencia: z.string().optional().or(z.literal("")).nullable(),
  data_fim_vigencia: z.string().optional().or(z.literal("")).nullable(),
});

/* ── Sub-schema: um papel da equipe (titular + substitutos) ────────────── */

const equipePapelSchema = z.object({
  titulares_ids: z.array(z.number().int()).default([]),
  substitutos_ids: z.array(z.number().int()).default([]),
});

const equipeSchema = z.object({
  gestor: equipePapelSchema.default({ titulares_ids: [], substitutos_ids: [] }),
  fiscal_requisitante: equipePapelSchema.default({ titulares_ids: [], substitutos_ids: [] }),
  fiscal_tecnico: equipePapelSchema.default({ titulares_ids: [], substitutos_ids: [] }),
  fiscal_administrativo: equipePapelSchema.default({ titulares_ids: [], substitutos_ids: [] }),
});

/* ── Schema principal ──────────────────────────────────────────────────── */

export const contratoCreateSchema = z
  .object({
    /* Projeto de Origem */
    projeto_id: z
      .number({ error: "Selecione o projeto de origem." })
      .int()
      .min(1, "Selecione um projeto válido."),

    /* Modalidade da Contratação */
    modalidade_contrato: z.enum(["CONTRATO", "ARP"]).default("CONTRATO"),

    /* Tipo de Contratação */
    tipo_contratacao: z.string({ error: "Selecione o tipo de contratação." }).min(1, "Selecione o tipo de contratação."),

    /* Dados da Contratação */
    numero: z.coerce.number().int().positive("Número deve ser maior que 0."),
    ano: z.coerce.number().int().min(2015, "Ano inválido.").max(2035, "Ano inválido."),

    /* Tipo de Instrumento (obrigatório para CONTRATO) */
    tipo_instrumento: z.enum(["CONTRATO", "NOTA_EMPENHO"]).optional().nullable(),

    fornecedor_id: z
      .number()
      .int()
      .optional()
      .or(z.literal(0)),

    tipo_fornecedor_contrato: z
      .enum(["REVENDEDOR", "FABRICANTE", "REVENDEDOR_E_FABRICANTE", ""])
      .optional()
      .or(z.literal(null)),

    tipo_contrato: z.enum(
      ["Aquisição", "Serviço continuado", "Subscrição"],
      { error: "Selecione o tipo de contrato." }
    ),

    /* Itens da Contratação */
    itens: z
      .array(itemContratoSchema)
      .min(1, "Adicione pelo menos um item à contratação."),

    /* Vigência */
    data_inicio_vigencia: z
      .string()
      .optional()
      .or(z.literal("")),

    vigencia_meses: z
      .number()
      .int()
      .min(0)
      .optional()
      .nullable(),

    prorrogacao_meses: z
      .number()
      .int()
      .min(0)
      .max(120)
      .default(0),

    data_assinatura: z
      .string({ error: "Data de assinatura é obrigatória." })
      .min(1, "Data de assinatura é obrigatória."),

    data_fim_vigencia: z
      .string({ error: "Data de fim de vigência é obrigatória." })
      .min(1, "Data de fim é obrigatória."),

    situacao_atual: z.enum(
      ["Vigente", "Extinto", "Extinto, mas suporte vigente"],
      { error: "Selecione a situação." }
    ),


    /* Campo específico de ARP */
    orgao_gerenciador: z.string().max(300).optional().or(z.literal("")),

    /* Equipe de Fiscalização (novo formato: titular + substitutos) */
    equipe: equipeSchema.optional(),
  })
  .refine(
    (d) => {
      if (d.data_assinatura && d.data_fim_vigencia) {
        return d.data_fim_vigencia >= d.data_assinatura;
      }
      return true;
    },
    {
      message: "A data de fim de vigência deve ser posterior à data de assinatura.",
      path: ["data_fim_vigencia"],
    }
  )
  .refine(
    (d) => {
      // tipo_instrumento é obrigatório para modalidade CONTRATO
      if (d.modalidade_contrato === "CONTRATO") {
        return !!d.tipo_instrumento;
      }
      return true;
    },
    {
      message: "Selecione o tipo de instrumento.",
      path: ["tipo_instrumento"],
    }
  );

export type ContratoCreateFormData = z.infer<typeof contratoCreateSchema>;

/* ── Limpar payload antes de enviar para a API ─────────────────────────── */

export function cleanContratoPayload(
  data: ContratoCreateFormData
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clean: Record<string, any> = { ...data };

  // Converter fornecedor_id = 0 → null
  if (clean.fornecedor_id === 0) clean.fornecedor_id = null;

  // Converter tipo_fornecedor_contrato vazio → null
  if (!clean.tipo_fornecedor_contrato) clean.tipo_fornecedor_contrato = null;

  // Limpar campos de catálogo vazios nos itens
  if (clean.itens && Array.isArray(clean.itens)) {
    clean.itens = clean.itens.map((item: any) => ({
      ...item,
      tipo_catalogo: item.tipo_catalogo === "" ? null : item.tipo_catalogo,
      codigo_catalogo: item.codigo_catalogo === "" ? null : item.codigo_catalogo,
      catalogo_produto_id: item.catalogo_produto_id === 0 || item.catalogo_produto_id === "" ? null : item.catalogo_produto_id,
      data_inicio_vigencia: item.data_inicio_vigencia === "" ? null : item.data_inicio_vigencia,
      data_fim_vigencia: item.data_fim_vigencia === "" ? null : item.data_fim_vigencia,
    }));
  }

  // Limpar strings vazias → null
  for (const key of ["data_inicio_vigencia"]) {
    if (clean[key] === "") clean[key] = null;
  }

  // orgao_gerenciador: limpar se CONTRATO ou vazio
  if (clean.modalidade_contrato !== "ARP" || !clean.orgao_gerenciador) {
    clean.orgao_gerenciador = null;
  }

  // tipo_instrumento: limpar se ARP
  if (clean.modalidade_contrato === "ARP") {
    clean.tipo_instrumento = null;
  }

  // vigencia_meses 0 ou undefined → null
  if (!clean.vigencia_meses) clean.vigencia_meses = null;

  // Transformar equipe: filtrar IDs inválidos
  if (clean.equipe) {
    const equipeLimpa: Record<string, unknown> = {};
    for (const papel of [
      "gestor",
      "fiscal_requisitante",
      "fiscal_tecnico",
      "fiscal_administrativo",
    ]) {
      const p = clean.equipe[papel];
      if (p) {
        equipeLimpa[papel] = {
          titulares_ids: (p.titulares_ids || []).filter(
            (id: number) => id > 0
          ),
          substitutos_ids: (p.substitutos_ids || []).filter(
            (id: number) => id > 0
          ),
        };
      }
    }
    clean.equipe = equipeLimpa;
  }

  return clean;
}
