import { z } from "zod";

const contatoSchema = z.object({
  nome: z.string().min(1, "Nome do contato é obrigatório."),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  cargo: z.string().optional().or(z.literal("")),
});

export const fornecedorCreateSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)."),
  natureza: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"], {
    message: "Selecione a natureza."
  }),
  documento: z.string().optional().or(z.literal("")),
  site: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  contatos: z.array(contatoSchema).default([]),
  portfolio_ids: z.array(z.number().int()).default([]),
});

export type FornecedorFormData = z.infer<typeof fornecedorCreateSchema>;

export function cleanFornecedorPayload(data: FornecedorFormData): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...data };

  // Limpar strings vazias → null
  for (const key of ["documento", "site", "email", "telefone"]) {
    if ((clean[key] as string) === "") clean[key] = null;
  }

  // Limpar contatos: remover campos vazios → null
  if (Array.isArray(clean.contatos)) {
    clean.contatos = (clean.contatos as Record<string, string>[]).map((c) => ({
      nome: c.nome,
      telefone: c.telefone || null,
      email: c.email || null,
      cargo: c.cargo || null,
    }));
  }

  return clean;
}
