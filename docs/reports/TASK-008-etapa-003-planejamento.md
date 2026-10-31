# TASK-008 — Etapa 003 — Planejamento

**Data:** 2026-10-29
**Checkout:** `flor-da-meia-noite`
**Branch:** `task/TASK-008-cupons-cart-events`
**HEAD base:** `356ab80`; documentação das Etapas 001–002 permanece local.

## Resultado da etapa

Plano concreto preparado a partir dos requisitos e do código existente. A autorização explícita da solicitante em 2026-10-29 classifica como compartilhados TASK-006/TASK-008 os arquivos `src/app/cart/page.tsx`, `src/app/api/orders/quote/route.ts`, `src/app/api/orders/route.ts`, `src/lib/orders/types.ts` e a integração por RPCs/tabelas via migration aditiva. **GATE-003: CONCLUÍDO/APROVADO.** A autorização limita a integração mínima de cupons/resgates/CartEvent e proíbe alteração do núcleo histórico da TASK-006. Nenhum código foi alterado nesta etapa.

## Requisitos e decisões vigentes

- Administrador cria, edita, lista, ativa/desativa cupons; funcionário e cliente não podem administrar cupons.
- Tipos: percentual e valor fixo; validade obrigatória.
- Um cupom por pedido, sem acumulação.
- Sem mínimo geral; mínimo pode ser configurado por campanha. Para o plano, o mínimo elegível e o desconto são avaliados sobre os itens que atendem ao escopo do cupom antes do desconto; desconto fixo é limitado ao subtotal elegível.
- Catálogo inteiro por padrão; restrição opcional por produto/categoria.
- Limite de uso por cliente configurável por campanha; ilimitado quando omitido.
- Cálculo com PostgreSQL `numeric`, duas casas decimais.
- Cancelamento antes da confirmação de pagamento libera o resgate uma única vez; depois da confirmação não há reativação automática.
- O servidor recalcula subtotal, elegibilidade, desconto e total; o cliente nunca define valores autoritativos.
- TASK-008 registra eventos CartEvent; TASK-011 agrega/exporta métricas RF-018.

## Descobertas do estado atual

- Carrinho e favoritos já são persistidos por `src/app/api/cart/items/route.ts` e `src/app/api/favorites/route.ts`, com RLS e tabelas em `202610250003_task005_cart_favorites_reservations.sql`.
- O carrinho usa upsert por `cart_id,product_id`; favoritos usam upsert idempotente por `customer_id,product_id`. Triggers aditivos no banco permitem registrar inserção de item/favorito sem alterar esses handlers TASK-005.
- O checkout está em `src/app/cart/page.tsx`; `/api/orders/quote` chama `create_order_quote`, e `/api/orders` chama `create_order_from_quote`.
- `order_quotes` guarda apenas itens, total, validade e estado de uso; `orders` guarda total e referência da cotação, sem snapshot/valor de cupom. A RPC de commit recalcula preços e cria o pedido em transação.
- A migration de implementação deve ser aditiva e ordenada após `202610290001_task007_outbox_lease_recovery.sql`; nome candidato: `supabase/migrations/202610290002_task008_coupons_cart_events.sql`.
- CI já provisiona Supabase efêmero em runner Linux para TASK-005/006. Não há testes ou job de CI específicos da TASK-008 ainda.

## Plano de implementação proposto

### Modelo e transações

Na migration aditiva TASK-008:

