import {
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { funcionarios } from "./funcionarios";

export const statusEmprestimoEnum = pgEnum("status_emprestimo", [
	"aprovado",
	"rejeitado",
	"erro_processamento",
]);

export const emprestimos = pgTable("emprestimos", {
	id: uuid("id").primaryKey().defaultRandom(),
	funcionarioId: uuid("funcionario_id")
		.notNull()
		.references(() => funcionarios.id),
	valorSolicitado: numeric("valor_solicitado").notNull(),
	numeroParcelas: integer("numero_parcelas").notNull(),
	valorParcela: numeric("valor_parcela").notNull(),
	status: statusEmprestimoEnum("status").notNull(),
	motivoRejeicao: text("motivo_rejeicao"),
	createdAt: timestamp("created_at", {
		withTimezone: true,
	})
		.notNull()
		.defaultNow(),
});

export type StatusEmprestimo = (typeof statusEmprestimoEnum.enumValues)[number];
