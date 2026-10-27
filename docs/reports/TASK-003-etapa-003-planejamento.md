# TASK-003 — Etapa 003 — Planejamento

**Data:** 2026-10-22  
**Resultado inicial:** Etapa documental concluída com GATE-003 bloqueado; **revalidação após decisões da solicitante: GATE-003 aprovado**.  
**TASK-003:** permanece `READY`; nenhuma implementação foi iniciada nem autorizada por esta etapa.  
**Escopo desta etapa:** planejamento e registro documental; sem branch, instalação, alteração de código, emulador, serviço pago, credenciais, conta real ou deploy.

## 1. Fontes e evidências

Foram considerados `AGENTS.md`, `README.md`, `TASKS.md`, ADR-001, ADR-002 e ADR-005, `docs/architecture/overview.md`, diagramas `architecture.mmd` e `context.mmd`, relatórios das Etapas 001 e 002 e da revalidação DoR, o prompt desta etapa, `package.json`, `src/`, `tests/` e o estado Git observado.

O prompt da Etapa 003 contém um snapshot de backlog antigo que marca TASK-003 como `BLOCKED` e apresenta provedor/CPF como pendências. Esse snapshot diverge do estado atual: `TASKS.md` e o relatório GATE-002 marcam TASK-003 `READY`, e a decisão Firebase/Identity Platform e a validação CPF foram registradas no ADR-005. Para esta execução, prevalecem as fontes atuais e os registros posteriores; o snapshot foi tratado como histórico, não como decisão vigente.

Estado relevante do repositório: branch atual `task/TASK-002-persistencia-postgresql`, sem branch TASK-003. Existem alterações locais preexistentes da TASK-002 em arquivos rastreados e não rastreados. Elas foram preservadas e não são atribuídas a esta etapa. A inspeção encontrou somente a base Next.js/PostgreSQL e teste de banco; não encontrou Firebase SDK, rotas/serviços/modelos de autenticação ou testes de autorização. Não foi feita validação de implementação da TASK-003.

## 2. Decisões aprovadas e limites do plano

- Identidade: Firebase Authentication upgraded to Identity Platform, conforme decisão explícita registrada em ADR-005. MFA administrativa por SMS; clientes confirmam e-mail e celular. Auth Emulator com dados sintéticos é o alvo dos testes locais. Nenhum projeto real, billing, SMS real ou configuração de produção está autorizado nesta etapa.
- CPF: validação local aprovada — normalizar para 11 dígitos, rejeitar sequência repetida e validar dígitos verificadores, sem consulta externa nem afirmação de nacionalidade/titularidade.
- Autorização: Cliente, Funcionário e Administrador devem ser autorizados no servidor. Não confiar em papel enviado pelo navegador. Ações administrativas sensíveis exigem prova recente de MFA na primeira ação da sessão e após mais de uma hora inativo, conforme ADR-005.
- Conta/equipe: funcionários têm contas individuais sem MFA. Dados e contratos dos funcionários são restritos ao administrador. Dados dos clientes são visíveis à equipe para atendimento, dentro do escopo já documentado.
- Anexos de contrato: manter privados, com verificação de permissão no servidor; arquitetura de armazenamento prevista em ADR-001. Nenhum contrato real em desenvolvimento/testes.
- Provedores para e-mail transacional de negócio, projeto/billing de produção, limites de custo, retenção de anexos e configuração de produção não serão escolhidos ou ativados neste plano.
- **Decisões adicionais fornecidas pela solicitante após a primeira avaliação do GATE-003:** cliente poderá editar somente nome, telefone, e-mail e senha, sujeitos às regras de validação integradas; CPF não poderá ser alterado pelo cliente. Contas de funcionários desligados ficarão congeladas por três meses e, após esse prazo, o administrador poderá excluí-las manualmente. Estas decisões resolvem as lacunas de escopo de perfil e ciclo de vida de funcionários identificadas na primeira avaliação.

## 3. Matriz critério → mudanças planejadas → evidência

