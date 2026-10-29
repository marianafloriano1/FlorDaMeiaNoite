# TASK-006 — Etapa 003 — Planejamento de pedido e WhatsApp

**Data:** 2026-10-28
**Checkout/branch:** `flor-da-meia-noite-task-006` / `task/TASK-006-checkout-pedidos`
**HEAD:** `73225c6` (`TASK-005: registrar publicação no GitHub`).
**Estado:** plano finalizado; GATE-003 APROVADO após decisões formalmente aprovadas pela usuária em 2026-10-28. Nenhuma implementação foi feita na Etapa 003.

## 1. Contexto confirmado

- TASK-003 e TASK-005 constam como DONE. TASK-005 registra GATE-001–007 aprovados. GATE-001 e GATE-002 da TASK-006 estão concluídos.
- A reserva da TASK-005 é atômica, pertence ao cliente, tem `status`, `expires_at`, itens e `idempotency_key`; a RPC `create_cart_reservation` e o worker expiram somente reservas ativas. O catálogo não guarda o preço na reserva.
- A aplicação tem papéis server-controlled `customer`, `employee` e `admin`; as rotas administrativas usam `requireSession`, `requireSameOrigin` e, para admin, `hasAdminStepUp`.
- Já existem `src/app/cart/page.tsx`, APIs de carrinho/reserva e testes `tests/task005/*`. Não há rotas/tabelas de pedido existentes em `src/app`/`supabase/migrations`.
- O README/ADR-003 e overview separam carrinho/reserva (TASK-005) de pedido (TASK-006), proíbem nova baixa/liberação pela TASK-006 e definem wa.me manual, BRL, referência opaca, papéis `employee`=operador e `admin`=gerente, além dos dois campos da janela de preparo.
- O README original rastreado no diff tinha os estados de pedido “Aguardando pagamento”, “Em preparo”, “Pronto para retirada”, “Retirado com sucesso” e “Cancelado”. A reconciliação documental anterior omitiu essa lista da linha RF-010, e a tabela de papéis do README ainda mantinha a permissão operacional de employee como pendente. Ambas foram corrigidas conforme autorização explícita da usuária, sem criar estados ou permissões adicionais.

## 2. Escopo

### Permitido nesta TASK

- Migration **aditiva** TASK-006 para pedidos/itens, inspeção, auditoria de transições e confirmação manual, índices, constraints, RLS e RPCs transacionais. Não editar migrations existentes.
- Serviço/validação de pedidos; APIs autenticadas de cliente e de operação; integração mínima da página de carrinho existente; acompanhamento do próprio pedido e fila administrativa; link wa.me manual.
- Testes unitários, de rotas/permissões e integração Supabase; configuração de teste sintética; scripts/CI estritamente necessários para validar a TASK-006.
- Reconciliação documental necessária nos requisitos e matriz de transições antes da implementação.

### Proibido

- Alterar TASK-003/TASK-004 ou implementar TASK-005/TASK-009/TASK-008; mexer em autenticação, papéis ou migrations anteriores; reescrever catálogo/carrinho fora da integração mínima.
- Cobrança, pagamento no site, dados de cartão, WhatsApp Business API/envio automático, valores reais ou dados pessoais em mensagem/URL/log, deploy, produção ou secrets reais.
- Confirmar pagamento por `employee`; mudar preço sem consentimento; duplicar/estornar ledger ou prolongar prazo da reserva na TASK-006.

## 3. Desenho proposto

