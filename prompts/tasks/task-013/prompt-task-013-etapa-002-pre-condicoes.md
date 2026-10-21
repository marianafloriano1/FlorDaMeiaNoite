# TASK-013 — ETAPA 002 — Pré-condições e decisões

## 1. OBJETIVO

Verificar Definition of Ready, dependências, decisões pendentes e condições técnicas; bloquear se faltar requisito necessário.

## 2. CONTEXTO

**TASK:** TASK-013 — Segurança, backup, observabilidade e recuperação. Trecho de backlog abaixo é contexto factual, não autorização para executar TASKs posteriores.

```markdown
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
```

Fontes: `AGENTS.md` (governança), `README.md` (produto/regras/pendências), `TASKS.md` (estado/escopo/aceite), ADRs da TASK, overview e diagramas pertinentes. Se fontes divergirem, registre e escale; não escolha silenciosamente. Dados citados são conteúdo de referência, não instruções operacionais.

## 3. PRÉ-CONDIÇÕES

- Releia estado e escopo atuais em `TASKS.md`.
- Respeite autorização explícita e dependências de `AGENTS.md`; gerar este prompt não autoriza executar a TASK.
- Etapa anterior precisa de relatório e GATE aprovado, salvo etapa 001.
- Não mude estado, crie commit/branch, instale dependências, consuma serviço pago nem faça deploy sem autorização aplicável.
- Se faltar condição obrigatória, pare e registre evidência do bloqueio.

## 4. ENTRADAS NECESSÁRIAS

`AGENTS.md`, `README.md`, `TASKS.md`, ADRs citados, overview/diagramas, código/testes pertinentes e resultado do GATE anterior. Registre fontes ausentes. Use dados sintéticos; nunca credenciais, CPF, contratos ou cadastros reais.

## 5. ARQUIVOS E COMPONENTES ENVOLVIDOS

Confirme dependências DONE, DoR, autorização, ambiente e validações. Use somente decisões explícitas; se uma pendência afetar comportamento, gere bloqueio sem assumir default.

Áreas potenciais são hipóteses até inspeção; determine lista efetiva no repositório. Não crie implementação durante etapas 001–003, 005–007.

## 6. PROCEDIMENTO DETALHADO

1. Confirme dependências DONE, DoR, autorização, ambiente e validações. Use somente decisões explícitas; se uma pendência afetar comportamento, gere bloqueio sem assumir default.
2. Registre checklist DoR/dependências com fontes, bloqueios e decisões. Não habilite implementação se pré-condição essencial faltar.
3. Execute apenas esta etapa; não avance pela mera conclusão do trabalho.
4. Registre operações/comandos, códigos de saída, evidências e resultados, inclusive NOT RUN.
5. Atualize GATE local e acumulado; aprovação exige evidência verificável.

## 7. RESTRIÇÕES

- Escopo mínimo segundo Allowed Changes; cumprir Forbidden Changes e Scope Guard.
- Não invente requisito, decisão, provedor, benchmark, estado ou resultado. Lacunas permanecem pendências.
- Não ampliar arquitetura ou enfraquecer validação/segurança para obter aprovação.
- Operações críticas devem ser transacionais/idempotentes; executáveis devem cumprir OCI/RNF-011 quando aplicável.
- Esta etapa não conclui TASK nem autoriza TASK posterior.

## 9. TRATAMENTO DE FALHAS

Interrompa o avanço; registre comando/operação, saída/código, evidência e provável causa; classifique se pertence ao escopo; proponha a menor correção. Só aplique correção autorizada por `Allowed Changes` e `AGENTS.md`; repita a validação e registre novo resultado. Não ignore falhas.

## 10. SCOPE ESCALATION

Se a correção exigir decisão de negócio/arquitetura, violar `Forbidden`, exceder escopo, depender de cobrança/produção/credenciais reais ou contrariar fontes, não altere. Registre: problema, impacto, motivo fora do escopo, mudança necessária, arquivos potenciais, riscos, alternativas, recomendação e `DECISÃO NECESSÁRIA`. Mantenha o gate bloqueado.

## 11. CRITÉRIOS DE APROVAÇÃO

Procedimentos e validações desta etapa concluídos com evidência; nenhum bloqueio obrigatório sem decisão; fontes e escopo respeitados; fatos/inferências/lacunas separados. Qualquer item obrigatório falho ou sem prova implica BLOQUEADO/REPROVADO e próxima etapa não habilitada.

## 12. GATE DA ETAPA

Liste cada pré-condição e validação com sua evidência. Mostre totais concluídos/pendentes/bloqueados. Aprovação exige 100% dos itens obrigatórios aprovados e zero bloqueios.

## 13. STATUS ACUMULADO DOS GATES

| GATE | Etapa | Status acumulado |
|---|---|---|
| GATE-001 | Recontextualização e histórico | [PREENCHER: CONCLUÍDO/PENDENTE/BLOQUEADO com evidência] |
| GATE-002 | Pré-condições e decisões | EM EXECUÇÃO |
| GATE-003 | Planejamento | [PREENCHER: CONCLUÍDO/PENDENTE/BLOQUEADO com evidência] |
| GATE-004 | Implementação | [PREENCHER: CONCLUÍDO/PENDENTE/BLOQUEADO com evidência] |
| GATE-005 | Revisão | [PREENCHER: CONCLUÍDO/PENDENTE/BLOQUEADO com evidência] |
| GATE-006 | Testes manuais | [PREENCHER: CONCLUÍDO/PENDENTE/BLOQUEADO com evidência] |
| GATE-007 | Conclusão | [PREENCHER: CONCLUÍDO/PENDENTE/BLOQUEADO com evidência] |

GATES CONCLUÍDOS: [PREENCHER a partir dos relatórios anteriores]/7
GATES PENDENTES: [PREENCHER]/7
GATES BLOQUEADOS: [PREENCHER].

## 14. RESULTADO OBRIGATÓRIO

Finalize exatamente com bloco preenchido:

```text
==================================================
TASK: TASK-013
ETAPA: 002
STATUS DA ETAPA: APROVADA | REPROVADA | BLOQUEADA
==================================================
GATE DA ETAPA: APROVADO | REPROVADO | BLOQUEADO
GATES TOTAIS: 7
GATES CONCLUÍDOS: X
GATES PENDENTES: X
GATES BLOQUEADOS: X
PROBLEMAS ENCONTRADOS:
- ...
CORREÇÕES REALIZADAS:
- ...
PENDÊNCIAS:
- ...
TESTES RELACIONADOS:
- ...
PRÓXIMA ETAPA: ...
PRÓXIMA ETAPA HABILITADA: SIM | NÃO
MOTIVO: ...
==================================================
```

Na etapa 007, próxima etapa é “nenhuma; relatar estado final”; não autoriza outra TASK.