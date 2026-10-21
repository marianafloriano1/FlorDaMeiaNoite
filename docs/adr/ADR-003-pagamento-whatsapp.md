# ADR-003 — Pagamento e negociação fora do site, pelo WhatsApp

- **Status:** ACEITO
- **Data:** 2026-09-23
- **Rastreabilidade:** RF-007/009/013/020; RN-008/013; UC-03/04/05; TASK-006, TASK-009.

## Contexto

O cliente finaliza no site e é direcionado ao WhatsApp. Pix, transferência, crédito e débito são tratados diretamente. Administrador confere pagamento no WhatsApp e registra confirmação em botão protegido no painel.

## Decisão

O sistema mantém pedido, reserva, estado e auditoria, mas não coleta dados de cartão, não processa pagamento, não concilia banco e não calcula/efetua reembolso. Abrir conversa do WhatsApp com identificador de pedido e texto mínimo; equipe confere os dados completos no painel. Somente administrador confirma pagamento, aprova a conferência e cancela pedido.

## Consequências

- Estado “aguardando pagamento” continua até confirmação manual ou expiração em três horas.
- Deve haver mensagem explícita ao cliente sobre política de cancelamento/reembolso aprovada pela loja antes de concluir pagamento.
- A política de reembolso informada possui trechos contraditórios; o site não deve codificar o cálculo. Texto final será pendência do negócio.