Os caminhos abaixo são **propostos**, sujeitos às duas decisões de produto da seção 8 e à revisão do plano antes da implementação. Não foram criados nesta etapa.

| Critério de aceite | Mudanças candidatas | Validação/evidência planejada |
|---|---|---|
| Cadastro/login de cliente e verificação de e-mail e telefone antes do checkout | Adaptadores Firebase cliente/servidor; rotas de cadastro e sessão; tela mínima de entrada/verificação; perfil local associado ao UID | Auth Emulator: cadastro sintético, tokens com e-mail/telefone verificados; chamadas de checkout futuras rejeitadas quando qualquer verificação faltar |
| Recuperação de senha por e-mail | Fluxo de recuperação no adaptador/tela de autenticação | Emulator: solicitar recuperação; verificar que mensagens/códigos são apenas sintéticos e que resposta não revela existência de conta |
| CPF local conforme decisão aprovada | Serviço puro `src/lib/auth/cpf.ts`; validação no servidor no cadastro | Testes unitários com CPFs sintéticos válidos/ inválidos, repetidos, máscara e normalização; não registrar CPF completo |
| Papéis Cliente/Funcionário/Administrador e autorização negativa | Verificação de ID token no backend, fonte de papel/estado de conta e guardas de autorização; custom claims se compatível com estratégia de revogação | Testes de rota: token inválido, papel ausente, papel insuficiente, conta bloqueada e tentativa de acessar outro usuário; nunca confiar no body/header do cliente para papel |
| Apenas administrador cria/edita/bloqueia contas de funcionários | Serviço/rotas e telas administrativas mínimas para ciclo de vida da equipe | Matriz de autorização admin/staff/customer; tentativa de funcionário alterar outro perfil, papel ou a própria conta deve ser negada e auditável |
| Dados/contratos de equipe restritos; perfil cliente acessível segundo regras | Rotas de perfil e funcionário; serviço de armazenamento privado; validação de acesso ao objeto no backend | Testes anônimos e não admin recebem negação; admin autorizado; funcionário não acessa contrato; upload/download não público |
| MFA admin e inatividade >1h | Middleware/serviço server-side para verificar token, fator SMS e recência; política de sessão e relógio injetável nos testes | Emulator/integração: negar antes de MFA, aceitar ação sensível após MFA, exigir renovação depois de >1h; testar relógio no limite; não alegar prova até execução |
| Rate limit, auditoria e proteção de dados | Política de tentativas, eventos de auditoria sem segredos/CPF integral; revisão de logging | Testes de limites, redaction e ausência de senha/token/CPF integral nos logs e erros |

## 4. Escopo de mudanças para uma futura Etapa 004

### Permitido pelo escopo da TASK-003 (condicionado à solução das pendências)

- Dependências estritamente necessárias e fixadas para Firebase client/Admin e execução do Auth Emulator, atualizando manifest/lockfile.
- Integração de autenticação, verificação de e-mail/celular, recuperação de senha, validação local de CPF, papéis e autorização backend, sessões e OTP administrativo.
- Persistência mínima dos perfis/estado de equipe e metadados necessários para associar identidade a cadastro, sem deslocar para esta tarefa as entidades funcionais de pedidos/catálogo.
- Rotas/UI mínimas para cadastro, login, recuperação, perfil, ações administrativas de funcionários e anexos privados.
- Configuração local/sintética do emulador e testes automatizados/manuais documentados. Somente dados fictícios.
- Documentação diretamente necessária: contrato de endpoints, modelo de ameaça/auth, variáveis de ambiente sem valores secretos e runbook local.

### Fora do escopo / proibido

