# TASK-009 — Etapa 004 — Implementação

**Data:** 2026-11-02
**Checkout:** `flor-da-meia-noite-task-009`
**Branch:** `task/TASK-009-gestao-pedidos-retirada`
**Base observada:** `356ab8048896905f4b30c0cc78d2aa700ae30007`

## Implementação registrada

- Migration aditiva `202611020001_task009_order_lifecycle.sql`: agenda de retirada; classificação e estado por linha; trilha de auditoria; retorno de estoque por item não usado; cancelamento; descarte de perecíveis; registro de defeito/avaria; agregação do estado terminal para pedidos mistos; alinhamento do cancelamento por expiração da reserva.
- RPCs verificam papel no banco, exigem AAL2 e prova de MFA servidor dentro de cinco minutos para admin, bloqueiam transições inválidas e fazem mudanças de estoque/ledger/eventos dentro da mesma transação. A prova recente não é renovada por essas chamadas. Antes do preparo, todas as linhas abertas precisam estar classificadas; para marcar pronto, é exigida agenda futura. Cancelamento pago também é permitido antes do início do preparo, com acordo auditado. Replays de cancelamento, descarte, agenda, classificação e registro idempotente de ocorrência não repetem efeitos.
- APIs administrativas aplicam same-origin, sessão, RBAC, MFA e validação de payload. Visitante recebe 401; papel inadequado recebe 403. Employee prepara, marca pronto e confirma retirada; ações exclusivas de admin continuam protegidas.
- Painel administrativo permite agendar retirada, classificar linhas, registrar retirada, cancelar com confirmação auditada, devolver apenas quantidade não usada após o prazo e registrar defeito/avaria sem conteúdo de conversa. A página do cliente mostra agenda, status agregado e status de suas linhas.
- Permanecem fora da implementação: cálculo/processamento de reembolso e envio automático de WhatsApp/e-mail.
- CI preparada para executar migrations em projeto Supabase efêmero e testar TASK-009 sem aceitar skip. A imagem OCI utiliza lint direcionado TASK-009 na branch própria, seguindo o mecanismo já existente para TASK-007; os diagnósticos globais da TASK-003 não foram alterados nem suprimidos.

## Evidência de validação

| Verificação | Resultado observado |
|---|---|
| `npm run test:task009` | **PASS — 10/10, 0 falhas, 0 skips** (testes de payload, HTTP, same-origin, sessão, RBAC e MFA da rota) |
| `npm run lint:task009` | **PASS — 14 arquivos, sem diagnósticos** |
| `npm run typecheck` | **PASS** — `next typegen` gerou os tipos e `tsc --noEmit` concluiu sem erros |
| `git diff --check` | **PASS** |
| `npm run build` | **FAIL/BLOCKED** — repetido após remover `.next`; Turbopack não encontrou `next/package.json` dentro do root do worktree, pois a dependência compartilhada está fora dele |
| `npx next build --webpack` | **FAIL/BLOCKED** — após a limpeza autorizada de `.next`, falhou com `EPERM` ao criar `.next/types/app/api/cart`; `node_modules/.cache` não existia |
| Docker | **BLOCKED** — Docker Client 29.9.2 existe; Docker Engine Linux não respondeu pelo named pipe `dockerDesktopLinuxEngine` |
| Supabase CLI | **BLOCKED** — `npx supabase --version` parou em `EPERM` ao gravar telemetria em `%USERPROFILE%\.supabase`; nenhuma stack ou migration foi iniciada |
| `test:task009:integration` / migration | **NOT RUN** — requer Docker/Supabase isolado; CI foi preparada, mas não foi disparada nesta execução |
| Parse automático do YAML da CI | **NOT RUN** — não há parser `yaml`/`js-yaml` nem `actionlint` disponível neste ambiente |
| Lint global | **NOT RUN** — a validação desta TASK usa lint direcionado; diagnósticos globais preexistentes da TASK-003 permanecem sem alteração |

## Pendências que bloqueiam o GATE-004

1. Aplicar a sequência completa de migrations em Supabase efêmero e obter PASS dos testes integrados de agenda, classificação, prova MFA recente no banco, retorno seletivo, idempotência, expiração e descarte.
2. Executar a CI Linux preparada e confirmar PASS do job integrado, typecheck, lint direcionado e build/OCI.
3. Resolver o ambiente de build do checkout dedicado: dependência Next.js ausente dentro do root do worktree e bloqueio `EPERM` na geração de `.next`, mesmo após limpeza autorizada.

Nenhuma migration foi aplicada neste ambiente. Não há evidência para aprovar o GATE-004 ou habilitar a Etapa 005. A Etapa 006 e a TASK-010 não foram iniciadas.

## Scope Guard

- Arquivos funcionais alterados pertencem ao fluxo de agenda, retirada, cancelamento e acompanhamento da TASK-009, mais configuração/testes direcionados necessários à sua validação.
- Nenhuma migration existente foi editada ou renomeada; nenhuma dependência foi adicionada.
- Código, testes e migrations da TASK-003 e implementação/código da TASK-004 não foram alterados nesta implementação. Mudanças documentais anteriores no README/ADR/arquitetura e no fechamento TASK-006 foram solicitadas separadamente e permanecem no worktree.
- Nenhum container, volume ou banco persistente foi iniciado, parado, resetado ou limpo. Sem commit, push ou deploy.

## Gate

```text
TASK: TASK-009
Status da TASK: IN_REVIEW
Etapa: 004 — Implementação
Implementação de aplicação: concluída para validação
STATUS DA ETAPA: BLOQUEADA
GATE-004: BLOQUEADO
Etapa 005: NÃO HABILITADA
Motivo: validação integrada Supabase/CI e build OCI ainda sem evidência PASS.
```
