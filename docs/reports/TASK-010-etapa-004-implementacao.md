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

Inspeção do workflow confirmou que `task010-integration` é acionado em branches `task/TASK-010*`, copia `supabase/` para `$RUNNER_TEMP`, define `project_id` exclusivo por execução, inicia a stack local efêmera, executa `supabase migration up --local`, exporta URL/chaves emitidas pela stack e executa `tests/task010/notifications.integration.test.ts`. O shell exige exatamente 1 teste, 1 PASS, 0 FAIL, nenhum SKIP e o título da suíte; também há lint direcionado, typecheck, build da imagem do worker e smoke test.

O job ainda não foi executado nesta revisão. Portanto, a aplicação real da migration, os testes Supabase e o smoke OCI permanecem **PENDENTES**. O build local PASS não substitui essas evidências. A validação automatizada de sintaxe YAML não pôde ser executada: não há parser YAML nem `actionlint` instalado no ambiente; o bloco foi inspecionado estruturalmente. O próprio runner do GitHub fará a validação definitiva ao iniciar o workflow.

## Gate

- **GATE-004:** PENDENTE — aguarda CI verde, com migration aplicada na stack efêmera e integração TASK-010 1/1 PASS, zero skips, além do smoke OCI do worker.
- **Etapa 005:** não iniciada e não habilitada até o GATE-004 ser aprovado.
- Nenhum arquivo funcional de TASK-003, TASK-004, TASK-006 ou TASK-009 foi alterado. Alterações de workflow, dependência SMTP, Docker, README/TASKS e documentação são compartilhadas ou específicas da TASK-010 conforme escopo.
- Nenhum commit, push, merge, deploy, reset ou limpeza foi executado.
