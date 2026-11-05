# TASK-010 — Etapa 002 — Pré-condições e Definition of Ready

**Data:** 2026-11-04 (America/Sao_Paulo)
**Branch:** `task/TASK-010-verificacao-notificacoes`
**HEAD de referência:** `09aab5080ff2f6dbae192c926402e9a6ca479809`
**Resultado:** aprovada; nenhuma implementação, serviço ou migration executados.

## Escopo verificado

- O contrato `AGENTS.md`, a seção TASK-010 de `TASKS.md`, os critérios RF-004/RF-012, RN-003/RN-011/RN-012, RNF-008/RNF-009 e UC-02/UC-06 do `README.md`, além dos ADRs 001, 003, 005 (histórico) e 007 e `docs/architecture/overview.md`.
- TASK-003, TASK-006 e TASK-009 estão `DONE` nesta base. O commit documental da TASK-009 (`e7fb9d81a5c43f0869b489eb4ad47293634eec5e`) foi integrado a esta branch pelo commit `09aab5080ff2f6dbae192c926402e9a6ca479809`; `git merge-base --is-ancestor` retornou exit code 0.
- Supabase Auth/TASK-003 gerencia verificação de conta e recuperação de senha; a TASK-010 não duplica esses fluxos. O SMS permanece restrito à autenticação. As notificações transacionais da TASK-010 são separadas. Mailpit é apenas o receptor local de desenvolvimento.
- RF-012 define e-mail para confirmação/lembretes de retirada, aviso de pronto e alertas diários de perecíveis. RNF-008 requer fuso `America/Sao_Paulo`, armazenamento UTC e exceções de feriados editáveis. RN-011 mantém para descarte da TASK-009 dias de segunda a sábado sem excluir feriados; essa regra não rege a política de envio da TASK-010.
- Os relatórios das Etapas 001 e 002 foram preservados como registro documental.

## Decisões aprovadas

A solicitante aprovou em 2026-11-04:

1. **Calendário de feriados:** calendário editável, com reagendamento dos lembretes para o próximo dia permitido. O calendário contempla feriados nacionais, estaduais e municipais.
2. **Identidade do remetente:** utilizar a identidade oficial da loja. Endereço de e-mail e domínio reais serão fornecidos posteriormente; nenhum valor foi inventado.
3. **Provedor de e-mail:** arquitetura independente de fornecedor, com adapter para e-mail transacional. A escolha do provedor é posterior. Mailpit nos testes locais.
4. **Limites configuráveis:** manter limites operacionais configuráveis, sem valores arbitrários apresentados como decisões definitivas.
5. **Controle de custos:** estabelecer teto de gastos e alertas antes de habilitar cobrança do provedor.
6. **Retenção e descarte:** manter política de retenção separada, entre metadados e payloads, e descarte seguro dos dados.

Fornecedor, endereço/domínio reais, valores de limites e orçamento, limiares de alerta e prazos concretos de retenção são parâmetros operacionais futuros, configurados depois. Não são decisões pendentes de aprovação.

## Checklist DoR

| Critério | Resultado | Evidência |
|---|---|---|
| Autorização, branch dedicada e escopo | PASS | Branch dedicada `task/TASK-010-verificacao-notificacoes`; alterações limitadas à documentação da TASK-010. |
| Rastreabilidade e critérios | PASS | RF/RN/RNF/UC listados acima existem no README e correspondem à tarefa. |
| Dependências TASK-003 e TASK-006 | PASS | Ambas `DONE` em `TASKS.md`. |
| Dependência TASK-009 | PASS | `DONE` em `TASKS.md`; commit `e7fb9d8` integrado por `09aab50`; ancestralidade exit 0. |
| Arquitetura Supabase/Auth e fronteira TASK-010 | PASS | ADR-007 vigente; ADR-003 atribui notificações automáticas à TASK-010; Auth/SMS documentados em `docs/architecture/TASK-010-notificacoes.md`. |
| Provedores e remetente | PASS | Decisões 2 e 3; valores reais são parâmetros futuros. Nenhum envio real ativado. |
| Política de feriados e agendamento | PASS | Decisão 1; regra de descarte da TASK-009 permanece distinta. |
| Custos, limites e alertas | PASS | Decisões 4 e 5; cobrança só após teto e alertas definidos. |
| Retenção e cancelamento de notificações | PASS | Decisão 6; cancelamento do pedido invalida notificações pendentes (ver arquitetura). |
| Ambiente e validação | PASS | Mailpit disponível no desenvolvimento; serviços pagos não ativados. |

## Verificações desta etapa

- Fontes e estado Git consultados; ancestralidade da TASK-009 confirmada (exit code 0).
- Nenhum teste funcional, T001–T014, migration, container, envio de e-mail/SMS, serviço externo ou alteração de código foi executado; a etapa é documental.
- Conferência por `git diff --check` e revisão do diff antes do commit.
- TASK-003, TASK-006 e TASK-009 não foram modificadas.

## Gates TASK-010

| Gate | Estado |
|---|---|
| GATE-001 — Recontextualização | CONCLUÍDO |
| GATE-002 — Pré-condições | CONCLUÍDO |
| GATE-003 — Planejamento | PENDENTE |
| GATE-004 — Implementação | PENDENTE |
| GATE-005 — Revisão | PENDENTE |
| GATE-006 — Testes manuais | PENDENTE |
| GATE-007 — Conclusão | PENDENTE |

**Totais:** 2 concluídos, 5 pendentes, 0 bloqueados. TASK-010 fica `READY`. A Etapa 003 está habilitada, mas não foi iniciada.