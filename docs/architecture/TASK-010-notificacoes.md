# TASK-010 — Arquitetura de verificação e notificações agendadas

**Status:** aprovado em 04/11/2026 (GATE-002)
**Branch:** `task/TASK-010-verificacao-notificacoes`
**Dependências:** TASK-003, TASK-006, TASK-009

## 1. Objetivo

Envio confiável de mensagens de verificação, status, retirada e alertas de prazo.

### Responsabilidades de identidade e notificações

Supabase Auth, conforme a TASK-003, continua responsável pela verificação de conta e
recuperação de senha. A TASK-010 reutiliza esses fluxos e não duplica autenticação.
O SMS permanece restrito à autenticação, sem uso transacional aprovado.

As notificações transacionais da TASK-010 são e-mails separados dos fluxos de Auth.
Eventos que exigem notificação são registrados no outbox persistente do Supabase e
processados por worker assíncrono, usando um adapter independente do fornecedor.
Mailpit é o destino para testes locais e não envia mensagens externas.

## 2. Decisões aprovadas

### 2.1 Calendário de feriados e dias permitidos

- Manter no sistema um calendário editável e persistido.
- O calendário deve permitir registrar feriados nacionais, estaduais e municipais
  aplicáveis à operação da loja.
- Lembretes programados para uma data não permitida por feriado devem ser suspensos
  e reagendados para o próximo dia permitido.
- A regra deve consultar o calendário configurado, não uma lista fixa embutida no
  código nem uma fonte externa presumida como oficial.
- Esta política rege notificações. Ela não altera a regra da TASK-009 para contagem
  do prazo de descarte de perecíveis.

### 2.2 Remetente

Identidade oficial da loja como remetente. Endereço real e domínio serão fornecidos
posteriormente; não usar valores fictícios.

### 2.3 Arquitetura de e-mail transacional

Independente de fornecedor, com Mailpit nos testes locais. O serviço externo será
escolhido posteriormente.

### 2.4 Limites operacionais

Manter limites operacionais configuráveis. Nenhum valor numérico é apresentado como
decisão definitiva; os valores são parâmetros futuros.

### 2.5 Teto de consumo e alertas

Teto de consumo e alertas definidos antes de habilitar qualquer cobrança.

### 2.6 Retenção e descarte

- Manter políticas de retenção separadas para metadados operacionais do outbox e
  payloads de mensagens.
- Os prazos serão parâmetros configuráveis, sem valores inventados neste documento.
- Ao expirar o prazo aplicável, descartar os dados com procedimento seguro.
- Minimizar dados pessoais nos payloads; não persistir OTP, CPF, conteúdo de conversas
  ou PII que não seja necessária para a entrega.
- A retenção de notificações deve permanecer distinta das políticas de logs técnicos
  e de registros de negócio que precisem ser preservados por outros requisitos.

## 3. Entrega e confiabilidade

- **Outbox:** persistente no Supabase; todo evento notificável é gravado nele.
- **Worker:** processa o outbox de forma assíncrona pelo adapter de e-mail.
- **Idempotência:** retries não podem duplicar mensagens.
- **Estados de envio:** explícitos, rastreáveis e auditáveis.
- **Cancelamento:** o cancelamento do pedido invalida notificações relacionadas ainda
  pendentes. Mensagens já aceitas pelo provedor não podem ser recolhidas.
- **Observabilidade:** falhas e reprocessamento visíveis sem expor dados privados.

## 4. Parâmetros operacionais futuros (não são decisões pendentes)

Fornecedor, endereço/domínio reais, valores de limites e orçamento, limiares de alerta
e prazos concretos de retenção. Não inventar valores nem ativar envio pago sem
provisionamento e controles aprovados.