import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	simulateEmprestimo200ResponseSchema,
	simulateEmprestimoBodySchema,
} from "@/schemas/emprestimos";
import { simulateEmprestimo } from "@/services/emprestimos";

/** Rotas de simulação, solicitação e consulta de empréstimos. */
export function emprestimosRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		"/simular",
		{
			schema: {
				body: simulateEmprestimoBodySchema,
				response: {
					200: simulateEmprestimo200ResponseSchema,
				},
			},
		},
		async (req, reply) => {
			const simulacao = await simulateEmprestimo(req.body);
			return reply.status(200).send({
				funcionarioId: simulacao.funcionarioId,
				valorSolicitado: simulacao.valorSolicitado.toNumber(),
				margemDisponivel: simulacao.margemDisponivel.toNumber(),
				parcelas: simulacao.parcelas.map((parcela) => ({
					numeroParcelas: parcela.numeroParcelas,
					valorParcela: parcela.valorParcela.toNumber(),
				})),
			});
		},
	);

	app.withTypeProvider<ZodTypeProvider>().get("/", {}, async (req, reply) => {
		return reply.status(200).send([]);
	});
}
