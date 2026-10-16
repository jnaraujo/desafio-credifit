export class GatewayUnavailableError extends Error {
	constructor(options?: ErrorOptions) {
		super("Gateway de pagamento indisponível", options);
		this.name = "GatewayUnavailableError";
	}
}
