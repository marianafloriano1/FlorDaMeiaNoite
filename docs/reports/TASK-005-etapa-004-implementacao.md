# TASK-005 — Etapa 004 — Implementação

**Data:** 2026-10-25  
**Checkout:** `flor-da-meia-noite-integracao-003-004`  
**Branch:** `task/TASK-005-carrinho-favoritos-reservas`  
**Status da etapa:** BLOQUEADA — implementação preparada, validações de integração e OCI pendentes  
**GATE-004:** BLOQUEADO

## Implementação realizada

- Migration aditiva `202610250003_task005_cart_favorites_reservations.sql`: carrinhos, itens, favoritos, reservas, itens de reserva e ledger; RLS por proprietário; índices de unicidade para uma reserva ativa por cliente/carrinho; RPC transacional para reservar, cancelar e expirar; reserva de três horas pelo relógio do banco; batch de expiração com `SKIP LOCKED`; checagem do papel `customer` na RPC. A migration NÃO foi aplicada nem validada em PostgreSQL nesta execução.
- APIs de leitura/escrita de carrinho e favoritos, criação/leitura/cancelamento de reserva; validações estritas, sessão de cliente, proteção same-origin nas mutações, respostas privadas sem cache e mensagens públicas sanitizadas.
- UI do carrinho com seleção de subconjunto, criação/cancelamento de reserva e remoção de item; ações mínimas de carrinho/favorito e link ao carrinho no detalhe do produto. `src/app/catalog/[slug]/page.tsx` é o único arquivo compartilhado TASK-004/TASK-005 alterado, conforme autorização da Etapa 002; sua integração é aditiva.
- Worker periódico `src/workers/reservation-expiration.mjs`, chamando apenas a RPC idempotente; script de execução e cópia do worker na imagem Dockerfile existente, mantendo o comando padrão do servidor web. Não foi iniciado worker nem container.
- Testes unitários para validação de payload e worker, e suíte de integração Supabase com fixtures sintéticas, protegida para recusar hosts remotos. O teste de integração é condicional a um Supabase local isolado.

## Arquivos do escopo TASK-005

- `supabase/migrations/202610250003_task005_cart_favorites_reservations.sql`
- `src/lib/cart/service.ts`, `src/lib/cart/validation.ts`
- `src/app/api/cart/route.ts`, `src/app/api/cart/items/route.ts`, `src/app/api/favorites/route.ts`, `src/app/api/reservations/route.ts`, `src/app/api/reservations/[id]/route.ts`
- `src/app/cart/page.tsx`, `src/app/catalog/[slug]/product-actions.tsx`
- `src/workers/reservation-expiration.mjs`
- `tests/task005/validation.test.ts`, `tests/task005/worker.test.ts`, `tests/task005/reservations.integration.test.ts`
- `package.json`, `Dockerfile`, `TASKS.md` e este relatório.
- Compartilhado autorizado: `src/app/catalog/[slug]/page.tsx`.

## Evidências executadas

| Verificação | Resultado | Evidência |
|---|---|---|
| `npm run test:task005` | PASS parcial | 4 testes de validação/worker passaram; 1 suíte de integração foi SKIP/NOT RUN por não haver configuração de Supabase local isolado. |
| `npx tsc --noEmit --incremental false` | PASS | Exit 0, sem erros. |
| Biome direcionado | PASS | `npx biome check --max-diagnostics=50 src/lib/cart src/app/api/cart src/app/api/favorites src/app/api/reservations 'src/app/api/reservations/[id]/route.ts' src/app/cart/page.tsx 'src/app/catalog/[slug]/page.tsx' 'src/app/catalog/[slug]/product-actions.tsx' src/workers tests/task005`; 14 arquivos, sem diagnósticos. |
| `npm run lint` | FAIL global | 5 diagnósticos em `src/app/api/auth/register/route.ts` (2), `src/app/layout.tsx` (1), `src/lib/auth/http.ts` (1), `tests/auth/task003.step-up.test.ts` (1). Nenhum diagnóstico nos arquivos incluídos no lint direcionado TASK-005. Arquivos de autenticação/teste da TASK-003 não foram editados. |
| `git diff --check` | PASS | Exit 0; warnings de conversão LF/CRLF não representam erros de whitespace. |
| `npm run build` | PASS isolado | Executado em cópia temporária do código, fora do checkout, com Next.js 16.4.2/webpack e valores sintéticos de ambiente; geração de `.next/standalone` concluída. A tentativa Turbopack na cópia temporária não resolveu o Next via junction e não foi usada como resultado. |
| Supabase/migration e integração concorrente | NOT RUN | `docker version` mostra Client 29.9.2, mas Server e `docker ps` falharam com `permission denied` no pipe `dockerDesktopLinuxEngine`; nenhum serviço foi iniciado. Sem stack Supabase isolada configurada, migration, RLS, corrida na última unidade, rollback, expiração e ledger permanecem sem execução. |
| OCI (construção/início/smoke test) | NOT RUN | Não foi possível confirmar Docker Server/`docker ps`; o comando não retornou evidência e a tentativa anterior registrou `permission denied` no pipe do Docker Desktop. Nenhum container foi iniciado. |

## Regras e fronteiras

- O desenho implementa uma reserva ativa por cliente/carrinho e reserva de estoque na mesma RPC/transação; qualquer item indisponível causa erro e rollback da transação.
- Cancelamento/expiração fazem transição condicional de `active`, devolvem saldo e escrevem ledger na mesma transação. Worker usa batch concorrente com `SKIP LOCKED`; repetição não deve liberar saldo novamente.
- TASK-005 não cria pedido, checkout ou pagamento. TASK-006 não foi iniciada.
- Nenhuma migration existente foi alterada. Nenhuma stack, container, volume ou banco foi iniciado, removido ou resetado. Nenhum endpoint remoto ou dado real foi usado.

## Scope Guard e gate

- TASK-003: nenhum arquivo foi alterado.
- TASK-004: nenhuma funcionalidade do catálogo foi alterada. A única mudança compartilhada é a integração aditiva aprovada no detalhe do produto.
- GATE-003 permanece CONCLUÍDO. GATE-004 fica BLOQUEADO: faltam aplicação e testes da migration em Supabase local isolado, evidência concorrente/rollback/expiração/RLS e validação OCI do worker/aplicação. O build Next isolado passou, sem modificar o `.next` original. O lint global ainda falha nos cinco diagnósticos listados, sem correção fora de escopo.
- TASK-005 permanece IN_REVIEW; Etapa 005 não iniciada. GATE-004 não aprova nem habilita etapas seguintes.



## Adendo de revalidação — GATE-004 aprovado (2026-10-27)

A evidência mais recente informada pela usuária confirma o job de integração da CI como PASS: `test:task005` executou 10/10 testes, com 0 SKIP, em Supabase local isolado após `supabase start` aplicar as quatro migrations. Os cenários cobriram concorrência na última unidade, idempotência, rollback atômico, expiração e RLS. Lint, typecheck e Biome também foram informados como PASS.

**Estado vigente da Etapa 004: APROVADA. GATE-004: APROVADO.** Este adendo atualiza o estado bloqueado registrado na execução de 2026-10-25; aquele registro permanece como histórico, não como estado atual. A evidência é reportada pela usuária e não foi repetida nesta atualização documental.
