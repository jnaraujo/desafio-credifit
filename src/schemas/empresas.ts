import { z } from "zod";
import { cpfSchema } from "./pessoas";

export const cnpjSchema = z.string().regex(/^\d{14}$/, {
	message: "CNPJ precisa ter 14 dígitos numéricos",
});

export const createEmpresaBodySchema = z.object({
	cnpj: cnpjSchema,
	razaoSocial: z.string().min(1, { message: "Razão social é obrigatória" }),
	nomeRepresentante: z
		.string()
		.min(1, { message: "Nome do representante é obrigatório" }),
	cpfRepresentante: cpfSchema,
	email: z.string().email({ message: "Email inválido" }),
	senha: z
		.string()
		.min(8, { message: "Senha precisa ter no mínimo 8 caracteres" }),
});

export type CreateEmpresaBody = z.infer<typeof createEmpresaBodySchema>;

export const createEmpresa201ResponseSchema = z.object({
	id: z.string().uuid({ message: "ID precisa ser um UUID válido" }),
	cnpj: cnpjSchema,
	razaoSocial: z.string().min(1, { message: "Razão social é obrigatória" }),
	nomeRepresentante: z
		.string()
		.min(1, { message: "Nome do representante é obrigatório" }),
	cpfRepresentante: cpfSchema,
	email: z.string().email({ message: "Email inválido" }),
	createdAt: z.string().datetime({ message: "Data de criação inválida" }),
});
