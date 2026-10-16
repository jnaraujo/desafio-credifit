import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
	max: env.DB_MAX_CONNECTIONS,
});

export const db = drizzle(client, {
	schema,
});

type TransactionCallback = Parameters<typeof db.transaction>[0];
export type DbTransaction = Parameters<TransactionCallback>[0];
