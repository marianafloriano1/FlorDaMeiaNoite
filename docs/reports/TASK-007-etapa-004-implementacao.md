# TASK-007 — Etapa 004 — Implementação

**Projeto:** Flor da Meia-Noite
**Data:** 2026-10-29
**Branch:** `task/TASK-007-painel-produtos-estoque`
**Status:** implementação e validação da etapa aprovadas; GATE-004 APROVADO.

## Escopo implementado

- Painel administrativo para cadastro/edição de produtos, ajuste de estoque e gestão de imagens.
- Autorização de funcionário/administrador no servidor; mutações de administrador exigem MFA recente.
- Ajuste de saldo transacional via RPC, com justificativa, ator e valores anterior/novo registrados em ledger imutável.
- Outbox interno no cruzamento de estoque de `>7` para `<=7`, com lease, idempotência, retry limitado e worker que não inclui PII do cliente.
- O sinal público de estoque baixo continua restrito a 1–2 unidades; saldo numérico não é exposto e estoque zero permanece oculto.
- Upload de imagens usa o bucket público `catalog`; documentos de funcionários não são reutilizados.

## Arquivos da Etapa 004

- `package.json` — scripts de testes, lint direcionado e worker TASK-007.
- `supabase/migrations/202610280002_task007_inventory_admin.sql` — ledger, outbox, RPCs e proteção contra alteração do histórico.
- `src/app/admin/catalog/page.tsx` (renderização por request), `src/app/admin/catalog/panel.tsx`.
- `src/app/api/admin/catalog/products/route.ts`, `src/app/api/admin/catalog/products/[productId]/route.ts`, `src/app/api/admin/catalog/products/[productId]/stock/route.ts`, `src/app/api/admin/catalog/products/[productId]/images/route.ts`.
- `src/lib/catalog/admin-authorization.ts`, `src/lib/catalog/admin-service.ts`, `src/lib/catalog/admin-validation.ts`, `src/lib/catalog/authorization.ts`.
- `src/lib/storage/catalog-image-validation.ts`, `src/lib/storage/catalog-products.ts`.
- `src/workers/catalog-stock-alerts.mjs`.
- `tests/task007/unit.test.ts`, `tests/task007/worker.test.ts`, `tests/task007/integration.test.ts`.
- `Dockerfile` — lint scoped opcional para TASK-007 por build arg e inclusão do worker da TASK-007 na imagem.
- `.github/workflows/ci.yml` — lint direcionado e build arg scoped somente para branches TASK-007; lint global mantido nas demais branches.

## Validações executadas

| Verificação | Resultado | Evidência |
|---|---|---|
| Migration integrada | PASS | Stack efêmera `task007-validation-final-20261029`; CLI aplicou, em ordem, `202610230001_supabase_identity.sql`, `202610250001_catalog.sql`, `202610250002_catalog_low_stock_alert.sql`, `202610250003_task005_cart_favorites_reservations.sql`, `202610270001_task005_inventory_ledger_restrict_delete.sql` e `202610280002_task007_inventory_admin.sql`. A migration TASK-007 final foi aplicada sem erro. Serviços auxiliares `analytics`, `studio` e `postgres-meta` foram excluídos após falha de health check; nenhum outro ambiente foi usado. A stack própria foi encerrada depois dos testes com backup padrão (`backup=true`), sem remover volumes; outras stacks não foram tocadas. |
| `npm run test:task007` | PASS | 12/12, 0 falhas, 0 skips, com `TASK007_REQUIRE_SUPABASE=1`. Incluiu limiares/outbox, projeção pública, autorização e imutabilidade, concorrência, upload Storage e testes unitários/worker. |
| `npm run test:catalog` | PASS | 19/19; regressão das regras públicas de estoque, locale e catálogo. |
| Biome direcionado TASK-007 | PASS | 17 arquivos verificados, sem diagnósticos. |
| Lint do pipeline TASK-007 | PASS | `npm run lint:task007`; workflow seleciona este comando apenas para a branch TASK-007. O lint global segue como padrão para outras branches. |
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit` concluiu sem erros. |
| `npm run lint` global | FAIL — legado fora do escopo | 49 diagnósticos `format` em 62 arquivos. O comando global permanece sem supressões; o workflow escolhe `lint:task007` somente na branch desta tarefa. Nenhum arquivo de TASK-003/004 foi alterado. |
| `npm run build` | PASS | Dependências do lockfile instaladas fisicamente no worktree em modo offline. Build padrão Turbopack compilou, passou TypeScript e gerou 18/18 páginas, sem aviso de arquivos externos no tracing standalone. |
| Build OCI e startup | PASS | `docker build --build-arg TASK007_LINT_SCOPE=1 --tag flor-da-meia-noite:task007-validation-20261029 .` passou por instalação, lint direcionado, typecheck, build e exportação da imagem. Container iniciado e `GET /api/catalog` retornou HTTP 200; worker TASK-007 presente na imagem. Container de smoke encerrado. |
| Entrega real de e-mail | NOT RUN | Worker testado com gateway sintético. Provedor/domínio de e-mail não foi escolhido nem configurado; nenhuma integração faturável foi ativada. |
| CI GitHub | NOT RUN | Workflow preparado para a branch; não houve push nem disparo remoto nesta execução. O comando scoped e o build Docker equivalente passaram localmente. |
| `git diff --check` | PASS | Sem erros de whitespace nas alterações rastreadas. |

## Proteção de escopo

- TASK-003: nenhum arquivo alterado nesta etapa.
- TASK-004: nenhum arquivo alterado nesta etapa.
- Não houve mudança de migration anterior, reset, commit, push, deploy ou ativação de provider pago.
- O catálogo público preserva o contrato existente; os arquivos compartilhados são limitados às novas ações administrativas da TASK-007.

## Parecer do GATE-004

**GATE-004: APROVADO.** A migration e os testes integrados passaram sem skips; lint direcionado, typecheck, build standalone padrão, imagem OCI e inicialização/endpoint também passaram. Para esta branch, o workflow e o Dockerfile usam lint limitado aos arquivos TASK-007; o lint global permanece inalterado e continua reportando 49 problemas de formatação em arquivos anteriores. A junction de dependências foi preservada fora do worktree e substituída por instalação física do lockfile no worktree, eliminando a falha do Turbopack e o aviso de tracing externo. TASK-003/004 foram preservadas.

**Etapa 005:** HABILITADA para execução futura; não iniciada nesta execução.

**Provider de e-mail:** seleção/configuração operacional permanece para antes da implantação; nenhuma cobrança foi ativada.
