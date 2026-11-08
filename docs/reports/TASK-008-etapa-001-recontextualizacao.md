# TASK-008 — Etapa 001 — Recontextualização e histórico

**Data:** 2026-10-29
**Checkout:** `flor-da-meia-noite`
**Branch:** `task/TASK-008-cupons-cart-events`
**HEAD base:** `356ab80` (branch TASK-007 publicada; sem commit nesta etapa)

## Objetivo e escopo

Reconciliar o contexto da TASK-008, registrar decisões de negócio aprovadas, confirmar dependências e rastreabilidade e verificar o Definition of Ready. Nenhuma funcionalidade foi implementada.

## Fontes consultadas

- `AGENTS.md` — ordem de governança, DoR, Scope Guard e transição de estado.
- `README.md` — RF-006, RF-015, RF-018; RN-005, RN-006, RN-017; UC-03; pendências e rastreabilidade.
- `TASKS.md` — estado/dependências/escopo/aceite da TASK-008 e estados das dependências.
- `docs/adr/ADR-002-postgresql-e-estoque.md` e `docs/adr/ADR-006-query-layer-e-migrations.md` — persistência e migrations; TASK-008 não cita ADR específico.
- `docs/architecture/overview.md` — arquitetura Supabase vigente.
- `.github/workflows/ci.yml` e `package.json` — CI Linux com Supabase CLI 2.122.0 e projetos efêmeros isolados já usados pelas TASK-005/006; scripts de teste dessas tarefas são existentes, mas ainda não há suíte própria TASK-008.
- `prompts/tasks/task-008/prompt-task-008-etapa-001-recontextualizacao.md` — procedimento da etapa.

## Fatos confirmados

- TASK-003 e TASK-005 estão registradas como `DONE` na branch de trabalho atual.
- A TASK-008 estava `BLOCKED` por seis decisões sobre cupons; as outras condições precisam ser avaliadas pelo DoR, não presumidas.
- README já atribui a geração dos relatórios agregados de RF-018 à TASK-011. A TASK-008 precisa registrar os eventos de carrinho/favoritos (`CartEvent`), enquanto TASK-011 consome/agrega esses eventos para relatórios.
- A descrição antiga de UC-03 misturava criação de reserva e abertura do WhatsApp. A fronteira vigente separa reserva (TASK-005), criação de pedido (TASK-006) e abertura manual/opcional do WhatsApp após persistência.
- Existe CI Linux com provisionamento de Supabase efêmero para testes integrados anteriores. A suíte e as fixtures específicas de TASK-008 ainda deverão ser planejadas e implementadas; nenhuma validação de TASK-008 foi executada nesta etapa.

## Decisões de negócio aprovadas pela solicitante em 2026-10-29

1. Um cupom por pedido; cupons não são acumuláveis.
2. Não existe mínimo geral; uma campanha pode configurar um mínimo elegível.
3. O escopo padrão abrange o catálogo inteiro; uma campanha pode restringir produtos/categorias.
4. Limite de uso por cliente é configurável por campanha; sem limite definido, o uso é ilimitado.
5. O desconto usa `numeric` no PostgreSQL e arredonda o valor monetário a duas casas decimais.
6. Cancelamento antes da confirmação do pagamento libera o resgate do cupom uma única vez. Após pagamento confirmado, não há reativação automática.

As decisões foram incorporadas ao RF-015/RN-006 e à seção da TASK-008 em `TASKS.md`. Não foi criada regra adicional de produto.

## Reconciliações documentais

- RF-018 agora separa captura de eventos (`CartEvent`, TASK-008) de agregação/exportação de relatórios (TASK-011).
- UC-03 agora esclarece: TASK-005 persiste a reserva temporária; TASK-006 consome reserva válida e persiste o pedido; somente depois a interface pode oferecer WhatsApp como canal opcional, com envio manual fora da transação.
- Nenhum requisito de catálogo, autenticação, reserva, pagamento ou arquitetura foi alterado.

## Definition of Ready

| Critério | Resultado | Evidência |
|---|---|---|
| Dependências concluídas | PASS | TASK-003 e TASK-005 estão `DONE` em `TASKS.md`. |
| Rastreabilidade existente | PASS | RF-006/015/018, RN-006/017 e UC-03/08 conferidos no README. |
| Critérios testáveis e regras essenciais decididas | PASS | Regras de cupom aprovadas acima e incorporadas ao README/TASKS. |
| Escopo permitido/proibido praticável | PASS | Coupon/Redemption/CartEvent, painel administrativo e validação backend; sem alteração das tarefas anteriores. |
| Ambiente de validação sintético disponível | PASS para planejamento | Workflow tem stack Supabase efêmera em runner Linux. Testes próprios da TASK-008 ainda serão definidos; não foram executados aqui. |
| Decisão externa essencial pendente | NENHUMA para iniciar | Número de WhatsApp, política legal ou outros parâmetros de implantação não são necessários à TASK-008. |

**DoR:** PASS. TASK-008 transicionada de `BLOCKED` para `READY`. Nenhum código funcional, migration ou segredo foi criado/alterado. Não houve commit ou push.

## GATE-001 e gates acumulados

- **GATE-001:** CONCLUÍDO/APROVADO.
- **GATE-002 a GATE-007:** PENDENTES; nenhuma etapa posterior foi executada.
- **Contagem:** 1 concluído, 6 pendentes, 0 bloqueados.

## Verificações e alterações

- Git antes da edição: worktree sem alterações locais; branch dedicada criada a partir de `356ab80`.
- Testes: NOT RUN (nenhuma implementação nesta etapa).
- `git diff --check`: PASS após a edição dos três arquivos documentais.
- Arquivos alterados: `README.md`, `TASKS.md`, `docs/reports/TASK-008-etapa-001-recontextualizacao.md`.
- TASK-003 e TASK-005: sem alteração.
- Próxima etapa habilitada: Etapa 002 — Pré-condições; não iniciada.