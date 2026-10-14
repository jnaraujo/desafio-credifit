import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { calculateOpcoesParcelas } from "@/utils/emprestimos";

describe("calculateOpcoesParcelas", () => {
	it("retorna opções de 1 a 4 parcelas quando todas cabem na margem", () => {
		const opcoes = calculateOpcoesParcelas(
			new Decimal("1000"),
			new Decimal("1000"),
		);

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

	it("retorna somente opções cuja parcela cabe na margem", () => {
		const opcoes = calculateOpcoesParcelas(
			new Decimal("1000"),
			new Decimal("350"),
		);

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 3, valorParcela: "333.33" },
			{ numeroParcelas: 4, valorParcela: "250" },
		]);
	});

	it("arredonda parcelas para centavos com half-up", () => {
		const opcoes = calculateOpcoesParcelas(
			new Decimal("2.01"),
			new Decimal("1.01"),
		);

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 2, valorParcela: "1.01" },
			{ numeroParcelas: 3, valorParcela: "0.67" },
			{ numeroParcelas: 4, valorParcela: "0.5" },
		]);
	});

	it("descarta parcela que excede a margem depois do arredondamento", () => {
		const opcoes = calculateOpcoesParcelas(
			new Decimal("2.01"),
			new Decimal("1.00"),
		);

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 3, valorParcela: "0.67" },
			{ numeroParcelas: 4, valorParcela: "0.5" },
		]);
	});

	it("não retorna opções com parcelas arredondadas para zero", () => {
		const opcoes = calculateOpcoesParcelas(
			new Decimal("0.01"),
			new Decimal("1"),
		);

		expect(
			opcoes.map(({ numeroParcelas, valorParcela }) => ({
				numeroParcelas,
				valorParcela: valorParcela.toString(),
			})),
		).toEqual([
			{ numeroParcelas: 1, valorParcela: "0.01" },
			{ numeroParcelas: 2, valorParcela: "0.01" },
		]);
	});

	it("retorna uma lista vazia quando nenhuma opção cabe", () => {
		expect(
			calculateOpcoesParcelas(new Decimal("2000"), new Decimal("350")),
		).toEqual([]);
	});
});
