import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

/** Rotas de funcionários, autorização e consulta de margem. */
export function funcionariosRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().get("/", {}, async (req, reply) => {
		return reply.status(200).send([]);
	});
}