- Não criar nesta etapa implementação, rotas, modelo, migração, UI, dependência, container/configuração de emulador, teste, projeto Firebase ou branch.
- Não ativar projeto Firebase real, Identity Platform faturável, billing, serviço de SMS/e-mail real, produção, deploy ou credenciais.
- Não habilitar checkout para cliente sem ambos os canais verificados; não implementar pagamento, pedidos, cupons ou relatórios.
- Não permitir que funcionário administre usuários, cupons, relatórios ou confirme pagamento; não confiar em role do navegador; não aplicar MFA a todos os usuários.
- Não expor CPF completo, senha, token, contrato/anexo nem colocar dados sensíveis em URL, logs ou mensagens de erro.
- Não incluir dados/documentos reais em testes nem adotar consulta externa de CPF ou alegação de nacionalidade/titularidade.
- Não modificar os arquivos/artefatos preexistentes da TASK-002 como parte de TASK-003, nem reverter mudanças do working tree.

## 5. Interfaces, entidades e contratos a especificar

Antes de implementação, definir e documentar contratos sem assumir detalhes ausentes:

- **Identidade externa:** Firebase UID como identificador de autenticação; validação do ID token no servidor; associação com perfil interno e estado ativo/bloqueado.
- **Perfil do cliente:** nome, CPF e telefone/email associados a identidade verificada; campos que podem ser alterados e revalidação necessária ainda dependem de decisão (seção 8).
- **Perfil de funcionário:** nome completo, idade, telefone, e-mail, CPF, data de contratação e referência a contrato privado, conforme requisito existente; role e estado definidos no servidor.
- **Operações candidatas:** registrar/verificar conta, iniciar sessão, recuperar senha, obter/atualizar perfil, listar/criar/editar/bloquear equipe, anexar/obter contrato e autorizar ação sensível. Métodos, payloads, erros e idempotência deverão ser formalizados na implementação sem exceder as decisões aprovadas.
- **Autorização:** identidade verificada + role/estado resolvidos pelo servidor; propriedade para recursos do cliente; privilégio mínimo para dados da equipe; trilha de auditoria para alterações e ações sensíveis.
- **Sessão step-up:** sinal verificável de MFA recente; relógio/fuso e regra exata do limite de 1h precisam ser cobertos por teste, sem aceitar um indicador controlado pelo cliente.

## 6. Arquivos/componentes candidatos

Lista planejada (nenhum deles editado nesta etapa):

- `package.json`, `package-lock.json` — dependências/scripts de Auth Emulator e Firebase, somente após revisão de versão/licença.
- `firebase.json` e eventualmente `firestore`/Storage emulator config **somente se** os componentes forem necessários e aprovados; não pressupor Firestore nem adicionar banco redundante.
- `src/lib/auth/firebase-client.ts`, `firebase-admin.ts`, `verify-id-token.ts`, `require-role.ts`, `require-admin-mfa.ts`, `cpf.ts` — adaptadores e políticas server-side.
- `src/lib/db/types.ts` e `src/lib/db/migrations/<timestamp>_identity_profiles.ts` — apenas perfil/estado interno indispensável, sem entidades de tarefas futuras.
- `src/lib/storage/employee-contracts.ts` — upload/acesso privado e validação de metadados, se confirmar Storage em ADR/arquitetura.
- `src/app/api/auth/*`, `src/app/api/me/route.ts`, `src/app/api/admin/employees/*` e rotas de anexos — contratos HTTP backend com autorização em todas as rotas.
- `src/app/(auth)/*` — telas mínimas de cadastro/login/verificação/recuperação/perfil, mantendo catálogo público independente.
- `tests/auth/*`, `tests/api/auth/*`, `tests/storage/employee-contracts.test.ts` — testes de unidade, integração/emulador e autorização negativa, com fixtures sintéticas.
- `docs/architecture/` e `docs/security/` — contrato, ameaça, dados, logs, sessão e decisões de operação diretamente pertencentes à tarefa.

Dependências exatas, tabela/banco para perfil, escolha do serviço de arquivos e APIs finais dependem da inspeção de implementação e não estão aprovadas por este plano.

## 7. Sequência planejada e validações

