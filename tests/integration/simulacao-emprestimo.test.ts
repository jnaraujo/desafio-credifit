import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";
import { db } from "@/database/connection";
import { emprestimos } from "@/database/schema";
import { createApp } from "@/http/app";
import { createFuncionarioValido } from "../fixtures/cadastros";
import { setMockScenario } from "../helpers/mocks";
import {
	createEmpresaForTest,
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
		await setMockScenario("healthy");
	});

	afterAll(async () => {
		await app.close();
	});

	it("retorna apenas as opções de parcelas que cabem na margem", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000 },
		});

		// Simula o Dataprev indisponível para garantir que a margem seja calculada apenas com base no salário e nos empréstimos aprovados
		await setMockScenario("dataprev-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 1000 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			funcionarioId,
			valorSolicitado: 1000,
			margemDisponivel: 350,
			parcelas: [
				{ numeroParcelas: 3, valorParcela: 333.33 },
				{ numeroParcelas: 4, valorParcela: 250 },
			],
		});
	});

	it("considera parcelas aprovadas para calcular a margem disponível", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000 },
		});
		await db.insert(emprestimos).values([
			{
				funcionarioId,
				valorSolicitado: "400",
				numeroParcelas: 4,
				valorParcela: "100",
				status: "aprovado",
			},
			{
				funcionarioId,
				valorSolicitado: "800",
				numeroParcelas: 4,
				valorParcela: "200",
				status: "rejeitado",
			},
		]);

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 1000 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			funcionarioId,
			valorSolicitado: 1000,
			margemDisponivel: 250,
			parcelas: [{ numeroParcelas: 4, valorParcela: 250 }],
		});
	});

	it("não retorna opções cuja parcela arredondada seja zero", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 0.01 },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			parcelas: [
				{ numeroParcelas: 1, valorParcela: 0.01 },
				{ numeroParcelas: 2, valorParcela: 0.01 },
			],
		});
	});

	it("retorna 400 quando nenhuma opção cabe na margem", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000 },
		});
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos/simular",
			payload: { funcionarioId, valorSolicitado: 2000 },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Nenhuma opção de parcelamento cabe na margem disponível",
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
