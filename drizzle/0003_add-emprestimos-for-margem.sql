CREATE TYPE "public"."status_emprestimo" AS ENUM('aprovado', 'rejeitado', 'erro_processamento');--> statement-breakpoint
CREATE TABLE "emprestimos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funcionario_id" uuid NOT NULL,
	"valor_solicitado" numeric NOT NULL,
	"numero_parcelas" integer NOT NULL,
	"valor_parcela" numeric NOT NULL,
	"status" "status_emprestimo" NOT NULL,
	"motivo_rejeicao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_funcionario_id_funcionarios_id_fk" FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionarios"("id") ON DELETE no action ON UPDATE no action;