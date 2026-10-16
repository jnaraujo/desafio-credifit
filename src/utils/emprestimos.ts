import Decimal from "decimal.js";
import {
	NUMERO_MAXIMO_EMPRESTIMOS_ATIVOS,
	NUMERO_MAXIMO_PARCELAS,
} from "@/constants/emprestimos";

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
		const valorParcela = calculateValorParcela(valorSolicitado, numParcelas);

		options.push({ numeroParcelas: numParcelas, valorParcela });
	}

	return options;
}

export function calculateValorParcela(
	valorSolicitado: Decimal,
	numeroParcelas: number,
): Decimal {
	return valorSolicitado
		.dividedBy(numeroParcelas)
		.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateScoreMinimo(salario: string): number {
	const salarioDecimal = new Decimal(salario);

	if (salarioDecimal.lessThanOrEqualTo(2000)) return 400;
	if (salarioDecimal.lessThanOrEqualTo(4000)) return 500;
	if (salarioDecimal.lessThanOrEqualTo(8000)) return 600;
	if (salarioDecimal.lessThanOrEqualTo(12000)) return 700;
	return 800;
}

export type ResultadoElegibilidadeEmprestimo =
	| { isEligible: true; motivoRejeicao: null }
	| { isEligible: false; motivoRejeicao: string };

export function verificarElegibilidadeEmprestimo({
	score,
	salario,
	valorSolicitado,
	margemDisponivel,
	quantidadeEmprestimosAtivos,
}: {
	score: number;
	salario: string;
	valorSolicitado: Decimal;
	margemDisponivel: Decimal;
	quantidadeEmprestimosAtivos: number;
}): ResultadoElegibilidadeEmprestimo {
	if (score < calculateScoreMinimo(salario)) {
		return {
			isEligible: false,
			motivoRejeicao: "Score insuficiente para a faixa salarial",
		};
	}

	if (valorSolicitado.greaterThan(margemDisponivel)) {
		return {
			isEligible: false,
			motivoRejeicao: "Valor solicitado excede a margem disponível",
		};
	}

	if (quantidadeEmprestimosAtivos >= NUMERO_MAXIMO_EMPRESTIMOS_ATIVOS) {
		return {
			isEligible: false,
			motivoRejeicao: "Limite de 3 empréstimos ativos atingido",
		};
	}

	return { isEligible: true, motivoRejeicao: null };
}

function addMonthsUTC(date: Date, months: number): Date {
	const year = date.getUTCFullYear();
	const targetMonth = date.getUTCMonth() + months;

	const lastDayOfMonth = new Date(
		Date.UTC(year, targetMonth + 1, 0),
	).getUTCDate();

	const targetDay = Math.min(date.getUTCDate(), lastDayOfMonth);

	return new Date(Date.UTC(year, targetMonth, targetDay));
}

export function calculateDatasVencimento(
	dataSolicitacao: Date,
	numeroParcelas: number,
): string[] {
	return Array.from({ length: numeroParcelas }, (_, index) =>
		addMonthsUTC(dataSolicitacao, index + 1)
			.toISOString()
			.slice(0, 10),
	);
}
