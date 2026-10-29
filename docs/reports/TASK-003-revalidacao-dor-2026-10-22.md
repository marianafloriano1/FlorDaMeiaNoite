# TASK-003 — Revalidação do DoR

**Data:** 2026-10-22  
**Solicitação:** inicializar a TASK-003 e definir o status como READY.  
**Resultado:** DoR aprovado; TASK-003 está `READY`.  
**Escopo:** revisão documental; sem início da tarefa, branch, implementação, instalação, serviço externo ou custo.

## Fontes verificadas

Foram lidos `AGENTS.md`, `README.md`, a seção TASK-003 de `TASKS.md`, `docs/adr/ADR-005-identidade-e-permissoes.md` e o estado final de TASK-002 em `TASKS.md` e `docs/reports/TASK-002-etapa-007-conclusao.md`.

## Checklist de prontidão

| Condição do DoR | Resultado | Evidência |
|---|---|---|
| Dependências concluídas | PASS | TASK-002 está `DONE`, com GATE-001 a GATE-007 concluídos. |
| IDs e rastreabilidade | PASS | TASK-003 mapeia RF-004/005/016, RN-003/004/015, RNF-005/006, UC-02/07 e ADR-005; IDs constam do README/ADR. |
| Critérios testáveis | PASS | CPF, provedor e canal OTP estão decididos; a TASK especifica critérios verificáveis. |
| Mudanças permitidas e proibidas | PASS | Escopo de identidade, verificação, RBAC, sessões, OTP e anexos está delimitado em `TASKS.md`. |
| Ambiente e dados de teste | PASS | TASK-002 validou Docker e DB sintético; Auth Emulator suporta email/senha, telefone/SMS e SMS MFA em projeto demo, sem mensagens reais. |
| Decisões externas essenciais | PASS | A solicitante escolheu Firebase Authentication; configuração documentada: Identity Platform com SMS MFA como OTP administrativo. |

## Decisões já resolvidas

O requisito de produto para autenticação administrativa está registrado em README e ADR-005: somente o administrador usa código de segundo fator; o código é solicitado na primeira ação sensível da sessão e uma nova verificação é exigida após mais de uma hora de inatividade. Funcionários não usam MFA. Esta política de sessão não precisa ser perguntada novamente.

Após a pergunta de esclarecimento, a solicitante aprovou validação local do CPF: normalizar para 11 dígitos, rejeitar sequências de dígitos repetidos e validar os dígitos verificadores; sem consulta externa ou alegação de nacionalidade/titularidade. A decisão foi registrada em README e ADR-005. CPF não é mais bloqueio do DoR.

## Decisões de implementação registradas

Não resta bloqueio de DoR. O requisito do administrador permite OTP por e-mail **ou** SMS; a decisão atual utiliza SMS MFA. Clientes terão e-mail e celular verificados. Firebase Auth padrão precisa do upgrade para Identity Platform para habilitar MFA SMS; a regra da primeira ação sensível e após >1h inativo deve ser imposta pelo backend.

## Pesquisa e recomendação de provedores (2026-10-22)

Pesquisa feita a pedido da solicitante; recomendação não ativa serviço nem autoriza consumo faturável.

| Opção | Compatibilidade / custos publicados | Avaliação para este projeto |
|---|---|---|
| **Firebase Authentication + Identity Platform** | MFA SMS e verificação telefônica documentadas; preços Identity Platform variam por MAU/SMS. Auth Emulator cobre testes locais de SMS MFA. | **Escolhida pela solicitante.** Compatível com a arquitetura Google Cloud. Política de step-up por ação/inatividade aplicada pelo backend. |
| **Amazon Cognito + SES/SMS AWS** | Alternativa pesquisada com MFA por e-mail/SMS; adiciona identidade AWS e serviços separados. | Não escolhida. |
| **Twilio Verify + provedor de identidade separado** | Tarifa por verificação concluída mais preço do canal, variável por país. | Não escolhida; adiciona integração e não resolve identidade/RBAC/sessões sozinho. |

Fontes oficiais: [Cognito preços](https://aws.amazon.com/cognito/pricing/), [Cognito MFA e-mail/SMS](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-sms-email-message.html), [Amazon SES preços](https://aws.amazon.com/pt/ses/pricing/), [AWS SNS SMS preços](https://aws.amazon.com/sns/sms-pricing/), [Identity Platform preços](https://cloud.google.com/identity-platform/pricing), [Identity Platform MFA](https://docs.cloud.google.com/identity-platform/docs/web/mfa), [Twilio Verify preços](https://www.twilio.com/en-us/verify/pricing).

O upgrade pago, o projeto real, billing e envios reais deverão ser avaliados/autorizados antes de uso. A escolha documental não autoriza ativação ou gastos. Fontes Firebase oficiais: [MFA SMS](https://firebase.google.com/docs/auth/web/multi-factor), [telefone/SMS](https://firebase.google.com/docs/auth/web/phone-auth), [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [preços](https://cloud.google.com/identity-platform/pricing). Alternativas pesquisadas: [Cognito](https://aws.amazon.com/cognito/pricing/), [Amazon SES](https://aws.amazon.com/pt/ses/pricing/), [Twilio Verify](https://www.twilio.com/en-us/verify/pricing).

## Operações desta revalidação

| Operação | Resultado |
|---|---|
| Conferência de `TASKS.md`, README, ADR-005 e estado final da TASK-002 | PASS; dependência concluída; pendências confirmadas. |
| `git status --short --branch` | PASS; branch atual ainda é `task/TASK-002-persistencia-postgresql`; nenhuma branch TASK-003 foi criada. |
| Registrar CPF local aprovado em README/ADR-005 e atualizar pendência em TASKS | PASS; CPF deixou de ser bloqueio. |
| Registrar Firebase Auth/Identity Platform e validar Auth Emulator como meio local | PASS; compatibilidade documentada em fontes oficiais. |
| Transição de TASK-003 para READY | PASS; aprovada documentalmente, sem branch/implementação. |
| Projeto real, upgrade pago, billing e envio real de OTP/e-mail/SMS | NOT RUN; não necessários nem autorizados nesta etapa. |

## Estado e próxima ação

TASK-003 está `READY`; o DoR foi aprovado e registrado em `TASKS.md` e ADR-005. A tarefa ainda não foi iniciada: não há branch nem implementação, projeto Firebase real, upgrade ou billing. Decisão: Firebase Authentication upgraded to Identity Platform, clientes com e-mail e celular verificados e OTP administrativo por SMS; CPF local conforme aprovado anteriormente.
