# Arquitetura de referência

## Princípios

1. PostgreSQL é fonte de verdade para clientes, catálogo, pedidos, reservas e estoque.
2. Operações críticas são atômicas, idempotentes e auditáveis.
3. Serviços externos podem falhar; notificações/traduções usam fila, repetição com limite e estado visível no painel.
4. O site deve servir catálogo/imagens com cache, mas validar saldo e preço no servidor no momento da finalização.
5. Separar ambientes de teste e produção, credenciais, bases, domínios e contas de serviços. Dados reais nunca vão para teste.
6. Construir imagens reproduzíveis por ambiente; configurar segredos, limites e identidade fora da imagem; promover a mesma imagem aprovada entre estágios quando tecnicamente possível.

## Componentes

- **Web responsiva (Next.js/TypeScript):** vitrine, conta, carrinho, favoritos, painel administrativo com acesso por função.
- **API/backend (Cloud Run):** autorização, validação, regras de pedido/cupom, transações de estoque, relatórios, exportações, tradução e webhooks de jobs.
- **Containerização obrigatória (RNF-011):** aplicação web/API e workers serão distribuídos como imagens de container compatíveis com OCI; Docker é a opção de desenvolvimento, podendo ser usado outro runtime compatível. Cloud Run executará as imagens em produção. Cloud SQL, Cloud Storage, filas e demais serviços gerenciados permanecem serviços externos e não precisam ser empacotados junto com a aplicação.
- **Cloud SQL PostgreSQL HA:** dados transacionais, ledger de estoque, índices e trilha de auditoria.
- **Cloud Storage privado:** anexos de contratos e imagens de origem; URLs de acesso controlado para anexos, transformações/cache de imagem pública via CDN.
- **Cloud CDN:** imagens otimizadas e recursos estáticos; não armazenar dados pessoais ou respostas privadas em cache público.
- **Cloud Tasks/Pub/Sub:** expiração de reserva, lembretes, e-mails/SMS e tradução sob demanda; consumidores idempotentes.
- **Identity Platform ou alternativa:** autenticação, verificação de canal, recuperação de senha e claims de função; seleção final depende da validação de MFA por e-mail/sessão.
- **Google Cloud Translation:** conteúdo de origem em português, tradução armazenada por idioma/versão.
- **Provedores transacionais de e-mail e SMS:** verificação, OTP e notificações. WhatsApp é abertura de conversa; sem integração automatizada nesta versão.
- **Secret Manager, Logging, Monitoring, Error Reporting e alertas de orçamento:** segredos, métricas, erros e custo.

## Fluxos críticos

### Finalização e reserva

1. Backend recalcula preço/cupom e verifica conta verificada.
2. Uma transação cria pedido, bloqueia/consome saldo disponível e cria reserva com `expires_at = created_at + 3h`.
3. Se qualquer linha falhar, rollback integral; não há reserva parcial.
4. Agendar job de expiração; ao executar, reler status e prazo. Se continua aguardando pagamento, marcar expirado/cancelado e liberar quantidades na mesma transação.
5. Redirecionar ao WhatsApp; falha do navegador em abrir link não deve desfazer o pedido/reserva.

### Aprovação/pagamento

Funcionário registra inspeção e resultado. Administrador realiza OTP sensível, aprova e marca pagamento manualmente. Operação registra valor/moeda e operador; preço não é alterado sem acordo com o cliente. Pedido passa a “em preparo” e registra início previsto entre +1h e +2h. O horário exato dessa janela precisa de definição: sistema pode mostrar janela, não inventar instante de início. Permissões de equipe para definir “pronto” e “retirado” ainda precisam de decisão; não presumir.

### Cancelamento e retorno

Somente administrador executa cancelamento na tela de pedidos com OTP válido. “Não preparado” libera todas as unidades; “em preparo” recebe seleção de materiais/itens usados e libera somente não usados; “finalizado” não libera itens. Cancelamento, seleção de consumo e movimentos de estoque ficam em uma transação auditável. Reembolso não é determinado pelo sistema.

### Retirada/notificações

Administrador combina e agenda retirada no painel; cliente vê data/hora e recebe e-mail em T-24h, T-1h e quando pronto. Para perecíveis não retirados, job envia aviso uma vez por dia por até três dias úteis desde a data combinada. Após 2h do horário agendado, equipe faz contatos WhatsApp em duas tentativas com intervalo de 1h. Cancelamento permanece exclusivo do administrador; a equipe pode fazer os contatos.

## Segurança e privacidade

- TLS em trânsito e criptografia em repouso; chaves gerenciadas; menor privilégio por papel.
- CPF, telefone e anexos privados; evitar CPF em URL, logs ou mensagem pré-preenchida do WhatsApp. Não expor telefone de outro cliente.
- Auditoria para pagamento, aprovação, cancelamento, conta e estoque; trilhas protegidas contra alteração comum.
- OTP limitado por taxa, expiração e uso único; MFA de administrador aplicado no backend; sessão invalidada após 1h de inatividade para ações protegidas.
- Política pública de privacidade; retenção, exclusão, consentimento de marketing e resposta aos titulares precisam de validação da loja antes do lançamento.
- Exportações incluem nome/dados de cliente conforme pedido do solicitante; somente administrador autorizado, log de exportação e arquivo temporário com expiração.

## Capacidade, desempenho e recuperação

- Pico é 1.000 pessoas simultâneas, não apenas visitas/dia. Realizar ensaio com tráfego anônimo de catálogo e uma parcela controlada de operações autenticadas; limitar carga na base e no serviço de tradução.
- Cache CDN para imagens públicas; formatos responsivos e thumbnails; manter rotas privadas sem cache compartilhado.
- Definir min/max instances, concorrência e pool de conexões após teste; Cloud Run autoscaling não substitui capacidade do banco.
- Cloud SQL regional HA, backups automáticos, PITR e cópia em projeto/local independente. RTO aprovado ≤24h; RPO final em aberto, com recomendação ≤5min.
- Restaurar backup em exercício antes do lançamento e periodicamente; documentar responsável e procedimento de fallback.
- Teste gratuito usa dataset sintético e não demonstra HA/SLO do plano pago.

## Observabilidade e jobs

Todo job tem chave idempotente (ex.: pedido + tipo + vencimento), tentativas limitadas, fila de falhas e alerta. Métricas: erro/latência por rota; conexão e saturação DB; reserva expirada/estoque; fila/notificações; falha OTP; custo API tradução; disponibilidade. Logs não contêm senha, OTP, token, conteúdo de contrato ou CPF completo.

## Decisões ainda abertas

Região exata; provedor de autenticação e OTP e-mail; provedor de e-mail/SMS; versão/runtime Next.js; método de exportação XLSX/PDF; política final de reembolso e cancelamento; cálculo de dias para não perecíveis; calendário de feriados; RPO/SLO pagos; orçamento mensal e retenção.
