# TASK-005 — Etapa 004 — Revalidação de 2026-10-26

**Checkout de validação:** `flor-da-meia-noite-integracao-003-004`  
**Branch:** `task/TASK-005-carrinho-favoritos-reservas`  
**Resultado:** GATE-004 PENDENTE/BLOQUEADO

## Evidências desta revalidação

- Docker respondeu inicialmente: `desktop-linux`, Server 29.9.2. A listagem de containers identificou `task003-004-integration-20261025` (DB na porta 56422), `task004-validation-20261025`, `task005` anterior não confirmado e `flor-da-meia-noite-local`. A stack local da aplicação foi preservada e não usada.
- Na stack `task003-004-integration-20261025`, labels indicam o diretório de validação integrado e o histórico contém `202610230001`, `202610250001`, `202610250002`. Porém as tabelas/RPCs TASK-005 já existem nessa base sem versão TASK-005 no histórico. Não reapliquei DDL nessa stack para evitar conflito/duplicação e preservar a evidência anterior.
- Foi criada cópia temporária em `C:\Users\Mariana\AppData\Local\Temp\task005-validation-20261026`, com `project_id=task005-validation-20261026`, portas 57420–57430 e quatro migrations. `supabase start --workdir ...` parou em “Starting database...” por mais de dois minutos. Interrompi somente o comando CLI; não removi containers/volumes. O status final dessa stack permanece **desconhecido**, pois chamadas Docker subsequentes ficaram sem resposta.
- `npm run test:task005`: 4 PASS; integração Supabase SKIP/NOT RUN por ausência de configuração local carregada.
- `npx tsc --noEmit --incremental false`: PASS.
- Biome direcionado: primeiro encontrou somente formatação no `tests/task005/reservations.integration.test.ts`; formatter foi aplicado nesse arquivo de teste e a nova execução direcionada passou (14 arquivos, sem diagnósticos).
- Build Next.js 16.4.2 com Webpack: uma repetição na cópia anterior falhou com `EPERM` ao criar `.next/types/app/api`. Uma cópia temporária nova concluiu compilação, TypeScript e 16/16 páginas estáticas. Aviso: 27 arquivos vinculados de `node_modules` ficaram fora do tracing root; portanto o build compilado passou, mas isso não comprova imagem standalone/OCI completa.
- Lint global não foi repetido nesta rodada; última evidência: FAIL com cinco diagnósticos fora do escopo TASK-005. Não alterei esses arquivos.
- `git diff --check` e `git status --short` devem ser conferidos no checkout integrado antes de qualquer commit. Nenhum commit/push/deploy foi feito nesta revalidação.

## Pendências e como resolver

| Pendência | Evidência que falta | Como resolver com segurança |
|---|---|---|
| Estado da nova stack temporária | Histórico de migration e saúde dos containers; `supabase start` ficou sem resposta | Quando Docker voltar a responder, consultar apenas containers com label `com.supabase.cli.project=task005-validation-20261026`; validar portas e `supabase status --workdir C:\Users\Mariana\AppData\Local\Temp\task005-validation-20261026`. Não remover serviços existentes. Se houver estado parcial, inspecionar antes de qualquer novo start; não resetar. |
| Aplicação da migration TASK-005 | Não há prova de que `202610250003_task005_cart_favorites_reservations.sql` aplicou na stack nova | Na stack isolada identificada, conferir `supabase_migrations.schema_migrations`; aplicar via `supabase db push --local --workdir <cópia-temporária>` somente se 001–003 estiverem registrados e 004 ausente. Comparar depois colunas, constraints, índices, policies e RPCs. Não reaplicar na stack integrada que já contém objetos sem registro correspondente. |
| Concorrência da última unidade | O teste existe, mas a suíte integrada foi SKIP | Após migration comprovada e endpoint/chaves locais sintéticos disponíveis, executar `npm run test:task005`; exigir exatamente um vencedor, uma falha, saldo zero e um registro ativo; conferir rollback em falha multi-item. A suíte recusa hosts remotos. |
| Rollback/idempotência | Não executados em banco | A mesma suíte verifica falha parcial e retries; executar no novo DB isolado e conferir estoque, reservas e ledger após cada cenário. |
| Expiração/RLS | Não executados em banco | Usar fixture/relógio controlado já definido pela suíte ou uma reserva vencida sintética; conferir transição, saldo liberado uma vez, acesso cruzado negado e operação repetida sem duplicar ledger. Não esperar 3 horas e não mudar a duração de produção. |
| Worker/OCI | Docker ficou sem resposta; imagem e processo worker não iniciados | Com daemon saudável e stack identificada, construir a imagem existente e iniciar o worker por `node src/workers/reservation-expiration.mjs` com URL/chave service-role da stack local somente em runtime; verificar ciclo, expiração/idempotência e shutdown. Não expor chave nos logs. |
| Build standalone | Compilação passou, tracing em cópia com junction alertou arquivos fora do root | Para prova OCI, executar o Dockerfile oficial quando o daemon responder. Para build standalone fora do Docker, usar cópia com dependências dentro do tracing root (instalação local em temp) ou configuração de tracing aprovada, sem alterar arquitetura só para silenciar o alerta. |
| Lint global | Último resultado global falha em 5 diagnósticos externos | Manter arquivos fora do escopo sem alteração; usar Biome direcionado como gate TASK-005 e registrar os cinco diagnósticos globais separadamente. |

## Decisão do gate

**GATE-004 = BLOQUEADO.** Testes unitários, typecheck e Biome direcionado passaram; build Next compilou na cópia temporária com a ressalva de tracing. Permanecem sem prova a migration, concorrência real, rollback, expiração no banco, RLS e worker/OCI. Etapa 005 continua bloqueada e não foi executada. TASK-003 não foi alterada; a integração de detalhe TASK-004/TASK-005 permanece somente a adição já autorizada.
