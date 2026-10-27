# TASK-003 — Etapa 005 — Revisão

**Data:** 2026-10-23 (America/Sao_Paulo)  
**Branch observada:** task/TASK-003-contas-autenticacao  
**Estado ao revisar:** mudanças locais sem commit; HEAD em 304eb32.  
**Resultado:** GATE-005 BLOQUEADO; nenhuma correção de código foi aplicada nesta etapa.

## 1. Escopo e fontes

Revisados AGENTS.md, README.md, TASKS.md, ADR-005, overview/diagramas, relatórios TASK-003 das etapas 001–004, contrato de segurança, roteiro integrado, código, testes, configuração Firebase, manifest/lockfile e estado Git.

A mudança funcional da TASK-003 abrange autenticação Firebase, perfis, autorização por papel, MFA administrativo, ciclo de vida de funcionários, contratos privados, migration e interfaces mínimas. Foram também revisadas alterações documentais e de ambiente. O ajuste em tests/db/task002.test.ts consta como autorizado anteriormente pela solicitante. Não foram alterados os artefatos de implementação durante esta revisão.

No status Git também aparecem documentos de TASK-001/TASK-002 e outros itens fora do escopo desta etapa; a origem deles não foi atribuída a esta revisão e foram preservados. firebase-debug.log está não rastreado e não é ignorado por .gitignore. Uma inspeção local de padrões não encontrou marcadores explícitos de idToken, refreshToken, senha, OTP ou Bearer; encontrou sequências numéricas e telefones E.164, que podem ser sintéticos. O arquivo não foi aberto no relatório nem incluído como artefato. Não foram apresentados valores sensíveis.

## 2. Achados

### P1 — Exclusão/edição de funcionário não é atômica entre serviços

Em src/app/api/admin/employees/[uid]/route.ts, a exclusão grava auditoria, remove contrato do Storage, exclui usuário do Firebase e só então remove o perfil PostgreSQL. Uma falha intermediária pode deixar registro sem contrato/identidade ou auditoria de exclusão sem exclusão concluída. No PATCH, Firebase é atualizado antes do banco e da auditoria; falha posterior pode divergir nome/e-mail/telefone entre sistemas. Isso contraria a necessidade de estado consistente e auditável.

**Correção mínima recomendada:** definir operação idempotente com estado pendente/outbox ou compensação/reconciliação para os passos externos, registrar auditoria apenas para a transição efetivada e testar falhas em cada fronteira. Não implementado nesta etapa de revisão.

### P1 — Typecheck em checkout limpo não comprovado

next-env.d.ts importa .next/dev/types/routes.d.ts e root-params.d.ts. Esses arquivos ficam sob .next/, ignorado pelo Git. O workflow executa npm run typecheck antes de npm run build; localmente esses tipos existem, mas não foi comprovado que existem num checkout limpo antes do typecheck. Portanto o PASS local não comprova o CI/checkout limpo.

**Correção/verificação mínima recomendada:** confirmar em checkout limpo e ajustar a geração/ordem dos tipos Next de modo reproduzível; então validar o workflow completo. A revisão não removeu arquivos gerados e não executou CI.

### P2 — Auth Emulator escuta em todas as interfaces

firebase.json configura o Auth Emulator em 0.0.0.0:9099, enquanto o uso documentado é local e as execuções relatadas usam loopback. Isso pode expor o emulador e o endpoint de limpeza do projeto demo à rede local.

**Correção mínima recomendada:** vincular a 127.0.0.1 no desenvolvimento local, salvo necessidade documentada de acesso a partir de container.

### P2 — Teste MFA limpa todas as contas do projeto demo

tests/auth/task003.mfa-emulator.test.ts chama DELETE em /emulator/v1/projects/{project}/accounts antes de começar. A verificação exige projectId demo-, mas apaga quaisquer contas existentes nesse projeto, não apenas fixtures criadas pelo teste. A solicitante havia autorizado reinicializar o estado do emulador como alternativa para limpar códigos; ainda assim, a automação é ampla e pode remover outras fixtures do operador.

**Correção mínima recomendada:** manter o teste isolado em um projeto demo dedicado ou limpar somente fixtures/códigos próprios. Nenhum emulador foi iniciado, limpo ou testado nesta revisão.

### P2 — Testes de autenticação não passam na checagem de formatação

O script npm run lint examina src e next.config.ts, mas não tests/auth. A checagem direcionada npx biome check tests/auth falhou (código 1): dois erros de formatação em task003.emulator.test.ts e task003.mfa-emulator.test.ts e cinco avisos de non-null assertion no teste integrado. O teste MFA foi relatado como executado com sucesso por Mariana, mas sua formatação e a cobertura lint do diretório continuam pendentes.

**Correção mínima recomendada:** formatar os testes e ampliar a checagem de lint para incluí-los, mantendo as asserções e a semântica dos testes.
### P2 — Proteção contra abuso/rate limit sem evidência completa

O RNF-005 exige proteção contra abuso de OTP. A interface usa RecaptchaVerifier e o fluxo passa pelo Firebase, mas não há teste de rate limit no conjunto tests/auth e o relatório anterior registra a validação como NOT RUN. O comportamento de quotas/antiabuso em produção não foi validado e nenhum projeto de produção foi usado.

**Pendência:** comprovar a proteção no provedor configurado e documentar o cenário de validação sem enviar mensagens reais; não alegar aprovação desta parte com base no Emulator.

