import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getTestDatabaseUrl } from "./database-url";

const client = postgres(getTestDatabaseUrl(), { max: 1 });

try {
	await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
} finally {
	await client.end();
}
