import { DrizzleQueryError } from "drizzle-orm/errors";
import postgres from "postgres";

export class CadastroDuplicadoError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "CadastroDuplicadoError";
	}
}

export function getUniqueConstraintError(error: unknown) {
	const databaseError =
		error instanceof DrizzleQueryError ? error.cause : error;

	if (
		databaseError instanceof postgres.PostgresError &&
		databaseError.code === "23505"
	) {
		return databaseError;
	}

	return undefined;
}

export function getForeignKeyConstraintError(error: unknown) {
	const databaseError =
		error instanceof DrizzleQueryError ? error.cause : error;

	if (
		databaseError instanceof postgres.PostgresError &&
		databaseError.code === "23503"
	) {
		return databaseError;
	}

	return undefined;
}
