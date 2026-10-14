import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	createEmpresa201ResponseSchema,
	createEmpresaBodySchema,
} from "@/schemas/empresas";
import { createEmpresa } from "@/services/empresas";

/** Rotas de cadastro e consulta de empresas conveniadas. */
export function empresasRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		"/",
		{
			schema: {
				body: createEmpresaBodySchema,
				response: {
					201: createEmpresa201ResponseSchema,
				},
			},
		},
		async (req, reply) => {
			const empresa = await createEmpresa(req.body);

			return reply.status(201).send({
				id: empresa.id,
				cnpj: empresa.cnpj,
				razaoSocial: empresa.razaoSocial,
				nomeRepresentante: empresa.representante.nomeCompleto,
				cpfRepresentante: empresa.representante.cpf,
				email: empresa.representante.email,
				createdAt: empresa.createdAt.toISOString(),
			});
		},
	);
}
