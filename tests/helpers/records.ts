import type { FastifyInstance } from "fastify";
import { expect } from "vitest";
import type { CreateEmpresaBody } from "@/schemas/empresas";
import type { CreateFuncionarioBody } from "@/schemas/funcionarios";
import { createFuncionarioValido, empresaValida } from "../fixtures/cadastros";

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

export async function createFuncionarioAutorizadoForTest(
	app: FastifyInstance,
	{
		empresa = empresaValida,
		funcionarioOverrides = {},
	}: {
		empresa?: CreateEmpresaBody;
		funcionarioOverrides?: Partial<CreateFuncionarioBody>;
	} = {},
) {
	const empresaId = await createEmpresaForTest(app, empresa);
	const funcionarioId = await createFuncionarioForTest(
		app,
		createFuncionarioValido(empresaId, funcionarioOverrides),
	);
	const response = await app.inject({
		method: "POST",
		url: `/funcionarios/${funcionarioId}/autorizacao-consulta`,
	});

	expect(response.statusCode).toBe(200);
	return funcionarioId;
}
