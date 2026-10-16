import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import * as dataprevClient from "@/clients/dataprev";
import { createApp } from "@/http/app";
import { createFuncionarioValido } from "../fixtures/cadastros";
import { setMockScenario } from "../helpers/mocks";
import {
	createEmpresaForTest,
	createEmprestimoForTest,
	createFuncionarioAutorizadoForTest,
	createFuncionarioForTest,
} from "../helpers/records";

type App = Awaited<ReturnType<typeof createApp>>;

describe("POST /emprestimos/simular", () => {
	let app: App;

	beforeAll(async () => {
		app = await createApp();
	});

	beforeEach(async () => {
		await setMockScenario("healthy");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await setMockScenario("healthy");
	});

	afterAll(async () => {
		await app.close();
	});

	it("aceita valor igual à margem e calcula as parcelas", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000 },
		});
		const empresaSpy = vi.spyOn(dataprevClient, "checkEmpresaHabilitada");
		const scoreSpy = vi.spyOn(dataprevClient, "getFuncionarioScore");

		// Simula o Dataprev indisponível para garantir que a margem seja calculada apenas com base no salário e nos empréstimos aprovados
		await setMockScenario("dataprev-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 350 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			funcionarioId,
			valorSolicitado: 350,
			margemDisponivel: 350,
			parcelas: [
				{ numeroParcelas: 1, valorParcela: 350 },
				{ numeroParcelas: 2, valorParcela: 175 },
				{ numeroParcelas: 3, valorParcela: 116.67 },
				{ numeroParcelas: 4, valorParcela: 87.5 },
			],
		});
		expect(empresaSpy).not.toHaveBeenCalled();
		expect(scoreSpy).not.toHaveBeenCalled();
	});

	it("considera parcelas aprovadas para calcular a margem disponível", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000, cpf: "98765432199" },
		});
		const aprovado = await createEmprestimoForTest(app, funcionarioId, 200, 2);
		expect(aprovado.status).toBe("aprovado");

		await setMockScenario("gateway-rejected");
		const rejeitado = await createEmprestimoForTest(app, funcionarioId);
		expect(rejeitado.status).toBe("rejeitado");

		await setMockScenario("gateway-down");
		const erro = await createEmprestimoForTest(app, funcionarioId);
		expect(erro.status).toBe("erro_processamento");
		await setMockScenario("healthy");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 200 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			funcionarioId,
			valorSolicitado: 200,
			margemDisponivel: 250,
			parcelas: [
				{ numeroParcelas: 1, valorParcela: 200 },
				{ numeroParcelas: 2, valorParcela: 100 },
				{ numeroParcelas: 3, valorParcela: 66.67 },
				{ numeroParcelas: 4, valorParcela: 50 },
			],
		});
	});

	it("retorna todas as opções mesmo quando a parcela arredonda para zero", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 0.01 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().parcelas).toEqual([
			{ numeroParcelas: 1, valorParcela: 0.01 },
			{ numeroParcelas: 2, valorParcela: 0.01 },
			{ numeroParcelas: 3, valorParcela: 0 },
			{ numeroParcelas: 4, valorParcela: 0 },
		]);
	});

	it("retorna 400 quando o valor simulado é infinito no JSON", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			headers: { "content-type": "application/json" },
			payload: `{"funcionarioId":"${randomUUID()}","valorSolicitado":1e309}`,
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ message: "Dados inválidos" });
	});

	it("retorna 400 quando o valor total solicitado excede a margem", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000 },
		});
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 1000 },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Valor solicitado excede a margem disponível",
			details: {},
		});
	});

	it("retorna 400 quando o valor solicitado é menor que 0,01", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId: randomUUID(), valorSolicitado: 0 },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ message: "Dados inválidos" });
	});

	it("retorna 404 quando o funcionário não existe", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId: randomUUID(), valorSolicitado: 1000 },
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			message: "Funcionário não encontrado",
			details: {},
		});
	});

	it("retorna 403 quando não há autorização ativa", async () => {
		const empresaId = await createEmpresaForTest(app);
		const funcionarioId = await createFuncionarioForTest(
			app,
			createFuncionarioValido(empresaId),
		);
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 1000 },
		});

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			message: "Autorização de consulta ausente ou expirada",
			details: {},
		});
	});
});
