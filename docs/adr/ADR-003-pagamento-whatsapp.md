# ADR-003 — Pedido e negociação fora do site, pelo WhatsApp

- **Status:** ACEITO
- **Data original:** 2026-09-23
- **Emenda documental:** 2026-10-28
- **Rastreabilidade:** RF-007/009/013/020; RN-008/013; UC-03/04/05; TASK-005, TASK-006, TASK-009.

## Contexto

A TASK-005 é responsável pelo carrinho/favoritos e pela reserva temporária concorrente. A TASK-006 começa a partir de uma reserva válida e cria/vincula o pedido. A descrição anterior que criava pedido e reserva como uma operação única não representa mais a fronteira aprovada.

## Decisão

- A TASK-005 permanece autoridade pela disponibilidade, expiração e liberação de estoque da reserva. A TASK-006 pode associar/consumir uma reserva válida ao criar Order/OrderItem, sem fazer uma segunda baixa, estender expires_at ou liberar estoque.
- Pagamentos são negociados fora do site. O sistema não coleta cartão, processa pagamentos, concilia banco, nem calcula/efetua reembolso. Somente admin/gerente registra confirmação manual do pagamento, aprova conferência e cancela pedido.
- Os papéis existentes em app_metadata.role são mapeados para autorização do pedido: employee = operador e admin = gerente. Esses papéis podem alterar apenas transições permitidas; customer não altera estados. Confirmação de pagamento e cancelamento permanecem exclusivos de admin/gerente.
- Após confirmação integral do pagamento, gravar preparation_window_start = payment_confirmed_at + 1 hora e preparation_window_end = payment_confirmed_at + 2 horas. Persistir como timestamptz UTC e exibir em America/Sao_Paulo.
- O canal WhatsApp é o link click-to-chat wa.me para WHATSAPP_STORE_NUMBER. A aplicação abre uma mensagem pré-preenchida e a pessoa executa o envio manual. Não há WhatsApp Business API, envio automático ou integração faturável.
- Template pt-BR do rascunho: “Olá! Quero acompanhar o pedido {order_reference}. Itens: {items_summary}. Total: R$ {total_brl}. Acompanhe: {tracking_url}”. Referência e tracking_url são opacas e não sequenciais; a mensagem não inclui CPF, telefone, credenciais, tokens nem dados de pagamento.
- WHATSAPP_STORE_NUMBER é configuração de ambiente em formato E.164; o valor oficial será fornecido antes da implantação. Testes usam valor sintético.
- ORDER_CANCELLATION_POLICY_TEXT é configuração com texto fornecido pela loja e exibido antes da confirmação de pagamento. O conteúdo legal continua pendente; não usar texto inventado nem calcular reembolso.
- Se a reserva associada expirar, TASK-005 libera estoque uma vez. TASK-006 reconcilia o pedido sem duplicar a liberação e não pode estender o prazo da reserva.

## Consequências

- Abrir WhatsApp não comprova envio nem pagamento; falha ou bloqueio de popup não desfaz pedido já persistido.
- O worker da TASK-005 é a única autoridade de expiração/liberação de inventário reservado. TASK-006 audita estados do pedido em separado.
- Número oficial e texto legal final são gates operacionais de implantação/pagamento, não defaults de desenvolvimento.
- O sistema não codifica cálculo ou decisão legal de reembolso; a loja fornece o texto final antes de habilitar a confirmação de pagamento.