1. **Persistência (migration nova):** `supabase/migrations/202610280001_task006_orders.sql` (nome/versão a confirmar contra o histórico imediatamente antes de criar). Adicionar `reservation_price_snapshots` e trigger na inserção de `reservation_items`, mais `orders`, `order_items`, `order_inspections` e `order_events` append-only. Ordem referencia unicamente a reserva e o cliente; itens guardam snapshot imutável de nome/código, quantidade e preço unitário BRL aceito. `orders` guarda status, referência pública aleatória não sequencial, idempotência, timestamps de pagamento e `preparation_window_start/end` (`timestamptz`). Uma tabela de snapshots de preço capturada por trigger na inserção de `reservation_items` preserva o preço observado no momento da seleção/reserva sem alterar o código ou a migration TASK-005. Constraints impedem duplicação por reserva/idempotency key; FKs protegem histórico. RLS permite ao cliente ler apenas os próprios pedidos e aos papéis autorizados ler/operar conforme as regras. Escritas críticas somente por RPC/server autorizado.
2. **Criação transacional:** RPC `create_order_from_reservation` bloqueia a linha da reserva (`FOR UPDATE`), valida ownership, `status=active`, `expires_at > clock_timestamp()` e seleção; uma única transação associa a reserva, grava pedido/itens/evento e idempotência. Não cria outro movimento de estoque. A transação da expiração e a conversão disputam o mesmo lock; somente uma pode vencer. Tentativa posterior/idêntica retorna o resultado idempotente; reserva já expirada não cria pedido. Ao confirmar pagamento dentro das 3h, a mesma RPC altera a reserva de `active` para `completed` e define `closed_at`, sem movimento de estoque; o worker já ignora estados não ativos. Se a expiração vencer a disputa, um trigger aditivo da TASK-006 cancela o pedido não pago na mesma transação de liberação.
3. **Serviços/API:** novos `src/lib/orders/{types,validation,service,whatsapp}.ts`; `POST/GET src/app/api/orders/route.ts`; leitura segura `src/app/api/orders/[reference]/route.ts`; `GET src/app/api/admin/orders/route.ts`; transições `PATCH src/app/api/admin/orders/[id]/route.ts`. Endpoints verificam same-origin e sessão; customer só cria/consulta o próprio pedido; employee opera inspeção e transições permitidas; admin com step-up confirma pagamento e cancela. Referência de acompanhamento opaca, aleatória e não PII; não aceitar UID/CPF como chave pública.
4. **Interface mínima:** integrar o passo explícito de criação do pedido em `src/app/cart/page.tsx` após reserva válida; acrescentar acompanhamento do cliente em `src/app/orders/[reference]/page.tsx`; fila/inspeção em `src/app/admin/orders/page.tsx`. Não mexer nas páginas do catálogo.
5. **WhatsApp:** gerar URL `https://wa.me/{WHATSAPP_STORE_NUMBER}?text=...` usando apenas referência opaca, resumo de itens, total BRL calculado no servidor e link seguro de acompanhamento. A pessoa revisa e envia; o retorno ao app não é prova de envio nem pagamento. Não usar integração/API.
6. **Janela e pagamento:** somente admin/gerente após confirmação manual integral grava `payment_confirmed_at`; no mesmo evento, `preparation_window_start = +1h`, `preparation_window_end = +2h`. Armazenar UTC; exibir America/Sao_Paulo. Employee nunca registra pagamento.
7. **Auditoria:** registrar ator, origem, estado anterior/novo, horário e evento mínimo sem tokens/PII excessiva. Validar transições no servidor/banco, não apenas ocultar botões.

## 4. Matriz critério → arquivo/área → evidência

| Critério | Alteração planejada | Validação futura |
|---|---|---|
| Pedido só nasce de reserva válida do próprio cliente | migration/RPC; `src/lib/orders/service.ts`; `POST /api/orders` | Supabase: ownership, estado/expiração, rollback; teste de reserva inválida |
| Associação/concorrência idempotente sem estoque negativo ou baixa duplicada | RPC transacional e constraint única | concorrência simultânea ordem × expiração; retry idempotente; ledger unchanged na conversão |
| Carrinho → pedido com resumo e total consentido | `src/app/cart/page.tsx`; validation/service | teste de caminho feliz, seleção inválida, preço alterado, exibição da diferença, aceite obrigatório e cotação obsoleta rejeitada |
| Cliente vê somente seu pedido | RLS/API e `src/app/orders/[reference]/page.tsx` | anon 401, outro cliente 404/403 sem vazamento, cliente próprio PASS |
| Employee inspeciona/avança somente transições permitidas; admin confirma/cancela | API administrativa, matriz de transições, RPC e `src/app/admin/orders/page.tsx` | matriz de papéis e MFA; customer/employee não confirma nem cancela |
| Estados e histórico | `orders`, `order_events`, validação de transição | testes de todas as transições aceitas e rejeitadas; eventos append-only |
| Janela de preparo | colunas e evento de confirmação | timestamps exatos +1h/+2h UTC e apresentação de fuso |
| Link seguro/manual | `src/lib/orders/whatsapp.ts`, interface | URL encoded; número sintético; sem PII; envio não alegado |
| Regressão e pipeline | `tests/task006/*`, `package.json`, `.github/workflows/ci.yml` | testes TASK-006 em Supabase Linux efêmero; lint, typecheck, build e `git diff --check` |

## 5. Arquivos previstos

**Novos:** `supabase/migrations/202610280001_task006_orders.sql`; `src/lib/orders/types.ts`; `src/lib/orders/validation.ts`; `src/lib/orders/service.ts`; `src/lib/orders/whatsapp.ts`; `src/app/api/orders/route.ts`; `src/app/api/orders/[reference]/route.ts`; `src/app/api/admin/orders/route.ts`; `src/app/api/admin/orders/[id]/route.ts`; `src/app/orders/[reference]/page.tsx`; `src/app/admin/orders/page.tsx`; testes em `tests/task006/`; `docs/reports/TASK-006-etapa-004-implementacao.md` e relatório de testes/revisão/conclusão nas respectivas etapas.

**Alterações mínimas previstas:** `src/app/cart/page.tsx`; `package.json` (script de teste dedicado); `.github/workflows/ci.yml` (job integrado efêmero, sem credenciais reais); `.env.example` (somente placeholders sintéticos); `README.md` (restaurar estados omitidos e listar configuração sem valores reais); `TASKS.md` e relatórios TASK-006.

**Não tocar:** arquivos TASK-003/TASK-004; migrations existentes; `src/lib/auth/*`; APIs de catálogo; páginas de catálogo; worker/migrations TASK-005. Se a implementação exigir alteração nessas áreas, parar para Scope Escalation.

## 6. Sequência de implementação (Etapa 004, não executada)

