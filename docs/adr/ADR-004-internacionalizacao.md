# ADR-004 — Português como origem e tradução automática para clientes

- **Status:** ACEITO
- **Data:** 2026-09-23
- **Rastreabilidade:** RF-019; RN-018; RNF-009; TASK-004, TASK-012.

## Decisão

Conteúdo editorial é cadastrado em português e traduzido pelo backend via Google Cloud Translation para inglês, espanhol e russo. Cachear por idioma e versão da origem, permitir fallback em português se API falhar, manter preços sempre em reais e nunca traduzir códigos/valores. Não haverá edição/revisão manual de tradução no painel.

## Consequências e salvaguardas

- Chave/API fica apenas no backend; estabelecer quotas, alertas de custo e proteção contra repetição.
- Texto botânico sobre toxicidade e cuidado deve ser cadastrado/fonteado pela loja; tradução automática não é fonte de verdade nem substitui revisão da informação original.
- Se tradução estiver indisponível, busca continua usando origem e navegação permanece possível.
- [Preço oficial da Cloud Translation](https://cloud.google.com/translate/pricing) foi consultado em 2026-09-23; custos dependem do volume e podem mudar.
