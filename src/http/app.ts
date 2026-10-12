import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyError } from "fastify";
import fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import { registerRoutesV1 } from "@/http/routes/route";

declare module "fastify" {
	interface FastifyRequest {
		startTime: bigint;
	}
}

export async function createApp() {
	const app = fastify().withTypeProvider<ZodTypeProvider>();

	app.setErrorHandler((error: FastifyError, _, reply) => {
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
