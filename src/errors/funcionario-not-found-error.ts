export class FuncionarioNotFound extends Error {
	constructor(options?: ErrorOptions) {
		super("Funcionário não encontrado", options);
		this.name = "FuncionarioNotFound";
	}
}
