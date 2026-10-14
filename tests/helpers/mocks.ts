import { env } from "@/env";

export type MockScenario =
	| "healthy"
	| "dataprev-down"
	| "dataprev-slow"
	| "gateway-down"
	| "gateway-rejected";

export async function setMockScenario(name: MockScenario) {
	const response = await fetch(
		new URL("/admin/scenario", env.DATAPREV_BASE_URL),
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name }),
		},
	);

	if (!response.ok) {
		throw new Error(`Não foi possível definir o cenário do mock: ${name}`);
	}
}
