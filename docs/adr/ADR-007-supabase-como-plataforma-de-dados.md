# ADR-007 — Supabase como plataforma de autenticação, dados e arquivos

- **Status:** ACEITO — decisão da solicitante em 2026-10-23
- **Rastreabilidade:** RNF-001/005/006/010; TASK-003 e tarefas de dados subsequentes; substitui as decisões de provedor dos ADR-002, ADR-005 e ADR-006.

## Contexto

A solicitante decidiu substituir permanentemente Firebase e qualquer banco anteriormente planejado pelo Supabase. A aplicação deve usar os serviços nativos Supabase Auth e Database para contas e persistência. A camada legada ainda contém Firebase Auth, PostgreSQL acessado diretamente por Kysely/`pg` e arquivos de contratos em Google Cloud Storage.

## Decisão

- Supabase Auth será a autoridade de identidade para clientes, funcionários e administrador. O cliente se autentica por e-mail/senha; confirmação do e-mail e do celular é obrigatória para concluir cadastro. O perfil de cliente guarda nome, CPF normalizado, e-mail e telefone E.164; senha fica exclusivamente no Auth.
- A autenticação usa cookies SSR do `@supabase/ssr`. A role administrativa é definida somente no servidor em `app_metadata`; dados de perfil, estado de funcionário, sessões administrativas e auditoria ficam em tabelas Supabase Database com RLS habilitado.
- MFA administrativo usa fator de telefone do Supabase Auth, com challenge/verify e AAL2. A janela de inatividade de uma hora continua sendo política da aplicação e registrada em `admin_auth_sessions`.
- Supabase Database é a única camada de consulta da aplicação. Migrations SQL versionadas ficam em `supabase/migrations`; não há conexão direta `pg`/Kysely da aplicação.
- Contratos de funcionários ficam em bucket privado do Supabase Storage. O acesso ocorre por rotas do servidor com autorização administrativa; nenhum bucket ou chave de serviço é público.
- Configuração local usa Supabase CLI e serviços Docker locais, dados sintéticos e Mailpit. Produção, billing, configuração de SMTP/SMS e migração de dados reais exigem planejamento operacional separado; esta decisão não cria projeto nem recurso remoto.

## Consequências

- Os fluxos e evidências de implementação que dependem de Firebase, PostgreSQL direto ou GCS deixam de validar a arquitetura atual e precisam ser substituídos/revalidados antes de reabrir TASK-003 e tarefas dependentes.
- Confirmação de SMS depende de um provedor SMS configurado no projeto Supabase hospedado; a execução local não envia SMS real. E-mail de teste local é capturado pelo serviço Mailpit da stack Supabase.
- A chave `SUPABASE_SERVICE_ROLE_KEY` só pode existir no servidor e nunca pode ser exposta em bundle, log ou repositório. A chave anon/publicável pode ser usada no browser sob RLS.
- Não há migração de contas/dados reais autorizada nem executada. Contas Firebase de produção, se existirem, exigem plano de migração e consentimento operacional específico.

## Fontes oficiais

- [Supabase Auth SSR para Next.js](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Auth por senha e telefone](https://supabase.com/docs/guides/auth/passwords)
- [MFA por telefone](https://supabase.com/docs/guides/auth/auth-mfa/phone)
- [Migrations locais Supabase](https://supabase.com/docs/guides/local-development/cli)
- [Controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control)
