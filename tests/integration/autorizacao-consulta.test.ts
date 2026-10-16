import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "@/http/app";
import { createFuncionarioValido } from "../fixtures/cadastros";
import { expectExpiracaoEmAproximadamente24Horas } from "../helpers/assertions";
import {
	createEmpresaForTest,
	createFuncionarioForTest,
} from "../helpers/records";

type App = Awaited<ReturnType<typeof createApp>>;

type AutorizacaoResponse = {
	funcionarioId: string;
	autorizado: boolean;
	expiraEm: string;
};

describe("POST /funcionarios/:funcionarioId/autorizacao-consulta", () => {
	let app: App;

	beforeAll(async () => {
		app = await createApp();
	});

	afterAll(async () => {
		await app.close();
	});

	it("autoriza a consulta por 24 horas para um funcionário existente", async () => {
		const empresaId = await createEmpresaForTest(app);
		const funcionarioId = await createFuncionarioForTest(
			app,
			createFuncionarioValido(empresaId),
		);

		const chamadaIniciadaEm = Date.now();
		const response = await app.inject({
			method: "POST",
			url: `/funcionarios/${funcionarioId}/autorizacao-consulta`,
		});
		const respostaRecebidaEm = Date.now();

		expect(response.statusCode).toBe(200);
		const body = response.json<AutorizacaoResponse>();
		expect(body).toMatchObject({
			funcionarioId,
			autorizado: true,
			expiraEm: expect.any(String),
		});
		expectExpiracaoEmAproximadamente24Horas(
			body.expiraEm,
			chamadaIniciadaEm,
			respostaRecebidaEm,
		);
	});

	it("retorna 400 quando o ID do funcionário não é um UUID", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios/id-invalido/autorizacao-consulta",
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 404 quando o funcionário não existe", async () => {
		const funcionarioId = randomUUID();
		const response = await app.inject({
			method: "POST",
			url: `/funcionarios/${funcionarioId}/autorizacao-consulta`,
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			message: "Funcionário não encontrado",
			details: {},
		});
	});

	it("renova a autorização para 24 horas após uma nova chamada", async () => {
		const empresaId = await createEmpresaForTest(app);
		const funcionarioId = await createFuncionarioForTest(
			app,
			createFuncionarioValido(empresaId),
		);
		const url = `/funcionarios/${funcionarioId}/autorizacao-consulta`;

		const primeiraResposta = await app.inject({ method: "POST", url });
		expect(primeiraResposta.statusCode).toBe(200);
		const primeiraAutorizacao = primeiraResposta.json<AutorizacaoResponse>();

		await new Promise((resolve) => setTimeout(resolve, 20));

		const segundaChamadaIniciadaEm = Date.now();
		const segundaResposta = await app.inject({ method: "POST", url });
		const segundaRespostaRecebidaEm = Date.now();
		expect(segundaResposta.statusCode).toBe(200);
		const segundaAutorizacao = segundaResposta.json<AutorizacaoResponse>();
		expectExpiracaoEmAproximadamente24Horas(
			segundaAutorizacao.expiraEm,
			segundaChamadaIniciadaEm,
			segundaRespostaRecebidaEm,
		);
		expect(Date.parse(segundaAutorizacao.expiraEm)).toBeGreaterThan(
			Date.parse(primeiraAutorizacao.expiraEm),
		);
	});
});
