# TASK-010 — Etapa 004 — Implementação

**Data:** 2026-11-05 (America/Sao_Paulo)
**Branch:** `task/TASK-010-verificacao-notificacoes`
**Commit-base:** `a289c51e3bab9bb2a7ffd01ec550701d7a579a25`
**Status:** implementação em validação; GATE-004 permanece PENDENTE.

## Implementação registrada

- Migration aditiva `supabase/migrations/202611050001_task010_notifications.sql`: calendário de feriados, controles de canal/custo, outbox e payloads separados, RLS, triggers transacionais e RPCs de claim, despacho, retry e retenção.
- Adapter SMTP desacoplado, seguro por configuração explícita, sem remetente/provedor fictício ou envio habilitado por padrão.
- Worker com autorização service-role, templates `pt-BR`/`en`/`es`/`ru`, fallback `pt-BR`, chaves idempotentes, retry limitado, estado terminal para resultado de entrega ambíguo e encerramento por sinal.
- Agenda `America/Sao_Paulo`: lembretes T-24h/T-1h respeitam feriados e são suprimidos se o reagendamento ocorrer depois da retirada. Alertas de itens perecíveis começam na data prevista de retirada, preservam o horário local e cobrem três dias úteis (segunda a sexta, excluindo feriados ativos); duplicatas do mesmo pedido/data são agrupadas e a série pendente é cancelada quando não resta linha perecível aberta.
- Workflow `task010-integration` usa cópia da configuração Supabase no diretório temporário do runner, identificador por execução, aplica migrations e exige 1 teste de integração PASS, 0 FAIL e 0 SKIP. O job também executa regressões, lint/typecheck e smoke OCI do worker com canal desabilitado.
- Configuração da identidade SMTP, credenciais, limites, orçamento, alertas e retenção permanece sem valores operacionais definidos; canal desativado na ausência de configuração válida. Nenhum serviço pago ou envio externo foi ativado.

## Verificações executadas localmente

| Verificação | Resultado |
|---|---|
| `npm run test:task010` | PASS — 18/18, zero skips |
| `npm run lint:task010` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — Next.js 16.4.2/Turbopack compilou, TypeScript passou e 22 páginas estáticas foram geradas |
| `npm run test:auth` (TASK-003) | PASS — 3/3 |
| `npm run test:catalog` (TASK-004) | PASS — 19/19 |
| `npm run test:task005` | 4 PASS, 0 FAIL, 1 integração SKIP por falta de Supabase local isolado |
| `npm run test:task006` | 5 PASS, 0 FAIL, 1 integração SKIP por falta de Supabase local isolado |
| `npm run test:task007` | 14 PASS, 0 FAIL, 1 integração SKIP por falta de Supabase local isolado |
| `npm run test:task009` | PASS — 10/10 |
| `git diff --check` | PASS |

Os SKIPs das integrações TASK-005/006/007 não são tratados como aprovação. Não foi iniciada stack Docker local. A validação integrada das migrations e do worker deverá ocorrer no job efêmero TASK-010 da CI.

## CI e evidência pendente

A execução GitHub Actions `42087756954` (commit `78bf5b11d92f4b328cce64aed90d8cc048d60a93`) confirmou a inicialização da stack Supabase efêmera e a aplicação das migrations sem erro. O teste integrado TASK-010 falhou, sem SKIP: em `tests/task010/notifications.integration.test.ts:144`, esperava-se 1 mensagem enviada, mas o worker enviou 6 (`6 !== 1`). O lint/typecheck e o smoke OCI seguintes foram ignorados por dependerem do sucesso desse teste; a construção da imagem OCI do worker passou.

Diagnóstico: o job executava `npm run test:task009:integration` antes do teste TASK-010, usando o mesmo banco efêmero. Essa integração cria pedidos sintéticos que deixam notificações elegíveis no outbox global; `runNotificationCycle` processa corretamente toda a fila elegível, então a contagem total não era isolada para o pedido recém-criado pelo teste. A asserção de uma mensagem é válida para uma fila limpa, mas a ordem do job contaminava esse pré-requisito.

Correção aplicada somente ao workflow: o teste integrado TASK-010 agora roda após os testes unitários TASK-010 e antes das regressões integradas das tarefas anteriores. Assim, a stack recém-migrada contém apenas o pedido criado pelo próprio teste quando ele verifica a primeira entrega. Nenhuma asserção foi removida ou afrouxada e nenhum código funcional, migration, seed ou dado persistente foi alterado.

A correção precisa de uma nova execução real do job para validar o resultado integrado e permitir que lint/typecheck e smoke OCI sejam executados após ele. Até essa evidência, migration: PASS na execução anterior; integração: FAIL na execução anterior e aguardando reexecução após a correção; smoke OCI: NOT RUN (etapa seguinte foi pulada). O GATE-004 permanece PENDENTE. A sintaxe do YAML foi revisada estruturalmente, mas não foi possível executar `actionlint` ou um parser YAML local.

## Revalidação local do commit `78bf5b1` — 2026-11-05

- `npm run test:task010`: PASS — 18/18, zero skips.
- `npm run lint:task010`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS — Next.js compilou, TypeScript passou e 22 páginas estáticas foram geradas.
- A execução Actions `42087756954` foi localizada na página autenticada do job. O teste integrado falhou pela contaminação da fila descrita acima; a migration foi aplicada e a imagem do worker foi construída. O smoke OCI não rodou porque o teste integrado falhou. O workflow foi reordenado localmente; ainda falta uma nova execução da CI sobre essa alteração.
- `git diff --check`: PASS. Os únicos itens locais não rastreados são dois backups `ci.yml.bak-task010*`; foram preservados sem alteração.

## Gate

- **GATE-004:** PENDENTE — aguarda CI verde, com migration aplicada na stack efêmera e integração TASK-010 1/1 PASS, zero skips, além do smoke OCI do worker.
- **Etapa 005:** não iniciada e não habilitada até o GATE-004 ser aprovado.
- Nenhum arquivo funcional de TASK-003, TASK-004, TASK-006 ou TASK-009 foi alterado. Alterações de workflow, dependência SMTP, Docker, README/TASKS e documentação são compartilhadas ou específicas da TASK-010 conforme escopo.
- A implementação está registrada em `78bf5b1`. Nesta revalidação não houve merge, deploy, reset, limpeza ou alteração dos backups não rastreados.
