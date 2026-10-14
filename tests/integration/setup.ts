import postgres from "postgres";
import { afterAll, beforeEach } from "vitest";
import { getTestDatabaseUrl } from "@/test/database-url";

const database = postgres(getTestDatabaseUrl(), { max: 1 });

beforeEach(async () => {
	await database`
		TRUNCATE TABLE
			"emprestimos",
			"autorizacoes_consulta",
			"empresas",
			"funcionarios",
			"pessoas",
			"contas"
		RESTART IDENTITY CASCADE
	`;
});

afterAll(async () => {
	await database.end();
});
