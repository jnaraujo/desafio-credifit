import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { empresas } from "./empresas";
import { contas, pessoas } from "./pessoas";

export const funcionarios = pgTable("funcionarios", {
	id: uuid("id").primaryKey().defaultRandom(),

	pessoaId: uuid("pessoa_id")
		.unique()
		.notNull()
		.references(() => pessoas.id),
	salario: numeric("salario", { mode: "number" }).notNull(),

	contaId: uuid("conta_id")
		.notNull()
		.unique()
		.references(() => contas.id),
	empresaId: uuid("empresa_id")
		.notNull()
		.references(() => empresas.id),

	createdAt: timestamp("created_at", {
		withTimezone: true,
	})
		.notNull()
		.defaultNow(),
});
