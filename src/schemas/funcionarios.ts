import { z } from "zod";
import { cpfSchema } from "./pessoas";

export const createFuncionarioBodySchema = z.object({
	nomeCompleto: z.string().min(1, { message: "Nome é obrigatório" }),
	cpf: cpfSchema,
	email: z.string().email({ message: "Email inválido" }),
	senha: z
		.string()
		.min(8, { message: "Senha precisa ter no mínimo 8 caracteres" }),
	empresaId: z
		.string()
		.uuid({ message: "ID da empresa precisa ser um UUID válido" }),
	salario: z
		.number()
		.min(0.01, { message: "Salário precisa ser no mínimo 0,01" }),
});

export type CreateFuncionarioBody = z.infer<typeof createFuncionarioBodySchema>;

export const createFuncionario201ResponseSchema = z.object({
	id: z.string().uuid({ message: "ID precisa ser um UUID válido" }),
	nomeCompleto: z.string().min(1, { message: "Nome é obrigatório" }),
	cpf: cpfSchema,
	email: z.string().email({ message: "Email inválido" }),
	salario: z
		.number()
		.min(0.01, { message: "Salário precisa ser no mínimo 0,01" }),
	empresaId: z
		.string()
		.uuid({ message: "ID da empresa precisa ser um UUID válido" }),
	createdAt: z.string().datetime({ message: "Data de criação inválida" }),
});

export const createFuncionarioAutorizacaoConsultaParamsSchema = z.object({
	funcionarioId: z
		.string()
		.uuid({ message: "ID do funcionário precisa ser um UUID válido" }),
});

export const createFuncionarioAutorizacaoConsulta200ResponseSchema = z.object({
	funcionarioId: z
		.string()
		.uuid({ message: "ID do funcionário precisa ser um UUID válido" }),
	autorizado: z.boolean(),
	expiraEm: z.string().datetime({ message: "Data de expiração inválida" }),
});
