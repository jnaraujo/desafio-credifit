export class EmpresaNaoEncontradaError extends Error {
	constructor(options?: ErrorOptions) {
		super("Empresa não encontrada", options);
		this.name = "EmpresaNaoEncontradaError";
	}
}
