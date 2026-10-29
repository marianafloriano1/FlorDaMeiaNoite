# Flor da Meia-Noite — visão e requisitos

## Estado deste documento

Planejamento aprovado pelo solicitante em 2026-09-23. Este repositório reúne os requisitos e as implementações entregues conforme o estado registrado em TASKS.md: catálogo e contas estão implementados, e o fluxo de pedidos/checkout da TASK-006 está em implementação. Endereço da loja, domínio, arquivos finais da marca, política jurídica de privacidade/cancelamento e alguns parâmetros operacionais ainda serão fornecidos pela loja antes da publicação.

## 1. Visão do produto

A Flor da Meia-Noite venderá flores, plantas, arranjos e artigos de jardinagem por um site de comércio eletrônico autoral, em português, inglês, espanhol e russo. O cliente poderá navegar sem conta; para comprar, usar carrinho ou favoritos, deverá se cadastrar e confirmar e-mail e celular. A retirada é presencial. O site reserva estoque e organiza pedidos, mas pagamento, negociação de alterações e eventual reembolso são tratados entre cliente e administrador pelo WhatsApp. O sistema não processa pagamentos.

O visual deverá expressar a identidade gótica e industrial da marca: preto absoluto `#000000`, cinza chumbo `#4A4A4A`, verde musgo `#1E2B22`, fotografia floral saturada, tipografia expressiva e microinterações cuidadosas. A estética não pode reduzir legibilidade, acessibilidade ou clareza das informações de compra.

### Objetivos mensuráveis conhecidos

- Operar cerca de 30 pedidos por dia e suportar picos estimados de 1.000 pessoas simultâneas em datas sazonais.
- Carregar imagens do conteúdo principal em até 2 segundos sob condições de teste a definir.
- Admitir indisponibilidade de até 24 horas (RTO máximo inicial) e minimizar perda de dados (RPO a ser fixado no desenho operacional; recomendação preliminar: até 5 minutos para dados transacionais).
- Fazer teste inicial sem gasto de hospedagem/serviços, mas projetar produção em serviços pagos quando necessário para disponibilidade confiável.
- Manter o estoque no sistema como controle oficial; não manter o Excel como sistema operacional paralelo. Funcionários cadastrarão produtos individualmente, inclusive fotos e descrições.

## 2. Escopo

### Incluído na primeira versão

Catálogo e páginas de produto; busca e filtros; conta e verificação de e-mail/celular; carrinho e favoritos para clientes cadastrados; cupons; reserva e controle de estoque; fluxo de pedido ligado ao WhatsApp; estados e retirada; painel de administrador e funcionários; notificações por e-mail e SMS; conteúdo em português com opção de visualizar traduções persistidas em inglês, espanhol ou russo; métricas e exportação PDF/Excel; auditoria de estoque; relatórios administrativos; backups, observabilidade e implantação resiliente.

### Fora do escopo inicial

- Entrega em domicílio, frete, roteirização e endereço de entrega.
- Checkout ou captura de pagamento dentro do site, conciliação bancária automática ou integração com adquirente. Pix, transferência, crédito e débito são acertados no WhatsApp.
- Integração automática com o Excel atual; a equipe fará o cadastro individual no site.
- Sincronização com sistema de ponto de venda físico (não existe sistema atual). O estoque online será a fonte oficial após a transição.
- Aplicativos nativos móveis e programa de fidelidade.

## 3. Atores e permissões

| Ator | Capacidades |
|---|---|
| Visitante | Ver catálogo, pesquisar e filtrar produtos e ver alerta de estoque baixo; não usa carrinho nem favoritos. |
| Cliente autenticado | Gerenciar perfil, comprar, usar carrinho e favoritos, aplicar cupom, acompanhar próprios pedidos, receber notificações e solicitar cancelamento por WhatsApp conforme política divulgada. |
| Funcionário (cinco contas individuais; role `employee` = operador) | Cadastrar/editar produtos; manter estoque com justificativa obrigatória de até 400 caracteres; conferir pedido e registrar resultado; avançar somente estados operacionais autorizados do pedido; consultar dados de clientes necessários à comunicação. Sem acesso a dados de outros funcionários, relatórios, gestão de contas, cupons, confirmação de pagamento ou cancelamento. |
| Administrador principal | Todas as ações administrativas; aprovar conferência e confirmar pagamentos; criar/editar/desativar cupons; gerenciar contas de funcionários; cancelar pedidos e decidir itens que retornam ao estoque; relatórios/exportações; configurações da loja. Exige código de segundo fator para ações sensíveis, uma vez por sessão; após 1 hora sem atividade, exige novo código para renovar a sessão. |

