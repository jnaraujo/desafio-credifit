import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "@/http/app";
import { createFuncionarioValido, empresaValida } from "../fixtures/cadastros";
import {
	createEmpresaForTest,
	createFuncionarioForTest,
} from "../helpers/records";

type App = Awaited<ReturnType<typeof createApp>>;

describe("POST /empresas", () => {
	let app: App;

	beforeAll(async () => {
		app = await createApp();
	});

	afterAll(async () => {
		await app.close();
	});

	it("cadastra uma empresa válida e não retorna a senha", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: empresaValida,
		});
		expect(response.statusCode).toBe(201);

		const body = response.json();
		expect(body).toMatchObject({
			id: expect.any(String),
			cnpj: empresaValida.cnpj,
			razaoSocial: empresaValida.razaoSocial,
			nomeRepresentante: empresaValida.nomeRepresentante,
			cpfRepresentante: empresaValida.cpfRepresentante,
			email: empresaValida.email,
			createdAt: expect.any(String),
		});
		expect(body).not.toHaveProperty("senha");
	});

	it("retorna 400 quando o CNPJ tem tamanho inválido", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...empresaValida, cnpj: "123" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando o CNPJ contém caracteres não numéricos", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...empresaValida, cnpj: "ABCDEFGHIJKLMN" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ message: "Dados inválidos" });
	});

	it("faz rollback do cadastro quando o CNPJ duplicado conflita", async () => {
		await createEmpresaForTest(app);
		const payload = {
			...empresaValida,
			cpfRepresentante: "11122233345",
			email: "rollback-cnpj@example.com",
		};

		const duplicada = await app.inject({
			method: "POST",
			url: "/empresas",
			payload,
		});
		expect(duplicada.statusCode).toBe(409);

		const retry = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...payload, cnpj: "98765432000100" },
		});
		expect(retry.statusCode).toBe(201);
	});

	it("retorna 400 quando o CPF do representante contém letras", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...empresaValida, cpfRepresentante: "ABCDEFGHIJK" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 400 quando a senha tem menos de 8 caracteres", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...empresaValida, senha: "1234567" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("aceita senha com exatamente 8 caracteres", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...empresaValida, senha: "12345678" },
		});

		expect(response.statusCode).toBe(201);
	});

	it("retorna 409 quando o CNPJ já está cadastrado", async () => {
		await createEmpresaForTest(app);

		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: {
				...empresaValida,
				cpfRepresentante: "98765432100",
				email: "outro-cnpj@techsolutions.com",
			},
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "CNPJ já cadastrado",
			details: {},
		});
	});

	it("retorna 400 quando o e-mail é inválido", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: { ...empresaValida, email: "email-invalido" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			message: "Dados inválidos",
		});
	});

	it("retorna 409 quando o CPF do representante já está cadastrado", async () => {
		await createEmpresaForTest(app);

		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: {
				...empresaValida,
				cnpj: "98765432000100",
				email: "outro-cpf@techsolutions.com",
			},
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "CPF já cadastrado",
			details: {},
		});
	});

	it("retorna 409 quando o e-mail já está cadastrado", async () => {
		await createEmpresaForTest(app);

		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: {
				...empresaValida,
				cnpj: "98765432000100",
				cpfRepresentante: "98765432100",
			},
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "E-mail já cadastrado",
			details: {},
		});
	});

	it("retorna 409 quando o CPF do representante pertence a um funcionário de outra empresa", async () => {
		const empresaId = await createEmpresaForTest(app);

		const funcionario = createFuncionarioValido(empresaId);
		await createFuncionarioForTest(app, funcionario);

		const response = await app.inject({
			method: "POST",
			url: "/empresas",
			payload: {
				...empresaValida,
				cnpj: "98765432000100",
				cpfRepresentante: funcionario.cpf,
				email: "outra-empresa@techsolutions.com",
			},
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			message: "CPF já cadastrado",
			details: {},
		});
	});
});
