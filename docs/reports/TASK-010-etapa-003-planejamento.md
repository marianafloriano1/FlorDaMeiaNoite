# TASK-010 — Etapa 003 — Planejamento

**Data:** 2026-11-04 (America/Sao_Paulo)
**Branch:** `task/TASK-010-verificacao-notificacoes`
**Commit-base:** `a289c51e3bab9bb2a7ffd01ec550701d7a579a25`
**Escopo desta etapa:** planejamento documental; nenhuma implementação ou teste funcional executado.

## 1. Estado, dependências e fontes

- TASK-010 está `READY`; GATE-001 e GATE-002 constam aprovados em `TASKS.md`.
- TASK-003, TASK-006 e TASK-009 constam `DONE`. Para TASK-009, o commit documental `e7fb9d81a5c43f0869b489eb4ad47293634eec5e` é ancestral da branch via commit integrador `09aab5080ff2f6dbae192c926402e9a6ca479809`.
- Decisões de 04/11/2026 e arquitetura foram consultadas em `docs/architecture/TASK-010-notificacoes.md`; GATE-002 e checklist DoR em `docs/reports/TASK-010-etapa-002-pre-condicoes.md`.
- Fontes adicionais: `AGENTS.md`, RF-004/RF-012, RN-003/RN-008..012, RNF-008/RNF-009, UC-02/UC-04/UC-06 no `README.md`; ADR-003 e ADR-007; rotas de pedidos; worker `src/workers/catalog-stock-alerts.mjs`; fixture `tests/task007/fixtures/mock-email-gateway.mjs`; migrations do outbox da TASK-007; `.github/workflows/ci.yml`; scripts do `package.json`.
- Inventário direcionado não encontrou calendário de feriados/notificações persistido nem interface administrativa de configurações. Há padrão de worker/outbox e gateway sintético reutilizável.

## 2. Requisitos e critérios de aceite planejados

1. **Identidade:** confirmação de conta e recuperação permanecem no Supabase Auth/TASK-003; TASK-010 não duplica esses fluxos. SMS permanece restrito à autenticação.
2. **E-mail transacional:** mensagens de pedido/status são assíncronas, com fornecedor desacoplado e Mailpit em desenvolvimento; nenhum fornecedor, domínio ou segredo é presumido.
3. **Eventos e outbox:** o evento notificável é persistido no mesmo limite transacional da mudança de negócio, para não perder a notificação entre commit e worker.
4. **Agenda:** lembretes T-24h/T-1h, aviso de pronto e alertas diários para perecíveis observam `America/Sao_Paulo`, armazenam timestamps UTC e usam calendário editável. Datas proibidas são reagendadas para o próximo dia permitido; T-24h/T-1h que, após reagendamento, caiam depois da retirada prevista são suprimidos. Por decisão registrada durante a Etapa 004, os alertas perecíveis começam na data prevista de retirada e cobrem três dias úteis de segunda a sexta, excluindo feriados ativos; mantêm o horário local da retirada e agrupam duplicatas do mesmo pedido/data. Esta regra não altera o prazo de descarte da TASK-009.
5. **Retries e concorrência:** claim com lease/lock e `skip locked`, retries limitados e idempotentes, erro sanitizado, estados auditáveis e proteção contra envio duplicado. Reutilizar como referência o padrão de lease/recovery da TASK-007 sem alterar sua implementação.
6. **Cancelamento:** cancelar o pedido invalida atomicamente notificações ainda pendentes/retryáveis. Mensagem já aceita pelo provedor não pode ser recolhida. Worker revalida pedido e estado antes de despachar; a janela entre despacho externo e cancelamento será testada e observada.
7. **Privacidade:** guardar somente identificador e dados mínimos de entrega; nunca OTP, CPF, conversa ou tokens em payload/log. Metadados e payloads seguem retenções distintas e descarte seguro.
8. **Templates:** mensagens necessárias nos idiomas pt/en/es/ru conforme idioma disponível do cliente, com fallback explícito pt-BR; valores, remetentes e idioma não devem ser inventados.
9. **Operação:** falhas do gateway são observáveis, limites configuráveis por canal/período e cobrança somente após teto/alertas e autorização. Ambiente local usa Mailpit ou gateway sintético, sem envio real.

