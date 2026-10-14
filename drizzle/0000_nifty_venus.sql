CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text NOT NULL,
	"razao_social" text NOT NULL,
	"representante_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "empresas_representante_id_unique" UNIQUE("representante_id"),
	CONSTRAINT "empresas_conta_id_unique" UNIQUE("conta_id")
);
--> statement-breakpoint
CREATE TABLE "funcionarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"salario" integer NOT NULL,
	"conta_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funcionarios_pessoa_id_unique" UNIQUE("pessoa_id"),
	CONSTRAINT "funcionarios_conta_id_unique" UNIQUE("conta_id")
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"senha" text NOT NULL,
	CONSTRAINT "contas_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pessoas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_completo" text NOT NULL,
	"cpf" text NOT NULL,
	CONSTRAINT "pessoas_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_representante_id_pessoas_id_fk" FOREIGN KEY ("representante_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;