Dados completos dos clientes ficam visíveis a funcionários e administrador porque são usados na confirmação pelo WhatsApp. Dados cadastrais e contrato dos funcionários são visíveis apenas ao administrador. A solicitação de direitos sobre dados pessoais é atendida pelo administrador. A loja publicará sua política de privacidade e termos.

## 4. Requisitos funcionais

Cada requisito tem identificador permanente. IDs removidos futuramente devem ser marcados CANCELLED/DEPRECATED, nunca renumerados.

| ID | Requisito e critério verificável | Regras/UCs | Tarefas |
|---|---|---|---|
| RF-001 | Visitantes visualizam catálogo, páginas de produto, busca e filtros sem criar conta. Produtos com estoque zero não são listados como compráveis. | RN-001, RN-002; UC-01 | TASK-004, TASK-012 |
| RF-002 | O catálogo suporta categorias fixas: Buquês, Arranjos, Boxes, Embalagens, Laços, Vasos, Ornamentos, Flores, Plantas, Fertilizantes, Terras, Sementes, Ferramentas de jardinagem, Decorações, Pedras e Insumos. Campos: nome, tipo, descrição, cores, fotos, preço em BRL, categoria, estoque inteiro, ocasião, tamanho, materiais, instruções de cuidado, significado das flores, toxicidade para animais e prazo de validade/perda. | RN-002; UC-01 | TASK-004, TASK-007 |
| RF-003 | A busca filtra por tipo de flor, cor, tamanho, materiais e faixa de preço; catálogo pode ainda exibir ocasião e demais características. | RN-001; UC-01 | TASK-004 |
| RF-004 | Cliente registra nome completo, e-mail, CPF brasileiro, telefone celular e senha. E-mail e telefone são verificados antes de finalizar compra; recuperação de senha é por e-mail. | RN-003; UC-02 | TASK-003 |
| RF-005 | Cliente autenticado administra dados permitidos do próprio perfil e consulta histórico/status dos próprios pedidos; favoritos e carrinho são persistentes por conta. | RN-003, RN-004; UC-02 | TASK-003, TASK-005 |
| RF-006 | Cliente autenticado adiciona itens ao carrinho e pode selecionar um subconjunto para uma reserva temporária. A seleção/reserva não envia pedido nem aplica cupom; pedido/checkout e cupons pertencem aos fluxos das TASKs responsáveis. | RN-005, RN-006; UC-03 | TASK-005, TASK-006, TASK-008 |
| RF-007 | A TASK-005 cria atomicamente uma reserva temporária do estoque selecionado, com validade de 3 horas e no máximo uma reserva ativa por cliente/carrinho. A TASK-005 não cria pedido, não inicia checkout nem direciona ao WhatsApp; a TASK-006 poderá consumir uma reserva válida ao iniciar o pedido/checkout. | RN-005, RN-007; UC-03 | TASK-005, TASK-006 |
| RF-008 | Se uma reserva não for consumida, concluída ou cancelada antes de expires_at (3 horas após sua criação), passa para expired e libera o estoque uma única vez por mecanismo periódico idempotente. A política de expiração/cancelamento de pedido por falta de pagamento pertence à TASK-006. | RN-007; UC-03, UC-05 | TASK-005, TASK-006 |
| RF-009 | O cliente abre conversa WhatsApp com mensagem pré-preenchida contendo referência opaca do pedido, resumo de itens, total autoritativo em BRL e link seguro de acompanhamento; a pessoa envia manualmente. Employee/operador registra conferência e atualiza estados permitidos; admin/gerente aprova e registra pagamento manual. | RN-008; UC-04 | TASK-006, TASK-009 |
| RF-010 | Estados do pedido: Aguardando pagamento, Em preparo, Pronto para retirada, Retirado com sucesso e Cancelado. Após confirmação integral do pagamento pelo administrador, registrar preparation_window_start = payment_confirmed_at + 1 hora e preparation_window_end = payment_confirmed_at + 2 horas; ambos timestamptz UTC, apresentados no fuso da loja. | RN-008, RN-009; UC-04, UC-05 | TASK-006, TASK-009 |
| RF-011 | Administrador define data e horário de retirada após combinar com cliente no WhatsApp; cliente vê previsão no site. Loja configura endereço e horários: seg-sex 08:00–18:30; sáb-dom 09:00–13:00; feriados e horários especiais configuráveis. Cliente informa quando precisa do produto. | RN-010; UC-04 | TASK-009 |
| RF-012 | Sistema envia confirmação/lembretes por e-mail: um dia e uma hora antes da retirada; e-mail de pronto; e, para item perecível não retirado, um alerta diário durante a janela de 3 dias úteis. Aviso de estoque baixo fica visível no site a todos; equipe recebe e-mail ao chegar a 7 unidades. | RN-011, RN-012; UC-06 | TASK-010 |
| RF-013 | Cliente pode pedir cancelamento conforme política divulgada, pelo WhatsApp; ação operacional de cancelar pedido no sistema é exclusiva do administrador. Sistema não calcula nem processa reembolso. | RN-013; UC-05 | TASK-009 |
| RF-014 | Ao cancelar: “não preparado” devolve todos os itens; “em preparo” exige selecionar itens já usados e devolve apenas os não selecionados; “finalizado” não devolve item. Toda devolução é automática após seleção/confirmação do administrador. | RN-014; UC-05 | TASK-009 |
| RF-015 | Administrador cria cupons percentuais ou de valor fixo, com validade e restrições opcionais definidas por ele. Sem limite de usos padrão; regras de acumulação e mínimo de compra precisam ser configuráveis ou marcadas pendentes antes de implementação. | RN-006; UC-03 | TASK-008 |
| RF-016 | Funcionários cadastrados individualmente têm nome, idade, celular, e-mail, CPF, data de contratação e anexo do contrato. Apenas administrador cria, edita e bloqueia contas e acessa esses dados/anexos. | RN-015; UC-07 | TASK-003, TASK-009 |
| RF-017 | Cada alteração de estoque registra usuário, data/hora, valores anterior/novo e justificativa obrigatória de até 400 caracteres. E-mail de estoque baixo é deduplicado enquanto quantidade permanecer em 7 ou menos; nova notificação após recompor e voltar a cruzar o limite. | RN-016; UC-07 | TASK-007 |
| RF-018 | Painel do administrador exibe faturamento semanal e mensal por data do pedido e data da confirmação do pagamento, pedidos/cancelamentos e produtos mais/menos vendidos, adicionados ao carrinho e favoritados. Exportação em Excel ou PDF escolhida pelo administrador. | RN-017; UC-08 | TASK-011 |
| RF-019 | O idioma padrão é pt-BR. O visitante pode escolher inglês, espanhol ou russo quando houver conteúdo de produto já traduzido e persistido; essa escolha é opcional. Tradução ausente ou falha usa pt-BR e não bloqueia a navegação. Não há geração automática nem integração faturável autorizada. Preços permanecem em BRL e códigos não são traduzidos. | RN-018; UC-01 | TASK-004 |
| RF-020 | Cliente pode verificar defeito/dano ao retirar, ou retornar à loja com o produto; equipe registra ocorrência para tratamento direto pelo WhatsApp. | RN-013; UC-05 | TASK-009 |

