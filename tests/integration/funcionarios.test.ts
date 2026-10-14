import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "@/http/app";
import {
	createFuncionarioValido,
	empresaIdInexistente,
	empresaValida,
} from "../fixtures/cadastros";
import {
	createEmpresaForTest,
	createFuncionarioForTest,
} from "../helpers/records";

type App = Awaited<ReturnType<typeof createApp>>;

describe("POST /funcionarios", () => {
	let app: App;

	beforeAll(async () => {
		app = await createApp();
	});

	afterAll(async () => {
		await app.close();
	});

	it("cadastra funcionário com salário decimal e não retorna a senha", async () => {
		const empresaId = await createEmpresaForTest(app);
		const payload = createFuncionarioValido(empresaId, { salario: 5000.25 });
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload,
		});

		expect(response.statusCode).toBe(201);

		const body = response.json();

		expect(body).toMatchObject({
			id: expect.any(String),
			nomeCompleto: payload.nomeCompleto,
			cpf: payload.cpf,
			email: payload.email,
			salario: payload.salario,
			createdAt: expect.any(String),
			empresaId,
		});
		expect(body).not.toHaveProperty("senha");
	});

	it("retorna 400 quando o CPF tem tamanho inválido", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { cpf: "123" }),
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando o CPF contém letras", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { cpf: "ABCDEFGHIJK" }),
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando o e-mail é inválido", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { email: "email-invalido" }),
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando o ID da empresa não é um UUID", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { empresaId: "invalido" }),
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando falta um campo obrigatório", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: {
				cpf: "98765432100",
				email: "maria@techsolutions.com",
				senha: "senhaSegura123",
				salario: 5000,
				empresaId,
			},
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando a senha tem menos de 8 caracteres", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { senha: "1234567" }),
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("aceita senha com exatamente 8 caracteres", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { senha: "12345678" }),
		});

		expect(response.statusCode).toBe(201);
	});

	it.each([-1, 0, 0.005])(
		"retorna 400 quando o salário é inferior a 0,01 (%s)",
		async (salario) => {
			const empresaId = await createEmpresaForTest(app);
			const response = await app.inject({
				method: "POST",
				url: "/funcionarios",
				payload: createFuncionarioValido(empresaId, { salario }),
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({
				message: "Dados inválidos",
			});
		},
	);

	it("aceita salário de 0,01", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, { salario: 0.01 }),
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ salario: 0.01 });
	});

	it("retorna 404 quando a empresa não existe", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaIdInexistente),
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			message: "Empresa não encontrada",
			details: {},
		});
	});

	it("retorna 409 quando o CPF já pertence a outro funcionário", async () => {
		const empresaId = await createEmpresaForTest(app);
		const primeiroFuncionario = createFuncionarioValido(empresaId);
		await createFuncionarioForTest(app, primeiroFuncionario);

		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, {
				cpf: primeiroFuncionario.cpf,
				email: "outro-funcionario@techsolutions.com",
			}),
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "CPF já cadastrado",
			details: {},
		});
	});

	it("retorna 409 quando o e-mail já pertence a outro funcionário", async () => {
		const empresaId = await createEmpresaForTest(app);
		const primeiroFuncionario = createFuncionarioValido(empresaId);
		await createFuncionarioForTest(app, primeiroFuncionario);

		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, {
				cpf: "98765432101",
				email: primeiroFuncionario.email,
			}),
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "Email já cadastrado",
			details: {},
		});
	});

	it("retorna 409 quando o CPF já pertence ao representante da empresa", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, {
				cpf: empresaValida.cpfRepresentante,
				email: "representante-como-funcionario@techsolutions.com",
			}),
		});
		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "CPF já cadastrado",
			details: {},
		});
	});

	it("retorna 409 quando o e-mail já pertence à conta da empresa", async () => {
		const empresaId = await createEmpresaForTest(app);
		const response = await app.inject({
			method: "POST",
			url: "/funcionarios",
			payload: createFuncionarioValido(empresaId, {
				cpf: "98765432101",
				email: empresaValida.email,
			}),
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "Email já cadastrado",
			details: {},
		});
	});
});
