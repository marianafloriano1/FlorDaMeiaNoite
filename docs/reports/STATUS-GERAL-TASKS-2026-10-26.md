# Estado documental consolidado — TASKs 001–005

**Data:** 2026-10-26
**Escopo:** reconciliação de evidências existentes e estado atual; sem alterações funcionais.

## Status por TASK

| TASK | Status atual | Gates / evidência resumida |
|---|---|---|
| TASK-001 — Base do repositório e ambientes | DONE | GATE-001–007 concluídos; T001–T007 aprovados conforme `docs/testing/TASK-001-testes-manuais.md`, CI/container e relatórios vinculados em `TASKS.md`. |
| TASK-002 — Persistência PostgreSQL e migrations base | DONE | GATE-001–007 concluídos; testes de migration, lint, typecheck, build e seis testes manuais registrados nos relatórios TASK-002. É o estado histórico aceito dessa tarefa; a plataforma de dados posterior foi migrada para Supabase sob ADR-007. |
| TASK-003 — Contas, autenticação e autorização | DONE | GATE-001–007 concluídos para a arquitetura vigente Supabase. Build limpo relatado PASS, testes direcionados e revisões registrados; limitações de provedor/SMS e cinco diagnósticos globais de lint foram documentados sem alterar seu escopo. |
| TASK-004 — Catálogo, mídia, busca e traduções | DONE | GATE-001–007 concluídos; T001–T011 PASS; migration `202610250002_catalog_low_stock_alert.sql` aplicada/validada em Supabase isolado; RNF-002: 41 ms, 43 ms e 247 ms, todos abaixo de 2 s. Provider faturável permanece desativado. Detalhes do fechamento constam no histórico TASK-004 em `TASKS.md`. |
| TASK-005 — Carrinho, favoritos e reserva concorrente | IN_REVIEW | Implementação da Etapa 004 preparada. Quatro testes unitários/worker PASS; teste de integração Supabase SKIP/NOT RUN; TypeScript, Biome direcionado e build Next em cópia temporária PASS; lint global FAIL em cinco diagnósticos fora do escopo. Migration TASK-005, concorrência, rollback, expiração/RLS e OCI não foram executados; GATE-004 BLOQUEADO. |
| TASK-006 a TASK-014 | BLOCKED | Não iniciadas; dependem de tarefas anteriores ainda pendentes, conforme seção individual de cada uma em `TASKS.md`. |

## Evidências da Etapa 004 — TASK-005

- `npm run test:task005`: 4 testes PASS; integração Supabase SKIP/NOT RUN porque não havia endpoint/chaves de stack local isolada configurados.
- `npx tsc --noEmit --incremental false`: PASS.
- Biome direcionado aos arquivos TASK-005 e à página de detalhe compartilhada: PASS (14 arquivos).
- `npm run lint`: FAIL global, cinco diagnósticos nos arquivos `src/app/api/auth/register/route.ts` (2), `src/app/layout.tsx` (1), `src/lib/auth/http.ts` (1) e `tests/auth/task003.step-up.test.ts` (1); sem correção nesta reconciliação.
- Build Next.js: PASS em cópia temporária fora do checkout, Next.js 16.4.2 com Webpack e valores sintéticos; `.next` do checkout não foi usado para essa execução.
- Migration `202610250003_task005_cart_favorites_reservations.sql`, testes reais de concorrência na última unidade, rollback, expiração após tempo controlado, RLS e execução do worker em OCI: NOT RUN. O Docker Engine ficou inacessível/sem resposta durante a tentativa, e não foi possível identificar com segurança qual container existente pertencia à stack integrada. Nenhuma migration/stack foi tocada.
- `git diff --check`: PASS na revisão anterior da Etapa 004; revalidar para o conjunto documental deste relatório antes do commit.

## Proteção de escopo e próximos gates

- Nenhum arquivo exclusivo da TASK-003 foi alterado nesta atualização documental.
- TASK-004 permanece DONE; a única integração de UI entre TASK-004/005 é a alteração aditiva previamente autorizada no detalhe de produto.
- TASK-005 permanece IN_REVIEW; GATE-004 BLOQUEADO até as evidências de banco/concorrência/rollback/expiração/RLS/OCI serem executadas numa stack corretamente identificada.
- Etapa 005 não foi iniciada. TASK-006 não foi iniciada.
- Nenhum commit/push/deploy é descrito como evidência de teste; esta atualização prepara exclusivamente a documentação solicitada.
