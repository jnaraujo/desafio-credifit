import { eq, sql } from "drizzle-orm";
import { db } from "@/database/connection";
import {
	autorizacoesConsulta,
	contas,
	funcionarios,
	pessoas,
} from "@/database/schema";
import {
	CadastroDuplicateError,
	getForeignKeyConstraintError,
	getUniqueConstraintError,
} from "@/errors/cadastro-duplicate-error";
import { EmpresaNotFoundError } from "@/errors/empresa-not-found-error";
import { FuncionarioNotFoundError } from "@/errors/funcionario-not-found-error";
import { CreateFuncionarioBody } from "@/schemas/funcionarios";
import { hashPassword } from "@/utils/auth";

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
					salario: data.salario,
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
		.select()
		.from(funcionarios)
		.where(eq(funcionarios.id, funcionarioId));
	return funcionario ?? null;
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
