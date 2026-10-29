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

### Estoque, reserva e pedidos

1. Backend recalcula preço/cupom e verifica conta confirmada.
2. Uma transação Supabase Database cria pedido, reserva estoque até três horas e impede saldo negativo.
3. Falha em qualquer linha causa rollback integral; não há reserva parcial.
4. Um job idempotente expira o pedido ainda aguardando pagamento e libera estoque uma vez.
5. O cliente segue para o WhatsApp; falha ao abrir WhatsApp não desfaz o pedido/reserva.

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
