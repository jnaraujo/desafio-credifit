import { DATAPREV_TIMEOUT_MS } from "@/constants/dataprev";
import { env } from "@/env";
import { DataprevUnavailableError } from "@/errors/margem-errors";
import { dataprevEmpresaStatusSchema } from "@/schemas/dataprev";

export async function checkEmpresaHabilitada(cnpj: string) {
	try {
		const response = await fetch(
			`${env.DATAPREV_BASE_URL}/empresa/${encodeURIComponent(cnpj)}/status`,
			{
				signal: AbortSignal.timeout(DATAPREV_TIMEOUT_MS),
			},
		);

		if (!response.ok) {
			throw new Error(`Dataprev respondeu com status ${response.status}`);
		}

		const body = dataprevEmpresaStatusSchema.parse(await response.json());
		return body.habilitada;
	} catch (error: unknown) {
		throw new DataprevUnavailableError({ cause: error });
	}
}
