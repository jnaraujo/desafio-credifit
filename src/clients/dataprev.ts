import axios from "axios";
import { DATAPREV_TIMEOUT_MS } from "@/constants/dataprev";
import { env } from "@/env";
import { DataprevUnavailableError } from "@/errors/margem-errors";
import {
	dataprevEmpresaStatusSchema,
	dataprevFuncionarioScoreSchema,
} from "@/schemas/dataprev";

const dataprevApi = axios.create({
	baseURL: env.DATAPREV_BASE_URL,
	timeout: DATAPREV_TIMEOUT_MS,
});

export async function checkEmpresaHabilitada(cnpj: string) {
	try {
		const response = await dataprevApi.get(
			`/empresa/${encodeURIComponent(cnpj)}/status`,
		);

		const body = dataprevEmpresaStatusSchema.parse(response.data);
		return body.habilitada;
	} catch (error: unknown) {
		throw new DataprevUnavailableError({ cause: error });
	}
}

export async function getFuncionarioScore(cpf: string) {
	try {
		const response = await dataprevApi.get(
			`/funcionario/${encodeURIComponent(cpf)}/score`,
		);

		const body = dataprevFuncionarioScoreSchema.parse(response.data);
		return body.score;
	} catch (error: unknown) {
		throw new DataprevUnavailableError({ cause: error });
	}
}
