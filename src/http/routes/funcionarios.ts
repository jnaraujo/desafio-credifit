import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	authorizeConsultaDataprev200ResponseSchema,
	authorizeConsultaDataprevParamsSchema,
	createFuncionario201ResponseSchema,
	createFuncionarioBodySchema,
} from "@/schemas/funcionarios";
import {
	authorizeConsultaDataprev,
	createFuncionario,
} from "@/services/funcionarios";

/** Rotas de funcionários, autorização e consulta de margem. */
export function funcionariosRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		"/",
		{
			schema: {
				body: createFuncionarioBodySchema,
				response: {
					201: createFuncionario201ResponseSchema,
				},
			},
		},
		async (req, reply) => {
			const funcionario = await createFuncionario(req.body);
			return reply.status(201).send({
				id: funcionario.id,
				nomeCompleto: funcionario.nome,
				cpf: funcionario.cpf,
				email: funcionario.email,
				salario: funcionario.salario,
				empresaId: funcionario.empresaId,
				createdAt: funcionario.createdAt.toISOString(),
			});
		},
	);

	app.withTypeProvider<ZodTypeProvider>().post(
		"/:funcionarioId/autorizacao-consulta",
		{
			schema: {
				params: authorizeConsultaDataprevParamsSchema,
				response: {
					200: authorizeConsultaDataprev200ResponseSchema,
				},
			},
		},
		async (req, reply) => {
			const autorizacao = await authorizeConsultaDataprev(
				req.params.funcionarioId,
			);

			return reply.status(200).send({
				funcionarioId: autorizacao.funcionarioId,
				autorizado: true,
				expiraEm: autorizacao.expiraEm.toISOString(),
			});
		},
	);
}
