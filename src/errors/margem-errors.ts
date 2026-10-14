export class AutorizacaoConsultaRequiredError extends Error {
	constructor(options?: ErrorOptions) {
		super("Autorização de consulta ausente ou expirada", options);
		this.name = "AutorizacaoConsultaRequiredError";
	}
}

export class EmpresaNotEnabledError extends Error {
	constructor(options?: ErrorOptions) {
		super("Empresa não habilitada no e-Consignado", options);
		this.name = "EmpresaNotEnabledError";
	}
}

export class MargemInsuficienteError extends Error {
	constructor(options?: ErrorOptions) {
		super("Nenhuma opção de parcelamento cabe na margem disponível", options);
		this.name = "MargemInsuficienteError";
	}
}

export class DataprevUnavailableError extends Error {
	constructor(options?: ErrorOptions) {
		super("Dataprev indisponível", options);
		this.name = "DataprevUnavailableError";
	}
}
