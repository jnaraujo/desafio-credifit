import type { CreateEmpresaBody } from "@/schemas/empresas";
import type { CreateFuncionarioBody } from "@/schemas/funcionarios";

export const empresaValida: CreateEmpresaBody = {
	cnpj: "12345678000100",
	razaoSocial: "Tech Solutions Ltda",
	nomeRepresentante: "João da Silva",
	cpfRepresentante: "12345678900",
	email: "joao@techsolutions.com",
	senha: "senhaSegura123",
};

export const empresaIdInexistente = "00000000-0000-4000-8000-000000000001";

export function funcionarioValido(
	empresaId: string,
	overrides: Partial<CreateFuncionarioBody> = {},
): CreateFuncionarioBody {
	return {
		nomeCompleto: "Maria Oliveira",
		cpf: "98765432100",
		email: "maria@techsolutions.com",
		senha: "senhaSegura123",
		salario: 5000,
		empresaId,
		...overrides,
	};
}
