import { env } from "@/env";
import { createApp } from "@/http/app";

async function startServer() {
	const app = await createApp();

	await app.listen({
		port: env.PORT,
		host: "0.0.0.0",
	});

	console.log(`🔥 Server is running on port ${env.PORT}`);
}

startServer();
