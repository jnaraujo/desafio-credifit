import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(pass: string) {
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);

	// Recomendacoes baseadas em https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
	return hash(pass, {
		memoryCost: 19 * 1024,
		timeCost: 2,
		parallelism: 1,
		salt: salt,
	});
}

export function comparePasswordHash(pass: string, hashed: string) {
	return verify(hashed, pass);
}
