import Decimal from "decimal.js";
import {
	AutorizacaoConsultaRequiredError,
	MargemInsuficienteError,
} from "@/errors/margem-errors";
import type { SimulateEmprestimoBody } from "@/schemas/emprestimos";
import {
	findAutorizacaoAtivaByFuncionarioId,
	findEmprestimosByFuncionarioId,
	findFuncionarioById,
} from "@/services/funcionarios";
import { calculateOpcoesParcelas } from "@/utils/emprestimos";
import { calculateMargem } from "@/utils/margem";

export async function simulateEmprestimo(simulation: SimulateEmprestimoBody) {
	const funcionario = await findFuncionarioById(simulation.funcionarioId);

	const autorizacaoAtiva = await findAutorizacaoAtivaByFuncionarioId(
		funcionario.id,
	);

	if (!autorizacaoAtiva) {
		throw new AutorizacaoConsultaRequiredError();
	}

	const emprestimosAprovados = await findEmprestimosByFuncionarioId(
		funcionario.id,
		"aprovado",
	);

	const margem = calculateMargem(
		funcionario.salario,
		emprestimosAprovados.map((emprestimo) => emprestimo.valorParcela),
	);

	const valorSolicitado = new Decimal(simulation.valorSolicitado);

	const parcelas = calculateOpcoesParcelas(
		valorSolicitado,
		margem.margemDisponivel,
	);

	if (parcelas.length === 0) {
		throw new MargemInsuficienteError();
	}

	return {
		funcionarioId: funcionario.id,
		valorSolicitado,
		margemDisponivel: margem.margemDisponivel,
		parcelas,
	};
}
