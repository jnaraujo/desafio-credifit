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
import { createApp } from "@/http/app";
import { createFuncionarioValido, empresaValida } from "../fixtures/cadastros";
import { setMockScenario } from "../helpers/mocks";
import {
	createEmpresaForTest,
	createEmprestimoForTest,
	createFuncionarioAutorizadoForTest,
	createFuncionarioForTest,
} from "../helpers/records";

type App = Awaited<ReturnType<typeof createApp>>;

describe("GET /funcionarios/:funcionarioId/margem", () => {
	let app: App;

	beforeAll(async () => {
		app = await createApp();
	});

	beforeEach(() => {
		return setMockScenario("healthy");
	});

	afterEach(async () => {
		await setMockScenario("healthy");
	});

	afterAll(async () => {
		await app.close();
	});

	it("calcula a margem quando o funcionário está autorizado e a empresa habilitada", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000.25 },
		});
		const response = await app.inject({
			method: "GET",
			url: `/funcionarios/${funcionarioId}/margem`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			funcionarioId,
			salario: 5000.25,
			margemTotal: 1750.09,
			margemUtilizada: 0,
			margemDisponivel: 1750.09,
		});
	});

	it("soma apenas parcelas aprovadas do funcionário consultado", async () => {
		const empresaId = await createEmpresaForTest(app);
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			empresaId,
			funcionarioOverrides: {
				salario: 5000.25,
				cpf: "98765432199",
			},
		});
		const outroFuncionarioId = await createFuncionarioAutorizadoForTest(app, {
			empresaId,
			funcionarioOverrides: {
				cpf: "88888888888",
				email: "outro-funcionario@techsolutions.com",
			},
		});

		const primeiroAprovado = await createEmprestimoForTest(
			app,
			funcionarioId,
			1000,
			4,
		);
		const segundoAprovado = await createEmprestimoForTest(
			app,
			funcionarioId,
			600,
			3,
		);
		await setMockScenario("gateway-rejected");
		const rejeitado = await createEmprestimoForTest(app, funcionarioId, 400, 2);
		await setMockScenario("gateway-down");
		const erro = await createEmprestimoForTest(app, funcionarioId, 400, 2);
		await setMockScenario("healthy");
		const outroFuncionarioAprovado = await createEmprestimoForTest(
			app,
			outroFuncionarioId,
			1000,
			4,
		);
		expect([
			primeiroAprovado.status,
			segundoAprovado.status,
			rejeitado.status,
			erro.status,
			outroFuncionarioAprovado.status,
		]).toEqual([
			"aprovado",
			"aprovado",
			"rejeitado",
			"erro_processamento",
			"aprovado",
		]);
		await setMockScenario("healthy");

		const response = await app.inject({
			method: "GET",
			url: `/funcionarios/${funcionarioId}/margem`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			margemTotal: 1750.09,
			margemUtilizada: 450,
			margemDisponivel: 1300.09,
		});
	});

	it("retorna 400 quando o ID do funcionário não é um UUID", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/funcionarios/id-invalido/margem",
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ message: "Dados inválidos" });
	});

	it("retorna 404 quando o funcionário não existe", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/funcionarios/${randomUUID()}/margem`,
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
			method: "GET",
			url: `/funcionarios/${funcionarioId}/margem`,
		});

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			message: "Autorização de consulta ausente ou expirada",
			details: {},
		});
	});

	it("não usa a autorização ativa de outro funcionário da mesma empresa", async () => {
		const empresaId = await createEmpresaForTest(app);
		await createFuncionarioAutorizadoForTest(app, {
			empresaId,
			funcionarioOverrides: {
				cpf: "98765432110",
				email: "autorizado@techsolutions.com",
			},
		});
		const funcionarioSemAutorizacaoId = await createFuncionarioForTest(
			app,
			createFuncionarioValido(empresaId, {
				cpf: "98765432111",
				email: "sem-autorizacao@techsolutions.com",
			}),
		);

		const response = await app.inject({
			method: "GET",
			url: `/funcionarios/${funcionarioSemAutorizacaoId}/margem`,
		});

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			message: "Autorização de consulta ausente ou expirada",
		});
	});

	it("retorna 422 quando a empresa não está habilitada no e-Consignado", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			empresa: { ...empresaValida, cnpj: "12345678000000" },
		});
		const response = await app.inject({
			method: "GET",
			url: `/funcionarios/${funcionarioId}/margem`,
		});

		expect(response.statusCode).toBe(422);
		expect(response.json()).toMatchObject({
			message: "Empresa não habilitada no e-Consignado",
			details: {},
		});
	});

	it.each([
		{ scenario: "dataprev-down", description: "indisponível" },
		{ scenario: "dataprev-slow", description: "excede o timeout" },
	] as const)(
		"retorna 502 quando o Dataprev está $description",
		async ({ scenario }) => {
			const funcionarioId = await createFuncionarioAutorizadoForTest(app);
			await setMockScenario(scenario);

			const response = await app.inject({
				method: "GET",
				url: `/funcionarios/${funcionarioId}/margem`,
			});

			expect(response.statusCode).toBe(502);
			expect(response.json()).toMatchObject({
				message: "Dataprev indisponível",
				details: {},
			});
		},
	);
});
