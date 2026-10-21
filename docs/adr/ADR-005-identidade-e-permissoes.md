# ADR-005 — Identidade, funções e verificação do administrador

- **Status:** PROPOSTO; selecionar provedor/configuração na arquitetura detalhada.
- **Data:** 2026-09-23
- **Rastreabilidade:** RF-004/016; RN-003/004/015; RNF-005/006; TASK-003, TASK-009.

## Decisão de produto

Clientes usam senha, confirmação de e-mail e celular e recuperação de senha por e-mail. Funcionários têm contas individuais sem MFA; somente administrador principal pode criá-los, editá-los ou bloqueá-los. Administrador precisa de OTP por e-mail ou SMS ao executar primeira ação sensível na sessão; depois de uma hora inativo, nova verificação é necessária. Ações sensíveis: criar/editar/excluir contas de funcionários, aprovar pedidos e confirmar pagamentos. Dados de cliente são visíveis à equipe para atendimento; dados/contratos de equipe apenas ao administrador.

## Implementação a decidir

Avaliar Identity Platform ou serviço equivalente com políticas de função e OTP por e-mail/SMS; garantir que requisito de reautenticação por ação/sessão seja compatível com o provedor e não fique apenas no frontend. OTP de e-mail/SMS é uma política de produto solicitada; proteção contra abuso, limitação de taxa, trilha de auditoria e sessão revogável são obrigatórias. Registros de funcionários e anexos devem ter acesso privado com autorização de backend.

## Ponto de validação

Identity Platform documentação consultada indica suporte a MFA SMS; fluxo de OTP administrativo por e-mail e reautenticação baseada em inatividade pode exigir implementação complementar. Verificar encaixe antes da tarefa de identidade. [Firebase MFA SMS](https://firebase.google.com/docs/auth/web/multi-factor), [Identity Platform MFA](https://docs.cloud.google.com/identity-platform/docs/work-with-mfa-users), [preços](https://cloud.google.com/identity-platform/pricing).
