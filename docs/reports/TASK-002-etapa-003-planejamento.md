# TASK-002 — Etapa 003: Planejamento

**Data:** 2026-10-22  
**GATE:** GATE-003  
**Status do planejamento:** APROVADO  
**Branch:** `task/TASK-002-persistencia-postgresql`  
**Limite:** plano documental; nenhum código, schema, migration, pacote ou serviço de banco foi criado.

## 1. Contexto e decisão proposta

TASK-002 está `IN_PROGRESS` após GATE-002 aprovado e a autorização da solicitante para executar esta etapa. TASK-001 está `DONE`. O projeto é Next.js/TypeScript com `strict: true`, npm lockfile, Dockerfile multi-stage e CI de lint/typecheck/build/container. Não há persistência, ORM, driver PostgreSQL, migrations ou testes de banco no estado inspecionado.

### Recomendação técnica do plano (não implementada)

Adotar **Kysely como query builder tipado**, o dialect PostgreSQL integrado com **`pg` (node-postgres)**, e o **Migrator de Kysely** para migrations TypeScript reversíveis (`up`/`down`). Antes da Etapa 004, formalizar a escolha e suas consequências em ADR-006; a proposta não instala dependências nem autoriza implantação.

Razões verificadas em documentação primária:

- Kysely documenta suporte ao dialect PostgreSQL sobre o driver `pg`, e oferece migrations `up`/`down` com ordenação por nome/timestamp. A compatibilidade com TypeScript `strict` e o requisito de TypeScript 5.4+ também correspondem ao `tsconfig`/TypeScript atuais do projeto. [Kysely: getting started](https://www.kysely.dev/docs/getting-started), [Kysely: migrations](https://kysely.dev/docs/migrations)
- A documentação do node-postgres confirma pool integrado, recomenda pool limitado/reutilizado e exige o mesmo client em todas as operações de uma transação; Kysely fornece a camada transacional que a implementação deverá validar por teste de rollback. [node-postgres: pooling](https://node-postgres.com/features/pooling), [node-postgres: transactions](https://node-postgres.com/features/transactions)

**Alternativa considerada:** usar `pg` diretamente com SQL parametrizado e implementar/operar migrations manualmente. É mais baixo nível e transferiria ao projeto a convenção de ordenação, histórico e rollback que Kysely Migrator fornece. A decisão proposta reduz código próprio de infraestrutura sem criar entidades funcionais. O trade-off é manter tipos de schema e migrations TypeScript manualmente sincronizados.

## 2. Matriz de critério → arquivos previstos → validação

Os caminhos abaixo são plano para a Etapa 004, sujeitos à formalização no ADR-006. Não foram criados nesta etapa.

| Critério de aceite | Mudança planejada | Validação/evidência futura |
|---|---|---|
| Escolha de query layer registrada | `docs/adr/ADR-006-query-layer-e-migrations.md` — registrar Kysely, `pg`, migrator, trade-offs e versão PostgreSQL de teste escolhida; relacionar ADR-002 e limites do escopo. | Revisão de consistência com ADR-002, TASK-002 e documentação oficial; ADR definido antes de instalação/implementação. |
| Conexão usa configuração/secrets | `package.json`, `package-lock.json`; `src/lib/db/client.ts`; `.env.example` com placeholder; manter `.gitignore` sem expor `.env*`. | Teste com URL sintética; configuração ausente/malformada falha sem expor valor; buscar segredos nos arquivos rastreados; health probe não retorna URL, stack ou detalhes internos. |
| Pool limitado e reutilizado | `src/lib/db/client.ts`; um pool/singleton por processo; valor validado por configuração `DB_POOL_MAX`, sem número de produção fixado neste plano. | Inspecionar configuração, validar limite positivo e que conexões são reutilizadas/encerradas; sizing produtivo fica para TASK-013 após capacity planning. |
| Migration base sobe e reverte | `src/lib/db/migrations/` e `src/lib/db/migrate.ts`; primeira migration cria somente o namespace `app`, sem tabelas de domínio; `down` remove apenas esse namespace sem `CASCADE`. Migrator conserva seu próprio histórico técnico. | Em banco PostgreSQL descartável: migrate up, verificar namespace, migrate down e verificar remoção; repetir e conferir histórico/estado final. Não usar banco produtivo. |
| Rollback transacional demonstrado | `tests/db/transaction-rollback.test.ts` com fixture temporária e dados sintéticos. | Dentro de uma transação, inserir fixture e provocar falha deliberada; confirmar após rollback que a linha não foi persistida. A fixture não vira entidade de produto/migration permanente. |
| Saúde/conexão observável | `src/app/api/health/db/route.ts` (ou localização equivalente confirmada na implementação): consulta mínima (`SELECT 1`), resposta pública mínima, 503 sem detalhes sensíveis quando indisponível. | Sucesso com DB ligado; falha sem DB; resposta não contém host, usuário, senha, SQL ou stack. Evitar criar pool por requisição. |
| Migração/testes executáveis no ambiente previsto | `package.json` scripts; runner de migração/teste TypeScript (`tsx` como ferramenta de execução proposta); database de teste PostgreSQL em container Docker. | `docker info`; iniciar somente DB de teste com segredo sintético; executar `db:migrate`, `db:rollback`, teste de rollback e fechar/remover container. Nenhuma imagem PostgreSQL foi baixada nesta etapa. |
| Tipos/build regressivos | `src/lib/db/types.ts` sem entidades de domínio; scripts de validação existentes em `package.json`; estender testes isolados. | `npm run lint`, `npm run typecheck`, `npm run build`, teste DB e migration round-trip. Nenhuma dessas validações foi executada nesta etapa de planejamento. |

### Comandos planejados (não executados)

1. `docker info --format '{{.ServerVersion}}'` — pré-checar o daemon (já passou no GATE-002).
2. Iniciar PostgreSQL local descartável em container, com versão principal pinada após conferência de compatibilidade Cloud SQL e senha sintética fornecida em runtime; nunca salvar senha em arquivo rastreado.
3. Executar `npm ci`, scripts de migration up/down e testes de rollback usando apenas a URL de teste.
4. `npm run lint`, `npm run typecheck` e `npm run build`.
5. Inspecionar `git ls-files`/`.gitignore` para segredos e executar `git diff --check`.
6. Encerrar a pool e remover o container/rede temporários; registrar saída/código nos relatórios posteriores.

Os comandos de migration e teste DB serão adicionados a `package.json` somente na Etapa 004. O roteiro Windows/PowerShell será especificado na Etapa 006; esta etapa não iniciou serviços nem baixou imagens.

## 3. Limites de escopo

### Permitido por TASK-002

- Camada ORM/query selecionada via decisão técnica documentada; estrutura e migrations base.
- Configuração segura de conexão, health/conexão, transação e pool.
- Fixtures exclusivamente sintéticas, limitadas a testes de migration/rollback.
- Testes e documentação diretamente necessários para provar os critérios da TASK.

### Proibido

- Banco de produção, credenciais reais, billing, deploy ou migração de dados reais.
- Entidades, fluxos e tabelas funcionais de cliente, produto, funcionário, pedido, estoque, reserva, cupom ou notificações das TASKs seguintes.
- Cache como autoridade de estoque.
- Escolher tamanho de pool/HA/SLO produtivos sem teste/decisão operacional; essa capacidade pertence ao desenho operacional posterior.
- Adicionar CI com serviço DB, Docker Compose ou dependências de conveniência sem provar que são necessárias e autorizadas pelo escopo.

### Arquivos previstos

| Arquivo/área | Classificação | Justificativa |
|---|---|---|
| `docs/adr/ADR-006-query-layer-e-migrations.md` | Direto/documentação técnica | Registrar a decisão exigida antes da implementação. |
| `package.json`, `package-lock.json` | Direto | Dependências runtime de acesso ao PostgreSQL e ferramenta de execução/teste estritamente necessária. |
| `src/lib/db/client.ts`, `src/lib/db/types.ts` | Direto | Conexão, pool, tipos mínimos e convenção transacional. |
| `src/lib/db/migrate.ts`, `src/lib/db/migrations/` | Direto | Executor e migration base reversível sem domínio funcional. |
| `src/app/api/health/db/route.ts` | Direto | Verificação mínima de conectividade, sem vazamento de informação. |
| `tests/db/` | Direto para aceite | Provar migration up/down, configuração negativa e rollback. |
| `.env.example`, `README.md` | Documentação/configuração diretamente afetada | Exemplo sintético e passos locais, sem segredo real. `.gitignore` já ignora `.env*` e permite `.env.example`; revalidar sem relaxar regra. |
| `Dockerfile` | Não previsto | Docker Engine disponível; teste usa container PostgreSQL e runtime de desenvolvimento já declarado. Reabrir apenas se a implementação provar que um executável de migration OCI é necessário, e então avaliar Scope Guard antes da mudança. |
| `.github/workflows/ci.yml` | Não previsto | Critério atual da TASK-002 não exige integração de DB no CI; manter CI existente sem ampliar escopo. |
| `TASKS.md` | Registro de estado/evidência | Atualizar branch/status e gate da TASK-002 conforme o fluxo de governança. |

## 4. Sequência de implementação proposta (Etapa 004; não executada)

1. Confirmar o usuário autorizou a implementação da Etapa 004; permanecer sem credenciais/serviços reais.
2. Criar ADR-006 com Kysely + `pg`, migrator up/down, configuração e limites, antes de instalar dependências; se a decisão não puder ser aceita no escopo técnico, parar e escalar.
3. Adicionar dependências runtime e ferramenta de execução/teste pinadas no `package-lock.json`; não mudar runtime Node ou arquitetura cloud.
4. Criar cliente PostgreSQL singleton configurado por `DATABASE_URL`, `DB_POOL_MAX` validado e tipos sem tabelas funcionais.
5. Implementar executor e migration-base reversível do namespace `app` apenas; não ativar migrations automaticamente em cada inicialização da aplicação.
6. Implementar health/readiness DB com resposta mínima e teste de desconexão.
7. Implementar teste sintético de transação que prove rollback, migration round-trip e cenário de configuração inválida.
8. Validar lint, typecheck, build, migration, rollback, configuração/segredos e remoção do container de teste; registrar resultados reais, inclusive falhas.
9. Revisar diff completo pelo Scope Guard antes de concluir o gate da implementação.

## 5. Riscos e mitigação

| Risco | Mitigação planejada |
|---|---|
| Migration down destrutiva ou fora de ordem | Arquivos congelados no tempo, nome ordenável, `down` inverso sem `CASCADE`, teste em banco descartável e ambiente de produção explicitamente proibido nesta TASK. |
| Pool por instância multiplica conexões no Cloud SQL | Uma pool por processo e valor configurável; não escolher limite produtivo sem dimensionar instâncias/conexões na TASK-013. |
| Falha ou ausência de segredo mostra dado sensível | Configuração apenas runtime; placeholder não funcional no `.env.example`; erro genérico, sem imprimir `DATABASE_URL`; manter `.env*` no ignore. |
| Next build tenta acessar DB | Inicialização lazy; módulo de conexão não faz conexão no import/build; provar build sem `DATABASE_URL`. |
| Health check abre conexões sem limite | Reutilizar singleton/pool e consulta simples com timeout; liveness do processo não consulta o banco continuamente. |
| Escopo expande para modelos funcionais | Migration inicial cria apenas namespace técnico; fixtures do teste são temporárias; nenhuma tabela de domínio. |
| A ferramenta proposta não atende o runtime | Confirmar Node/TypeScript, lockfile e documentação oficial no ADR antes de instalar; não alterar runtime pelo caminho. |

## 6. Rollback planejado

- **Migration/teste local:** executar `migrate down` somente no DB descartável; verificar que namespace e fixture sumiram; parar/remover container e configuração runtime temporários.
- **Mudanças de código futuras:** reverter somente os arquivos criados/modificados pela Etapa 004; preservar alterações preexistentes. Não executar `DROP` em banco externo/produção.
- **Dependências:** remover os pacotes da alteração da TASK-002, regenerar `package-lock.json` e repetir `npm ci`, lint/typecheck/build; não editar lockfile manualmente.
- **Estado Git:** não fazer commit/push nesta etapa. Commits futuros requerem revisão e autorização aplicável.

## 7. Histórico e evidências desta etapa

- Prompt da Etapa 003 e gates GATE-001/GATE-002 consultados.
- Inspecionados `TASKS.md`, `AGENTS.md`, `README.md`, ADR-002, overview, package/lockfile, `tsconfig.json`, `.gitignore`, `.dockerignore`, Dockerfile, CI e diretório `src/`.
- Consulta das fontes oficiais do Kysely, node-postgres e Node.js para verificar PostgreSQL dialect/driver, migrations up/down, pool, restrições transacionais e runner TypeScript. Fontes: [Kysely getting started](https://www.kysely.dev/docs/getting-started), [Kysely migrations](https://kysely.dev/docs/migrations), [node-postgres pooling](https://node-postgres.com/features/pooling), [node-postgres transactions](https://node-postgres.com/features/transactions), [Node.js TypeScript](https://nodejs.org/api/typescript.html).
- Branch criada conforme governança: `task/TASK-002-persistencia-postgresql` (comando `git switch -c task/TASK-002-persistencia-postgresql`, código 0). `TASKS.md` atualizado para `IN_PROGRESS` com a branch.
- Antes desta etapa, a working tree já tinha mudanças/arquivos locais de TASK-001 (`TASKS.md`, `docs/reports/`, `docs/testing/`). Foram preservados; não foram tratados como mudanças de implementação da TASK-002. Não houve commit/push.
- **NOT RUN:** npm install/ci, lint, typecheck, build, migration round-trip, teste de rollback, DB container e validação de secrets; não fazem parte do gate de planejamento e não foram executados.
- Nenhum arquivo de implementação foi editado nesta etapa; o presente plano é o artefato documental previsto.

## 8. Gate local e acumulado

| Gate | Etapa | Status | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização e histórico | CONCLUÍDO | `TASK-002-etapa-001-recontextualizacao.md`. |
| GATE-002 | Pré-condições e decisões | CONCLUÍDO | `TASK-002-revalidacao-dor-2026-10-22.md`; Docker Engine acessível. |
| GATE-003 | Planejamento | CONCLUÍDO | Este plano; matriz critério→arquivo→validação, escopo, sequência, riscos e rollback documentados. |
| GATE-004 | Implementação | PENDENTE | Não executada; exige autorização explícita da solicitante. |
| GATE-005 | Revisão | PENDENTE | Depende de implementação autorizada. |
| GATE-006 | Testes manuais | PENDENTE | Depende de revisão e implementação. |
| GATE-007 | Conclusão | PENDENTE | Depende dos gates anteriores. |

**Gates acumulados:** 3 concluídos; 4 pendentes; 0 bloqueados.  
**Status da TASK-002:** IN_PROGRESS.  
**Próxima etapa:** Etapa 004 — Implementação; não iniciada nem autorizada por este planejamento.

==================================================
TASK: TASK-002
ETAPA: 003
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio obrigatório para o plano; dependência, escopo, critérios e ambiente foram confirmados.
- A ferramenta Kysely + pg é recomendação técnica do planejamento; ADR-006 deverá registrá-la antes da implementação, e nenhuma dependência foi instalada.
CORREÇÕES REALIZADAS:
- Criado apenas o relatório de planejamento; branch e status registrados conforme governança.
PENDÊNCIAS:
- Obter autorização explícita para a Etapa 004.
- Formalizar a recomendação em ADR-006 antes de instalar dependências ou escrever código.
- Na implementação, pin de versão de PostgreSQL de teste, migrations, transação rollback, configuração secreta sintética e validações conforme plano.
TESTES RELACIONADOS:
- NOT RUN: validações de aplicação e banco pertencem às etapas de implementação/testes.
- Fontes oficiais consultadas para verificar capacidades declaradas da camada recomendada.
PRÓXIMA ETAPA: Etapa 004 — Implementação
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: O planejamento concluiu GATE-003, mas `AGENTS.md` proíbe iniciar a próxima etapa automaticamente; é necessária autorização explícita para implementar. A decisão técnica proposta deve ser formalizada em ADR antes do primeiro código.
==================================================
