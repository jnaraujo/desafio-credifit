import Decimal from "decimal.js";
import type { emprestimos } from "@/database/schema";
import { calculateDatasVencimento } from "@/utils/emprestimos";

type EmprestimoRecord = typeof emprestimos.$inferSelect;

export function toEmprestimoResponse(record: EmprestimoRecord) {
	const valorParcela = new Decimal(record.valorParcela).toNumber();
	const datasVencimento = calculateDatasVencimento(
		record.createdAt,
		record.numeroParcelas,
	);

	return {
		id: record.id,
		funcionarioId: record.funcionarioId,
		valorSolicitado: new Decimal(record.valorSolicitado).toNumber(),
		numeroParcelas: record.numeroParcelas,
		valorParcela,
		status: record.status,
		motivoRejeicao: record.motivoRejeicao,
		parcelas: datasVencimento.map((dataVencimento, index) => ({
			numero: index + 1,
			valor: valorParcela,
			dataVencimento,
		})),
		createdAt: record.createdAt.toISOString(),
	};
}
