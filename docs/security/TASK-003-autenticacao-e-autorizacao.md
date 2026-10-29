# TASK-003 — Contrato de autenticação e autorização

**Provedor vigente:** Supabase Auth, Supabase Database e Supabase Storage, conforme ADR-007. Evidências anteriores de Firebase/Auth Emulator, PostgreSQL direto e GCS são históricas e não validam esta arquitetura. A implementação Supabase foi validada pelos gates da TASK-003; consulte os relatórios GATE-004 a GATE-007 para evidências e limitações atuais.

## Limites de confiança

- Supabase Auth é a autoridade de credenciais, verificação de e-mail/celular e identidade. A senha não é gravada no perfil nem no user metadata.
- O cadastro público cria uma identidade sem papel privilegiado. A rota `/api/auth/register` verifica `email_confirmed_at`, `phone_confirmed_at`, correspondência do telefone e CPF local antes de criar perfil e definir `app_metadata.role=customer`.
- `app_metadata.role` é alterado exclusivamente por código de servidor com service role. Nenhum corpo de requisição define papel.
- Perfis, estado de funcionário, sessões administrativas e eventos de auditoria ficam no Supabase Database. RLS está habilitado nas tabelas de identidade. O service role só é usado no servidor após autorização da rota.
- `@supabase/ssr` mantém a sessão em cookies e valida o usuário no servidor com `auth.getUser()`/`auth.getClaims()`. API que altera estado confere mesma origem.
- MFA administrativo usa challenge/verify por telefone. A ação sensível exige AAL2 e sessão administrativa não revogada; depois de uma hora sem atividade é necessário novo step-up.
- Serviço privilegiado usa `SUPABASE_SERVICE_ROLE_KEY`, nunca exposta em bundle ou `NEXT_PUBLIC_*`.

## Matriz de acesso

| Recurso/operação | Visitante | Cliente | Funcionário | Administrador |
|---|---:|---:|---:|---:|
| Iniciar cadastro/entrar/recuperar senha | Sim | Sim | Sim | Sim |
| Finalizar cadastro cliente | Não | Próprio perfil, após e-mail + celular verificados | Não | Não por endpoint público |
| Ler/alterar perfil cliente | Não | Próprio perfil; CPF imutável | Não | Não por endpoint de cliente |
| Listar/criar/editar/congelar/excluir funcionário | Não | Não | Não | Sim; mutações exigem step-up MFA |
| Enviar/baixar contrato de funcionário | Não | Não | Não | Sim; upload exige MFA e download é auditado |
| Confirmar pagamento, administrar cupom/relatório | Não implementado nesta TASK | Não | Não | Pertence a outras TASKs |

## Fluxos Supabase Auth

- **Cadastro:** Auth recebe e-mail/senha; nome, CPF e celular são coletados na interface. CPF de rascunho permanece somente na sessão de navegador até confirmação. Auth envia link de confirmação de e-mail.
- **Confirmação celular:** após confirmar e-mail e entrar, cliente vincula/verifica o telefone via OTP SMS. O backend exige confirmação dos dois contatos antes de inserir perfil e permitir cadastro concluído.
- **Recuperação:** `resetPasswordForEmail` envia link; a página de recuperação aceita uma nova senha após a sessão do link.
- **MFA admin:** Supabase phone factor `enroll`, `challenge`, `verify`; login verifica o AAL e pede código se há fator verificado. MFA não é exigido para funcionário.
- **Ambiente local:** Supabase CLI com Auth, Database, Storage e Mailpit via Docker. A configuração local inclui um OTP fixo apenas para um número de teste sintético; não configura SMS real. Em projeto hospedado é necessário configurar provedor SMS e SMTP antes de enviar mensagens.

## Dados pessoais e funcionário

CPF é normalizado para onze dígitos, rejeita repetição e valida os dígitos verificadores; não há consulta externa nem alegação de nacionalidade/titularidade. CPF não é enviado em logs, claims, URLs ou auditoria.

Perfil de funcionário contém nome, idade, telefone, e-mail, CPF, data de contratação, status, datas de congelamento e chave do contrato. Congelamento define `app_metadata.suspended` e marca o perfil; exclusão manual ocorre somente depois de três meses. A sessão de funcionário confere o status ativo em cada request.

Contratos aceitam PDF, PNG e JPEG com limite `EMPLOYEE_CONTRACT_MAX_BYTES`, no bucket privado `employee-contracts`. Somente rotas autenticadas de administrador leem os objetos; upload e download geram evento de auditoria. Nenhum objeto ou URL é público.

## Validações e limitações

- `npm run typecheck` e `npm run lint` foram executados durante a implementação/revisão. Os fluxos locais de Auth, e-mail/Mailpit, RBAC, sessão, MFA/step-up, Storage e HTTP foram validados conforme GATE-004 a GATE-006; veja os relatórios citados para distinguir evidência automatizada, harness e manual.
- A configuração local de OTP fixo não comprova quotas, limites de tentativa, entrega SMS, reputação SMTP, antifraude ou disponibilidade de produção.
- Não foi criado projeto Supabase remoto, billing, provedor externo, conta de cliente real nem migração de dados reais.
- As evidências TASK-003 baseadas em Firebase foram invalidadas para os gates atuais. O status final vigente da TASK-003 e os riscos remanescentes estão registrados em `docs/reports/TASK-003-etapa-007-conclusao.md`.
