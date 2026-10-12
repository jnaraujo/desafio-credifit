import type { FastifyPluginAsync } from "fastify";
import { empresasRoutes } from "@/http/routes/empresas";
import { emprestimosRoutes } from "@/http/routes/emprestimos";
import { funcionariosRoutes } from "@/http/routes/funcionarios";

export const registerRoutesV1: FastifyPluginAsync = async (app) => {
	await app.register(empresasRoutes, {
		prefix: "/empresas",
	});
	await app.register(funcionariosRoutes, {
		prefix: "/funcionarios",
	});
	await app.register(emprestimosRoutes, {
		prefix: "/emprestimos",
	});
};
