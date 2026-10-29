# TASK-007 — Etapa 005 — Revisão

**Data:** 2026-10-29
**Branch:** `task/TASK-007-painel-produtos-estoque`
**Escopo:** resolução dos achados P1/P2 da revisão e revalidação direcionada; TASK-003 e TASK-004 preservadas.

## Parecer

**GATE-005: APROVADO.** O outbox agora encerra como `failed` leases expiradas que já consumiram as cinco tentativas, e testes dos handlers administrativos cobrem sessão, papéis, origem e step-up. Não há achados bloqueantes remanescentes para liberar a Etapa 006.

## P1 — Recuperação do outbox (resolvido)

A migration aditiva `202610290001_task007_outbox_lease_recovery.sql` atualiza `claim_catalog_stock_alerts`: antes de reivindicar itens disponíveis, transiciona leases expiradas em `processing` com `attempts >= 5` para `failed`, limpa `locked_until` e registra `worker_lease_expired_after_max_attempts`. A migration anterior não foi alterada.

Teste de integração simula cinco reivindicações, falhas concluídas nas quatro primeiras e crash na quinta. Após expirar a lease, a próxima chamada não reivindica novamente o evento e o banco confirma `status=failed`, `attempts=5`, `locked_until=null` e o código terminal esperado.

## P2 — Handlers HTTP administrativos (resolvido)

`tests/task007/admin-routes.test.ts` executa os handlers reais de cadastro de produto e ajuste de estoque com `authorizeCatalogOperator` real e primitivas externas de sessão/origem/step-up simuladas. Foram cobertos: origem não permitida retorna 403 antes da sessão, sessão ausente retorna 401, papel customer retorna 403, employee pode cadastrar, admin sem step-up recente recebe 428 e admin com step-up pode ajustar estoque. O teste confirma também que o UID verificado chega ao serviço de estoque.

`tests/task007/same-origin.test.ts` executa a função `requireSameOrigin` real: origem igual aceita; host divergente, origem ausente, `sec-fetch-site=cross-site` e URL inválida recusados.

## Validações executadas

| Verificação | Resultado | Evidência |
|---|---|---|
| Migration `202610290001` | PASS | Aplicada por `supabase migration up --local` somente em `task007-validation-20261028-2eed9cd5`; histórico confirmou as sete migrations da sequência. Sem reset. |
| `npm run test:task007` | PASS | 21/21 testes, 0 falhas, 0 skips, com `TASK007_REQUIRE_SUPABASE=1`; incluiu integração real Supabase, lease final expirada e handlers HTTP. |
| `npm run test:catalog` | PASS | 19/19 testes, 0 falhas, 0 skips. |
| `npm run lint:task007` | PASS | Biome verificou 20 arquivos, sem diagnósticos. |
| `npm run typecheck` | PASS | `next typegen` e `tsc --noEmit` concluíram com exit 0. |
| `git diff --check` | PASS | Exit 0, sem erros de whitespace. |
| Build / CI remota | NOT RUN | Não solicitados nesta correção; o relatório da Etapa 004 conserva as evidências de build e OCI anteriores. |

A stack Supabase isolada permaneceu ativa ao fim da validação. Nenhuma outra stack foi iniciada, parada ou modificada; nenhum segredo local foi exibido. Não houve commit, push ou deploy.

## Scope Guard

- TASK-003: nenhum arquivo alterado.
- TASK-004: nenhum arquivo alterado.
- A migration anterior `202610280002_task007_inventory_admin.sql` foi preservada; a correção foi aditiva.
- Arquivos desta correção: `package.json`, `supabase/migrations/202610290001_task007_outbox_lease_recovery.sql`, `tests/task007/integration.test.ts`, `tests/task007/admin-routes.test.ts`, `tests/task007/same-origin.test.ts` e `tests/task007/next-test-setup.mjs`, além deste relatório e `TASKS.md`.
- O setup de testes usa o marcador `server-only` já empacotado pelo Next para executar os módulos server-side sob a condição `react-server`; nenhuma dependência foi adicionada.

## Gates acumulados

| Gate | Estado | Evidência |
|---|---|---|
| GATE-001 | CONCLUÍDO | Relatório da Etapa 001. |
| GATE-002 | CONCLUÍDO | Relatório da Etapa 002 e DoR. |
| GATE-003 | CONCLUÍDO | Planejamento e decisão aprovada dos limiares. |
| GATE-004 | CONCLUÍDO | Relatório da Etapa 004, incluindo Supabase, testes e OCI. |
| GATE-005 | CONCLUÍDO | Achados P1/P2 resolvidos e verificações acima aprovadas. |
| GATE-006 | PENDENTE | Testes manuais ainda não iniciados. |
| GATE-007 | PENDENTE | Conclusão ainda não iniciada. |

**Totais:** 5 concluídos; 2 pendentes; 0 bloqueados.

**TASK-003:** preservada. **TASK-004:** preservada. TASK-007 permanece `IN_REVIEW`; a Etapa 006 fica habilitada para execução futura e não foi iniciada nesta revisão.

==================================================
TASK: TASK-007
ETAPA: 005
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 5
GATES PENDENTES: 2
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- P1 de lease recuperado por transição para `failed` após expiração no limite de tentativas.
- P2 resolvido com testes HTTP direcionados e teste da função same-origin real.
CORREÇÕES REALIZADAS:
- Migration aditiva para encerrar como `failed` a lease final expirada; migration anterior preservada.
- Teste integrado da recuperação após crash na quinta tentativa.
- Testes dos handlers administrativos e da validação same-origin; runner habilitado para module mocks/server-only do Next.
PENDÊNCIAS:
- Nenhuma pendência obrigatória da Etapa 005. T006 e T007 permanecem pendentes como etapas futuras.
TESTES RELACIONADOS:
- `npm run test:task007`: PASS 21/21, 0 falhas, 0 skips, integração Supabase obrigatória.
- `npm run test:catalog`: PASS 19/19.
- `npm run lint:task007`: PASS, 20 arquivos.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.
- Build/CI remota: NOT RUN nesta etapa; build/OCI anterior consta no relatório da Etapa 004.
PRÓXIMA ETAPA: 006 — Testes manuais
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-005 aprovado após correção e validação dos achados P1/P2. A Etapa 006 não foi executada.
==================================================