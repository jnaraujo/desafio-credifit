import { z } from "zod";

export const dataprevEmpresaStatusSchema = z.object({
	habilitada: z.boolean(),
});
