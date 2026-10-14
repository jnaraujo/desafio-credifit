import { db } from "@/database/connection";
import { contas, funcionarios, pessoas } from "@/database/schema";
import {
	CadastroDuplicadoError,
	getForeignKeyConstraintError,
	getUniqueConstraintError,
} from "@/errors/cadastro-duplicado-error";
import { EmpresaNaoEncontradaError } from "@/errors/empresa-nao-encontrada-error";
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
			throw new EmpresaNaoEncontradaError({ cause: error });
		}

		const uniqueConstraintError = getUniqueConstraintError(error);
		switch (uniqueConstraintError?.constraint_name) {
			case "pessoas_cpf_unique":
				throw new CadastroDuplicadoError("CPF já cadastrado", {
					cause: error,
				});
			case "contas_email_unique":
				throw new CadastroDuplicadoError("Email já cadastrado", {
					cause: error,
				});
		}

		throw error;
	}
}