## 3. Scope Guard e privacidade

- **Dentro do escopo observado:** módulos/rotas de auth, perfil, administração de funcionários e contrato; migration/types; telas mínimas; Firebase demo config; testes sintéticos; documentação de identidade/segurança.
- **Alteração autorizada de tarefa anterior:** teste de migration TASK-002, conforme autorização registrada.
- **Fora do escopo da revisão:** documentos TASK-001/TASK-002 que aparecem no working tree; preservados e não aprovados como mudanças TASK-003.
- **Artifact local:** firebase-debug.log não rastreado e não ignorado; deve permanecer fora de commit e ser tratado/retido pelo operador. Não foi removido.
- **Segredos/PII:** nenhuma credencial real foi identificada nas configurações examinadas. O log local contém padrões de telefone/sequências numéricas; não foi incorporado ao diff nem exposto.
- **Resultado Scope Guard:** PARCIAL/BLOQUEADO até separar os artefatos fora da tarefa e tratar o log gerado. As alterações principais da TASK-003 correspondem ao escopo autorizado.

## 4. Validações desta etapa

| Operação | Resultado |
|---|---|
| Revisão de branch/status/diff e fontes da TASK-003 | PASS; branch task/TASK-003-contas-autenticacao, HEAD 304eb32, mudanças locais sem commit. |
| npm run lint | PASS, código 0; Biome verificou 27 arquivos em src e next.config.ts. Testes não estão cobertos por esse script. |
| npm run typecheck | PASS, código 0 no checkout local com .next/dev/types presente; checkout limpo/CI permanece NOT RUN. |
| npm run test:auth | PASS, 3/3; CPF e janela de inatividade. |
| npx biome check tests/auth | FAIL, código 1; 2 erros de formatação em dois arquivos e 5 avisos de non-null assertion. O lint oficial não inclui tests/auth. |
| git diff --check | PASS; apenas avisos de normalização LF/CRLF do Git. |
| npm run test:auth:emulator / PostgreSQL / fake-gcs-server | NOT RUN nesta revisão; resultados integrados anteriores continuam referenciados em TASKS.md e no relatório da Etapa 004. |
| npm run test:auth:mfa:emulator | NOT RUN pelo agente nesta revisão. Evidência humana Mariana, 1/1, foi informada e registrada em TASKS.md na revalidação do GATE-004. |
| CI em checkout limpo, revisão automatizada de segurança, OCI e testes manuais | NOT RUN nesta etapa. |

Os comandos npm executados foram precedidos por $env:npm_config_cache = "$PWD\.npm-cache". Nenhum teste do emulador foi executado nesta etapa.

## 5. Revalidação acumulada dos gates

GATE-001 a GATE-004 permanecem CONCLUÍDOS conforme evidências documentadas; em particular, GATE-004 inclui a execução OTP/MFA positiva 1/1 informada por Mariana em Auth Emulator local. GATE-005 fica BLOQUEADO pelos achados P1/P2 e validações pendentes. GATE-006 e GATE-007 permanecem PENDENTES.

**Totais:** 4 concluídos, 2 pendentes, 1 bloqueado.  
**TASK-003:** BLOCKED até resolução/revalidação dos achados obrigatórios.  
**Próxima etapa habilitada:** NÃO; testes manuais não devem avançar enquanto o gate de revisão estiver bloqueado.

==================================================
TASK: TASK-003
ETAPA: 005
STATUS DA ETAPA: BLOQUEADA
==================================================
GATE DA ETAPA: BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: 4
GATES PENDENTES: 2
GATES BLOQUEADOS: 1
PROBLEMAS ENCONTRADOS:
- P1: edição/exclusão de funcionário pode divergir ou perder dados entre Firebase, PostgreSQL e Storage após falha parcial.
- P1: typecheck local depende de tipos .next ignorados; workflow verifica tipos antes do build e checkout limpo não foi validado.
- P2: Auth Emulator está configurado para escutar em 0.0.0.0.
- P2: testes auth fora do lint oficial falham formatação (2 erros, 5 avisos); teste MFA limpa todas as contas do projeto demo; rate limit/antiabuso sem evidência suficiente.
- firebase-debug.log está não rastreado/não ignorado; artefatos TASK-001/TASK-002 aparecem no working tree e precisam ficar fora do escopo TASK-003.
CORREÇÕES REALIZADAS:
- Nenhuma; etapa documental de revisão.
PENDÊNCIAS:
- Corrigir/revalidar consistência idempotente das operações externas e teste de falha parcial.
- Validar typecheck/CI em checkout limpo e geração reproduzível de tipos Next.
- Restringir o bind do Auth Emulator e isolar a limpeza de fixtures.
- Formatar os testes, incluir tests/auth na checagem de lint, comprovar proteção contra abuso OTP e isolar a limpeza de fixtures; tratar o log/artefatos fora de escopo antes da revisão final.
TESTES RELACIONADOS:
- PASS: lint 0; typecheck 0 local; test:auth 3/3; git diff --check.
- NOT RUN: CI/checkout limpo; testes Auth Emulator e MFA pelo agente nesta etapa; testes manuais; OCI.
PRÓXIMA ETAPA: Etapa 006 — Testes manuais
PRÓXIMA ETAPA HABILITADA: NÃO
MOTIVO: GATE-005 bloqueado; os achados de consistência e validação obrigatória precisam ser resolvidos e revalidados antes da etapa seguinte.
==================================================