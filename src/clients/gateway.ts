import axios from "axios";
import { GATEWAY_TIMEOUT_MS } from "@/constants/emprestimos";
import { env } from "@/env";
import { GatewayUnavailableError } from "@/errors/gateway-errors";
import { gatewayPagamentoResponseSchema } from "@/schemas/gateway";

const gatewayApi = axios.create({
	baseURL: env.GATEWAY_BASE_URL,
	timeout: GATEWAY_TIMEOUT_MS,
});

export async function processarPagamento(
	valor: number,
	funcionarioCpf: string,
) {
	try {
		const response = await gatewayApi.post("/pagamento", {
			valor,
			funcionarioCpf,
		});

		return gatewayPagamentoResponseSchema.parse(response.data);
	} catch (error: unknown) {
		throw new GatewayUnavailableError({ cause: error });
	}
}