## 5. Regras de negócio

- **RN-001 — Navegação pública:** catálogo e filtros são públicos. Para carrinho, favoritos e compra, autenticação é obrigatória.
- **RN-002 — Visibilidade:** estoque é inteiro e nunca negativo; produto com zero unidades não aparece no catálogo público. Para estoque de 1 ou 2 unidades, exibir publicamente exatamente “Últimas unidades disponíveis.”; acima de 2 não exibir alerta. A view/API pública expõe somente o sinal booleano necessário, nunca a quantidade real.
- **RN-003 — Elegibilidade:** compra exige CPF brasileiro validável e confirmação de e-mail e celular; público de compra é pessoa com CPF brasileiro. Validação local aprovada: normalizar o valor para 11 dígitos, rejeitar sequências com todos os dígitos iguais e validar os dígitos verificadores; não consultar cadastro externo nem alegar verificar nacionalidade. A regra verifica consistência matemática/formato, não titularidade do CPF.
- **RN-004 — Isolamento:** cliente vê seus próprios pedidos e perfil; equipe vê os dados de clientes necessários para comunicação; apenas administrador vê dados e anexos dos funcionários.
- **RN-005 — Reserva concorrente:** reserva de todo item selecionado é transacional/atômica. Se não houver saldo para qualquer linha, a reserva não é criada parcialmente. O carrinho não reserva estoque antes da ação explícita de reserva; criar pedido/checkout é responsabilidade da TASK-006.
- **RN-006 — Cupom:** validade é obrigatória. Limite de uso/restrições são opcionais, cadastrados pelo administrador. Acumulação entre cupons, mínimo de compra, incidência sobre produtos e arredondamento permanecem PENDENTES DE DECISÃO.
- **RN-007 — Expiração da reserva:** o prazo da reserva começa na criação e dura 3 horas. Ao vencer, a TASK-005 marca a reserva como expired e libera a disponibilidade uma única vez, de forma transacional e idempotente. A TASK-005 não cancela pedido nem processa pagamento; prazo de pagamento/cancelamento de pedido e concorrência com confirmação pertencem à especificação da TASK-006.
- **RN-008 — Verificação/pagamento:** employee/operador registra conferência e pode alterar estados operacionais permitidos; admin/gerente pode gerir estados permitidos. Somente admin/gerente aprova conferência, confirma pagamento manual após WhatsApp e cancela pedido. Sem integração de pagamento. Após confirmação integral, preparation_window_start fica em +1 hora e preparation_window_end em +2 horas.
- **RN-009 — Status:** transições são controladas e auditadas no backend/banco. employee corresponde ao privilégio de operador e admin ao de gerente; ambos alteram somente transições autorizadas além da conferência inicial. Confirmação de pagamento e cancelamento são exclusivos de admin/gerente.
- **RN-010 — Retirada:** retirada é presencial no endereço configurável. Horários regulares são seg-sex 08:00–18:30 e sáb-dom 09:00–13:00; administrador poderá configurar exceção de feriado/horário. A previsão exata é definida pelo administrador após acordo via WhatsApp.
- **RN-011 — Perecíveis:** a contagem começa na data combinada de retirada; tolerância até 3 dias úteis (segunda a sábado, calendário de feriados configurável), com um e-mail diário. Após prazo, loja descarta e pedido não é reembolsado; o sistema encerra/cancela conforme ação autorizada e registra descarte. Duas tentativas de contato pelo WhatsApp, com intervalo de 1 hora, começam após 2 horas do horário combinado.
- **RN-012 — Não perecíveis:** ficam aguardando até uma semana após a data combinada; após isso, cancelamento sem reembolso. Não foi definido se semana significa 7 dias corridos ou calendário comercial: PENDENTE DE DECISÃO.
- **RN-013 — Cancelamento/financeiro:** acertos de reembolso são tratados no WhatsApp. Site não determina elegibilidade, percentual ou transferência do reembolso. A política exibida antes de pagar precisa ser aprovada pela loja. O cliente pode solicitar cancelamento; apenas administrador executa a ação no sistema.
- **RN-014 — Retorno de estoque:** não preparado = todas as unidades voltam; em preparo = administrador identifica itens já usados, somente não usados voltam; finalizado = nenhum item volta. Para prazo expirado de pedido perecível descartado, unidades descartadas não retornam.
- **RN-015 — Equipe:** cinco funcionários individuais no lançamento, contas criadas/bloqueadas só pelo administrador; atributos pessoais e contrato protegidos do acesso da equipe.
- **RN-016 — Auditoria de estoque:** justificativa obrigatória ≤400 caracteres, usuário e carimbo de data/hora imutáveis. Alerta de e-mail dispara ao cruzar para ≤7 unidades, sem repetição contínua; rearmado ao estoque voltar a >7.
- **RN-017 — Relatórios:** somente administrador acessa. Faturamento é baseado em pagamentos confirmados; apresentar também data do pedido separadamente. Definições de semana, fuso e devoluções/cancelamentos são configuráveis/validadas na implementação.
- **RN-018 — Idioma e conteúdo traduzido:** pt-BR é o idioma padrão e conteúdo de origem. O visitante pode selecionar inglês, espanhol ou russo para exibir traduções previamente persistidas quando disponíveis. Não gerar traduções automaticamente nem ativar provider, quota ou cobrança sem decisão futura específica. Tradução ausente ou falha usa pt-BR sem bloquear navegação. Preço é sempre BRL e códigos permanecem inalterados.

