import type { FastifyInstance } from "fastify";
import { expect } from "vitest";
import type { CreateFuncionarioBody } from "@/schemas/funcionarios";
import { empresaValida } from "../fixtures/cadastros";

export async function createEmpresaForTest(
	app: FastifyInstance,
	payload = empresaValida,
) {
	const response = await app.inject({
		method: "POST",
		url: "/empresas",
		payload,
	});
	expect(response.statusCode).toBe(201);

	const id: unknown = response.json().id;
	if (typeof id !== "string") {
		throw new TypeError("A resposta de criação da empresa não contém um ID");
	}
	return id;
}

export async function createFuncionarioForTest(
	app: FastifyInstance,
	payload: CreateFuncionarioBody,
) {
	const response = await app.inject({
		method: "POST",
		url: "/funcionarios",
		payload,
	});
	expect(response.statusCode).toBe(201);

	const id: unknown = response.json().id;
	if (typeof id !== "string") {
		throw new TypeError(
			"A resposta de criação do funcionário não contém um ID",
		);
	}
	return id;
}
