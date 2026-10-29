# Arquitetura de referência

## Princípios

1. Supabase Database é a fonte oficial dos dados operacionais; Supabase Auth é a autoridade de identidade.
2. Operações críticas são atômicas, idempotentes e auditáveis.
3. Serviços externos podem falhar; notificações/traduções usam fila, repetição com limite e estado visível no painel.
4. O site serve catálogo/imagens com cache, mas valida saldo e preço no servidor ao finalizar a compra.
5. Ambientes de teste e produção, credenciais, projetos e dados são separados. Dados reais nunca vão para teste.
6. A aplicação executa em imagens reproduzíveis de container OCI; segredos e identidade são fornecidos em runtime.

## Componentes

- **Web responsiva (Next.js/TypeScript):** vitrine, conta, carrinho, favoritos e painel administrativo por função.
- **API/backend:** autorização, validação, regras de pedido/cupom, transações do Database, relatórios, exportações, tradução e webhooks de jobs.
- **Containerização obrigatória (RNF-011):** aplicação web/API e workers em containers Docker ou runtime OCI equivalente. Serviços gerenciados externos não precisam ser empacotados na imagem da aplicação.
- **Supabase Auth:** credenciais de cliente/funcionário/administrador, confirmação de e-mail e celular, recuperação por e-mail e MFA administrativo por telefone.
- **Supabase Database:** perfis, catálogo, pedidos, estoque, sessões administrativas e auditoria; políticas RLS habilitadas nas tabelas. Migrations SQL ficam em `supabase/migrations`.
- **Supabase Storage:** bucket privado de contratos e mídia restrita; contratos são acessados por rotas do servidor com autorização de administrador.
- **Supabase local:** Supabase CLI e Docker para Auth, Database, Storage e Mailpit; SMS local usa apenas OTP sintético configurado. Nenhum serviço remoto é necessário para desenvolvimento.
- **Filas/Workers:** expiração de reservas, lembretes, e-mails/SMS de negócio e tradução sob demanda; consumidores idempotentes. Provedor operacional ainda será definido.
- **Google Cloud Translation:** conteúdo de origem em português, tradução armazenada por idioma/versão.
- **WhatsApp:** abertura de conversa para negociação e pagamento; sem integração automatizada nesta versão.
- **Segredos e observabilidade:** chaves em runtime/gerenciador de segredos; métricas, erros e custo sem PII nos logs.

## Fluxos críticos

### Conta e verificação

1. Cadastro inicia Supabase Auth com e-mail e senha; nome/CPF/celular são coletados como dados do perfil, nunca como senha/metadata JWT.
2. A confirmação do e-mail é concluída pelo link enviado por Auth. Após login, o cliente confirma o telefone por OTP SMS.
3. A rota do servidor confere ambos os marcadores de confirmação, valida CPF e grava perfil no Database. A senha fica somente no Auth.
4. Recuperação envia link com `resetPasswordForEmail`; o cliente define a nova senha após abrir o link.

### Sessão administrativa e autorização

`app_metadata.role` é definido somente pelo servidor e nunca aceito do corpo da requisição. O backend valida a sessão Supabase em cada rota e confere o estado atual do funcionário. MFA telefone deve produzir AAL2; sessões administrativas registram `session_id`, horário de MFA e atividade. Depois de mais de uma hora sem atividade, ações sensíveis exigem novo challenge/verify.

### Reserva e pedido — responsabilidades separadas

1. A TASK-005 mantém carrinho/favoritos e cria a reserva temporária após seleção explícita. A reserva é atômica, dura até três horas e é a única autoridade de disponibilidade e baixa temporária.
2. A TASK-006 aceita somente uma reserva válida e não expirada para criar/vincular Order e OrderItem. A criação do pedido não cria nova reserva nem faz nova baixa. Falha na associação não pode deixar pedido parcial nem ampliar a reserva.
3. A expiração da reserva e a liberação única do estoque pertencem ao worker/RPC da TASK-005. A TASK-006 pode reconciliar o estado do pedido associado, mas não libera saldo nem altera o ledger da reserva.
4. Pagamento é negociado fora do site. O admin/gerente registra manualmente a confirmação; o site não coleta cartão, processa pagamento ou calcula reembolso.
5. Após confirmação integral do pagamento, registrar preparation_window_start = payment_confirmed_at + 1 hora e preparation_window_end = payment_confirmed_at + 2 horas. Campos timestamptz em UTC e exibidos em America/Sao_Paulo.
6. O cliente abre link wa.me para WHATSAPP_STORE_NUMBER. O rascunho contém referência opaca, resumo de itens, total autoritativo em BRL e link seguro de acompanhamento; a pessoa envia manualmente. Não há envio automatizado nem WhatsApp Business API.
7. A autorização usa os papéis server-controlled existentes: employee (operador) e admin (gerente). Apenas admin/gerente confirma pagamento e cancela pedido.
## Segurança e privacidade

- Supabase service role key fica exclusivamente no servidor; nunca usar prefixo `NEXT_PUBLIC_`.
- RLS é habilitado em tabelas de identidade; acesso privilegiado do servidor ocorre somente depois de autorização backend por usuário/papel.
- CPF, telefone e contratos são privados; CPF não aparece em logs, URLs ou mensagem de WhatsApp.
- Bucket de contratos é privado, sem URL pública; acesso é intermediado por endpoint autenticado e auditado.
- Auditoria cobre pagamento, aprovação, cancelamento, contas, contratos e estoque; eventos não incluem CPF, senha, OTP, token ou conteúdo do contrato.
- MFA, tentativas e reenvios devem respeitar os limites configurados no Supabase e nos provedores. Produção precisa validar limites antiabuso e custos.
- Política de privacidade, retenção, exclusão, consentimento e resposta aos titulares precisam de validação antes da produção.

## Capacidade, recuperação e operação

- Pico estimado: 1.000 pessoas simultâneas. Planejar teste de carga do plano Supabase e da aplicação antes de lançamento.
- Definir plano/região Supabase, política de conexão, backup/PITR, RTO e RPO de produção; testes locais não comprovam HA/SLO pagos.
- Exercitar restauração de backup antes do lançamento e periodicamente.
- Jobs devem ter chave idempotente, tentativas limitadas, fila de falhas e alerta.
- Logs não incluem senha, OTP, token, conteúdo de contrato ou CPF completo.

## Decisões ainda abertas

Plano/região Supabase e disponibilidade de produção; provedor SMS e SMTP de produção; provedor transacional de e-mail para notificações de negócio; plataforma de hospedagem do container; sizing e connection pooling; política final de reembolso, calendário de feriados, método de exportação e retenção.

## Decisão de arquitetura

ADR-007 substitui Firebase Auth, PostgreSQL direto e Cloud Storage pela plataforma Supabase. ADR-002, ADR-005 e ADR-006 permanecem como histórico das decisões anteriores e não autorizam usar os provedores substituídos.