## 6. Requisitos não funcionais

| ID | Requisito verificável |
|---|---|
| RNF-001 | Suportar pico de 1.000 usuários simultâneos em teste de carga acordado, sem perda de reserva/estoque e mantendo APIs principais dentro de metas de latência definidas na tarefa de performance. |
| RNF-002 | Imagens principais visíveis em ≤2 s no cenário de rede/dispositivo definido; usar formatos modernos, dimensões responsivas, CDN e lazy loading fora da primeira dobra. |
| RNF-003 | RTO máximo de 24 h. RPO deve ser “mínimo possível”; arquitetura propõe PITR com meta inicial de até 5 minutos, pendente de orçamento/aprovação operacional. Backup automático, criptografado, cópia independente e ensaio de restauração antes do lançamento. |
| RNF-004 | Disponibilidade confiável em produção, monitorada. SLO inicial a contratar: 99,9% mensal como recomendação para avaliação, não compromisso já aprovado; definição do objetivo e custo permanece PENDENTE DE DECISÃO. |
| RNF-005 | Segredos fora do código; TLS; menor privilégio; autenticação forte; proteção contra abuso de OTP; logs sem senha, token ou conteúdo desnecessário de CPF; trilha de auditoria de ações privilegiadas e estoque. |
| RNF-006 | Dados pessoais e anexos têm acesso por função; anexos privados; exportações limitadas a administrador e auditadas. Política de retenção/exclusão e prazos legais serão aprovados pela loja. |
| RNF-007 | Interface responsiva, teclado acessível, foco visível, contraste legível sobre fundo escuro, textos alternativos e conformidade WCAG 2.2 AA como meta de projeto. |
| RNF-008 | Horário e prazos calculados no fuso da loja `America/Sao_Paulo`; feriados e exceções editáveis. Todos os eventos armazenados com timestamp UTC e apresentados no fuso local. |
| RNF-009 | Falhas de e-mail/SMS são monitoradas, retentadas de forma idempotente e não duplicam pedidos, reservas, pagamento ou mudança de estoque. Falha ao consultar conteúdo traduzido usa pt-BR conforme RN-018. |
| RNF-010 | Operações críticas (reserva, expiração, baixa/retorno de estoque, confirmação de pagamento, cancelamento) são idempotentes, transacionais e auditáveis. |
| RNF-011 | A aplicação deverá obrigatoriamente executar em containers. Os componentes executáveis do produto (web/API e workers) serão empacotados como imagens compatíveis com OCI e deverão rodar em Docker ou runtime de containers equivalente, localmente e nos ambientes de implantação. Serviços gerenciados externos do Supabase não precisam ser containerizados. |

