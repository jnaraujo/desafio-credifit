import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

// ============================================================
// Estado interno do mock (controlável via /admin/scenario)
// ============================================================
let scenario = "healthy";

const SCENARIOS = [
  "healthy",
  "dataprev-down",
  "dataprev-slow",
  "gateway-down",
  "gateway-rejected",
] as const;

// ============================================================
// ADMIN — Controle de cenários (usado pelo avaliador)
// ============================================================
app.post("/admin/scenario", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!SCENARIOS.includes(name)) {
    res.status(400).json({
      message: `Cenário inválido. Opções: ${SCENARIOS.join(", ")}`,
    });
    return;
  }
  scenario = name;
  console.log(`[MOCK] Cenário alterado para: ${scenario}`);
  res.json({ scenario });
});

app.get("/admin/scenario", (_req: Request, res: Response) => {
  res.json({ scenario });
});

// ============================================================
// DATAPREV — Verificar se empresa está habilitada no e-Consignado
// ============================================================
app.get(
  "/dataprev/empresa/:cnpj/status",
  async (req: Request, res: Response) => {
    if (scenario === "dataprev-down") {
      res.status(503).json({ message: "Serviço temporariamente indisponível" });
      return;
    }

    if (scenario === "dataprev-slow") {
      await sleep(5000);
    }

    const { cnpj } = req.params;

    // CNPJs terminados em "0000" não estão habilitados
    // Todos os outros estão habilitados
    const habilitada = !cnpj.endsWith("0000");

    res.json({ cnpj, habilitada });
  }
);

// ============================================================
// DATAPREV — Consultar score de crédito do funcionário
// ============================================================
app.get(
  "/dataprev/funcionario/:cpf/score",
  async (req: Request, res: Response) => {
    if (scenario === "dataprev-down") {
      res.status(503).json({ message: "Serviço temporariamente indisponível" });
      return;
    }

    if (scenario === "dataprev-slow") {
      await sleep(5000);
    }

    const { cpf } = req.params;

    // Score determinístico baseado no CPF para testes reproduzíveis:
    // - CPFs terminados em "00": score 300 (baixo)
    // - CPFs terminados em "50": score 500 (médio)
    // - CPFs terminados em "99": score 900 (alto)
    // - Demais: score 650 (padrão)
    let score = 650;
    const lastTwo = cpf.slice(-2);
    if (lastTwo === "00") score = 300;
    else if (lastTwo === "50") score = 500;
    else if (lastTwo === "99") score = 900;

    res.json({ cpf, score });
  }
);

// ============================================================
// GATEWAY — Processar pagamento
// ============================================================
app.post("/gateway/pagamento", async (req: Request, res: Response) => {
  if (scenario === "gateway-down") {
    res.status(503).json({ message: "Gateway indisponível" });
    return;
  }

  if (scenario === "gateway-rejected") {
    res.json({
      status: "recusado",
      motivo: "Saldo insuficiente na conta de origem",
    });
    return;
  }

  const { valor, funcionarioCpf } = req.body;

  console.log(
    `[MOCK GATEWAY] Pagamento de R$ ${valor} para CPF ${funcionarioCpf}`
  );

  res.json({
    status: "aprovado",
    transacaoId: generateUUID(),
    valor,
    processadoEm: new Date().toISOString(),
  });
});

// ============================================================
// Health check
// ============================================================
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", scenario });
});

// ============================================================
// Start
// ============================================================
const PORT = process.env.MOCK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[MOCK] Servidor de mocks rodando na porta ${PORT}`);
  console.log(`[MOCK] Cenário atual: ${scenario}`);
  console.log(`[MOCK] Endpoints disponíveis:`);
  console.log(`  GET  /dataprev/empresa/:cnpj/status`);
  console.log(`  GET  /dataprev/funcionario/:cpf/score`);
  console.log(`  POST /gateway/pagamento`);
  console.log(`  POST /admin/scenario`);
  console.log(`  GET  /admin/scenario`);
  console.log(`  GET  /health`);
});

// ============================================================
// Helpers
// ============================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
