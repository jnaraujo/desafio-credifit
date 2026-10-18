# Credifit — Crédito do Trabalhador

API REST desenvolvida para o desafio técnico da Credifit. Implementa o cadastro de empresas e funcionários, a autorização de consulta ao Dataprev, a simulação e a solicitação de empréstimos consignados, com processamento de pagamento por um gateway externo.

## Tecnologias

- **Node.js e TypeScript**, com **Fastify** para a API HTTP.
- **PostgreSQL 16** e **Drizzle ORM**, para banco de dados.
- **Zod** para validação de entradas, respostas e dados dos serviços externos.
- **Decimal.js** para cálculos monetários e **Argon2** para hash de senhas.
- **Axios** para integração com Dataprev e Gateway.
- **Vitest** para testes unitários e de integração; **Biome** para análise e formatação do código.
- **Docker Compose** para executar a API, o banco e os mocks.

## Executar com Docker

Para rodar o projeto, basta rodar:

```bash
docker compose up --build
```

O Compose aguarda os healthchecks do PostgreSQL e dos mocks. Em seguida, a API aplica as migrations automaticamente antes de iniciar. Não é necessário criar um `.env` para essa execução: as variáveis já estão definidas em `compose.yaml`.

| Serviço | Endereço |
| --- | --- |
| API | http://localhost:3000 |
| Dataprev | http://localhost:3001/dataprev |
| Gateway | http://localhost:3001/gateway |

Para conferir a API:

```bash
curl -i http://localhost:3000/emprestimos
```

Em um banco vazio, a resposta esperada é HTTP **200** com `{"data":[]}`.

Para encerrar os serviços, preservando os dados do banco:

```bash
docker compose down
```

O arquivo [`.env.example`](./.env.example) contém a configuração para desenvolvimento local.

| Variável | Exemplo local / padrão | Finalidade |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://credifit:credifit123@localhost:5432/credifit_credito` | Conexão com o PostgreSQL; obrigatória |
| `DATAPREV_BASE_URL` | `http://localhost:3001/dataprev` | Endereço do Dataprev; obrigatório |
| `GATEWAY_BASE_URL` | `http://localhost:3001/gateway` | Endereço do Gateway; obrigatório |
| `PORT` | `3000` | Porta da API; opcional |
| `DB_MAX_CONNECTIONS` | `10` | Limite de conexões do pool; opcional, entre 1 e 100 |

## Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/empresas` | Cadastrar empresa conveniada |
| `POST` | `/funcionarios` | Cadastrar funcionário vinculado a uma empresa |
| `POST` | `/funcionarios/:funcionarioId/autorizacao-consulta` | Conceder ou renovar autorização por 24 horas |
| `GET` | `/funcionarios/:funcionarioId/margem` | Consultar margem e verificar a habilitação da empresa |
| `POST` | `/emprestimos/simular` | Simular opções de 1 a 4 parcelas, sem consultar o Dataprev |
| `POST` | `/emprestimos` | Solicitar empréstimo e processar pagamento |
| `GET` | `/emprestimos` | Listar empréstimos, com filtros opcionais `funcionarioId` e `status` |
| `GET` | `/emprestimos/:emprestimoId` | Consultar empréstimo e suas parcelas |

Os payloads, schemas e códigos de resposta completos estão no [contrato OpenAPI](./api-contract.yaml).

## Testes e qualidade

Para executar os testes na máquina, instale as dependências com Node.js e pnpm:

```bash
pnpm install
pnpm test
```

O comando `pnpm test` prepara o ambiente automaticamente: recria o PostgreSQL de testes, aplica as migrations e recria o serviço de mocks antes de executar as suítes. A API não precisa estar rodando, pois os testes chamam diretamente as rotas do Fastify.

O banco de testes é **`credifit_credito_test`**, na porta **5433**, configurado em [`.env.test`](./.env.test). Ele usa armazenamento efêmero e suas tabelas são limpas entre os testes. A preparação verifica o nome do banco antes de utilizá-lo.

> Os mocks na porta 3001 são compartilhados com o ambiente de desenvolvimento. A preparação dos testes recria esse serviço, e a suíte altera seus cenários. Evite executar testes manuais simultaneamente.

| Comando | Finalidade |
| --- | --- |
| `pnpm test` | Preparar a infraestrutura e executar testes unitários e de integração |
| `pnpm test:coverage` | Executar os testes e gerar relatório em `coverage/` |

As suítes cobrem cálculos de margem, score, arredondamento e vencimentos, além de cadastros, unicidade global, autorização, filtros, rejeições, concorrência e falhas dos serviços externos.

## Estrutura e decisões técnicas

```text
src/
├── clients/          # Integrações HTTP com Dataprev e Gateway
├── constants/        # Limites e parâmetros das regras
├── database/         # Conexão e schemas do PostgreSQL
├── errors/           # Erros de domínio e de integração
├── http/             # Aplicação Fastify, rotas e mapeamento de respostas
├── schemas/          # Validações Zod
├── services/         # Casos de uso e acesso ao banco
├── test/             # Configuração e preparação do banco de testes
└── utils/            # Funções de cálculo e hash de senhas
tests/
├── unit/             # Testes das funções de negócio
└── integration/      # Testes das rotas e suas integrações
drizzle/              # Migrations e metadados versionados
mocks/                # Simuladores de Dataprev e Gateway
```

- **Unicidade no banco:** as tabelas compartilhadas `pessoas` e `contas` centralizam CPF e e-mail. Empresas e funcionários referenciam esses registros, e constraints garantem a unicidade durante os cadastros.
- **Transações nos cadastros:** conflitos não deixam pessoas ou contas parcialmente cadastradas.
- **Consistência nas solicitações:** uma transação com bloqueio da linha do funcionário (`SELECT ... FOR UPDATE`) serializa suas solicitações concorrentes antes de verificar margem e limite de empréstimos ativos.
- **Valores monetários:** o PostgreSQL utiliza `numeric`, e os cálculos usam Decimal.js com arredondamento `ROUND_HALF_UP` para centavos.
- **Parcelas derivadas:** valores e vencimentos são calculados a partir dos dados persistidos do empréstimo. Não há tabela separada de parcelas, pois o contrato não prevê alteração ou baixa individual delas. Os vencimentos são calculados em UTC.
- **Autorizações com histórico:** cada concessão é registrada; a consulta considera apenas registros cuja expiração ainda não ocorreu.
- **Senhas protegidas:** são armazenadas como hash Argon2 e não são incluídas nas respostas da API.
