import { describe, expect, it } from "vitest";
import { calculateMargem } from "@/utils/margem";

describe("calculateMargem", () => {
	it("calcula 35% do salário quando não há parcelas", () => {
		const margem = calculateMargem("5000", []);

		expect(margem.margemTotal.eq("1750")).toBe(true);
		expect(margem.margemUtilizada.eq("0")).toBe(true);
		expect(margem.margemDisponivel.eq("1750")).toBe(true);
	});

	it("soma as parcelas mensais e calcula a margem disponível", () => {
		const margem = calculateMargem("5000.25", ["250", "300"]);

		expect(margem.margemTotal.eq("1750.09")).toBe(true);
		expect(margem.margemUtilizada.eq("550")).toBe(true);
		expect(margem.margemDisponivel.eq("1200.09")).toBe(true);
	});

	it("arredonda valores de parcelas para centavos", () => {
		const margem = calculateMargem("5000.25", ["250.126", "100.124", "1.005"]);

		expect(margem.margemTotal.eq("1750.09")).toBe(true);
		expect(margem.margemUtilizada.eq("351.26")).toBe(true);
		expect(margem.margemDisponivel.eq("1398.83")).toBe(true);
	});

	it("preserva margem disponível negativa quando parcelas excedem o limite", () => {
		const margem = calculateMargem("1000", ["400"]);

		expect(margem.margemTotal.eq("350")).toBe(true);
		expect(margem.margemUtilizada.eq("400")).toBe(true);
		expect(margem.margemDisponivel.eq("-50")).toBe(true);
	});
});
