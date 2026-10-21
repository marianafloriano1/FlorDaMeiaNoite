# ADR-001 — Arquitetura gerenciada em Google Cloud

- **Status:** PROPOSTO, aprovado como direção de planejamento; configuração final e custos dependem da etapa de implantação.
- **Data:** 2026-09-23
- **Decisores:** solicitante / responsável pela Flor da Meia-Noite
- **Rastreabilidade:** RNF-001..004, RNF-009; RF-019; TASK-001, TASK-002, TASK-013, TASK-014.

## Contexto

O sistema é novo, deve operar aproximadamente 30 pedidos/dia e suportar picos estimados em 1.000 usuários simultâneos. O solicitante aceita serviços pagos em produção e prioriza disponibilidade confiável. Google Cloud Translation é requisito, enquanto SMS/e-mail e domínio serão pagos quando necessário. Teste inicial precisa ser gratuito. Foi acrescentado o requisito RNF-011: a aplicação obrigatoriamente deve rodar em containers (Docker ou runtime equivalente).

## Decisão

Adotar como arquitetura de referência Google Cloud: aplicação Next.js/TypeScript empacotada em imagem OCI e executada no Cloud Run; Cloud SQL PostgreSQL regional com alta disponibilidade e PITR; Cloud Storage privado para originais de imagem/anexos; Cloud CDN para imagens públicas otimizadas; Cloud Tasks ou Pub/Sub para jobs; Secret Manager e serviços de logging/monitoramento. Manter aplicação stateless e APIs protegidas no backend. O ambiente local e de teste também executa a aplicação em container Docker ou runtime OCI equivalente, isolado e com dados sintéticos. Os serviços gerenciados externos não precisam ser containerizados.

## Alternativas

1. Vercel + Supabase: rápida para protótipo, porém planos sem custo têm limites/inatividade e características de uso, backup e produção que exigiriam plano pago. Vercel Hobby limita a uso pessoal/não comercial.
2. Cloudflare Pages/Workers/D1: custo inicial baixo e boa distribuição estática, mas para transações de reserva, arquivos privados e backups gerenciados, exigiria validação adicional e composição de serviços distintos.
3. VM única: simples inicialmente, porém aumenta responsabilidade operacional e risco de ponto único de falha.

## Consequências

- Aumenta controle de disponibilidade, escala horizontal e integração direta com tradução; inclui cobrança variável e configuração inicial mais trabalhosa.
- Cloud Run autoscaling precisa de limites de instâncias para proteger Cloud SQL e orçamento; sessões de carrinho/reserva devem estar no banco, nunca na memória do contêiner.
- A região, a estratégia de envio de e-mail/SMS e o SLO de produção permanecem decisões de implantação.
- Imagens devem ser reproduzíveis, sem segredos embutidos e com dependências/runtime declarados; validar construção e inicialização como gates de CI.
- Testes gratuitos não reproduzem plenamente HA, throughput e entrega SMS de produção.

## Evidência consultada

[Cloud Run autoscaling](https://docs.cloud.google.com/run/docs/about-instance-autoscaling), [concurrency](https://docs.cloud.google.com/run/docs/about-concurrency), [Cloud SQL HA](https://docs.cloud.google.com/sql/docs/postgres/high-availability), [Cloud SQL restore/PITR](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/restore), [Vercel Hobby](https://vercel.com/docs/plans/hobby).
