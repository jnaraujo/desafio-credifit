import { z } from "zod";
import { NUMERO_MAXIMO_PARCELAS } from "@/constants/emprestimos";

export const simulateEmprestimoBodySchema = z.object({
	funcionarioId: z
		.string()
		.uuid({ message: "ID do funcionário precisa ser um UUID válido" }),
	valorSolicitado: z
		.number()
		.min(0.01, { message: "Valor solicitado precisa ser no mínimo 0,01" }),
});

export type SimulateEmprestimoBody = z.infer<
	typeof simulateEmprestimoBodySchema
>;

export const simulateEmprestimo200ResponseSchema = z.object({
	funcionarioId: z.string().uuid(),
	valorSolicitado: z.number(),
	margemDisponivel: z.number(),
	parcelas: z.array(
		z.object({
			numeroParcelas: z.number().int().min(1).max(NUMERO_MAXIMO_PARCELAS),
			valorParcela: z.number(),
		}),
	),
});
