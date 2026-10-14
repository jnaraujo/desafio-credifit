import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	createFuncionario201ResponseSchema,
	createFuncionarioBodySchema,
} from "@/schemas/funcionarios";
import { createFuncionario } from "@/services/funcionarios";

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
}