## 7. Casos de uso

- **UC-01 — Descobrir produtos:** visitante/cliente consulta catálogo traduzido, pesquisa, filtra e abre produto; zero estoque não pode ser comprado.
- **UC-02 — Criar conta e perfil:** visitante informa nome, CPF, e-mail, celular e senha; confirma e-mail/SMS; recupera senha por e-mail.
- **UC-03 — Montar e enviar pedido:** cliente cadastrado usa carrinho/favoritos, escolhe itens e cupom, seleciona itens a comprar; finalização cria reserva de 3h e abre WhatsApp.
- **UC-04 — Conferir, aprovar e receber pagamento:** funcionário registra conferência; administrador aprova e marca pagamento após confirmação por WhatsApp; define retirada; equipe prepara e atualiza estados.
- **UC-05 — Cancelar/retirar pedido:** administrador cancela e classifica uso dos itens; ou equipe registra retirada. Sistema calcula devolução de estoque segundo RN-014 e envia comunicações.
- **UC-06 — Notificações:** sistema envia e-mail/SMS de verificação, avisos, lembretes, pronto e perecibilidade; equipe recebe e-mail de baixo estoque.
- **UC-07 — Administrar catálogo/estoque/equipe:** equipe mantém produtos e estoque com justificativa; administrador mantém cupons, contas e configuração.
- **UC-08 — Analisar operação:** administrador filtra relatórios por semana/mês e base temporal, consulta métricas e exporta PDF ou Excel.

