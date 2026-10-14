import Decimal from "decimal.js";
import { and, eq, gt, sql } from "drizzle-orm";
import { checkEmpresaHabilitada } from "@/clients/dataprev";
import { db } from "@/database/connection";
import {
	autorizacoesConsulta,
	contas,
	empresas,
	emprestimos,
	funcionarios,
	pessoas,
	type StatusEmprestimo,
} from "@/database/schema";
import {
	CadastroDuplicateError,
	getForeignKeyConstraintError,
	getUniqueConstraintError,
} from "@/errors/cadastro-duplicate-error";
import { EmpresaNotFoundError } from "@/errors/empresa-not-found-error";
import { FuncionarioNotFoundError } from "@/errors/funcionario-not-found-error";
import {
	AutorizacaoConsultaRequiredError,
	EmpresaNotEnabledError,
} from "@/errors/margem-errors";
import { CreateFuncionarioBody } from "@/schemas/funcionarios";
import { hashPassword } from "@/utils/auth";
import { calculateMargem } from "@/utils/margem";

export async function createFuncionario(data: CreateFuncionarioBody) {
	try {
		return await db.transaction(async (tx) => {
			const [novaPessoa] = await tx
				.insert(pessoas)
				.values({
					nomeCompleto: data.nomeCompleto,
					cpf: data.cpf,
				})
				.returning();

			if (!novaPessoa) {
				throw new Error("Erro ao criar funcionário.");
			}

			const [novaConta] = await tx
				.insert(contas)
				.values({
					email: data.email,
					senha: await hashPassword(data.senha),
				})
				.returning();

			if (!novaConta) {
				throw new Error("Erro ao criar funcionário.");
			}

			const [novoFuncionario] = await tx
				.insert(funcionarios)
				.values({
					pessoaId: novaPessoa.id,
					empresaId: data.empresaId,
					contaId: novaConta.id,
					salario: new Decimal(data.salario).toString(),
				})
				.returning();

			if (!novoFuncionario) {
				throw new Error("Erro ao criar o funcionário.");
			}

			return {
				...novoFuncionario,
				email: novaConta.email,
				cpf: novaPessoa.cpf,
				nome: novaPessoa.nomeCompleto,
			};
		});
	} catch (error: unknown) {
		const foreignKeyConstraintError = getForeignKeyConstraintError(error);
		if (
			foreignKeyConstraintError?.constraint_name ===
			"funcionarios_empresa_id_empresas_id_fk"
		) {
			throw new EmpresaNotFoundError({ cause: error });
		}

		const uniqueConstraintError = getUniqueConstraintError(error);
		switch (uniqueConstraintError?.constraint_name) {
			case "pessoas_cpf_unique":
				throw new CadastroDuplicateError("CPF já cadastrado", {
					cause: error,
				});
			case "contas_email_unique":
				throw new CadastroDuplicateError("Email já cadastrado", {
					cause: error,
				});
		}

		throw error;
	}
}

export async function findFuncionarioById(funcionarioId: string) {
	const [funcionario] = await db
		.select({
			id: funcionarios.id,
			salario: funcionarios.salario,
			cnpj: empresas.cnpj,
			nome: pessoas.nomeCompleto,
			cpf: pessoas.cpf,
		})
		.from(funcionarios)
		.innerJoin(empresas, eq(funcionarios.empresaId, empresas.id))
		.innerJoin(pessoas, eq(funcionarios.pessoaId, pessoas.id))
		.where(eq(funcionarios.id, funcionarioId));

	if (!funcionario) {
		throw new FuncionarioNotFoundError();
	}

	return funcionario;
}

export async function authorizeConsultaDataprev(funcionarioId: string) {
	try {
		const [autorizacao] = await db
			.insert(autorizacoesConsulta)
			.values({
				funcionarioId,
				expiraEm: sql`NOW() + INTERVAL '24 hours'`,
			})
			.returning();

		if (!autorizacao) {
			throw new Error("Erro ao criar autorização de consulta.");
		}

		return autorizacao;
	} catch (error: unknown) {
		const foreignKeyConstraintError = getForeignKeyConstraintError(error);
		if (
			foreignKeyConstraintError?.constraint_name ===
			"autorizacoes_consulta_funcionario_id_funcionarios_id_fk"
		) {
			throw new FuncionarioNotFoundError({ cause: error });
		}

		throw error;
	}
}

export async function findAutorizacaoAtivaByFuncionarioId(
	funcionarioId: string,
) {
	const [autorizacaoAtiva] = await db
		.select()
		.from(autorizacoesConsulta)
		.where(
			and(
				eq(autorizacoesConsulta.funcionarioId, funcionarioId),
				gt(autorizacoesConsulta.expiraEm, sql`NOW()`),
			),
		)
		.limit(1);

	return autorizacaoAtiva ?? null;
}

export async function findEmprestimosByFuncionarioId(
	funcionarioId: string,
	status?: StatusEmprestimo,
) {
	const emprestimosDoFuncionario = await db
		.select()
		.from(emprestimos)
		.where(
			and(
				eq(emprestimos.funcionarioId, funcionarioId),
				status ? eq(emprestimos.status, status) : sql`1=1`,
			),
		);

	return emprestimosDoFuncionario;
}

export async function getFuncionarioMargem(funcionarioId: string) {
	const funcionario = await findFuncionarioById(funcionarioId);

	const autorizacaoAtiva =
		await findAutorizacaoAtivaByFuncionarioId(funcionarioId);

	if (!autorizacaoAtiva) {
		throw new AutorizacaoConsultaRequiredError();
	}

	const empresaHabilitada = await checkEmpresaHabilitada(funcionario.cnpj);
	if (!empresaHabilitada) {
		throw new EmpresaNotEnabledError();
	}

	const emprestimosAprovados = await findEmprestimosByFuncionarioId(
		funcionarioId,
		"aprovado",
	);

	const margem = calculateMargem(
		funcionario.salario,
		emprestimosAprovados.map((emprestimo) => emprestimo.valorParcela),
	);

	return {
		funcionarioId: funcionario.id,
		salario: funcionario.salario,
		...margem,
	};
}
