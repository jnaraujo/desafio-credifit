export class EmpresaNotFoundError extends Error {
	constructor(options?: ErrorOptions) {
		super("Empresa não encontrada", options);
		this.name = "EmpresaNotFoundError";
	}
}
