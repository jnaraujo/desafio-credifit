import { z } from "zod";

export const defaultErrorSchema = z.object({
	message: z.string(),
});
