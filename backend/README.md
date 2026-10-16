# Next Level — backend independente

Preparado a partir da produção **v26**, commit `3c19cbad0249e122ceae86ee0b23a3cd4d8232a2`, em 02/10/2026. Inclui os rankings de alunos, escolas, classe, posição pessoal e grupos. Este pacote NÃO altera nem migra a produção existente.

`server/` é a versão adaptada para sua Cloudflare. `provenance/production-v26/` guarda os arquivos originais publicados para comparação; não é o código de implantação. O banco privado é um arquivo separado, nunca parte deste repositório. `data/` contém o conteúdo público de questões e gabaritos usado no servidor, com IDs preservados. Não exponha esses gabaritos como arquivos estáticos: Wrangler serve apenas `public/`.

## 1. Preparar o computador

Instale Node.js 24 ou superior em https://nodejs.org/ e Git em https://git-scm.com/. Abra o terminal (PowerShell no Windows). Baixe a branch ou use:

```sh
git clone --branch backend-export https://github.com/mbagostini75/NextLevelEtec.git
cd NextLevelEtec/backend
npm install
npm test
```

Não precisa de ChatGPT, Work, IA, plugin ou ferramenta de geração para nenhum comando. O lockfile fixa as dependências. Depois da primeira instalação, prefira `npm ci`.

## 2. Criar sua Cloudflare e D1

Crie sua própria conta em https://dash.cloudflare.com/. O Wrangler abre o navegador para você autorizar sua conta:

```sh
npx wrangler login
npx wrangler d1 create next-level-db
```

Copie o `database_id` retornado para `wrangler.toml`, substituindo o UUID de zeros. O nome do binding continua `DB`. Não use IDs do ambiente antigo. O Worker `next-level-backend` será criado pelo primeiro deploy.

## 3. Importar o banco — escolha uma das opções

Guarde o SQL privado **fora do repositório**, por exemplo em `C:/NextLevelPrivado/nextlevel-database-v26.sql`.

**Restaurar as contas existentes:** o export entregue contém esquema + dados; importe-o em um D1 NOVO e VAZIO, sem aplicar as migrações antes:

```sh
npx wrangler d1 execute next-level-db --remote --file="C:/NextLevelPrivado/nextlevel-database-v26.sql"
npx wrangler d1 execute next-level-db --remote --command="PRAGMA foreign_key_check"
```

**Começar sem dados:** aplique somente o esquema:

```sh
npx wrangler d1 execute next-level-db --remote --file=docs/SCHEMA.sql
```

Alternativa para banco novo vazio: `npx wrangler d1 migrations apply next-level-db --remote`. Não execute esta alternativa sobre um banco já importado: o histórico de migrações do Wrangler não faz parte do export e as migrações iniciais criariam tabelas duplicadas. Para futuras alterações, gere uma nova migração e aplique somente o arquivo novo, após backup.

O export foi obtido com leituras das 11 tabelas repetidas e idênticas, sem cortes; a reconstrução SQL passou em comparação de cada valor e verificação de chaves estrangeiras. A origem não disponibilizou snapshot transacional: não há garantia de instante atômico entre tabelas. Uma migração futura deve usar backup final do ambiente de origem sob controle de escritas. Não trate esta preparação como migração concluída.

## 4. Configurar variáveis e chave

Edite `[vars]` em `wrangler.toml`:

| Nome | Valor |
|---|---|
| APP_ORIGIN | URL HTTPS canônica do novo Worker, sem barra final |
| GOOGLE_OAUTH_CLIENT_ID | ID do cliente OAuth Web criado na sua conta Google Cloud |
| MAIL_SENDER | E-mail Gmail remetente, em minúsculas |
| ADMIN_EMAIL | E-mail da sua conta cadastrada; vários separados por vírgula |

