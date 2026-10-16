import Decimal from "decimal.js";
import { and, asc, eq } from "drizzle-orm";
import {
	checkEmpresaHabilitada,
	getFuncionarioScore,
} from "@/clients/dataprev";
import { processarPagamento } from "@/clients/gateway";
import { type DbTransaction, db } from "@/database/connection";
import {
	emprestimos,
	funcionarios,
	type StatusEmprestimo,
} from "@/database/schema";
import { FuncionarioNotFoundError } from "@/errors/funcionario-not-found-error";
import { GatewayUnavailableError } from "@/errors/gateway-errors";
import {
	AutorizacaoConsultaRequiredError,
	EmpresaNotEnabledError,
	MargemInsuficienteError,
} from "@/errors/margem-errors";
import type {
	SimulateEmprestimoBody,
	SolicitarEmprestimoBody,
} from "@/schemas/emprestimos";
import {
	findAutorizacaoAtivaByFuncionarioId,
	findEmprestimosByFuncionarioId,
	findFuncionarioById,
} from "@/services/funcionarios";
import {
	calculateOpcoesParcelas,
	calculateValorParcela,
	verificarElegibilidadeEmprestimo,
} from "@/utils/emprestimos";
import { calculateMargem } from "@/utils/margem";

export async function simulateEmprestimo(simulation: SimulateEmprestimoBody) {
	const funcionario = await findFuncionarioById(simulation.funcionarioId);
	if (!funcionario) {
		throw new FuncionarioNotFoundError();
	}

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
	if (valorSolicitado.greaterThan(margem.margemDisponivel)) {
		throw new MargemInsuficienteError();
	}

	const parcelas = calculateOpcoesParcelas(valorSolicitado);

	return {
		funcionarioId: funcionario.id,
		valorSolicitado,
		margemDisponivel: margem.margemDisponivel,
		parcelas,
	};
}

export async function solicitarEmprestimo(data: SolicitarEmprestimoBody) {
	const funcionario = await findFuncionarioById(data.funcionarioId);
	if (!funcionario) {
		throw new FuncionarioNotFoundError();
	}

	const autorizacaoAtiva = await findAutorizacaoAtivaByFuncionarioId(
		funcionario.id,
	);
	if (!autorizacaoAtiva) {
		throw new AutorizacaoConsultaRequiredError();
	}

	const empresaHabilitada = await checkEmpresaHabilitada(funcionario.cnpj);
	if (!empresaHabilitada) {
		throw new EmpresaNotEnabledError();
	}

	const score = await getFuncionarioScore(funcionario.cpf);
	const valorSolicitado = new Decimal(data.valorSolicitado);
	const valorParcela = calculateValorParcela(
		valorSolicitado,
		data.numeroParcelas,
	);

	return db.transaction(async (tx) => {
		await lockFuncionario(tx, funcionario.id);

		const emprestimosAtivos = await findEmprestimosAtivos(tx, funcionario.id);

		const margem = calculateMargem(
			funcionario.salario,
			emprestimosAtivos.map((emprestimo) => emprestimo.valorParcela),
		);

		const elegibilidade = verificarElegibilidadeEmprestimo({
			score,
			salario: funcionario.salario,
			valorSolicitado,
			margemDisponivel: margem.margemDisponivel,
			quantidadeEmprestimosAtivos: emprestimosAtivos.length,
		});

		let resultado: ResultadoEmprestimo;
		if (!elegibilidade.isEligible) {
			resultado = {
				status: "rejeitado",
				motivoRejeicao: elegibilidade.motivoRejeicao,
			};
		} else {
			resultado = await processarPagamentoEmprestimo(
				valorSolicitado,
				funcionario.cpf,
			);
		}

		return saveEmprestimo(tx, {
			funcionarioId: funcionario.id,
			valorSolicitado,
			numeroParcelas: data.numeroParcelas,
			valorParcela,
			resultado,
		});
	});
}

export async function listEmprestimos(filters: {
	funcionarioId?: string;
	status?: StatusEmprestimo;
}) {
	const conditions = [];
	if (filters.funcionarioId) {
		conditions.push(eq(emprestimos.funcionarioId, filters.funcionarioId));
	}
	if (filters.status) {
		conditions.push(eq(emprestimos.status, filters.status));
	}

	return db
		.select()
		.from(emprestimos)
		.where(and(...conditions))
		.orderBy(asc(emprestimos.createdAt), asc(emprestimos.id));
}

export async function getEmprestimoById(emprestimoId: string) {
	const [emprestimo] = await db
		.select()
		.from(emprestimos)
		.where(eq(emprestimos.id, emprestimoId))
		.limit(1);

	return emprestimo ?? null;
}

type ResultadoEmprestimo =
	| { status: "aprovado"; motivoRejeicao: null }
	| { status: "rejeitado"; motivoRejeicao: string }
	| { status: "erro_processamento"; motivoRejeicao: null };

async function lockFuncionario(tx: DbTransaction, funcionarioId: string) {
	await tx
		.select({ id: funcionarios.id })
		.from(funcionarios)
		.where(eq(funcionarios.id, funcionarioId))
		.for("update");
}

async function findEmprestimosAtivos(tx: DbTransaction, funcionarioId: string) {
	return tx
		.select({ valorParcela: emprestimos.valorParcela })
		.from(emprestimos)
		.where(
			and(
				eq(emprestimos.funcionarioId, funcionarioId),
				eq(emprestimos.status, "aprovado"),
			),
		);
}

async function processarPagamentoEmprestimo(
	valorSolicitado: Decimal,
	funcionarioCpf: string,
): Promise<ResultadoEmprestimo> {
	try {
		const pagamento = await processarPagamento(
			valorSolicitado.toNumber(),
			funcionarioCpf,
		);

		if (pagamento.status === "recusado") {
			return {
				status: "rejeitado",
				motivoRejeicao: "Pagamento recusado pelo gateway",
			};
		}

		return { status: "aprovado", motivoRejeicao: null };
	} catch (error: unknown) {
		if (!(error instanceof GatewayUnavailableError)) {
			throw error;
		}

		return { status: "erro_processamento", motivoRejeicao: null };
	}
}

async function saveEmprestimo(
	tx: DbTransaction,
	data: {
		funcionarioId: string;
		valorSolicitado: Decimal;
		numeroParcelas: number;
		valorParcela: Decimal;
		resultado: ResultadoEmprestimo;
	},
) {
	const [emprestimoCriado] = await tx
		.insert(emprestimos)
		.values({
			funcionarioId: data.funcionarioId,
			valorSolicitado: data.valorSolicitado.toString(),
			numeroParcelas: data.numeroParcelas,
			valorParcela: data.valorParcela.toString(),
			status: data.resultado.status,
			motivoRejeicao: data.resultado.motivoRejeicao,
		})
		.returning();

	if (!emprestimoCriado) {
		throw new Error("Erro ao salvar o empréstimo.");
	}

	return emprestimoCriado;
}
