import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const testDatabaseName = "credifit_credito_test";
const testEnvPath = fileURLToPath(new URL("../../.env.test", import.meta.url));

export function getTestDatabaseUrl() {
	const { error } = config({ path: testEnvPath, override: true });
	if (error) {
		throw new Error(`Não foi possível carregar .env.test: ${error.message}`);
	}

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL não está definido em .env.test");
	}

	const parsedUrl = new URL(databaseUrl);
	const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
	if (databaseName !== testDatabaseName) {
		throw new Error(
			`Operação cancelada: o banco de testes precisa se chamar ${testDatabaseName}`,
		);
	}

	return databaseUrl;
}
