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
import * as gatewayClient from "@/clients/gateway";
import { GatewayUnavailableError } from "@/errors/gateway-errors";
import { DataprevUnavailableError } from "@/errors/margem-errors";
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

describe("POST /emprestimos", () => {
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

	it("aprova o empréstimo e retorna as parcelas com vencimentos", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: {
				salario: 5000,
				cpf: "98765432199",
			},
		});

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 1200,
				numeroParcelas: 3,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			funcionarioId,
			valorSolicitado: 1200,
			numeroParcelas: 3,
			valorParcela: 400,
			status: "aprovado",
			motivoRejeicao: null,
			parcelas: [
				{ numero: 1, valor: 400 },
				{ numero: 2, valor: 400 },
				{ numero: 3, valor: 400 },
			],
			createdAt: expect.any(String),
		});
		expect(response.json().parcelas[0].dataVencimento).toMatch(
			/^\d{4}-\d{2}-\d{2}$/,
		);
	});

	it("retorna 404 quando o funcionário não existe", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId: randomUUID(),
				valorSolicitado: 100,
				numeroParcelas: 1,
			},
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			message: "Funcionário não encontrado",
		});
	});

	it("aceita score exatamente igual ao mínimo da faixa salarial", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 4000, cpf: "98765432150" },
		});
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 1,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ status: "aprovado" });
	});

	it("aceita valor solicitado exatamente igual à margem disponível", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000, cpf: "98765432199" },
		});
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 350,
				numeroParcelas: 1,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			valorSolicitado: 350,
			status: "aprovado",
		});
	});

	it("arredonda todas as parcelas de 1000 em 3x para 333,33", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { cpf: "98765432199" },
		});
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 1000,
				numeroParcelas: 3,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			valorSolicitado: 1000,
			valorParcela: 333.33,
			parcelas: [
				{ numero: 1, valor: 333.33 },
				{ numero: 2, valor: 333.33 },
				{ numero: 3, valor: 333.33 },
			],
		});
	});

	it("retorna 400 quando o valor solicitado é infinito no JSON", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			headers: { "content-type": "application/json" },
			payload: `{"funcionarioId":"${randomUUID()}","valorSolicitado":1e309,"numeroParcelas":1}`,
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ message: "Dados inválidos" });
	});

	it.each([0, 1.5, 5])(
		"retorna 400 quando o número de parcelas é inválido (%s)",
		async (numeroParcelas) => {
			const response = await app.inject({
				method: "POST",
				url: "/emprestimos",
				payload: {
					funcionarioId: randomUUID(),
					valorSolicitado: 100,
					numeroParcelas,
				},
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({ message: "Dados inválidos" });
		},
	);

	it("retorna 400 quando o número de parcelas não foi informado", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId: randomUUID(),
				valorSolicitado: 100,
			},
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ message: "Dados inválidos" });
	});

	it("retorna rejeição por score sem chamar o gateway", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000, cpf: "98765432100" },
		});
		const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");
		await setMockScenario("gateway-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "rejeitado",
			motivoRejeicao: "Score insuficiente para a faixa salarial",
		});
		expect(pagamentoSpy).not.toHaveBeenCalled();
	});

	it("retorna rejeição quando o valor total excede a margem", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 1000, cpf: "98765432199" },
		});
		const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");
		await setMockScenario("gateway-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 351,
				numeroParcelas: 4,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "rejeitado",
			motivoRejeicao: "Valor solicitado excede a margem disponível",
		});
		expect(pagamentoSpy).not.toHaveBeenCalled();
	});

	it("considera a margem consumida por empréstimos aprovados anteriores", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000, cpf: "98765432199" },
		});
		const aprovado = await createEmprestimoForTest(app, funcionarioId, 1000);
		expect(aprovado.status).toBe("aprovado");
		const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");
		await setMockScenario("gateway-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 751,
				numeroParcelas: 4,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "rejeitado",
			motivoRejeicao: "Valor solicitado excede a margem disponível",
		});
		expect(pagamentoSpy).not.toHaveBeenCalled();
	});

	it("não consome margem com empréstimos rejeitados ou com erro", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000, cpf: "98765432199" },
		});
		await setMockScenario("gateway-rejected");
		const recusado = await createEmprestimoForTest(app, funcionarioId, 1000);
		expect(recusado.status).toBe("rejeitado");

		await setMockScenario("gateway-down");
		const erroProcessamento = await createEmprestimoForTest(
			app,
			funcionarioId,
			1000,
		);
		expect(erroProcessamento.status).toBe("erro_processamento");

		await setMockScenario("healthy");
		const elegivelAteOMaximoDaMargem = await createEmprestimoForTest(
			app,
			funcionarioId,
			1750,
		);
		expect(elegivelAteOMaximoDaMargem.status).toBe("aprovado");
	});

	it.each([
		{ scenario: "gateway-rejected", status: "rejeitado" },
		{ scenario: "gateway-down", status: "erro_processamento" },
	] as const)(
		"não conta o status $status entre os três empréstimos aprovados",
		async ({ scenario, status }) => {
			const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
				funcionarioOverrides: { cpf: "98765432199" },
			});
			const primeiroAprovado = await createEmprestimoForTest(
				app,
				funcionarioId,
			);
			const segundoAprovado = await createEmprestimoForTest(app, funcionarioId);
			expect(primeiroAprovado.status).toBe("aprovado");
			expect(segundoAprovado.status).toBe("aprovado");

			await setMockScenario(scenario);
			const naoAprovado = await createEmprestimoForTest(app, funcionarioId);
			expect(naoAprovado.status).toBe(status);

			await setMockScenario("healthy");
			const terceiroAprovado = await app.inject({
				method: "POST",
				url: "/emprestimos",
				payload: { funcionarioId, valorSolicitado: 100, numeroParcelas: 1 },
			});
			expect(terceiroAprovado.statusCode).toBe(201);
			expect(terceiroAprovado.json().status).toBe("aprovado");
		},
	);

	it("rejeita quando o funcionário já tem três empréstimos aprovados", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000, cpf: "98765432199" },
		});
		for (let index = 0; index < 3; index++) {
			const created = await createEmprestimoForTest(app, funcionarioId);
			expect(created.status).toBe("aprovado");
		}
		await setMockScenario("gateway-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 1,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "rejeitado",
			motivoRejeicao: "Limite de 3 empréstimos ativos atingido",
		});
	});

	it("serializa solicitações concorrentes para respeitar o limite de ativos", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000, cpf: "98765432199" },
		});
		const primeiroAprovado = await createEmprestimoForTest(app, funcionarioId);
		const segundoAprovado = await createEmprestimoForTest(app, funcionarioId);
		expect(primeiroAprovado.status).toBe("aprovado");
		expect(segundoAprovado.status).toBe("aprovado");

		const payload = {
			funcionarioId,
			valorSolicitado: 100,
			numeroParcelas: 1,
		};
		const responses = await Promise.all([
			app.inject({ method: "POST", url: "/emprestimos", payload }),
			app.inject({ method: "POST", url: "/emprestimos", payload }),
		]);

		expect(responses.map((response) => response.statusCode)).toEqual([
			201, 201,
		]);
		expect(responses.map((response) => response.json().status).sort()).toEqual([
			"aprovado",
			"rejeitado",
		]);
	});

	it("serializa solicitações concorrentes para respeitar a margem disponível", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { salario: 5000, cpf: "98765432199" },
		});
		const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");
		const payload = {
			funcionarioId,
			valorSolicitado: 1000,
			numeroParcelas: 1,
		};

		const responses = await Promise.all([
			app.inject({ method: "POST", url: "/emprestimos", payload }),
			app.inject({ method: "POST", url: "/emprestimos", payload }),
		]);

		expect(responses.map((response) => response.statusCode)).toEqual([
			201, 201,
		]);
		expect(responses.map((response) => response.json().status).sort()).toEqual([
			"aprovado",
			"rejeitado",
		]);
		expect(
			responses
				.find((response) => response.json().status === "rejeitado")
				?.json().motivoRejeicao,
		).toBe("Valor solicitado excede a margem disponível");
		expect(pagamentoSpy).toHaveBeenCalledOnce();
	});

	it("salva como rejeitado quando o gateway recusa o pagamento", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { cpf: "98765432199" },
		});
		await setMockScenario("gateway-rejected");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "rejeitado",
			motivoRejeicao: "Pagamento recusado pelo gateway",
		});
	});

	it("salva como erro_processamento quando o gateway está indisponível", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { cpf: "98765432199" },
		});
		await setMockScenario("gateway-down");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "erro_processamento",
			motivoRejeicao: null,
		});
	});

	it("salva erro_processamento quando o client reporta indisponibilidade", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { cpf: "98765432199" },
		});
		const pagamentoSpy = vi
			.spyOn(gatewayClient, "processarPagamento")
			.mockRejectedValue(
				new GatewayUnavailableError({ cause: new Error("timeout") }),
			);

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({
			status: "erro_processamento",
			motivoRejeicao: null,
		});
		expect(pagamentoSpy).toHaveBeenCalledOnce();
	});

	it("retorna 502 quando apenas a consulta de score falha", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { cpf: "98765432199" },
		});
		const scoreSpy = vi
			.spyOn(dataprevClient, "getFuncionarioScore")
			.mockRejectedValue(new DataprevUnavailableError());
		const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toMatchObject({
			message: "Dataprev indisponível",
		});
		expect(scoreSpy).toHaveBeenCalledOnce();
		expect(pagamentoSpy).not.toHaveBeenCalled();

		const loans = await app.inject({
			method: "GET",
			url: `/emprestimos?funcionarioId=${funcionarioId}`,
		});
		expect(loans.statusCode).toBe(200);
		expect(loans.json()).toEqual({ data: [] });
	});

	it.each([
		{ scenario: "dataprev-down", descricao: "responde 503" },
		{ scenario: "dataprev-slow", descricao: "excede o timeout" },
	] as const)(
		"retorna 502 quando o Dataprev $descricao",
		async ({ scenario }) => {
			const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
				funcionarioOverrides: { cpf: "98765432199" },
			});
			const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");
			await setMockScenario(scenario);

			const response = await app.inject({
				method: "POST",
				url: "/emprestimos",
				payload: {
					funcionarioId,
					valorSolicitado: 100,
					numeroParcelas: 2,
				},
			});

			expect(response.statusCode).toBe(502);
			expect(response.json()).toMatchObject({
				message: "Dataprev indisponível",
			});
			expect(pagamentoSpy).not.toHaveBeenCalled();

			const loans = await app.inject({
				method: "GET",
				url: `/emprestimos?funcionarioId=${funcionarioId}`,
			});
			expect(loans.statusCode).toBe(200);
			expect(loans.json()).toEqual({ data: [] });
		},
	);

	it("retorna 422 quando a empresa não está habilitada", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			empresa: { ...empresaValida, cnpj: "12345678000000" },
			funcionarioOverrides: { cpf: "98765432199" },
		});

		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(422);
	});

	it("retorna 403 quando não há autorização ativa", async () => {
		const empresaId = await createEmpresaForTest(app);
		const funcionarioId = await createFuncionarioForTest(
			app,
			createFuncionarioValido(empresaId, {
				cpf: "98765432199",
				salario: 5000,
			}),
		);
		const empresaSpy = vi.spyOn(dataprevClient, "checkEmpresaHabilitada");
		const scoreSpy = vi.spyOn(dataprevClient, "getFuncionarioScore");
		const pagamentoSpy = vi.spyOn(gatewayClient, "processarPagamento");
		const response = await app.inject({
			method: "POST",
			url: "/emprestimos",
			payload: {
				funcionarioId,
				valorSolicitado: 100,
				numeroParcelas: 2,
			},
		});

		expect(response.statusCode).toBe(403);
		expect(empresaSpy).not.toHaveBeenCalled();
		expect(scoreSpy).not.toHaveBeenCalled();
		expect(pagamentoSpy).not.toHaveBeenCalled();
	});
});
