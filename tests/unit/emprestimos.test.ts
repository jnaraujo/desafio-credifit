import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
	calculateDatasVencimento,
	calculateOpcoesParcelas,
	calculateScoreMinimo,
	verificarElegibilidadeEmprestimo,
} from "@/utils/emprestimos";

describe("calculateOpcoesParcelas", () => {
	it("retorna as opções de 1 a 4 parcelas", () => {
		const opcoes = calculateOpcoesParcelas(new Decimal("1000"));

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 1, valorParcela: "1000" },
			{ numeroParcelas: 2, valorParcela: "500" },
			{ numeroParcelas: 3, valorParcela: "333.33" },
			{ numeroParcelas: 4, valorParcela: "250" },
		]);
	});

	it("arredonda parcelas para centavos com half-up", () => {
		const opcoes = calculateOpcoesParcelas(new Decimal("2.01"));

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 1, valorParcela: "2.01" },
			{ numeroParcelas: 2, valorParcela: "1.01" },
			{ numeroParcelas: 3, valorParcela: "0.67" },
			{ numeroParcelas: 4, valorParcela: "0.5" },
		]);
	});

	it("mantém opções cuja parcela arredondada seja zero", () => {
		const opcoes = calculateOpcoesParcelas(new Decimal("0.01"));

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 1, valorParcela: "0.01" },
			{ numeroParcelas: 2, valorParcela: "0.01" },
			{ numeroParcelas: 3, valorParcela: "0" },
			{ numeroParcelas: 4, valorParcela: "0" },
		]);
	});
});

describe("calculateScoreMinimo", () => {
	it.each([
		["2000", 400],
		["2000.01", 500],
		["4000", 500],
		["4000.01", 600],
		["8000", 600],
		["8000.01", 700],
		["12000", 700],
		["12000.01", 800],
	])("salário %s exige score mínimo %i", (salario, scoreMinimo) => {
		expect(calculateScoreMinimo(salario)).toBe(scoreMinimo);
	});
});

describe("verificarElegibilidadeEmprestimo", () => {
	const margemDisponivel = new Decimal("350");
	const valorSolicitado = new Decimal("300");

	it("retorna o motivo de score primeiro, mesmo se outras regras falharem", () => {
		expect(
			verificarElegibilidadeEmprestimo({
				score: 300,
				salario: "5000",
				valorSolicitado: new Decimal("500"),
				margemDisponivel: new Decimal("100"),
				quantidadeEmprestimosAtivos: 3,
			}),
		).toEqual({
			isEligible: false,
			motivoRejeicao: "Score insuficiente para a faixa salarial",
		});
	});

	it("rejeita quando o total excede a margem disponível", () => {
		expect(
			verificarElegibilidadeEmprestimo({
				score: 900,
				salario: "5000",
				valorSolicitado: new Decimal("351"),
				margemDisponivel,
				quantidadeEmprestimosAtivos: 0,
			}),
		).toEqual({
			isEligible: false,
			motivoRejeicao: "Valor solicitado excede a margem disponível",
		});
	});

	it("rejeita quando o limite de empréstimos ativos foi atingido", () => {
		expect(
			verificarElegibilidadeEmprestimo({
				score: 900,
				salario: "5000",
				valorSolicitado,
				margemDisponivel,
				quantidadeEmprestimosAtivos: 3,
			}),
		).toEqual({
			isEligible: false,
			motivoRejeicao: "Limite de 3 empréstimos ativos atingido",
		});
	});

	it("não retorna motivo se todas as regras forem atendidas", () => {
		expect(
			verificarElegibilidadeEmprestimo({
				score: 900,
				salario: "5000",
				valorSolicitado,
				margemDisponivel,
				quantidadeEmprestimosAtivos: 2,
			}),
		).toEqual({ isEligible: true, motivoRejeicao: null });
	});
});

describe("calculateDatasVencimento", () => {
	it("preserva o dia original e usa o último dia do mês quando necessário", () => {
		expect(
			calculateDatasVencimento(new Date("2025-01-31T12:00:00.000Z"), 3),
		).toEqual(["2025-02-28", "2025-03-31", "2025-04-30"]);
	});

	it("considera 29 de fevereiro em ano bissexto", () => {
		expect(
			calculateDatasVencimento(new Date("2024-01-31T12:00:00.000Z"), 2),
		).toEqual(["2024-02-29", "2024-03-31"]);
	});
});
