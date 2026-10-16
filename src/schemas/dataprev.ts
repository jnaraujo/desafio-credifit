import { z } from "zod";

export const dataprevEmpresaStatusSchema = z.object({
	habilitada: z.boolean(),
});

export const dataprevFuncionarioScoreSchema = z.object({
	cpf: z.string(),
	score: z.number().int().min(0),
});
