import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contas, pessoas } from "./pessoas";

export const empresas = pgTable("empresas", {
	id: uuid("id").primaryKey().defaultRandom(),
	cnpj: text("cnpj").unique().notNull(),
	razaoSocial: text("razao_social").notNull(),

	representanteId: uuid("representante_id")
		.notNull()
		.unique()
		.references(() => pessoas.id),

	contaId: uuid("conta_id")
		.notNull()
		.unique()
		.references(() => contas.id),

	createdAt: timestamp("created_at", {
		withTimezone: true,
	})
		.notNull()
		.defaultNow(),
});