`DB` e `ASSETS` são bindings, não valores para `.env`. `.env.example` apenas lista os nomes. Para desenvolvimento crie `.dev.vars` com os valores; esse arquivo é ignorado pelo Git. Para produção as quatro variáveis ficam em Wrangler, e a chave fica em secret:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
npx wrangler secret put GMAIL_STORAGE_KEY
```

Cole a chave gerada quando solicitado; guarde uma cópia privada. Se você conseguir recuperar a chave ORIGINAL do ambiente antigo pelo painel onde ela foi cadastrada, use exatamente essa chave em vez de gerar outra. Esta preparação não conseguiu exportá-la. Nunca envie chave, `.dev.vars`, `.env`, SQL privado ou tokens ao GitHub.

### O que muda se a chave for nova

Senhas PBKDF2, IDs, XP, progresso e sessões armazenadas não são cifrados por essa chave e permanecem preservados. Os tokens CSRF antigos expiram ou se tornam inválidos; basta recarregar `/api/conta` para obter outro. Cookies com `__Host-` são vinculados ao host: login feito diretamente no host antigo não acompanha o novo domínio. Ao manter o mesmo frontend Vercel e importar sessões, os cookies daquele frontend podem continuar válidos até seu vencimento; faça login novamente no Worker para administrar o Gmail.

`mail_settings.client_secret`, `mail_settings.refresh_token`, `mail_oauth.verifier` e `study_groups.invite_secret` usam AES-GCM com `GMAIL_STORAGE_KEY`. Sem a chave original, NÃO há como decifrá-los. Preserve o export original intacto. No novo banco, reconecte o Gmail salvando a credencial novamente no painel. Autorizações OAuth que estavam em andamento precisam ser reiniciadas. Eventuais grupos conservam senha/hash, membros e XP, mas o dono precisa renovar o convite por `/api/grupos/:id/convite` com uma nova senha de 6–128 caracteres; isso substitui o segredo cifrado e invalida o link antigo. No export atual há zero grupos.

## 5. Build, teste e deploy

```sh
npm test
npm run test:local
npm run build
npx wrangler deploy
```

O teste local cria um D1 local do zero e um Worker de teste com respostas Google simuladas; não envia e-mails reais nem utiliza produção. `npm test` cobre as rotas de conta, estudos, grupos, rankings e painel de e-mail. Os testes originais de conteúdo/frontend foram executados no checkout original e passaram antes da adaptação. `fixtures/web/` guarda scripts para a integração existente, sem publicar ou modificar o frontend da raiz. `validar.cjs` foi preservado; seu teste de imagens requer também os arquivos originais `web/assets/simulados/` na fixture, não necessários para o backend. Não é etapa do deploy.

Para testar manualmente sem dados privados:

```sh
npx wrangler d1 execute next-level-db --local --file=docs/SCHEMA.sql
npm run build
npx wrangler dev
```

Configure `.dev.vars` antes. Abra o endereço local informado. O painel de conta independente permite login e recuperação. O cadastro normal continua no frontend e em `/api/cadastro`.

## 6. Conectar o Gmail

Na sua conta https://console.cloud.google.com/ crie um projeto, ative Gmail API, configure a tela de consentimento OAuth e crie credenciais **OAuth 2.0 → Aplicativo da Web**. Cadastre exatamente:

```
https://SEU-WORKER.SEUSUBDOMINIO.workers.dev/admin/email/retorno
```

Este endereço é `APP_ORIGIN + /admin/email/retorno`. Coloque o ID em `GOOGLE_OAUTH_CLIENT_ID` e republique se mudou a configuração. A conta em `MAIL_SENDER` deve autorizar o envio; adicione-a como usuário de teste enquanto o projeto Google estiver em testes.

Abra `/conta` no novo Worker e entre com sua conta NORMAL do site cujo e-mail consta em `ADMIN_EMAIL`. Se não existe conta, faça o cadastro pela API/frontend primeiro. A allowlist não cria conta nem substitui a senha. `/admin/email` permite salvar o segredo do cliente OAuth, autorizar no Google e testar envio. Essa credencial será cifrada no D1. Não há login ChatGPT e nenhum header `oai-*` é aceito como autenticação.

Em apps Google externos no estado de teste com escopo Gmail, o refresh token pode vencer em 7 dias. Configure a publicação/verificação do app conforme as exigências Google para operação contínua; se expirar, reconecte pelo mesmo painel.

## 7. Trocar o frontend Vercel — somente na migração futura

**Nada foi alterado agora.** Quando o novo Worker estiver validado, edite apenas os destinos já existentes em `vercel.json` na raiz:

```json
{"source":"/api/:path*","destination":"https://SEU-WORKER.SEUSUBDOMINIO.workers.dev/api/:path*"}
```

O destino de `/admin/:path*` deve apontar para `https://SEU-WORKER.SEUSUBDOMINIO.workers.dev/admin/:path*`. Preserve as outras regras. O redirect de admin para o Worker é compatível com o login independente em `/conta` naquele Worker; não compartilhe cookies entre hosts. Para APIs mantenha o proxy de mesma origem da Vercel: não precisa habilitar CORS aberto nem alterar cookies/CSRF.

Publique a mudança pela sua conta Vercel. Teste cadastro, login, recuperação, estudo, XP e rankings antes de anunciar a migração.

## 8. Backup e rollback

Antes de qualquer mudança no novo ambiente:

```sh
npx wrangler d1 export next-level-db --remote --output="C:/NextLevelPrivado/backup.sql"
```

Registre o commit e a versão do Worker. Para código:

```sh
npx wrangler versions list
npx wrangler rollback ID_DA_VERSAO_ANTERIOR
```

Rollback do Worker não restaura o D1. Para desfazer alteração de banco, restaure o backup em OUTRO D1 vazio, valide e republique o Worker apontando para ele. Não sobrescreva banco ativo sem planejamento. Para voltar ao backend antigo, restaure os destinos anteriores em `vercel.json` e publique na Vercel; dados criados no novo banco não retornarão automaticamente ao antigo. Mantenha o serviço antigo ligado até conferir a migração final, sem novas escritas divergentes.

## Dependências

A versão preparada para executar em `server/` não depende de ChatGPT/Work nem de IA. Precisa de sua Cloudflare (Workers, D1 e assets), Google OAuth/Gmail para enviar e-mails, Node/npm para build e opcionalmente Vercel para o frontend. O material de procedência registra referências históricas do Work, sem ser importado pelo build. A produção atual e os destinos atuais da Vercel continuam dependentes do Work até a migração, deliberadamente não realizada nesta etapa. A chave original e o snapshot transacional da origem não estão disponíveis neste pacote.

## Fontes oficiais consultadas

- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/d1/best-practices/import-export-data/
- https://developers.cloudflare.com/workers/wrangler/commands/d1/
- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2
