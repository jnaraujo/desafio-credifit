import { z } from "zod";

export const cpfSchema = z
	.string()
	.length(11, { message: "CPF precisa ter 11 dígitos" })
	.regex(/^\d{11}$/, { message: "CPF precisa conter apenas dígitos" });
