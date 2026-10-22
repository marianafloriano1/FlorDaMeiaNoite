# Backlog executável — Flor da Meia-Noite

Estados: `BLOCKED`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`. Estado inicial é BLOCKED até dependências e Definition of Ready estarem satisfeitas. Executar somente uma TASK READY após autorização explícita do solicitante. Concluir uma TASK não autoriza a próxima.

## Regras globais para toda TASK

- Cada tarefa abaixo indica rastreabilidade, dependências, Allowed Changes, mudanças incidentais, Forbidden Changes, critérios de aceite, validação e Definition of Done.
- Mudanças incidentais permitidas apenas para corrigir formatação, pequenos defeitos indispensáveis ou documentação diretamente afetada dentro dos arquivos permitidos; descrevê-las no relatório.
- Não fazer scope creep. Alteração fora do permitido exige parar, registrar o bloqueio e solicitar decisão.
- Executar somente gates aplicáveis à TASK, registrar comando/evidência/resultado e não afirmar sucesso sem execução.
- `IN_REVIEW` exige revisão do diff e validação do Scope Guard. Marcar DONE somente depois dos gates e DoD.

## TASK-001 — Base do repositório e ambientes

- **Status:** IN_PROGRESS | **Branch:** `task/TASK-001-base-repositorio-ambientes` | **DEPENDS_ON:** nenhuma | **RF/RN/RNF/UC/ADR:** RNF-005, RNF-009, RNF-011; transversal; ADR-001.
- **Objetivo:** estruturar aplicação e automação de desenvolvimento/implantação com ambientes separados de teste e produção.
- **Allowed Changes:** estrutura do app TypeScript/Next.js; container; lint/format/build; configuração de ambiente; pipeline CI; documentação inicial de execução e deploy.
- **Incidental:** arquivos de ignore e scripts mínimos de desenvolvimento diretamente necessários.
- **Forbidden:** recursos de produção provisionados sem autorização de infraestrutura; chaves/secrets reais; lógica funcional de catálogo/pedido; dados pessoais reais.
- **Aceite:** app inicia localmente dentro de um container Docker ou runtime OCI compatível; a imagem é reproduzível e executa sem dependências instaladas diretamente no host, além dos requisitos do runtime; CI valida instalação/lint/build e construção da imagem; configuração de teste não aponta para produção; segredos não versionados; deploy de teste documentado.
- **Validação:** lint, typecheck, build e verificação do pipeline.
- **DoD:** diff dentro do escopo, CI verde, instruções de ambiente e rollback documentadas.

## TASK-002 — Persistência PostgreSQL e migrations base

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-001 | **Rastreabilidade:** RNF-001, RNF-010; ADR-002.
- **Objetivo:** definir conexão segura, migrations e convenções transacionais sem criar todas as entidades funcionais.
- **Allowed Changes:** ORM/query layer escolhido via decisão técnica documentada; migrations base; saúde/conexão; transação e pool.
- **Incidental:** dados de seed estritamente sintéticos para desenvolvimento.
- **Forbidden:** banco de produção sem autorização; credenciais reais; entidades/fluxos funcionais das próximas TASKs; armazenar estoque autoritativo em cache.
- **Aceite:** migração sobe e reverte em DB de teste; conexão usa secret/config; transação de exemplo demonstra rollback; nenhum segredo no repositório.
- **Validação:** migration round-trip, typecheck e checagem de configuração.
- **DoD:** estratégia de migration/rollback documentada e mudanças limitadas à fundação.

## TASK-003 — Contas, autenticação e autorização por função

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-002 | **Rastreabilidade:** RF-004/005/016; RN-003/004/015; RNF-005/006; UC-02/07; ADR-005.
- **Objetivo:** implementar cadastro/verificação, recuperação de senha, perfil e papéis Cliente/Funcionário/Administrador.
- **Allowed Changes:** modelo e serviços de identidade; verificação e-mail/celular; CPF brasileiro; RBAC backend; sessão; OTP administrativo; dados privados de funcionários e anexo.
- **Incidental:** telas mínimas de entrada/perfil para tornar o fluxo acessível.
- **Forbidden:** cliente sem verificação finalizar compra; funcionário gerir contas/cupons/relatórios ou confirmar pagamento; endpoint confiar em papel enviado pelo navegador; MFA para todos contra requisito; documentos reais em testes.
- **Aceite:** verificar e-mail e telefone é pré-condição de compra; reset por e-mail; autorização negativa para acesso cruzado; apenas administrador administra funcionários; dados de funcionário protegidos; reautenticação administrativa por OTP e regra de inatividade atendidas no backend.
- **Pendente obrigatório antes de iniciar:** selecionar provedor que cubra OTP e-mail/SMS administrativo e política por sessão; definir validação/formato CPF.
- **Validação:** testes de autorização, verificação, sessão, rate limit e arquivo privado.
- **DoD:** modelo de ameaça/auth decisões documentadas; nenhum segredo/CPF completo em logs.

## TASK-004 — Catálogo, mídia, busca e traduções

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-002 | **Rastreabilidade:** RF-001/002/003/019; RN-001/002/018; RNF-002/007/009; UC-01; ADR-004.
- **Objetivo:** criar catálogo com categorias fixas, conteúdo completo, pesquisa/filtros e tradução automática em quatro idiomas.
- **Allowed Changes:** Product/Category/Translation/Image; páginas de catálogo/produto; busca; filtros tipo de flor, cor, tamanho, materiais e faixa de preço; integração backend Translation.
- **Incidental:** cache de catálogo/imagens para cumprir desempenho.
- **Forbidden:** tradução de preço/código; expor estoque interno além do alerta público definido; aceitar estoque decimal; publicar produto com estoque zero como comprável; tradução manual dentro do painel.
- **Aceite:** todos os campos e categorias do README; imagem responsiva; preço em BRL; busca/filtros combináveis; tradução en/es/ru com cache e fallback pt; erro de API não bloqueia navegação.
- **Validação:** testes de filtro/idioma/fallback/estoque e medição de imagem em cenário documentado.
- **DoD:** API key só backend; limites de custo configurados; conteúdos de teste sintéticos.

## TASK-005 — Carrinho, favoritos e reserva concorrente

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-002, TASK-003, TASK-004 | **Rastreabilidade:** RF-005/006/007/008; RN-005/007; RNF-001/010; UC-03; ADR-002.
- **Objetivo:** persistir carrinho/favoritos e reservar unidades escolhidas por três horas sem saldo negativo.
- **Allowed Changes:** Cart/CartItem/Favorite/Reservation/InventoryLedger; transação de checkout/reserva; job de expiração.
- **Incidental:** mecanismo idempotente de retry e painel técnico de reservas necessário ao suporte.
- **Forbidden:** checkout de visitante; reserva antes do botão final; reserva parcial; liberar item duas vezes; cancelar pedido pago por job; manipular saldo por cache.
- **Aceite:** cliente seleciona subconjunto; reserva começa no clique final e dura três horas mesmo durante conferência; saldo concorrente correto; expiração cancela e libera exatamente uma vez; visitante não usa carrinho/favorito; catálogo esconde zero.
- **Validação:** teste concorrente em último item, expiração repetida, rollback, relógio/fuso.
- **DoD:** transação e idempotência demonstradas com evidência e ledger auditável.

## TASK-006 — Pedido e transição para WhatsApp

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-005 | **Rastreabilidade:** RF-007/009/010; RN-007/008/009; RNF-010; UC-03/04; ADR-003.
- **Objetivo:** vincular pedido ao cliente, criar resumo para WhatsApp e suportar conferência por funcionário e aprovação/confirmação pelo administrador.
- **Allowed Changes:** Order/OrderItem/OrderInspection/payment confirmation event; painel de fila; link WhatsApp; status e audit log.
- **Incidental:** mensagens de erro e recuperação do link após bloqueio de popup.
- **Forbidden:** pagamento no site; armazenar cartão; confirmar pagamento por funcionário; pôr CPF completo na URL ou texto WhatsApp; alterar preço sem consentimento.
- **Aceite:** funcionário registra conferência; administrador com OTP aprova e marca pago; pedido tem estados e histórico; link abre conversa da loja com identificador seguro; pagamento integral confirmado precede preparo; preparo começa entre 1–2 h e previsão fica clara/configurável. Permissão para funcionário mudar estados além de registrar conferência fica pendente e não deve ser presumida.
- **Pendências antes de iniciar:** número WhatsApp oficial; definição de como representar a janela de produção de 1–2 horas; política de preço/conteúdo do link.
- **Validação:** testes de transição, permissões e link sem PII excessiva.
- **DoD:** nenhum pagamento processado; registro financeiro mínimo auditável.

## TASK-007 — Painel de produtos, estoque e auditoria

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-004, TASK-005 | **Rastreabilidade:** RF-002/017; RN-002/016; RNF-005/010; UC-07; ADR-002.
- **Objetivo:** permitir cadastro/edição de produtos e estoque com histórico justificável.
- **Allowed Changes:** telas de catálogo/estoque; ledger; anexo de produto; alertas no limiar 7; notificação interna.
- **Incidental:** carregamento otimizado de imagens no painel.
- **Forbidden:** editar estoque sem motivo; motivo >400 caracteres; usuário modificar próprio autor/data; equipe acessar dados/contratos de funcionários; importação automatizada Excel.
- **Aceite:** funcionário administra produto e estoque; administrador também; registro contém operador, hora, anterior/novo e justificativa; alerta site quando ≤7; e-mail equipe ao cruzar para ≤7, sem spam; rearmar quando >7.
- **Validação:** testes de permissão e transições 8→7→6→8→7, auditoria e upload privado/público apropriado.
- **DoD:** motivos e log não editáveis por operadores; notificações idempotentes.

## TASK-008 — Cupons e indicadores de carrinho/favoritos

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-005 | **Rastreabilidade:** RF-006/015/018; RN-006/017; UC-03/08.
- **Objetivo:** administrar cupons e aplicar descontos válidos; registrar eventos de carrinho/favoritos para relatório.
- **Allowed Changes:** Coupon/Redemption/CartEvent; painel do administrador; validação no backend.
- **Incidental:** ferramenta de expiração dos cupons.
- **Forbidden:** funcionários criarem cupom; desconto acima do subtotal; aplicar cupom expirado; limite padrão de uso inventado.
- **Aceite:** percentual e valor fixo; data de validade; restrições configuráveis; preço recalculado no servidor; registro de adição/favorito suporta métricas; somente administrador cria/edita/desativa.
- **Pendente:** acumulação, mínimo, escopo, uso por cliente, arredondamento/reuso após cancelamento.
- **Validação:** limites, concorrência de resgate, cancelamento e autorização.
- **DoD:** sem defaults de negócio não aprovados; termos do cupom armazenados no pedido.

## TASK-009 — Gestão de pedido, retirada e cancelamentos

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-006, TASK-007 | **Rastreabilidade:** RF-009..014/020; RN-008..014; RNF-010; UC-04/05/07; ADR-003.
- **Objetivo:** concluir preparação/retirada, agenda, cancelamento e retorno seletivo de estoque.
- **Allowed Changes:** Order status/pickup/cancellation; agenda e tela de pedidos; seleção de itens usados; confirmação de retirada; avisos de política.
- **Incidental:** auditoria de decisões e timeline para cliente.
- **Forbidden:** cálculo ou execução de reembolso; cancelamento por funcionário; retornar itens usados/finalizados; alterar pedido sem acordo do cliente; inventar responsabilidade legal.
- **Aceite:** administrador define retirada; cliente vê previsão; status de pronto/retirado é alterado apenas por papel aprovado em requisito; cancelamento só administrador e exige estágio (não preparado/em preparo/finalizado); retorno de estoque corresponde exatamente aos itens não usados; tratamento de perecíveis/não perecíveis segue regra aprovada; defeito registrado para tratativa pelo WhatsApp.
- **Pendente:** uma semana corridos/calendário; permissão de equipe para alterar estados de pedido; estados finais de descarte.
- **Validação:** matriz de transição, devolução seletiva, abuso de permissão e auditoria.
- **DoD:** política informativa aprovada visível antes de pagamento; nenhuma regra financeira calculada.

## TASK-010 — Verificação e notificações agendadas

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-006, TASK-009 | **Rastreabilidade:** RF-004/012; RN-003/011/012; RNF-008/009; UC-02/06.
- **Objetivo:** envio confiável de mensagens de verificação, status, retirada e alertas de prazo.
- **Allowed Changes:** modelo Notification/outbox, workers, templates pt/en/es/ru, e-mail/SMS provider adapters.
- **Incidental:** monitor de falhas e reprocessamento.
- **Forbidden:** enviar marketing sem consentimento; duplicar mensagens em retries; mandar OTP/logs ao painel aberto; notificar clientes após cancelamento indevidamente.
- **Aceite:** verificação email/SMS; senha por email; e-mail pronto; lembretes T-24h/T-1h; avisos diários para perecíveis até três dias úteis; disponibilidade de canal/retry registrada; feriado respeitado.
- **Pendências:** escolher serviços, remetente/domínio, calendário de feriados e limites/custos.
- **Validação:** relógio simulado, retries, duplicidade, opt-out aplicável e falha de provedor.
- **DoD:** outbox/job idempotente; entrega/erro observável sem expor dados privados.

## TASK-011 — Relatórios, exportações e métricas

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-005, TASK-007, TASK-008, TASK-009 | **Rastreabilidade:** RF-018; RN-017; RNF-006; UC-08.
- **Objetivo:** relatórios semanais/mensais e exportações Excel/PDF disponíveis apenas ao administrador.
- **Allowed Changes:** consultas agregadas, filtros, geração XLSX/PDF, registro de exportação.
- **Incidental:** otimizações/índices locais ao relatório.
- **Forbidden:** relatórios para equipe; exportações públicas; esconder cancelamentos; faturamento confundido com pedidos não pagos; incluir todos os dados pessoais sem necessidade.
- **Aceite:** faturamento por data de criação e data de pagamento claramente separados; mais/menos vendidos, carrinho, favoritos; seletor Excel ou PDF; conteúdo consistente com filtros; somente administrador.
- **Pendente:** definição de semana, tratamento de cupom/cancelamento no faturamento e escopo de PII exportada.
- **Validação:** fixtures sintéticas contra totais calculados e autorização.
- **DoD:** export temporário protegido e com auditoria; relatórios explicam base temporal.

## TASK-012 — Direção visual, idiomas e acessibilidade

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-001, TASK-004 | **Rastreabilidade:** RF-001/019; RNF-002/007; UC-01; ADR-004.
- **Objetivo:** aplicar identidade visual gótica/industrial e experiência não convencional sem comprometer compra acessível.
- **Allowed Changes:** componentes/styles; tokens cor/tipografia; microinterações; layouts responsivos; seletor de idioma; conteúdo institucional configurável.
- **Incidental:** ajustes semânticos/accessibility diretamente ligados aos componentes.
- **Forbidden:** reduzir contraste; inventar logo oficial, endereço ou afirmação botânica; templates genéricos não justificados; dependência de animações para conteúdo essencial.
- **Aceite:** palette do README; fotos florais de impacto; navegação clara; teclado/foco, contraste, textos alternativos, mobile e estados de erro/vazio; quatro idiomas.
- **Pendente:** logo final, fontes licenciadas, fotos autorizadas, endereço e texto institucional.
- **Validação:** auditoria WCAG e inspeção visual em larguras acordadas.
- **DoD:** direção de arte documentada e assets com licença/origem identificada.

## TASK-013 — Segurança, backup, observabilidade e recuperação

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-001, TASK-002, TASK-003, TASK-005 | **Rastreabilidade:** RNF-003..006/008..011; ADR-001/002/005.
- **Objetivo:** preparar proteção e operação para produção confiável e permitir recuperação em RTO ≤24h.
- **Allowed Changes:** pipeline de deploy de imagens OCI, configuração de runtime/container registry, alertas, backups/PITR, cópia, runbooks, gestão de secrets, políticas de bucket/database e custos.
- **Incidental:** cabeçalhos/limites de segurança no gateway/app se necessários.
- **Forbidden:** deploy ou dados reais sem autorização; alegar RPO não medido; desabilitar auditoria; expor CPF/contratos/secret.
- **Aceite:** backup automático e independente; exercício de restore documentado; RTO avaliado ≤24h; RPO medido e aprovado; dashboards e alertas; rollback; budget alerts; teste/produção isolados; deploy de produção usa imagem de container aprovada e reproduzível.
- **Pendente:** SLO, região, retenção e valor de orçamento.
- **Validação:** restauração real de dados sintéticos, rotação de secret, revisão de acesso e cenário de falha.
- **DoD:** plano operacional aprovado e nenhum deploy final sem autorização.

## TASK-014 — Migração operacional de catálogo

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-004, TASK-007, TASK-012 | **Rastreabilidade:** RF-002; RN-002; UC-01/07.
- **Objetivo:** preparar processo seguro para funcionários cadastrar produtos, fotos, descrições e saldo manualmente.
- **Allowed Changes:** guia de cadastro, formulário, validações, checklist de consistência e treinamento.
- **Incidental:** melhorias de preenchimento em lote sem importar planilha, se aprovadas e localizadas.
- **Forbidden:** integração automática com Excel ou migrar saldo sem validação; inventar informações/toxicidade; publicar produtos incompletos sem autorização.
- **Aceite:** equipe consegue cadastrar item por item; imagens otimizadas; categoria fixa; contagem conferida contra inventário físico antes de abrir vendas.
- **Validação:** ensaio com produtos sintéticos; reconciliação manual documentada.
- **DoD:** processo e responsabilidade de dupla conferência definidos.

## TASK-015 — Capacidade, aceitação ponta a ponta e prontidão de lançamento

- **Status:** BLOCKED | **DEPENDS_ON:** TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014 | **Rastreabilidade:** todos RF/RNF; todos UCs; ADR-001..005.
- **Objetivo:** validar requisitos integrados e preparar lançamento controlado.
- **Allowed Changes:** scripts/config de carga, correções diretamente necessárias aos critérios, runbooks e release checklist.
- **Incidental:** defeitos P0/P1 dentro do escopo já aprovado.
- **Forbidden:** novos requisitos, mudar termos de negócio, operar pagamento real em carga, usar PII real, publicar site sem autorização explícita.
- **Aceite:** fluxos críticos E2E; 1.000 sessões simultâneas em carga acordada; imagens ≤2s no cenário definido; estoque sem divergência; notificações/retries; restore demonstrado; acessibilidade; privacidade/permissões; plano de suporte; aprovação de pendências.
- **Validação:** gates de build/lint/tipos, suíte unitária/integrada/E2E, carga, segurança, acessibilidade e regressão definidos no AGENTS.md.
- **DoD:** relatório de execução completo, pendências aceitas/rejeitadas, checklist de lançamento aprovado.

