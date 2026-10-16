import { expect } from "vitest";

const dayInMs = 24 * 60 * 60 * 1000;
const toleranceInMs = 10 * 1000;

export function expectExpiracaoEmAproximadamente24Horas(
	expiraEm: string,
	chamadaIniciadaEm: number,
	respostaRecebidaEm: number,
) {
	const expiraEmMs = Date.parse(expiraEm);

	expect(Number.isNaN(expiraEmMs)).toBe(false);
	expect(expiraEmMs).toBeGreaterThanOrEqual(
		chamadaIniciadaEm + dayInMs - toleranceInMs,
	);
	expect(expiraEmMs).toBeLessThanOrEqual(
		respostaRecebidaEm + dayInMs + toleranceInMs,
	);
}
