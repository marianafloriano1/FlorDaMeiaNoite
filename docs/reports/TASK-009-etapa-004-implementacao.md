# TASK-009 — Etapa 004 — Implementação

**Revalidação:** 2026-11-03 23:02 America/Sao_Paulo
**Checkout:** `flor-da-meia-noite-task-009`
**Branch:** `task/TASK-009-gestao-pedidos-retirada`
**Base observada:** `356ab8048896905f4b30c0cc78d2aa700ae30007`
**Commit validado por CI:** `d1f9c3ebe574b3bc9a5af033a5c71ef28fcbaa9d` — [CI 41757612439](https://github.com/marianafloriano1/FlorDaMeiaNoite/actions/runs/41757612439)
**Commit local adicional, ainda não enviado:** `43b5feacd5d3777c5a26cfb0a7b80c55120cdd89`; adiciona apenas um passo de regressão TASK-003 à CI.

## Implementação e validação

A Etapa 004 implementa a agenda de retirada, classificação e estado por linha, auditoria, cancelamento com devolução seletiva, descarte de perecíveis, registro de defeito/avaria e estado terminal agregado de pedidos mistos. RPCs e APIs verificam RBAC, MFA recente, same-origin, idempotência e consistência transacional. Employee prepara, marca pronto e confirma retirada; ações exclusivas de admin permanecem protegidas. Reembolso e envio automático de mensagens permanecem fora do escopo.

| Verificação | Resultado |
|---|---|
| Integração Supabase TASK-009 | **PASS na CI 41757612439**: stack efêmera, migrations, testes de integração, guard TAP de zero testes/falhas/skips, lint direcionado e typecheck. O teste ampliado cobre rollback de cancelamento inválido, isolamento RLS entre clientes, evento de ocorrência idempotente e pedido misto até retirada. |
| Lint, typecheck, build Next.js, imagem OCI e smoke `GET /auth` | **PASS na CI 41757612439**. O step de smoke iniciou a imagem e verificou HTTP 200. |
| Regressões CI TASK-005 e TASK-006 | **PASS** na execução 41757612439. |
| `npm run test:task009` | **PASS local — 10/10, 0 falhas, 0 skips**. |
| `npm run lint:task009` | **PASS local — 14 arquivos, sem diagnósticos**. |
| `npx tsc --noEmit` | **PASS local**. |
| `npm run test:task009:integration` local | **NOT RUN/BLOCKED** — 1 teste foi ignorado pela ausência de credenciais/stack local; a validação integrada real passou na CI, cujo guard rejeita zero testes ou qualquer skip. |
| Regressão TASK-003 `npm run test:auth` | **PASS — 3/3**. |
| Regressão TASK-003 `npm run test:auth:supabase-mfa` | **BLOCKED localmente** — falhou na pré-condição `requires loopback Supabase URL`; não havia stack/URL local e nenhum fluxo MFA foi exercitado. Foi acrescentado à CI um passo que executa o teste contra a stack Supabase efêmera; esse passo está no commit local `43b5fea` e ainda aguarda push/execução. |
| Regressão TASK-004 `npm run test:catalog` | **PASS — 19/19, 0 skips**. |
| Regressões locais TASK-005 / TASK-006 | TASK-005 **4 PASS, 1 SKIP**; TASK-006 **5 PASS, 1 SKIP** por ausência de stack local. Integrações das duas passaram na CI 41757612439. |
| Regressão TASK-007 `npm run test:task007` | **PASS — 14 PASS, 1 SKIP** por ausência de Supabase local, com `NODE_PATH` apontando a `node_modules/next/dist/compiled`. |
| TASK-008 | `package.json` não define script de testes TASK-008. Suas migrations estão na sequência aplicada pelo job Supabase TASK-009 da CI. |
| `git diff --check` | **PASS** após as alterações documentais. |

## Escopo e evidências

- Comparação da branch com a base `356ab80`: nenhum arquivo de código, teste ou migration da TASK-003 ou TASK-004 foi alterado. A única alteração de workflow desta revalidação acrescenta uma execução de regressão do teste MFA TASK-003 na stack já efêmera; não altera código da TASK-003.
- O job e os passos do run 41757612439 aparecem como `success` na API pública do GitHub, incluindo `Testes Supabase TASK-009 (TAP e skip proibido)` e `Iniciar container e verificar endpoint TASK-009`. O workflow exige `# tests` maior que zero, `# fail 0`, nenhum skip e presença do teste principal. Os logs brutos dos jobs não estão acessíveis nesta sessão; não se registra saída detalhada além dos estados públicos dos passos e do predicado documentado no workflow.
- Nenhuma stack local, volume ou dado persistente foi iniciado, parado, resetado ou removido. Foram usados dados sintéticos na CI.

## Resultado do gate

```text
TASK: TASK-009
Status da TASK: IN_REVIEW
Etapa: 004 — Implementação
Branch/Commit validado: task/TASK-009-gestao-pedidos-retirada / d1f9c3ebe574b3bc9a5af033a5c71ef28fcbaa9d
Primary Changes: ciclo de agenda, retirada, cancelamento e descarte por linha; migration/RPCs/API/UI TASK-009
Incidental Changes: expansão de testes integrados TASK-009 e passo CI de regressão MFA TASK-003
Tests/Gates: GATE-004 PASS; integração Supabase, testes TASK-009, lint, typecheck, build, imagem OCI e smoke HTTP PASS na CI 41757612439; teste local de MFA Supabase TASK-003 BLOCKED por ausência de URL loopback, regressão remota adicionada mas ainda sem execução
Scope Guard: PASS — TASK-003 e TASK-004 sem alterações funcionais; alteração de workflow limitada à regressão sintética
Definition of Done da Etapa 004: PASS
Next Eligible: Etapa 005 — HABILITADA; não executada nesta revalidação
```

```text
GATE-004: CONCLUÍDO/APROVADO
Evidência principal: CI 41757612439, commit d1f9c3ebe574b3bc9a5af033a5c71ef28fcbaa9d
Etapa 005: HABILITADA PARA EXECUÇÃO FUTURA; NÃO INICIADA
Ressalva independente: a regressão TASK-003 MFA ainda aguarda publicação e execução do commit local 43b5fea.
```
