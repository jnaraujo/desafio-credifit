import Decimal from "decimal.js";
import { NUMERO_MAXIMO_PARCELAS } from "@/constants/emprestimos";

export type OpcaoParcelamento = {
	numeroParcelas: number;
	valorParcela: Decimal;
};

export function calculateOpcoesParcelas(
	valorSolicitado: Decimal,
): OpcaoParcelamento[] {
	const options: OpcaoParcelamento[] = [];

	for (
		let numParcelas = 1;
		numParcelas <= NUMERO_MAXIMO_PARCELAS;
		numParcelas++
	) {
		const valorParcela = valorSolicitado
			.dividedBy(numParcelas)
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

		if (valorParcela.greaterThan(0)) {
			options.push({ numeroParcelas: numParcelas, valorParcela });
		}
	}

	return options;
}