## 8. Modelo conceitual

Entidades principais: `Customer`, `Employee`, `Product`, `Category` (lista fixa), `ProductTranslation`, `ProductImage`, `InventoryLedgerEntry`, `Cart`, `CartItem`, `Favorite`, `Coupon`, `CouponRedemption`, `Order`, `OrderItem`, `InventoryReservation`, `OrderInspection`, `Cancellation`, `PickupSchedule`, `Notification`, `AuditEvent`, `StoreSchedule`, `HolidayException`.

Relacionamentos: cliente 1:N pedidos/carrinhos/favoritos; pedido 1:N linhas e reservas; produto 1:N imagens/traduções/movimentos de estoque; pedido 0..1 inspeção, pagamento confirmado por evento administrativo, programação de retirada e cancelamento; funcionário N:N operações auditadas. Estoque atual deriva de saldo controlado e razão de movimentos, não de edição silenciosa.

## 8.1 Diagramas

- [Contexto do sistema](docs/diagrams/context.mmd)
- [Modelo de domínio](docs/diagrams/domain-model.mmd)
- [Ciclo de vida do pedido](docs/diagrams/order-lifecycle.mmd)
- [Sequência de checkout e reserva](docs/diagrams/checkout-sequence.mmd)
- [Arquitetura de referência](docs/diagrams/architecture.mmd)
- [Detalhamento arquitetural](docs/architecture/overview.md)

## 9. Interfaces e integrações

- **Traduções do catálogo**: conteúdo já traduzido pode ser persistido por idioma e versão da origem; provider automático, quota e cobrança estão desativados e dependem de decisão futura específica.
- **WhatsApp:** link wa.me para WHATSAPP_STORE_NUMBER com mensagem pré-preenchida que a pessoa envia manualmente; sem WhatsApp Business API ou envio automático. O texto usa referência opaca, resumo de itens, total BRL autoritativo e link de acompanhamento, sem PII.
- **E-mail transacional**: verificação, recuperação, situação/pronto, lembretes, perecíveis e alertas internos. Provedor e domínio de envio serão selecionados antes da implantação.
- **Autenticação e dados**: Supabase Auth e Supabase Database são a plataforma aprovada. Supabase Database é o único banco de dados da aplicação e a única camada permitida para qualquer leitura ou gravação persistente; não se deve conectar a aplicação diretamente a outro banco, provedor ou driver. Auth atende confirmação por e-mail e celular, recuperação por e-mail e MFA administrativo por SMS; Database é a fonte oficial para perfis e persistência. SMS exige configurar um provedor no projeto Supabase hospedado.
- **PDF/Excel**: geração de exportações no servidor respeitando autorização de administrador.

## 10. Arquitetura recomendada e decisões

Arquitetura aprovada para dados e identidade: **Supabase Auth**, **Supabase Database** e **Supabase Storage**. Supabase Database (PostgreSQL gerenciado pelo Supabase) é o único banco de dados autorizado para todas as funcionalidades; toda persistência deve ocorrer por meio do client Supabase e suas APIs. Não utilizar Firebase Database, conexão PostgreSQL direta, outro banco gerenciado, ORM ou driver de banco alternativo. O ADR-007 é a decisão vigente e substitui as escolhas de provedor registradas nos ADRs anteriores. Hospedagem da aplicação, região, plano de disponibilidade, backups, SMTP e provedor SMS ainda serão definidos antes da produção. O ADR-007 registra a substituição de Firebase, PostgreSQL direto e Cloud Storage. Google Cloud Translation e demais integrações de negócio permanecem separadas quando aplicáveis.

