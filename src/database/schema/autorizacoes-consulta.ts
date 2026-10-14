import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { funcionarios } from "./funcionarios";

export const autorizacoesConsulta = pgTable("autorizacoes_consulta", {
	id: uuid("id").primaryKey().defaultRandom(),
	funcionarioId: uuid("funcionario_id")
		.notNull()
		.references(() => funcionarios.id),
	concedidaEm: timestamp("concedida_em", {
		withTimezone: true,
	})
		.notNull()
		.defaultNow(),
	expiraEm: timestamp("expira_em", {
		withTimezone: true,
	}).notNull(),
});
