import Decimal from "decimal.js";
import { MARGEM_CONSIGNAVEL_PERCENTUAL } from "@/constants/margem";

function sumParcelas(valoresParcelas: readonly string[]): Decimal {
	const total = valoresParcelas.reduce(
		(acc, val) => acc.plus(val),
		new Decimal(0),
	);

	return total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateMargem(
	salario: string,
	valoresParcelas: readonly string[],
) {
	const margemTotal = new Decimal(salario)
		.times(MARGEM_CONSIGNAVEL_PERCENTUAL)
		.dividedBy(100)
		.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

	const margemUtilizada = sumParcelas(valoresParcelas);

	return {
		margemTotal,
		margemUtilizada,
		margemDisponivel: margemTotal.minus(margemUtilizada),
	};
}
