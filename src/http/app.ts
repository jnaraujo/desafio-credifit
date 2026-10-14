import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyError } from "fastify";
import fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	hasZodFastifySchemaValidationErrors,
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import { CadastroDuplicateError } from "@/errors/cadastro-duplicate-error";
import { EmpresaNotFoundError } from "@/errors/empresa-not-found-error";
import { FuncionarioNotFoundError } from "@/errors/funcionario-not-found-error";
import {
	AutorizacaoConsultaRequiredError,
	DataprevUnavailableError,
	EmpresaNotEnabledError,
} from "@/errors/margem-errors";
import { registerRoutesV1 } from "@/http/routes/route";

declare module "fastify" {
	interface FastifyRequest {
		startTime: bigint;
	}
}

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

	const isProductionEnvironment = process.env.NODE_ENV === "production";

	if (!isProductionEnvironment) {
		app.register(fastifySwagger, {
			openapi: {
				info: {
					title: "Desafio Credifit API",
					description: "Docuentação da API do Desafio Credifit",
					version: "1.0.0",
				},
				servers: [
					{
						url: "http://localhost:3001",
						description: "Development server",
					},
				],
			},
			transform: jsonSchemaTransform,
		});

		app.register(fastifySwaggerUi, {
			routePrefix: "/swagger",
		});
	}

	await app.register(registerRoutesV1);

	return app;
}