1. Confirmar estado limpo/escopo e sequência de migrations; fechar as duas decisões pendentes abaixo.
2. Reconciliar a matriz textual e as variáveis/configuração sem valores reais.
3. Criar migration aditiva, constraints/RLS e RPCs idempotentes; validar em Supabase descartável/CI sem resetar stacks persistentes.
4. Implementar serviço e testes unitários de validação/estados.
5. Implementar rotas com autorização backend, same-origin e step-up para admin; testes negativos por papel/ownership.
6. Integrar criação a partir do carrinho e acompanhamento; gerar link wa.me manual, seguro e codificado.
7. Rodar testes TASK-006/integrados; depois lint direcionado/global, typecheck, build, `git diff --check`, revisar diff completo e confirmar TASK-003/TASK-004/TASK-005 intocadas.
8. Atualizar evidências/gates; parar em IN_REVIEW até Etapa 005.

## 7. Testes previstos

- Validação de payload, quantidades, seleção, moeda e idempotency key.
- Criação uma vez; repetição mesma chave; reservation inválida, expirando, alheia ou cancelada; rollback sem pedido/itens parciais.
- Concorrência create-order × expiry e pedidos repetidos da mesma reserva: um único estado final consistente, sem lançamento de estoque novo nem saldo negativo.
- Segurança: sessão ausente, customer lendo pedido de terceiro, employee/admin em cada transição, step-up vencido/ausente, same-origin, referência pública inválida e sem PII.
- Transições e eventos auditáveis; pagamento manual apenas admin; preparação calculada a partir de confirmação integral; link wa.me com número sintético, parâmetros escapados e conteúdo aprovado.
- Migração integrada sobre migrations 001–005 na ordem; fixture totalmente sintética e isolada; CI deve falhar em skip/zero testes integrados.
- Lint/format, typecheck, build e teste OCI conforme gates da TASK.

## 8. Riscos, rollback e dependências

- **Concorrência de expiração/conversão:** locks inconsistentes podem liberar ou consumir duas vezes. Resolver em RPC única e validar em CI Supabase; nenhum ajuste no worker TASK-005 sem autorização.
- **Preço/consentimento:** snapshot auxiliar captura preço no momento da reserva por trigger aditivo; RPC compara preço atual e exige aceite explícito quando houver diferença.
- **Corrida de pagamento/expiração:** pagamento e expiração bloqueiam a mesma linha de reserva; trigger TASK-006 cancela pedido quando o estado passa para expired. Testar ambas as ordens e assegurar que exatamente um resultado prevaleça.
- **Privacidade do link:** referência de alta entropia, não sequencial, sem PII, com consultas limitadas e teste de acesso indevido.
- **MFA/permissões:** aproveitar helper atual sem editar TASK-003; `employee` não confirma pagamento/cancela; admin exige step-up nas ações sensíveis.
- **Rollback:** migration só aditiva e aplicada primeiro em stack efêmera; em falha, parar deploy e corrigir por nova migration. Não apagar tabelas/linhas já usadas nem reverter dado por comando destrutivo. Código pode ser revertido antes de ser habilitado; depois de dados reais, rollback exige procedimento de migração aprovado.
- Dependências: TASK-003/TASK-005 DONE, Supabase e migrations já aprovadas, decisões registradas. CI TASK-005 serve de padrão, mas será necessário job/teste integrado específico da TASK-006.

## 9. DECISÕES APROVADAS

1. **Preço e consentimento (aprovado pela usuária):** no início do checkout o servidor calcula preço atual em BRL e compara com snapshot capturado em trigger quando os itens da reserva são criados. A tela mostra qualquer diferença. O cliente deve aceitar explicitamente o total atualizado; o pedido só é criado após essa aceitação. A RPC recalcula antes de persistir e recusa a cotação obsoleta, exigindo novo aceite.
2. **Reserva/pedido não pago (aprovado pela usuária):** a reserva conserva o `expires_at` original de 3h. Se não houver pagamento confirmado, o worker TASK-005 expira e libera estoque uma vez. Um trigger aditivo TASK-006 cancela o pedido não pago na mesma transação; estado terminal irreversível e pagamento posterior rejeitado. Se a confirmação de pagamento vencer a corrida antes de `expires_at`, a transação muda a reserva de `active` para `completed`, define `closed_at` sem liberar estoque e registra confirmação; a função de expiração existente só processa `active`.
3. **Papéis/estados README (aprovado):** funcionário/`employee` pode conferir e avançar somente estados operacionais permitidos; admin/`admin` aprova conferência, confirma pagamento e cancela conforme escopo. RF-010 volta a listar estados anteriormente rastreados. README foi corrigido antes da implementação.

## 10. GATE-003

**APROVADO** — planejamento revisável, matriz de escopo, arquivos, sequência, testes, riscos e rollback registrados; as decisões de negócio foram aprovadas em 2026-10-28 e as divergências documentais autorizadas foram reconciliadas. Gates acumulados: 3 concluídos (001–003), 4 pendentes (004–007), 0 bloqueados. A usuária autorizou iniciar Etapa 004; nenhuma implementação foi feita durante a Etapa 003.