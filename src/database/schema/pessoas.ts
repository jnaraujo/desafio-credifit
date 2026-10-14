import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const pessoas = pgTable("pessoas", {
	id: uuid("id").primaryKey().defaultRandom(),

	nomeCompleto: text("nome_completo").notNull(),
	cpf: text("cpf").unique().notNull(),
});

export const contas = pgTable("contas", {
	id: uuid("id").primaryKey().defaultRandom(),

	email: text("email").unique().notNull(),
	senha: text("senha").notNull(),
});