1. Resolver decisões pendentes e revisar este plano; então, mediante autorização para Etapa 004, criar branch da TASK-003 a partir do baseline indicado pela governança, sem misturar alterações locais da TASK-002.
2. Fechar contrato de dados, ameaças e limites; confirmar dependências e configuração local do Auth Emulator sem credenciais reais.
3. Construir primeiro verificação de token, CPF, sessão e guards server-side; validar testes negativos antes de telas.
4. Integrar fluxo de cliente e perfil, garantindo verificação dos dois canais e recuperação por e-mail.
5. Integrar ciclo de vida da equipe, role/estado autoritativos, OTP admin e anexos privados.
6. Executar lint, typecheck, build, testes unitários, integração com Auth Emulator, autorização negativa, redaction/rate limit e `git diff --check`; documentar cada comando/saída. Testes de produção/serviços externos não pertencem ao gate local.
7. Revisar diff/Scope Guard, checar ausência de PII real/segredos e obter aprovação dos gates seguintes antes de concluir a TASK.

### Casos mínimos de validação futuros

- Cadastro não confirmado não autoriza compra; e-mail confirmado sem celular ou celular confirmado sem e-mail também não.
- Reset de senha não revela se uma conta existe.
- CPF normalizado, válido e inválido, repetido e com caracteres de máscara; nenhuma consulta remota.
- Acesso a perfil alheio negado; cliente/funcionário não obtém rotas administrativas; funcionário bloqueado perde acesso.
- Role enviado por browser/body ignorado; token expirado/inválido/revogado negado.
- Admin sem MFA recente não executa ação sensível; após MFA executa; depois de mais de uma hora inativo precisa renovar. Limites de fronteira ficam explicitados nos testes.
- Contrato privado não pode ser obtido por URL pública nem por funcionário; tentativa não autorizada resulta em negação sem revelar existência do arquivo.
- Rate limit e auditoria preservam contexto sem registrar senha, OTP, bearer token ou CPF integral.
- Auth Emulator usa apenas identidades e códigos sintéticos e não envia SMS/e-mail real.

Todos os testes acima estão **NOT RUN** nesta etapa porque são validações da implementação futura.

## 8. Riscos, decisões necessárias e recomendação

| Questão não definida explicitamente | Impacto | Recomendação para decisão da solicitante |
|---|---|---|
| Quais dados um cliente pode editar no próprio perfil? | **RESOLVIDO pela solicitante:** nome, telefone, e-mail e senha podem ser editados sob validação integrada; CPF não pode ser alterado pelo cliente. | Implementação deverá aplicar as regras já definidas para cada campo e preservar confirmação de email/celular requerida antes de compra; não permitir mutação de CPF por endpoint de perfil. |
| Funcionário pode ser excluído permanentemente ou apenas bloqueado? | **RESOLVIDO pela solicitante:** cadastro fica congelado por três meses após desligamento e depois pode ser excluído manualmente pelo administrador. | Implementação deverá representar o estado congelado e data de início do prazo; apenas administrador poderá executar exclusão manual após o período. O procedimento deve preservar trilha de auditoria e tratar referências existentes conforme retenção aplicável, sem exclusão automática. |

Riscos técnicos a tratar durante implementação: claims Firebase obsoletas podem manter privilégio; exigir validação de token, estado atual da conta e revogação conforme o desenho. SMS pode sofrer abuso/custo; limitar tentativas, aplicar proteção antiabuso e testar sem operadora. Prova de MFA e inatividade precisam ser verificadas no servidor. Anexos exigem ACL privada, limites de arquivo e prevenção de URL pública. O comportamento de Identity Platform, Storage emulator e configuração final deve ser confirmado com documentação oficial e testes antes da implementação; este plano não declara compatibilidade já executada.

**Decisões necessárias para habilitar Etapa 004:** nenhuma das duas lacunas de produto que bloquearam a primeira avaliação permanece pendente; foram respondidas pela solicitante e incorporadas acima. Antes da implementação, os contratos técnicos de revalidação dos canais e retenção de referências deverão seguir os requisitos e regras aprovadas, sem ampliar a decisão de produto.

## 9. Rollback planejado

