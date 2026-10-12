import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

/** Rotas de simulação, solicitação e consulta de empréstimos. */
export function emprestimosRoutes(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().get("/", {}, async (req, reply) => {
		return reply.status(200).send([]);
	});
}