O protótipo/teste deverá usar projeto e credenciais isolados, dados sintéticos, limites de orçamento e serviços gratuitos/emuladores quando possível. O envio real de SMS, domínio, serviço de e-mail, uma eventual futura ativação do Google Translation e alta disponibilidade de produção podem gerar custos. A integração de tradução automática não está autorizada nem ativa. Vercel Hobby não é recomendação para a loja porque seus termos limitam o uso não comercial; preços/termos foram consultados em [Vercel Hobby](https://vercel.com/docs/plans/hobby). Não armazenar documentos reais ou dados de clientes no ambiente de teste.

## 11. Pendências explícitas

1. **PENDENTE PARA IMPLANTAÇÃO:** valor real de WHATSAPP_STORE_NUMBER, endereço, domínio, logo/arquivos da marca e contatos de suporte. Implementação usa configuração e valores sintéticos em testes; número ilustrativo não é oficial.
2. Regra de cupons: acumulação, mínimo de compra, escopo por produto/categoria, limite por cliente, arredondamento e reutilização após cancelamento.
3. Significado da janela de uma semana para não perecíveis (7 dias corridos ou outra contagem) e ação do sistema após prazo.
4. **PENDENTE PARA IMPLANTAÇÃO/PAGAMENTO:** texto legal final de cancelamento/reembolso não definido. Não calcular/processar reembolso; texto fornecido pela loja será ORDER_CANCELLATION_POLICY_TEXT e deve estar disponível antes da confirmação de pagamento. Testes usam somente texto sintético.
5. **RESOLVIDO (2026-10-28, TASK-006):** employee = operador e admin = gerente para transições operacionais autorizadas além da conferência; confirmação de pagamento/cancelamento permanecem exclusivas de admin/gerente.
6. Frequência de backup/RPO final, SLO mensal, retenção de dados, retenção de anexos e requisitos legais de privacidade.
7. Ajuste das categorias de ocasião/tipo e conteúdo botânico de toxicidade/cuidados; conteúdo deve ser fornecido pela loja e não inventado.
8. Alerta público de última unidade definido em RN-002; alerta de equipe no limite 7 será deduplicado conforme RN-016.

## 12. Matriz de rastreabilidade resumida

| Cadeia | Destino de implementação |
|---|---|
| RF-001..003 → RN-001/002/018 → RNF-002/007 → UC-01 → Product/Translation/Image → API catálogo → TASK-004/012 |
| RF-004..005 → RN-003/004 → RNF-005/006 → UC-02 → Customer/Employee → API identidade/perfil → TASK-003 |
| RF-006..008/015 → RN-005..007 → RNF-001/010 → UC-03 → Cart/Coupon/Order/Reservation → API carrinho/checkout → TASK-005/008 |
| RF-009..014/020 → RN-008..014 → RNF-009/010 → UC-04/05 → Order/Inspection/Pickup/Cancellation/Ledger → API pedidos → TASK-006/009 |
| RF-012/017 → RN-011/012/016 → RNF-008/009 → UC-06/07 → Notification/Ledger → workers de notificação → TASK-007/010 |
| RF-018 → RN-017 → RNF-006 → UC-08 → Order/Ledger/Favorite/CartEvent → API relatórios/exportação → TASK-011 |
| Todo o produto → RNF-001..011 → todos UCs/entidades → arquitetura/operação → TASK-001/002/013/014 |

## 13. Critérios globais de aceite

- Todos RFs têm critérios verificáveis e UCs; regras sem decisão são identificadas como pendentes, não codificadas como fatos.
- Fluxos de concorrência de reserva e expiração não geram saldo negativo nem liberam duas vezes.
- Permissões de funcionário/administrador e acesso aos dados pessoais são testados por autorização negativa.
- Alertas e jobs podem ser repetidos sem efeitos duplicados.
- O desenho de capacidade é validado com 1.000 sessões concorrentes simuladas em cenário definido; imagens principais testadas em ≤2 s nas condições acordadas.
- Backups e restauração são demonstrados; tarefas de implementação não declaram qualidade sem evidências registradas.

## 14. Desenvolvimento, container e ambientes

### Execução local e validação do ambiente de teste

O esqueleto não conecta a serviços externos nem usa dados de clientes. Para construir e executar a aplicação em um container local:

```sh
docker build --pull --tag flor-da-meia-noite:local .
docker run --rm --name flor-da-meia-noite-test -p 127.0.0.1:3000:3000 flor-da-meia-noite:local
```

Em outro terminal, verifique a resposta da página inicial:

```sh
curl --fail http://localhost:3000/
```

No PowerShell, a verificação equivalente é `Invoke-WebRequest -Uri http://localhost:3000/`. O container é removido ao encerrar porque usa `--rm`. Para parar, use `Ctrl+C` no terminal que o iniciou. Não instale dependências no host para executar a imagem; a construção instala o lockfile dentro do container.

O ambiente local usa Supabase via Docker, dados sintéticos e configuração de teste; não usa endpoints de produção ou dados pessoais. Configure em .env.local (não versione esse arquivo). No PowerShell, mantenha o estado da CLI dentro da pasta local do projeto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anon-local-informada-pelo-supabase-cli>
SUPABASE_SERVICE_ROLE_KEY=<chave-service-role-local-informada-pelo-supabase-cli>
WHATSAPP_STORE_NUMBER=<numero-sintetico-de-teste-em-E.164>
ORDER_CANCELLATION_POLICY_TEXT=<texto-sintetico-de-teste>
```

SUPABASE_SERVICE_ROLE_KEY é exclusivamente de servidor e nunca deve usar o prefixo NEXT_PUBLIC_. WHATSAPP_STORE_NUMBER e ORDER_CANCELLATION_POLICY_TEXT são configurações sem segredo. Defina $env:SUPABASE_HOME = "$PWD\.supabase-home" e $env:npm_config_cache = "$PWD\.npm-cache"; use npm run supabase:start e npm run supabase:status para iniciar a stack local e consultar os valores locais. E-mails locais são capturados pelo Mailpit; a stack usa o OTP sintético documentado e não envia SMS real.

### Database local e migrations

Supabase Database é acessado pelo client Supabase; a aplicação não abre conexão direta. Migrations SQL ficam em supabase/migrations e são aplicadas à stack local com npm run db:reset. Configure SUPABASE_HOME e npm_config_cache no PowerShell conforme acima. Não conecte a CLI a projeto remoto sem autorização explícita. Consulte [ADR-007](docs/adr/ADR-007-supabase-como-plataforma-de-dados.md).

### Autenticação e dados de identidade

O cadastro usa Supabase Auth. A conta só é concluída após confirmação de e-mail e celular; nome, CPF validado localmente, e-mail e telefone E.164 ficam no perfil Supabase, enquanto a senha permanece no Auth. CPF não pode ser alterado pelo cliente. Roles ficam em app_metadata, conferidas no servidor; contratos ficam em bucket privado do Supabase Storage. A interface de autenticação está em /auth e o perfil em /profile.

Recuperação de senha usa resetPasswordForEmail. MFA do administrador usa challenge/verify por telefone e as ações sensíveis verificam AAL2 e a janela de inatividade no servidor. Em produção, configure SMTP e provedor SMS no Supabase; não versione chaves reais. A configuração e a matriz de acesso estão em [docs/security/TASK-003-autenticacao-e-autorizacao.md](docs/security/TASK-003-autenticacao-e-autorizacao.md).

### CI

O workflow `.github/workflows/ci.yml` é executado em pushes para `master` e branches `task/**`, além de pull requests para `master`. Ele instala dependências com `npm ci`, executa lint, verificação de tipos e build, e constrói a imagem OCI. O workflow não publica imagens, não faz deploy e não usa secrets. A execução real no GitHub depende de publicar a branch ou abrir um pull request; confira a quota disponível do repositório antes de qualquer uso que possa gerar cobrança.

### Deploy de teste e rollback

A validação gratuita desta etapa é o container local descrito acima. O ADR-001 aponta o Google Cloud Run como direção de arquitetura, mas nenhum projeto, registry, serviço, domínio, secret ou recurso de nuvem é criado por esta tarefa. Um deploy de teste no Cloud Run depende de um projeto de teste isolado, região e configuração aprovadas, imagem identificada por SHA e autorização específica de infraestrutura e billing; não use recursos ou dados de produção.

Quando esse deploy for autorizado, siga esta sequência: (1) confirmar quota e orçamento; (2) criar/selecionar um projeto Google Cloud exclusivo de teste e um repositório de imagens separado; (3) construir a imagem a partir do lockfile e publicá-la com tag do commit e digest registrados; (4) criar um serviço Cloud Run de teste na região aprovada, com acesso restrito e somente configuração/segredos de teste; (5) verificar a rota inicial, logs e revisão implantada. Não reutilize projeto, registry, base de dados, domínio ou credenciais de produção. Os identificadores do projeto, região, registry e política de acesso permanecem parâmetros a serem fornecidos/aprovados antes do deploy.

Para rollback local, pare o container atual e execute a tag da última imagem local conhecida como válida. Para um futuro serviço Cloud Run, retorne o tráfego à última revisão saudável. Não há deploy de nuvem nesta etapa; portanto, nenhum rollback de serviço remoto foi executado.
