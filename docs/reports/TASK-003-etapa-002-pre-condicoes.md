# TASK-003 — Etapa 002 — Pré-condições e decisões

**Data:** 2026-10-22
**Resultado:** GATE-002 aprovado; TASK-003 permanece `READY` (esta etapa não iniciou a implementação).
**Escopo:** validação documental de DoR, dependência, decisões e meio de teste; nenhuma conta, projeto real, serviço pago, mensagem, branch, commit ou deploy criado.

## Fontes conferidas

`AGENTS.md`; `README.md`; `TASKS.md`; ADR-001, ADR-002 e ADR-005; `docs/architecture/overview.md`; diagramas `architecture.mmd` e `context.mmd`; relatório GATE-001 `docs/reports/TASK-003-etapa-001-recontextualizacao.md`; conclusão TASK-002 `docs/reports/TASK-002-etapa-007-conclusao.md`; relatório de revalidação DoR `docs/reports/TASK-003-revalidacao-dor-2026-10-22.md`; `package.json`; arquivos `src/` e `tests/`; e o prompt desta etapa.

## Checklist DoR

| Pré-condição | Resultado | Evidência |
|---|---|---|
| Autorização e etapa anterior | PASS | Solicitante pediu a Etapa 002; GATE-001 aprovado no relatório da Etapa 001. Esta autorização não inclui implementar a TASK ou avançar para a etapa seguinte. |
| Dependência | PASS | TASK-002 está `DONE`; conclusão documenta GATE-001..007 e validações da base PostgreSQL. |
| Status e escopo | PASS | TASK-003 está `READY`; DEPENDS_ON e Allowed/Incidental/Forbidden Changes, aceite, validação e DoD estão registrados em TASKS.md. Não há mudança de estado para `IN_PROGRESS`. |
| IDs e rastreabilidade | PASS | RF-004/005/016, RN-003/004/015, RNF-005/006, UC-02/07 e ADR-005 estão presentes em README/ADR e vinculados à TASK-003. |
| Regras necessárias à tarefa | PASS | Cadastro de cliente, confirmação de e-mail/celular, recuperação por e-mail, CPF local, papéis, acesso a dados/anexos, ações sensíveis e janela de OTP estão definidos em README/ADR-005/TASKS. |
| Decisão de provedor | PASS | A solicitante escolheu Firebase Authentication; para SMS MFA administrativo, ADR-005 fixa Firebase Authentication upgraded to Identity Platform. MFA administrativo por SMS atende ao requisito que permite e-mail **ou** SMS. |
| Ambiente e validação | PASS | TASK-002 validou Docker e banco sintético. Node, npm, Java, Docker CLI e `node_modules` estão presentes. Firebase Auth Emulator documenta email/senha, verificação de telefone e SMS MFA em projeto demo, sem tráfego real; fontes no ADR-005. O emulator ainda não foi instalado/iniciado nesta etapa. |
| Dados/segredos | PASS | Nenhum cadastro, CPF, telefone ou contrato real é necessário. Projeto demo/emulator permite testes sintéticos sem credenciais de produção. Não há necessidade de serviço pago nesta fase. |
| Decisões externas e privacidade | PASS | Provedor/canal de autenticação escolhido. Projeto real, upgrade com billing e envio real de mensagens não são necessários para GATE-002 e continuam sem autorização de ativação. |

## Decisões e limites registrados

- **Cliente:** autenticação email/senha; e-mail verificado; telefone verificado via SMS; reset de senha por e-mail; CPF normalizado/validado localmente conforme RN-003.
- **Administrador:** MFA SMS via Identity Platform. Backend exigirá prova MFA recente na primeira ação sensível da sessão e novamente após mais de 1h de inatividade. A validação/controle não poderá existir somente no frontend.
- **Funcionários:** contas individuais sem MFA, criadas/editadas/bloqueadas pelo administrador; funcionários não podem gerir contas, cupons, relatórios nem confirmar pagamentos.
- **Autorização:** papel e identidade devem ser verificados em cada operação de backend. Dados de funcionários/anexos são privados; acesso ao contrato somente do administrador.
- **Ambiente:** testes com Authentication Emulator e dados inteiramente sintéticos; nenhum envio para operadoras ou e-mail real. Em produção, Identity Platform/SMS, limites, orçamento, consentimento e configuração devem ser aprovados antes de ativar cobrança.

## Divergências documentais corrigidas

Na Etapa 001 foram observados textos antigos dizendo que provedor/MFA ainda aguardava seleção. A escolha explícita da solicitante e a configuração aprovada no ADR-005 resolvem essa divergência. Para manter a cadeia de requisitos consistente, esta etapa atualizou somente documentação técnica diretamente afetada: README, overview e diagramas. Permanecem pendentes para contexto operacional posterior a região, projeto/billing real, limites de custo e provedor de e-mail transacional para notificações de negócio; não bloqueiam autenticação local por emulator.

## Operações e validações

| Operação | Resultado |
|---|---|
| Revisão da autorização, DoR, dependência e escopo | PASS; checklist evidenciado neste relatório. |
| Revisão de fontes e rastreabilidade | PASS; divergências antigas sincronizadas com ADR-005. |
| Atualização documental | PASS; README, overview e diagramas agora registram Firebase Authentication/Identity Platform e separam autenticação de notificações de negócio. |
| Inspeção de código/dependências existentes | PASS; nenhum fluxo Firebase foi implementado; Firebase SDK/CLI não foi adicionado. |
| `git diff --check` | PASS, código 0. |
| Build, testes de aplicação, Auth Emulator, SMS/e-mail real, criação de projeto, upgrade pago, billing, branch nova | NOT RUN; não fazem parte da validação documental deste gate, ou exigem etapas/autorização próprias. |

## Matriz acumulada dos gates

| GATE | Etapa | Status | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização e histórico | CONCLUÍDO | `docs/reports/TASK-003-etapa-001-recontextualizacao.md`. |
| GATE-002 | Pré-condições e decisões | CONCLUÍDO | Este relatório; DoR, decisões, ambiente de teste e escopo confirmados. |
| GATE-003 | Planejamento | PENDENTE | Etapa própria não executada. |
| GATE-004 | Implementação | PENDENTE | Etapa própria não executada. |
| GATE-005 | Revisão | PENDENTE | Etapa própria não executada. |
| GATE-006 | Testes manuais | PENDENTE | Etapa própria não executada. |
| GATE-007 | Conclusão | PENDENTE | Etapa própria não executada. |

**GATES CONCLUÍDOS:** 2/7
**GATES PENDENTES:** 5/7
**GATES BLOQUEADOS:** 0

## Resultado

**GATE-002 aprovado.** DoR confirmado sem requisito essencial pendente para planejar TASK-003. O Authentication Emulator é meio adequado para validação sintética sem serviço real. Nenhuma implementação foi iniciada; TASK-003 continua `READY`. GATE-003 (planejamento) está habilitado, mas não foi executado por esta autorização.
