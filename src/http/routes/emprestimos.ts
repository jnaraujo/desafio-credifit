import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { EmprestimoNotFoundError } from "@/errors/emprestimo-not-found-error";
import { toEmprestimoResponse } from "@/http/mappers/emprestimos";
import {
	emprestimoResponseSchema,
	getEmprestimoParamsSchema,
	getEmprestimos200ResponseSchema,
	getEmprestimosQuerySchema,
	simulateEmprestimo200ResponseSchema,
	simulateEmprestimoBodySchema,
	solicitarEmprestimoBodySchema,
} from "@/schemas/emprestimos";
import {
	getEmprestimoById,
	listEmprestimos,
	simulateEmprestimo,
	solicitarEmprestimo,
} from "@/services/emprestimos";

/** Rotas de simulação, solicitação e consulta de empréstimos. */
export function emprestimosRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		"/",
		{
			schema: {
				body: solicitarEmprestimoBodySchema,
				response: {
					201: emprestimoResponseSchema,
				},
			},
		},
		async (req, reply) => {
			const record = await solicitarEmprestimo(req.body);
			return reply.status(201).send(toEmprestimoResponse(record));
		},
	);

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

	app.withTypeProvider<ZodTypeProvider>().get(
		"/",
		{
			schema: {
				querystring: getEmprestimosQuerySchema,
				response: { 200: getEmprestimos200ResponseSchema },
			},
		},
		async (req, reply) => {
			const records = await listEmprestimos(req.query);
			return reply.status(200).send({
				data: records.map(toEmprestimoResponse),
			});
		},
	);

	app.withTypeProvider<ZodTypeProvider>().get(
		"/:emprestimoId",
		{
			schema: {
				params: getEmprestimoParamsSchema,
				response: { 200: emprestimoResponseSchema },
			},
		},
		async (req, reply) => {
			const record = await getEmprestimoById(req.params.emprestimoId);
			if (!record) {
				throw new EmprestimoNotFoundError();
			}

			return reply.status(200).send(toEmprestimoResponse(record));
		},
	);
}