## 3. Scope Guard

### Primary Changes candidatos

- Migration aditiva com outbox e calendário persistido, constraints, índices, RLS e RPCs de claim/finish/cancelamento.
- `src/lib/notifications/` para tipos, agenda de feriados, cálculo de lembretes, idempotência e adapter de e-mail.
- Worker dedicado sob `src/workers/` para claim, retry, dispatch, cancelamento e encerramento limpo.
- Templates transacionais pt/en/es/ru.
- Testes unitários e de integração com relógio simulado, fixtures sintéticas e gateway local.
- Job efêmero Supabase em `.github/workflows/ci.yml` para aplicar migrations e executar integração sem skips.

### Escopo do calendário (decisão da solicitante em 2026-11-04)

A solicitante definiu que a edição do calendário será feita somente pelo Supabase Studio. Portanto, não serão criadas página nem rota administrativa de calendário na aplicação. A migration aditiva TASK-010 deverá persistir as datas/categorias do calendário, acessíveis à operação autorizada pelo Supabase Studio. A política aprovada continua incluindo feriados nacionais, estaduais e municipais e reagendamento para o próximo dia permitido. O calendário não altera a regra de prazo de descarte da TASK-009.

### Incidental Changes

- Observabilidade e reprocessamento diretamente ligados ao worker/outbox.
- Alterações mínimas ao CI para executar job TASK-010 efêmero; revisar escopo do workflow antes de editar.

### Forbidden Changes

- Alterar ou duplicar Supabase Auth/TASK-003, contratos de pedidos/reservas ou migrations anteriores.
- SMS fora da autenticação; WhatsApp, marketing, envio real, provider pago, billing ou domínio sem autorização operacional.
- Modificar worker/outbox da TASK-007 para implementar TASK-010.
- Persistir OTP, credenciais ou PII desnecessária.
- Alterar regras de estoque, pedidos, pagamentos, cancelamento ou prazo da TASK-009.

## 4. Matriz critério → arquivos candidatos → validação

| Critério | Arquivos/componentes candidatos | Validação prevista |
|---|---|---|
| Modelo de outbox, política de acesso e agenda persistida | Nova migration aditiva `supabase/migrations/<timestamp-unico>_task010_notifications.sql`; RLS/RPCs | Supabase efêmero aplica todas as migrations; consultas negativas por anon/customer; constraints e RPCs verificadas |
| Calendário editável e acesso admin | API e tela administrativa acima, somente após autorização de escopo | Testes HTTP de sessão, role admin, customer negado, validação de datas/regiões; CRUD persistido em Supabase efêmero |
| Cálculo T-24h/T-1h, feriados e fuso | `src/lib/notifications/schedule.ts` e validação correspondente | Relógio simulado; fronteiras de data, DST/zone handling, feriado local/estadual/nacional e próximo dia permitido |
| Eventos sem perda e cancelamento | Integração transacional com eventos de pedido em migration aditiva e serviço de notificação | Teste integrado: commit produz outbox; rollback não deixa mensagem órfã; cancelar pedido impede dispatch de itens pendentes |
| Lease, retries, estados e idempotência | `src/workers/transactional-notifications.mjs`, RPCs outbox | Falha temporária, lease expirado, limite de tentativas, replay e concorrência com gateway sintético; nenhuma duplicidade lógica |
| Adapter, Mailpit e templates | `src/lib/notifications/email-adapter.ts`, `src/lib/notifications/templates/*`, config/env documentada | Gateway sintético/Mailpit; payload sem PII/segredos; idiomas/fallback; falha de provider não corrompe pedido |
| Limites e alertas de custo | Configuração server-only e monitor do worker | Valores não fixados no plano; testes de limite usam configuração sintética e billing desativado |
| CI isolada e regressão | `.github/workflows/ci.yml`, scripts package, testes `tests/task010/` | CI Linux com Supabase efêmero, migrations, 0 skips; testes anteriores aplicáveis, lint, typecheck, build e diff-check |

Nomes e caminhos são alvos de planejamento, não arquivos criados. O identificador temporal da migration será escolhido somente na Etapa 004 após verificar o estado então atual, evitando colisão.