- Criar `public.coupons` com código normalizado/único, tipo/valor, validade, mínimo opcional, escopo padrão geral com restrições opcionais de produto/categoria, máximo global opcional, máximo por cliente opcional, status e timestamps de servidor.
- Criar `public.coupon_redemptions` ligada ao cupom, cliente e pedido; índice único para no máximo um resgate por pedido; estados que permitam contar resgate concluído e liberar uma vez quando o pedido for cancelado antes do pagamento; guardar desconto e snapshot imutável dos termos usados.
- Persistir os termos do cupom em `coupon_redemptions`, com FK única para o pedido e snapshot imutável de identificador/código, subtotal elegível, desconto e termos; o total final fica em `orders.total_brl`. Uma tabela lateral de cotação vincula a prévia ao `order_quote` e sua validade. Não alterar o schema histórico por edição de migrations antigas.
- Criar `public.cart_events` para eventos sintéticos/operacionais mínimos: ator-cliente, produto, tipo de evento, quantidade/delta quando aplicável e timestamp do servidor. RLS nega escrita direta de anon/authenticated; escrita ocorre por triggers seguros no banco e leitura fica restrita ao backend autorizado.
- Adicionar triggers para registrar inclusão/aumento positivo de quantidade em `cart_items` e inclusão efetiva em `favorites`; upsert repetido sem mudança não gera evento de favorito duplicado. Nenhuma alteração no saldo, preço ou conteúdo do catálogo.
- Criar RPCs aditivas, por exemplo `create_order_quote_with_coupon` e `create_order_from_quote_with_coupon`, que chamam as RPCs históricas da TASK-006 sem substituir nem editar suas definições. A primeira cria cotação base e registra dados de cupom em tabela lateral; a segunda chama a criação de pedido existente, revalida preço/termos, serializa limite por lock do cupom e, na mesma transação, aplica o total descontado, registra snapshot/resgate e mantém os dados do evento de criação coerentes. Falha em validação aborta toda a transação, sem pedido/resgate parcial.
- Trigger aditivo de status do pedido libera o resgate uma única vez quando a transição para cancelado ocorrer antes de `payment_confirmed_at`; pedidos pagos não reativam o cupom automaticamente. As funções históricas de pedido/cancelamento permanecem inalteradas.

### Serviços, API e interface

- `src/lib/coupons/types.ts`, `validation.ts`, `service.ts`: modelos, normalização de código, validações server-side e operações de administração/aplicação.
- `src/app/api/admin/coupons/route.ts` e `src/app/api/admin/coupons/[id]/route.ts`: listar/criar e editar/desativar com sessão, same-origin nas mutações e papel `admin` verificado no backend.
- `src/app/admin/coupons/page.tsx`: formulário/listagem administrativa; sem ações para employee.
- Aplicar o cupom no passo de cotação já existente do carrinho; mostrar subtotal/desconto/total e manter o consentimento explícito ao total atualizado.
- Não incluir PII em `CartEvent`; nenhuma integração externa ou serviço pago.

### Matriz critério → arquivos → validação

| Critério | Arquivos/componentes previstos | Evidência planejada |
|---|---|---|
| Criação/edição/desativação só por admin | Migration de cupons; `src/lib/coupons/*`; `/api/admin/coupons*`; `/admin/coupons/page.tsx` | Testes HTTP de sessão, same-origin, RBAC admin/employee/customer, validação de payload e operações admin. |
| Validade, tipo, escopo, mínimo e limites | Migration; serviço/validação de cupons | Testes unitários de datas, tipos, escopo, mínimo, limite ausente/configurado, percentual e valor fixo. |
| Desconto/total autoritativo e termos no pedido | `order_quotes`, `orders`, `coupon_redemptions`; RPC de quote/commit na migration; integração do checkout | Testes Supabase: preço alterado, expiração, consentimento, snapshot, desconto limitado, erro sem pedido parcial. |
| Concorrência de resgate | RPC transacional e constraints/índices | Duas tentativas concorrentes no último uso global/por cliente: um resgate vence; nenhum contador excede limites; retry idempotente. |
| Liberação do uso após cancelamento pré-pagamento | Integração transacional com cancelamento/expiração de order | Cancelamento repetido libera uma vez; pago não libera; falha não deixa redemption órfão. |
| Captura de eventos | Migration `cart_events` e triggers em `cart_items`/`favorites` | Testes de insert/upsert/update, quantidade positiva, favorito duplicado, RLS e ausência de escrita anônima. |
| Persistência e privacidade de dados | Migration, policies e testes de integração | Cliente não lê eventos de terceiros nem escreve evento direto; sem PII/segredos nos eventos. |
| Qualidade e pipeline | `tests/task008/*`, `package.json`, `.github/workflows/ci.yml` | Job Supabase isolado, migrations completas, zero SKIP; lint direcionado, typecheck, testes e build. |

## Arquivos previstos e classificação

**TASK-008, novos:**

