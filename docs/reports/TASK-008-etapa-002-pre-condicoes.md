# TASK-008 — Etapa 002 — Pré-condições e decisões

**Data:** 2026-10-29
**Checkout:** `flor-da-meia-noite`
**Branch:** `task/TASK-008-cupons-cart-events`
**Base:** `356ab80`; alterações documentais da Etapa 001 ainda locais.

## Resultado

**GATE-002: CONCLUÍDO/APROVADO.** As pré-condições para planejar a implementação da TASK-008 foram verificadas. Esta etapa não implementou funcionalidade, schema, migration ou testes e não iniciou a Etapa 003.

## Checklist DoR

| Critério | Resultado | Evidência |
|---|---|---|
| Autorização e etapa anterior | PASS | Solicitação explícita para executar a Etapa 002; GATE-001 aprovado em `docs/reports/TASK-008-etapa-001-recontextualizacao.md`. |
| Dependências | PASS | TASK-003 e TASK-005 constam DONE em `TASKS.md` da branch. TASK-006 não é dependência formal da TASK-008; a interface de consumo de cupom no checkout está descrita no README. |
| Rastreabilidade | PASS | RF-006/015/018, RN-006/017 e UC-03/08 existem no README e estão vinculados à TASK-008. |
| Decisões de negócio | PASS | As seis regras de cupom foram aprovadas pela usuária e registradas em RF-015/RN-006. |
| Escopo permitido e proibido | PASS | Entidades Coupon/Redemption/CartEvent, painel administrativo e validação backend; funcionários não criam cupons, descontos não superam subtotal e cupons expirados são rejeitados. Captura de CartEvent é TASK-008; agregação/exportação de RF-018 é TASK-011. |
| Arquitetura e fronteiras | PASS | Supabase/PostgreSQL é a arquitetura vigente. TASK-005 cria reserva, TASK-006 persiste pedido, e abertura/envio manual do WhatsApp ocorre opcionalmente depois, fora da transação. |
| Ambiente e dados de teste | PASS para preparação | Workflow usa runner Linux, Supabase CLI 2.122.0 e stack efêmera por execução; variáveis/chaves são geradas pela stack. Não foram iniciados serviços nem executados testes nesta etapa. |
| Segredos/serviços pagos | PASS | Validação futura delimitada à stack efêmera da CI; nenhuma integração faturável ou credencial real necessária. |
| Critérios/validação | PASS | Critérios incluem validade, limites, concorrência de resgate, cancelamento idempotente, autorização e preço calculado no servidor. Os testes específicos serão planejados antes da implementação. |

## Decisões vigentes

- Um cupom por pedido; sem acumulação.
- Sem mínimo geral; mínimo elegível opcional por campanha.
- Catálogo inteiro por padrão; restrições opcionais por produto/categoria.
- Limite de uso por cliente configurável por campanha; ilimitado quando omitido.
- Cálculo com PostgreSQL `numeric`, arredondado a duas casas decimais.
- Cancelamento antes da confirmação do pagamento libera o resgate uma única vez; após confirmação não há reativação automática.

## Transição e validação

O prompt da Etapa 002 proíbe mudança de estado, enquanto o `AGENTS.md` exige READY → IN_PROGRESS ao iniciar. A contradição foi apresentada à usuária; ela autorizou seguir o `AGENTS.md`. A TASK-008 foi transacionada para **IN_PROGRESS**.

- `git diff --check`: PASS.
- Testes: NOT RUN; nenhuma implementação foi feita.
- Alterações da etapa: `TASKS.md` e este relatório. As alterações README/TASKS da Etapa 001 permanecem no mesmo conjunto documental local.
- Nenhum arquivo funcional, migration, segredo, serviço pago ou ambiente Supabase foi alterado/iniciado.

**GATE-002:** CONCLUÍDO/APROVADO.
**Gates acumulados:** 2 concluídos (GATE-001, GATE-002), 5 pendentes (GATE-003 a GATE-007), 0 bloqueados.
**Próxima etapa:** Etapa 003 — Planejamento, habilitada e não iniciada.