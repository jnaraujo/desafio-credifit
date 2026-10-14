import { db } from "@/database/connection";
import { contas, empresas, pessoas } from "@/database/schema";
import {
	CadastroDuplicadoError,
	getUniqueConstraintError,
} from "@/errors/cadastro-duplicado-error";
import type { CreateEmpresaBody } from "@/schemas/empresas";
import { hashPassword } from "@/utils/auth";

export async function createEmpresa(data: CreateEmpresaBody) {
	try {
		return await db.transaction(async (tx) => {
			const [novaPessoa] = await tx
				.insert(pessoas)
				.values({
					nomeCompleto: data.nomeRepresentante,
					cpf: data.cpfRepresentante,
				})
				.returning();

			if (!novaPessoa) {
				throw new Error("Erro ao criar a pessoa representante da empresa.");
			}

			const [novaConta] = await tx
				.insert(contas)
				.values({
					email: data.email,
					senha: await hashPassword(data.senha),
				})
				.returning();

			if (!novaConta) {
				throw new Error("Erro ao criar a conta da empresa.");
			}

			const [novaEmpresa] = await tx
				.insert(empresas)
				.values({
					cnpj: data.cnpj,
					representanteId: novaPessoa.id,
					razaoSocial: data.razaoSocial,
					contaId: novaConta.id,
				})
				.returning();

			if (!novaEmpresa) {
				throw new Error("Erro ao criar a empresa.");
			}

			return {
				...novaEmpresa,
				representante: {
					...novaPessoa,
					email: novaConta.email,
				},
			};
		});
	} catch (error: unknown) {
		const uniqueConstraintError = getUniqueConstraintError(error);

		switch (uniqueConstraintError?.constraint_name) {
			case "empresas_cnpj_unique":
				throw new CadastroDuplicadoError("CNPJ já cadastrado", {
					cause: error,
				});
			case "pessoas_cpf_unique":
				throw new CadastroDuplicadoError("CPF já cadastrado", {
					cause: error,
				});
			case "contas_email_unique":
				throw new CadastroDuplicadoError("E-mail já cadastrado", {
					cause: error,
				});
		}

		throw error;
	}
}
