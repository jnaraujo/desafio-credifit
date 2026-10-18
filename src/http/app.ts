import type { FastifyError } from "fastify";
import fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	hasZodFastifySchemaValidationErrors,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import { CadastroDuplicateError } from "@/errors/cadastro-duplicate-error";
import { EmpresaNotFoundError } from "@/errors/empresa-not-found-error";
import { EmprestimoNotFoundError } from "@/errors/emprestimo-not-found-error";
import { FuncionarioNotFoundError } from "@/errors/funcionario-not-found-error";
import {
	AutorizacaoConsultaRequiredError,
	DataprevUnavailableError,
	EmpresaNotEnabledError,
	MargemInsuficienteError,
} from "@/errors/margem-errors";
import { registerRoutesV1 } from "@/http/routes/route";

export async function createApp() {
	const app = fastify().withTypeProvider<ZodTypeProvider>();

	app.setErrorHandler((error: FastifyError, _, reply) => {
		if (hasZodFastifySchemaValidationErrors(error)) {
			return reply.status(400).send({
				message: "Dados inválidos",
				details: {
					fields: error.validation.map((issue) => ({
						field: issue.params.issue.path.join("."),
						message: issue.message,
					})),
				},
			});
		}

		if (error instanceof CadastroDuplicateError) {
			return reply.status(409).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof EmpresaNotFoundError) {
			return reply.status(404).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof FuncionarioNotFoundError) {
			return reply.status(404).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof EmprestimoNotFoundError) {
			return reply.status(404).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof AutorizacaoConsultaRequiredError) {
			return reply.status(403).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof EmpresaNotEnabledError) {
			return reply.status(422).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof DataprevUnavailableError) {
			return reply.status(502).send({
				message: error.message,
				details: {},
			});
		}

		if (error instanceof MargemInsuficienteError) {
			return reply.status(400).send({
				message: error.message,
				details: {},
			});
		}

		const statusCode = error.statusCode || 500;
		const safeMessage =
			statusCode >= 500
				? "An internal error occurred"
				: error.message || "An error occurred";

		reply.status(statusCode).send({
			statusCode,
			error: statusCode >= 500 ? "Internal Server Error" : "Error",
			message: safeMessage,
		});
	});

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	await app.register(registerRoutesV1);

	return app;
}