- Manter a mudança em branch isolada da TASK-003 quando a implementação for autorizada; não reaproveitar ou limpar alterações locais da TASK-002.
- Se implementação local falhar, interromper o gate e reverter apenas commits/arquivos próprios da branch TASK-003, preservando fontes de dados e alterações preexistentes.
- Migrações locais de teste podem ser revertidas somente em banco descartável e vazio, comprovando `down`; não apagar dados de produção nem contas/contratos reais como rollback.
- Desativação de fluxo em ambiente de teste deve preservar trilha/auditoria. Em produção, qualquer rollback dependeria de plano e autorização próprios, backup verificado e análise de compatibilidade; não é autorizado por este plano.
- Nunca tratar exclusão de usuários ou anexos de produção como rollback automático. Preferir bloqueio de acesso e procedimento de recuperação documentado.

## 10. Operações e resultado verificável

| Operação | Resultado |
|---|---|
| Leitura do prompt e fontes atuais | PASS; fontes listadas na seção 1; divergência histórica registrada. |
| Inspeção de arquivos/estado Git | PASS; ausência de implementação de identidade confirmada; working tree tem alterações preexistentes da TASK-002 preservadas. |
| Plano, matriz, escopo, validações, riscos e rollback | PASS como artefato documental; pendências essenciais explícitas. |
| `git diff --check` após registrar relatório/gate | PASS, código 0 (registrado após a edição). |
| Código, dependências, migrations, rotas, UI, emulator, testes de aplicação, build, serviços pagos/reais, branch/commit/deploy | NOT RUN / NÃO EXECUTADOS; fora da autorização desta etapa documental. |

## 11. Matriz acumulada de gates

| GATE | Etapa | Status | Evidência |
|---|---|---|---|
| GATE-001 | Recontextualização e histórico | CONCLUÍDO | `docs/reports/TASK-003-etapa-001-recontextualizacao.md`. |
| GATE-002 | Pré-condições e decisões | CONCLUÍDO | `docs/reports/TASK-003-etapa-002-pre-condicoes.md`; DoR e decisões aprovadas. |
| GATE-003 | Planejamento | CONCLUÍDO | Este relatório e revalidação: plano completo; decisões de edição de perfil e congelamento/exclusão de funcionários registradas. |
| GATE-004 | Implementação | PENDENTE | Habilitada pelo gate, mas não iniciada; depende de autorização própria. |
| GATE-005 | Revisão | PENDENTE | Não executada. |
| GATE-006 | Testes manuais | PENDENTE | Não executados. |
| GATE-007 | Conclusão | PENDENTE | Não executada. |

**GATES CONCLUÍDOS:** 3/7  
**GATES PENDENTES:** 4/7  
**GATES BLOQUEADOS:** 0/7

## Resultado obrigatório

==================================================
TASK: TASK-003
ETAPA: 003
STATUS DA ETAPA: APROVADA
==================================================
GATE DA ETAPA: APROVADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 3
GATES PENDENTES: 4
GATES BLOQUEADOS: 0
PROBLEMAS ENCONTRADOS:
- As duas lacunas de produto identificadas na primeira avaliação foram resolvidas pela solicitante e incorporadas neste relatório.
CORREÇÕES REALIZADAS:
- Plano documental revisado com campos editáveis do perfil e ciclo de congelamento/exclusão de funcionário; decisões explícitas registradas sem ampliar seu alcance.
- Matriz acumulada de gates atualizada em `TASKS.md`; nenhuma implementação foi alterada.
PENDÊNCIAS:
- GATE-004 requer autorização própria; nenhuma implementação foi iniciada nesta etapa.
TESTES RELACIONADOS:
- `git diff --check`: PASS, código 0.
- Testes de aplicação/Auth Emulator/build: NOT RUN; planejamento documental, sem implementação.
PRÓXIMA ETAPA: Etapa 004 — Implementação
PRÓXIMA ETAPA HABILITADA: SIM
MOTIVO: GATE-003 está aprovado após incorporação das decisões da solicitante; Etapa 004 está habilitada no fluxo, sujeita a autorização própria para execução.
==================================================
