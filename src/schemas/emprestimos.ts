import { z } from "zod";
import { NUMERO_MAXIMO_PARCELAS } from "@/constants/emprestimos";

export const statusEmprestimoSchema = z.enum([
	"aprovado",
	"rejeitado",
	"erro_processamento",
]);

export const simulateEmprestimoBodySchema = z.object({
	funcionarioId: z
		.string()
		.uuid({ message: "ID do funcionário precisa ser um UUID válido" }),
	valorSolicitado: z
		.number()
		.finite()
		.min(0.01, { message: "Valor solicitado precisa ser no mínimo 0,01" }),
});

export type SimulateEmprestimoBody = z.infer<
	typeof simulateEmprestimoBodySchema
>;

export const solicitarEmprestimoBodySchema = z.object({
	funcionarioId: z
		.string()
		.uuid({ message: "ID do funcionário precisa ser um UUID válido" }),
	valorSolicitado: z
		.number()
		.finite()
		.min(0.01, { message: "Valor solicitado precisa ser no mínimo 0,01" }),
	numeroParcelas: z.number().int().min(1).max(NUMERO_MAXIMO_PARCELAS),
});

export type SolicitarEmprestimoBody = z.infer<
	typeof solicitarEmprestimoBodySchema
>;

export const simulateEmprestimo200ResponseSchema = z.object({
	funcionarioId: z.string().uuid(),
	valorSolicitado: z.number().finite(),
	margemDisponivel: z.number().finite(),
	parcelas: z.array(
		z.object({
			numeroParcelas: z.number().int().min(1).max(NUMERO_MAXIMO_PARCELAS),
			valorParcela: z.number().finite(),
		}),
	),
});

export const emprestimoResponseSchema = z.object({
	id: z.string().uuid(),
	funcionarioId: z.string().uuid(),
	valorSolicitado: z.number().finite(),
	numeroParcelas: z.number().int().min(1).max(NUMERO_MAXIMO_PARCELAS),
	valorParcela: z.number().finite(),
	status: statusEmprestimoSchema,
	motivoRejeicao: z.string().nullable(),
	parcelas: z.array(
		z.object({
			numero: z.number().int().min(1),
			valor: z.number().finite(),
			dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		}),
	),
	createdAt: z.string().datetime(),
});

export const getEmprestimosQuerySchema = z.object({
	funcionarioId: z.string().uuid().optional(),
	status: statusEmprestimoSchema.optional(),
});

export const getEmprestimoParamsSchema = z.object({
	emprestimoId: z.string().uuid(),
});

export const getEmprestimos200ResponseSchema = z.object({
	data: z.array(emprestimoResponseSchema),
});
