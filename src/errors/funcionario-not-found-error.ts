export class FuncionarioNotFoundError extends Error {
	constructor(options?: ErrorOptions) {
		super("Funcionário não encontrado", options);
		this.name = "FuncionarioNotFoundError";
	}
}
