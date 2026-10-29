# ADR-005 — Identidade, funções e verificação do administrador

- **Status:** SUBSTITUÍDO pelo ADR-007 em 2026-10-23; texto mantido como histórico das regras de produto e da decisão anterior de provedor.
- **Data:** 2026-09-23
- **Rastreabilidade:** RF-004/016; RN-003/004/015; RNF-005/006; TASK-003, TASK-009.

## Decisão de produto

Clientes usam senha, confirmação de e-mail e celular e recuperação de senha por e-mail. Funcionários têm contas individuais sem MFA; somente administrador principal pode criá-los, editá-los ou bloqueá-los. Administrador precisa de OTP por e-mail ou SMS ao executar primeira ação sensível na sessão; depois de uma hora inativo, nova verificação é necessária. Ações sensíveis: criar/editar/excluir contas de funcionários, aprovar pedidos e confirmar pagamentos. Dados de cliente são visíveis à equipe para atendimento; dados/contratos de equipe apenas ao administrador.

## Decisão aprovada para TASK-003 — CPF

Em 2026-10-22, a solicitante aprovou validação local: normalizar para 11 dígitos, rejeitar sequências de dígitos repetidos e validar os dígitos verificadores. Não haverá consulta externa nem alegação de verificação de nacionalidade ou titularidade. Essa decisão resolve a pendência técnica de CPF do DoR.

## Decisão aprovada para TASK-003 — Provedor de identidade

Em 2026-10-22, a solicitante escolheu Firebase Authentication para autenticação e confirmação dos clientes e OTP administrativo por e-mail ou SMS. Para cumprir MFA administrativo com recursos documentados, a configuração escolhida é **Firebase Authentication upgraded to Identity Platform**, usando SMS MFA como canal administrativo. Clientes terão e-mail verificado e telefone verificado por SMS. O Auth Emulator será usado para testes sintéticos locais, sem envio real de mensagens.

O OTP administrativo será solicitado na primeira ação sensível da sessão e novamente após mais de uma hora de inatividade. A aplicação/backend deverá exigir prova recente de autenticação multifator para essas operações; proteger apenas o botão no frontend não atende ao requisito. A alternativa por SMS atende à regra de produto “e-mail ou SMS”; OTP administrativo por e-mail não faz parte da decisão atual. Projeto real, upgrade com cobrança, configuração de billing e envio real de SMS/e-mail não estão autorizados por esta decisão documental.

## Implementação a decidir

Implementar integração Firebase Auth/Identity Platform com autorização de backend para Cliente, Funcionário e Administrador; validação de token e prova de MFA recente nas ações sensíveis. Preservar proteção contra abuso, limitação de taxa, trilha de auditoria e sessão revogável. Dados de funcionários e anexos permanecem privados com autorização de backend.

## Contrato técnico implementado na TASK-003

- Firebase UID associa identidade externa e perfil PostgreSQL; role é custom claim provisionado somente no backend e validado junto ao estado atual da conta. O corpo do cliente nunca escolhe papel.
- O backend usa cookie de sessão `HttpOnly`, `SameSite=Strict`, `Secure` em produção e validade limitada. Escritas de sessão validam a origem. Logout limpa o cookie e revoga o registro de sessão administrativa.
- Sessão de administrador registra somente hash do cookie, UID e timestamps. Step-up requer MFA SMS recente, verificado no token Firebase; atividades sensíveis deixam de passar após mais de uma hora de inatividade até nova prova.
- CPF usa validação local de onze dígitos e verificadores; não implica titularidade/nacionalidade. Perfil do cliente não aceita alteração de CPF.
- Funcionário congelado é desabilitado e tem tokens revogados; exclusão manual só ocorre depois dos três meses. Contrato fica em bucket privado e acessível somente por rota autenticada de administrador.
- Auth Emulator usa `demo-flor-da-meia-noite`; configuração real, Identity Platform com billing, e-mail/SMS reais e bucket real não foram ativados.

Detalhes, limitações e matriz de acesso: `docs/security/TASK-003-autenticacao-e-autorizacao.md`.

## Ponto de validação

Firebase Authentication padrão não basta para MFA: é necessário upgrade para Identity Platform. A documentação consultada confirma MFA SMS e verificação por telefone. A reautenticação da ação sensível e a janela de inatividade são políticas da aplicação/backend. O Auth Emulator suporta teste local de SMS MFA sem envio a operadoras. Fontes: [MFA SMS](https://firebase.google.com/docs/auth/web/multi-factor), [verificação de telefone](https://firebase.google.com/docs/auth/web/phone-auth), [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [preços Identity Platform](https://cloud.google.com/identity-platform/pricing).