## 5. Sequência proposta para Etapa 004

1. Criar a migration aditiva da agenda e dos dados do calendário, com acesso de edição operacional via Supabase Studio; manter sem tela/rota no app.
2. Definir schema aditivo, RLS, estados, chave de idempotência e RPCs; revisar limites e privacidade antes da migration.
3. Implementar cálculo de agenda/fuso/feriados com relógio injetável e validação unitária.
4. Implementar transação de criação dos eventos outbox alinhada aos eventos existentes de pedidos sem alterar contratos anteriores.
5. Implementar worker, lease, retries, backoff configurado, cancelamento pendente e adapter sintético; Mailpit em dev.
6. Implementar templates aprovados e fallback de locale.
7. Documentar procedimento operacional para editar feriados pelo Supabase Studio, sem adicionar UI/API administrativa.
8. Adicionar integração Supabase efêmera e testes negativos/concorrentes sem SKIP.
9. Revisar diff e executar testes TASK-010, regressão das TASKs afetadas, lint direcionado, typecheck, build e `git diff --check`; nenhuma evidência antecipada é presumida.

## 6. Riscos, rollback e dependências

- **Risco:** edição operacional direta do calendário requer acesso apropriado ao Supabase Studio. **Mitigação:** conceder esse acesso somente a operadores autorizados e não criar superfície pública/admin no app.
- **Risco:** corrida entre cancelamento e envio já reivindicado. **Mitigação:** estado/lease transacional, revalidação imediatamente antes do dispatch e testes concorrentes; mensagem aceita externamente não é reversível.
- **Risco:** retries com resposta ambígua duplicarem e-mail. **Mitigação:** chave estável e adapter que suporte idempotência; não repetir cegamente resultado ambíguo.
- **Reagendamento coincidente:** lembretes idênticos do mesmo pedido/tipo/destino que caiam na mesma data permitida serão agrupados em uma única mensagem lógica, preservando o conteúdo; tipos distintos (por exemplo T-24h e T-1h) permanecem separados. A chave idempotente inclui pedido, tipo e data local permitida.
- **Risco:** calendário, provider ou configuração ausente. **Mitigação:** não enviar; manter outbox observável e permitir configuração sem valores fictícios.
- **Rollback:** desligar worker por configuração; preservar outbox não enviado; reverter somente componentes TASK-010 após verificar consumidores; migration é aditiva e não deve apagar filas/estados já consumidos. Correção de schema exige migration compensatória, não edição retroativa.
- **Dependências:** TASK-003, TASK-006 e TASK-009 DONE; GATE-002 aprovado. Nenhum serviço pago, domínio, provider ou segredo é necessário para planejar/testar localmente com Mailpit/gateway sintético.

## 7. Gate e conclusão do planejamento

As duas definições pendentes foram resolvidas pela solicitante: o calendário será editado operacionalmente no Supabase Studio, sem página/API na aplicação; lembretes idênticos do mesmo pedido, tipo e data local permitida serão agrupados, mantendo tipos distintos separados. O plano atende aos critérios da Etapa 003 sem ampliar silenciosamente Allowed Changes. Nenhum bloqueio obrigatório permanece.

**GATE-001:** CONCLUÍDO.
**GATE-002:** CONCLUÍDO/APROVADO.
**GATE-003:** CONCLUÍDO/APROVADO.
**GATE-004–007:** PENDENTES, não iniciados.
```text
==================================================
TASK: TASK-010
ETAPA: 003
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio obrigatório do planejamento permanece após as decisões da solicitante.
CORREÇÕES REALIZADAS:
- Registrado o plano com matriz de critérios/arquivos/validação, sequência, riscos, rollback e decisões de escopo.
PENDÊNCIAS:
- Implementação ainda não iniciada; valores operacionais futuros permanecem parâmetros, sem ativação de serviço real.
TESTES RELACIONADOS:
- NOT RUN; etapa documental de planejamento. Nenhum teste funcional foi repetido.
PRÓXIMA ETAPA: 004 — Implementação
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-003 aprovado e plano disponível; Etapa 004 não iniciada nesta execução.
==================================================
```
