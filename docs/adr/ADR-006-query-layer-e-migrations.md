# ADR-006 — Camada de consultas e migrations PostgreSQL

- **Status:** ACEITO — decisão técnica da TASK-002
- **Data:** 2026-10-22
- **Rastreabilidade:** TASK-002; RNF-001, RNF-010; ADR-002

## Contexto

TASK-002 requer persistência PostgreSQL, conexão configurável com segredo em runtime, migrations reversíveis, pool reutilizado e convenções transacionais. O escopo exclui entidades e fluxos funcionais das tarefas posteriores. ADR-002 determina PostgreSQL transacional como fonte de verdade para estoque e exige operações críticas atômicas, idempotentes e auditáveis.

## Decisão

Adotar Kysely como query builder TypeScript, seu dialect PostgreSQL sobre `pg` (node-postgres), e o Migrator/FileMigrationProvider do Kysely para migrations TypeScript ordenadas com `up` e `down`. Usar migrations explícitas via comando; a aplicação não executará migrations automaticamente durante inicialização.

A conexão usará `DATABASE_URL` e o tamanho máximo do pool virá de `DB_POOL_MAX`, ambos fornecidos em runtime. O cliente/pool será singleton por processo e inicializado sob demanda. A configuração não escolherá o tamanho de pool de produção; dimensionamento, HA e SLO ficam para TASK-013.

A migration inicial criará apenas o schema técnico `app`, sem tabelas de domínio. O rollback removerá somente esse schema, sem `CASCADE`. O histórico interno do Migrator é metadado técnico. Nenhum saldo de estoque será armazenado em cache.

O banco descartável de validação usará PostgreSQL **17.11**, versão atualmente listada como suportada pelo Cloud SQL e disponível na imagem oficial `postgres:17.11-alpine3.24`, fixada pelo digest `sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb`. Essa escolha serve para compatibilidade de teste e não seleciona versão, edição ou instância de produção.

## Alternativas consideradas

- **`pg` direto e migrations próprias:** oferece controle SQL explícito, mas exigiria manter convenções próprias de ordenação, histórico, rollback e transações. Rejeitada para esta fundação mínima.
- **ORM com schema/code generation:** não é necessário para a migration sem tabelas de domínio e aumentaria ferramentas/configuração nesta etapa.

## Consequências

- O query layer é tipado em TypeScript, mas a equipe mantém manualmente os tipos de tabelas e as migrations sincronizados quando entidades forem introduzidas em tarefas autorizadas.
- O Migrator mantém histórico e executa migrations em ordem; cada migration deve oferecer `up` e `down`, e rollback será verificado somente em banco descartável.
- Transações devem usar a abstração transacional do Kysely; testes de rollback provarão atomicidade com fixture sintética.
- `DATABASE_URL` nunca será impressa em logs, resposta de health check ou documentação como credencial utilizável. `.env.example` conterá somente placeholder local.
- A imagem PostgreSQL é exclusivamente uma dependência local de teste. Não há banco de produção, serviço pago ou credencial real autorizado por esta decisão.

## Fontes consultadas

- [Kysely — Getting started](https://www.kysely.dev/docs/getting-started): dialect PostgreSQL/driver `pg`, compatibilidade TypeScript.
- [Kysely — Migrations](https://kysely.dev/docs/migrations): migration `up`/`down`, ordenação e providers.
- [node-postgres — Pooling](https://node-postgres.com/features/pooling) e [Transactions](https://node-postgres.com/features/transactions): reutilização do pool e vínculo de operações transacionais ao mesmo client.
- [Cloud SQL — versões PostgreSQL suportadas](https://docs.cloud.google.com/sql/docs/postgres/db-versions): PostgreSQL 17.11 consta na lista de versões suportadas na data da decisão.
- [Imagem oficial PostgreSQL](https://hub.docker.com/_/postgres): tag de teste `17.11-alpine3.24`.

## Limites

Esta decisão não aprova infraestrutura/credenciais de produção, dimensionamento de pool produtivo, tabelas de cliente/produto/pedido/estoque, política de retenção ou execução de qualquer TASK posterior.
