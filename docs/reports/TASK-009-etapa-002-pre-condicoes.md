# TASK-009 — Etapa 002 — Pré-condições e decisões

**Registro restaurado:** 2026-11-02
**Checkout:** `flor-da-meia-noite-task-009`
**Branch:** `task/TASK-009-gestao-pedidos-retirada`
**HEAD de referência:** `356ab8048896905f4b30c0cc78d2aa700ae30007`

## Proveniência

O relatório original da Etapa 002 não estava no worktree dedicado reestruturado, e a busca nas pastas de trabalho acessíveis localizou apenas o prompt oficial. Este registro foi restaurado a partir das decisões explícitas da solicitante nesta conversa, do prompt da Etapa 002 e do estado documentado no `TASKS.md`. Ele preserva a proveniência: não afirma que os testes de implementação ou o Supabase foram executados nesta etapa.

## Definition of Ready e dependências

- **TASK-006:** `DONE` no `TASKS.md`, após sete gates registrados como aprovados no relatório da Etapa 007 e autorização explícita da solicitante para concluir a task. O número oficial de WhatsApp e o texto legal de cancelamento permanecem condições de implantação, não decisões pendentes da TASK-009.
- **TASK-007:** `DONE` no `TASKS.md`, com GATE-007 concluído e gates anteriores registrados como aprovados.
- **Rastreabilidade:** RF-009..014/020, RN-008..014, RNF-010, UC-04/05/07 e ADR-003 presentes no backlog e na documentação consultada.
- **Arquitetura:** Supabase continua sendo a plataforma autorizada. O escopo não exige novo provedor, cobrança ou infraestrutura paralela.
- **Worktree:** branch própria da TASK-009 confirmada; `git status` inicialmente mostrou somente a alteração documental de `TASKS.md` feita a pedido da solicitante. A raiz da TASK-003 não foi usada nem alterada.

## Decisões aprovadas pela solicitante

1. Admin agenda data e horário acordados de retirada; employee prepara, marca pronto para retirada e registra a retirada. Admin cancela pedidos.
2. Admin classifica manualmente cada linha do pedido como perecível ou não perecível.
3. Perecível não retirado pode ser marcado `discarded` por admin após três dias úteis desde a data acordada. Para esta regra, contam-se segunda-feira a sábado; feriados não são excluídos. Descarte é por linha e não devolve estoque.
4. Não perecível pode aguardar até sete dias corridos após a data acordada; depois disso, admin pode cancelar.
5. Em cancelamento de `ready_for_pickup`, somente linhas não usadas retornam ao estoque. Linhas usadas, retiradas ou descartadas nunca retornam.
6. Em pedido misto, as ações e estados são por linha; o pedido só fica terminal quando todas as linhas forem retiradas, canceladas ou descartadas.
7. Para cancelar pedido pago, admin registra de forma auditável a confirmação do acordo do cliente. Não se armazena conteúdo de WhatsApp. O sistema não calcula nem processa reembolso.

## Resultado da etapa

**GATE-002: CONCLUÍDO conforme o histórico de aprovação da solicitante.** As decisões necessárias ao escopo estão registradas acima. A ausência do relatório original é uma limitação de proveniência explicitada, não evidência de teste de implementação. Nenhuma migration, código, banco ou serviço foi alterado nesta etapa documental. Testes funcionais, Supabase e integração: **NOT RUN** nesta restauração.

```text
TASK: TASK-009
ETAPA: 002 — Pré-condições e decisões
STATUS DA ETAPA: APROVADA (registro restaurado)
GATE-002: CONCLUÍDO conforme aprovação anterior reportada pela solicitante
Dependências: TASK-006 DONE; TASK-007 DONE
Limitação: relatório original não localizado; restauração baseada no histórico desta conversa
Implementação/testes: NOT RUN nesta etapa
Próxima etapa: 003 — Planejamento (já aprovada no histórico; ver relatório restaurado)
```
