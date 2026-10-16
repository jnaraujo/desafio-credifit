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
import { setMockScenario } from "../helpers/mocks";
import {
	createEmpresaForTest,
	createEmprestimoForTest,
	createFuncionarioAutorizadoForTest,
} from "../helpers/records";

type App = Awaited<ReturnType<typeof createApp>>;

describe("GET /emprestimos", () => {
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

	it("consulta pelo ID e lista os dados criados pela rota de solicitação", async () => {
		const funcionarioId = await createFuncionarioAutorizadoForTest(app, {
			funcionarioOverrides: { cpf: "98765432199" },
		});
		const created = await createEmprestimoForTest(app, funcionarioId, 1000);

		const detail = await app.inject({
			method: "GET",
			url: `/emprestimos/${created.id}`,
		});
		const list = await app.inject({ method: "GET", url: "/emprestimos" });

		expect(detail.statusCode).toBe(200);
		expect(detail.json()).toEqual(created);
		expect(list.statusCode).toBe(200);
		expect(list.json()).toEqual({ data: [created] });
	});

	it("aplica filtros de funcionário e status, inclusive em conjunto", async () => {
		const empresaId = await createEmpresaForTest(app);
		const primeiroFuncionarioId = await createFuncionarioAutorizadoForTest(
			app,
			{
				empresaId,
				funcionarioOverrides: { cpf: "98765432199" },
			},
		);
		const segundoFuncionarioId = await createFuncionarioAutorizadoForTest(app, {
			empresaId,
			funcionarioOverrides: {
				cpf: "98765432198",
				email: "segundo@techsolutions.com",
			},
		});

		const aprovado = await createEmprestimoForTest(app, primeiroFuncionarioId);
		expect(aprovado.status).toBe("aprovado");
		await setMockScenario("gateway-rejected");
		const rejeitado = await createEmprestimoForTest(app, primeiroFuncionarioId);
		expect(rejeitado.status).toBe("rejeitado");
		await setMockScenario("gateway-down");
		const erro = await createEmprestimoForTest(app, segundoFuncionarioId);
		expect(erro.status).toBe("erro_processamento");
		await setMockScenario("healthy");

		const all = await app.inject({ method: "GET", url: "/emprestimos" });
		const byEmployee = await app.inject({
			method: "GET",
			url: `/emprestimos?funcionarioId=${primeiroFuncionarioId}`,
		});
		const byStatus = await app.inject({
			method: "GET",
			url: "/emprestimos?status=rejeitado",
		});
		const byBoth = await app.inject({
			method: "GET",
			url: `/emprestimos?funcionarioId=${primeiroFuncionarioId}&status=rejeitado`,
		});
		const byErrorStatus = await app.inject({
			method: "GET",
			url: "/emprestimos?status=erro_processamento",
		});

		expect(all.json().data).toHaveLength(3);
		expect(all.json().data.map((record: { id: string }) => record.id)).toEqual(
			expect.arrayContaining([aprovado.id, rejeitado.id, erro.id]),
		);
		expect(byEmployee.json().data).toHaveLength(2);
		expect(
			byEmployee
				.json()
				.data.every(
					(record: { funcionarioId: string }) =>
						record.funcionarioId === primeiroFuncionarioId,
				),
		).toBe(true);
		expect(
			byStatus.json().data.map((record: { id: string }) => record.id),
		).toEqual([rejeitado.id]);
		expect(byStatus.json().data[0].motivoRejeicao).toBe(
			"Pagamento recusado pelo gateway",
		);
		expect(
			byBoth.json().data.map((record: { id: string }) => record.id),
		).toEqual([rejeitado.id]);
		expect(
			byErrorStatus.json().data.map((record: { id: string }) => record.id),
		).toEqual([erro.id]);
		expect(byErrorStatus.json().data[0].motivoRejeicao).toBeNull();
	});

	it("retorna envelope vazio, valida filtros e responde 404 no detalhe ausente", async () => {
		const empty = await app.inject({ method: "GET", url: "/emprestimos" });
		const filteredEmpty = await app.inject({
			method: "GET",
			url: `/emprestimos?funcionarioId=${randomUUID()}`,
		});
		const invalidStatus = await app.inject({
			method: "GET",
			url: "/emprestimos?status=pendente",
		});
		const missing = await app.inject({
			method: "GET",
			url: `/emprestimos/${randomUUID()}`,
		});

		expect(empty.statusCode).toBe(200);
		expect(empty.json()).toEqual({ data: [] });
		expect(filteredEmpty.statusCode).toBe(200);
		expect(filteredEmpty.json()).toEqual({ data: [] });
		expect(invalidStatus.statusCode).toBe(400);
		expect(missing.statusCode).toBe(404);
		expect(missing.json()).toMatchObject({
			message: "Empréstimo não encontrado",
		});
	});
});