- `supabase/migrations/202610290002_task008_coupons_cart_events.sql`
- `src/lib/coupons/types.ts`, `src/lib/coupons/validation.ts`, `src/lib/coupons/service.ts`
- `src/app/api/admin/coupons/route.ts`, `src/app/api/admin/coupons/[id]/route.ts`
- `src/app/admin/coupons/page.tsx`
- `tests/task008/coupons.validation.test.ts`, `tests/task008/coupons.integration.test.ts`, e testes HTTP necessários
- atualização de `package.json` para script direcionado e `.github/workflows/ci.yml` para job isolado da TASK-008
- relatório da Etapa 004 e roteiro/relatório de Etapa 006, nas etapas correspondentes

**Compartilhados TASK-006/TASK-008 — autorização explícita recebida em 2026-10-29, limitada à integração descrita:**

- `src/app/cart/page.tsx` — entrada do cupom, discriminação subtotal/desconto/total e consentimento.
- `src/app/api/orders/quote/route.ts` — receber código opcional e retornar cotação recalculada.
- `src/app/api/orders/route.ts` — commit atômico do cupom/resgate e retorno do total/snapshot.
- `src/lib/orders/types.ts` — contrato da cotação e pedido com dados do desconto.
- Migration nova TASK-008 cria tabelas laterais e RPCs/triggers novos que chamam/integraram com as RPCs históricas; nenhuma migration antiga nem definição do núcleo RPC da TASK-006 será editada. O único campo de valor atualizado é `orders.total_brl` dentro da transação do wrapper aprovado.

**TASK-005 preservada:** nenhum handler de carrinho/favoritos será modificado; captura será por triggers aditivos e nova tabela no migration TASK-008. Testes existentes TASK-003/004/005/006 não serão alterados sem autorização específica.

## Sequência

1. Manter a integração restrita aos arquivos compartilhados autorizados e às novas tabelas/RPCs/triggers; não alterar o núcleo histórico da TASK-006.
2. Implementar migration aditiva com tabelas, constraints, RLS, triggers e RPC transacional; validar a sequência em Supabase efêmero.
3. Criar serviço/validação e APIs admin; testar RBAC/same-origin e dados inválidos.
4. Integrar cotação/commit e UI do carrinho aos dados de cupom aprovados; manter idempotência e consentimento de preço.
5. Adicionar testes unitários, HTTP, concorrência e cancelamento; job de CI isolado, sem SKIP.
6. Executar lint direcionado, typecheck, testes específicos, integração Supabase e build; registrar evidências na Etapa 004.
7. Revisão/Etapa 005, depois roteiro e execução manual nas Etapas 006–007 mediante gates próprios.

## Riscos e mitigação

- Corrida de última utilização: lock transacional do cupom e constraints únicas; teste concorrente no banco.
- Divergência entre total cotado e commit: revalidar preços e termos na mesma transação do pedido; abortar sem mutação parcial.
- Retry/cancelamento duplicado: chave idempotente e estado único do redemption, operação transacional.
- Privacidade dos eventos: sem PII, escrita via trigger, RLS deny-by-default e leitura privilegiada autorizada.
- Alta contenção em campanha popular: lock por cupom serializa uso limitado; medir teste concorrente, não enfraquecer atomicidade.
- Escopo de checkout TASK-006: integração mínima autorizada; risco mitigado por novos wrappers/tabelas aditivos, sem editar RPCs históricas ou migrations existentes.
- Integração OCI/Docker local pode indisponível; CI usa runner Linux isolado; se CI falhar, registrar NOT RUN/BLOCKED sem simular sucesso.

## Rollback

- Antes da aplicação em ambiente persistente: remover apenas os arquivos novos desta branch por revisão normal; não tocar migrations existentes nem dados anteriores.
- Testes/CI usam stack Supabase efêmera com fixtures sintéticas, descartada pelo runner ao fim do job.
- Após qualquer aplicação fora da stack efêmera, preferir migration compensatória aditiva; não apagar pedidos, resgates ou histórico de eventos nem reescrever migration aplicada.
- Nenhuma migration será executada em produção/homologação nesta TASK sem autorização específica.

## GATE-003 e decisão de escopo

O plano foi revisado após a autorização explícita da solicitante em 2026-10-29. Os arquivos compartilhados de UI/API/types e as integrações via novas RPCs/tabelas em migration aditiva estão autorizados nos limites acima. Nenhuma função histórica da TASK-006, migration anterior, TASK-005 ou outra tarefa poderá ser alterada. **GATE-003: CONCLUÍDO/APROVADO; Etapa 004 habilitada.**