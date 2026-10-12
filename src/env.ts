import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().url(),
	DATAPREV_BASE_URL: z.string().url(),
	GATEWAY_BASE_URL: z.string().url(),

	DB_MAX_CONNECTIONS: z.coerce.number().min(1).max(100).default(10),

	PORT: z.coerce.number().min(1).max(65535).default(3000),
});

export const env = envSchema.parse(process.env);
