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
import { createFuncionarioValido, empresaValida } from "../fixtures/cadastros";
import { setMockScenario } from "../helpers/mocks";
import {
	createEmpresaForTest,
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
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000.25 },
		});
		const outraEmpresaId = await createEmpresaForTest(app, {
			...empresaValida,
			cnpj: "11223344000199",
			cpfRepresentante: "11122233344",
			email: "representante@outra-empresa.com",
		});
		const outroFuncionarioId = await createFuncionarioForTest(
			app,
			createFuncionarioValido(outraEmpresaId, {
				cpf: "88888888888",
				email: "funcionario@outra-empresa.com",
			}),
		);

		await db.insert(emprestimos).values([
			{
				funcionarioId,
				valorSolicitado: "1000",
				numeroParcelas: 4,
				valorParcela: "250",
				status: "aprovado",
			},
			{
				funcionarioId,
				valorSolicitado: "600",
				numeroParcelas: 3,
				valorParcela: "200",
				status: "rejeitado",
			},
			{
				funcionarioId,
				valorSolicitado: "400",
				numeroParcelas: 2,
				valorParcela: "200",
				status: "erro_processamento",
			},
			{
				funcionarioId: outroFuncionarioId,
				valorSolicitado: "3600",
				numeroParcelas: 4,
				valorParcela: "900",
				status: "aprovado",
			},
		]);

		const response = await app.inject({
			method: "GET",
			url: `/funcionarios/${funcionarioId}/margem`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			margemTotal: 1750.09,
			margemUtilizada: 250,
			margemDisponivel: 1500.09,
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
