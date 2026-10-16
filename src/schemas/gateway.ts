import { z } from "zod";

export const gatewayPagamentoResponseSchema = z.object({
	status: z.enum(["aprovado", "recusado"]),
	motivo: z.string().optional(),
});
