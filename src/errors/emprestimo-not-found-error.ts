export class EmprestimoNotFoundError extends Error {
	constructor(options?: ErrorOptions) {
		super("Empréstimo não encontrado", options);
		this.name = "EmprestimoNotFoundError";
	}
}
