# TASK-008 — Etapa 005 — Revisão

**Data:** 2026-10-30
**Checkout:** `flor-da-meia-noite`
**Branch registrada:** `task/TASK-008-cupons-cart-events`
**GATE-004:** CONCLUÍDO/APROVADO, conforme relatório da Etapa 004.
**Resultado da revisão:** APROVADA.

## Escopo e fontes verificadas

Revisados o `AGENTS.md`, RF/RN/UC relevantes do `README.md`, seção TASK-008 do `TASKS.md`, ADR-003, overview, planejamento da Etapa 003, relatório da Etapa 004 e os componentes de cupom, checkout, migration e testes em `src/lib/coupons`, `src/app/api/admin/coupons`, `src/app/api/orders`, `supabase/migrations/202610290002_task008_coupons_cart_events.sql` e `tests/task008`.

Após execução das verificações Git em modo somente leitura autorizado, `git status --short` e `git diff --stat` foram obtidos. O status inclui somente documentação/configuração TASK-008, arquivos Coupon, a migration e testes TASK-008, mais os componentes de checkout previamente autorizados para integração. Nenhum arquivo de TASK-003, TASK-004 ou TASK-005 aparece no status. `git diff --check` passou. As mudanças untracked de TASK-008 foram revisadas por leitura e lint direcionado.

## Achado P1 — WhatsApp obrigatório para confirmar pedido

`src/app/api/orders/route.ts` verifica `WHATSAPP_STORE_NUMBER` e retorna 503 antes de chamar a RPC que persiste o pedido (linhas 42–44). Depois da criação, também retorna 503 se não conseguir gerar o link de WhatsApp (linhas 65–68). O UC-03 vigente em `README.md` diz que, depois de o pedido existir, a interface pode oferecer a abertura opcional do WhatsApp e que essa comunicação fica fora da transação.

Assim, configuração ausente poderia impedir a criação do pedido; falha posterior ao commit poderia devolver erro apesar da persistência. A solicitante autorizou formalmente a alteração da rota compartilhada e arquivos correlatos. A rota agora persiste o pedido sem pré-condição de número de WhatsApp; a geração do link ocorre após o retorno da RPC em bloco isolado de falha, e a API responde com o pedido e `whatsappUrl: null` quando o canal não está configurado ou a geração falha. A tela mantém o link de acompanhamento e só apresenta a ação de WhatsApp quando há URL. O defeito P1 foi resolvido e validado por testes HTTP direcionados.

## Correção efetuada na revisão

O serviço `src/lib/coupons/service.ts` enviava `p_coupon_id` também ao RPC `admin_create_coupon`, cuja assinatura na migration aceita apenas `p_coupon`. Isso fazia a criação administrativa passar pelos testes HTTP mockados sem provar o contrato RPC. Foi corrigido o mapeamento de argumentos, separado em `src/lib/coupons/admin-rpc.ts`, e adicionados testes que verificam as assinaturas exatas de criação e atualização em `tests/task008/coupons.validation.test.ts`.

## Validações

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes direcionados de validação e HTTP administrativo | PASS | `node --experimental-test-module-mocks --import=tsx --test tests/task008/coupons.validation.test.ts tests/task008/coupons.admin-routes.test.ts`: 13/13, 0 falhas, 0 SKIP. Inclui argumentos RPC de criação/atualização, RBAC, origem, MFA e payload inválido. |
| Testes HTTP da rota de pedidos/WhatsApp opcional | PASS | Incluídos em `tests/task008/orders.route.test.ts`: número ausente retorna pedido persistido com URL null; falha sintética ao construir link não converte o sucesso da persistência em erro. |
| Testes direcionados consolidados | PASS | `node --experimental-test-module-mocks --import=tsx --test tests/task008/coupons.validation.test.ts tests/task008/coupons.admin-routes.test.ts tests/task008/orders.route.test.ts`: 16/16, 0 falhas, 0 SKIP. |
| Lint direcionado | PASS | `npm run lint:task008`; Biome verificou 18 arquivos, sem diagnósticos. |
| TypeScript | PASS | `npx tsc --noEmit --incremental false`, exit code 0. |
| Integração Supabase da Etapa 004 | PASS, evidência anterior | `npm run test:task008`: 11/11, 0 falhas, 0 SKIP contra stack local efêmera; migration confirmada aplicada. Foi executada antes da correção do serviço desta revisão. |
| Integração Supabase da Etapa 004 | PASS, evidência reutilizada | 11/11 PASS, 0 SKIP contra stack local efêmera; migration confirmada aplicada. Não repetida nesta revisão porque a migration e a lógica transacional não mudaram; Docker está inacessível neste ambiente. |
| Build nesta revisão | NOT RUN | Build da Etapa 004 havia passado; a alteração de UI/API foi validada nesta revisão por TypeScript, testes direcionados e lint. |
| Git status/diff e `git diff --check` | PASS | A leitura em modo somente leitura confirmou arquivos dentro do escopo. `git diff --check` saiu com código 0. |

## Gate e pendências

GATE-001 a GATE-005 estão CONCLUÍDOS/APROVADOS. O P1 de UC-03 foi corrigido dentro da autorização recebida; o contrato RPC de criação de cupom também foi corrigido e coberto. Testes direcionados, lint, TypeScript e `git diff --check` passaram. A integração Supabase da Etapa 004, 11/11 PASS e 0 SKIP, foi reaproveitada; não houve alteração de migration nesta revisão. Não resta bloqueio obrigatório para o GATE-005. GATE-006 e GATE-007 permanecem pendentes. A Etapa 006 está habilitada, mas não foi iniciada.

## Arquivos alterados nesta revisão

- `src/lib/coupons/service.ts` — chamada RPC com a assinatura correta.
- `src/lib/coupons/admin-rpc.ts` — despacho isolado e testável de RPC.
- `tests/task008/coupons.validation.test.ts` — cobertura dos argumentos de criação/atualização.
- `src/app/api/orders/route.ts` — pedido persistido independentemente da disponibilidade do WhatsApp.
- `src/app/cart/page.tsx` — link de acompanhamento sempre exibido; ação WhatsApp opcional.
- `tests/task008/orders.route.test.ts` — cenários de canal ausente e falha ao gerar link.
- `docs/reports/TASK-008-etapa-005-revisao.md` — este relatório.

O Scope Guard foi confirmado pelo status Git; não houve alteração intencional em arquivos da TASK-003, TASK-004 ou TASK-005. Sem commit, push ou deploy.

```text
==================================================
TASK: TASK-008
ETAPA: 005
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 5
GATES PENDENTES: 2
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- Nenhum bloqueio obrigatório restante para GATE-005.
CORREÇÕES REALIZADAS:
- Corrigidos os argumentos RPC do serviço de cupons.
- Desacoplada a persistência do pedido da disponibilidade/geração do link opcional do WhatsApp.
- Adicionados testes direcionados para os contratos RPC e o comportamento HTTP do WhatsApp opcional.
PENDÊNCIAS:
- Nenhuma pendência obrigatória da Etapa 005. CI remota não foi executada; a integração local isolada já consta aprovada na Etapa 004.
TESTES RELACIONADOS:
- Testes direcionados 16/16 PASS, 0 SKIP; lint direcionado PASS (18 arquivos); TypeScript PASS; `git diff --check` PASS.
- Integração anterior da Etapa 004 11/11 PASS, 0 SKIP, antes da correção do serviço.
PRÓXIMA ETAPA: 006 — Testes manuais
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-005 aprovado; Etapa 006 habilitada para execução futura e não iniciada.
==================================================
```
