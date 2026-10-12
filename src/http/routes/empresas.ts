import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

/** Rotas de cadastro e consulta de empresas conveniadas. */
export function empresasRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().get("/", {}, async (req, reply) => {
		return reply.status(200).send([]);
	});
}
