# API Next Level

Origem canônica configurada em `APP_ORIGIN`. API JSON retorna erros `{error: "mensagem"}`. O frontend mantém o proxy `/api/*` de mesma origem. GETs autenticados usam cookie; POSTs JSON exigem os headers abaixo, inclusive cadastro/login/recuperação. Não há confirmação de e-mail obrigatória.

1. GET `/api/conta` devolve `{user,csrf}`; para conta autenticada também `progress`. Guarde cookies `Set-Cookie` e `csrf`.
2. POSTs enviam `Content-Type: application/json`, `x-nextlevel-request: 1` e `x-nextlevel-csrf: <csrf>`.
3. Depois de login/cadastro, GET `/api/conta` atualiza o CSRF vinculado à sessão.

Cookie `__Host-nextlevel`: HttpOnly, Secure, SameSite=Lax, Path=/, validade 14 dias. Cookie anônimo `__Host-nextlevel-form`: mesmas proteções, 1 hora. CSRF HMAC-SHA256 usa `GMAIL_STORAGE_KEY`, prefixo `mail-form|`, identidade de sessão e timestamp, janela 1 hora. Senhas: PBKDF2 SHA-256, 100.000 iterações, salt aleatório de 16 bytes, saída 32 bytes; salt.hash em base64url. Não mudar esses parâmetros para importar contas.

| Método/rota | Entrada principal | Resposta/efeito |
|---|---|---|
| GET /api/conta | cookie opcional | user (id,email,name,nick,birthDate,school,grade,address,verified,xp), csrf, progress; ou user:null |
| POST /api/cadastro | email,name,nick opcional,birthDate AAAA-MM-DD,school,grade,password,address opcional | 201 `{ok:true,mailSent:false}`; sessão; verified=1 |
| POST /api/entrar | email,password | `{ok:true}` + sessão |
| POST /api/sair | {} | `{ok:true}`; encerra sessão atual |
| POST /api/recuperar | email | `{ok:true,message}`; envia link se conta existir; envio indisponível pode retornar 503 |
| POST /api/redefinir | token,password | `{ok:true}`; consome token de 30 min e revoga sessões da conta |
| POST /api/verificar | token | compatibilidade com links antigos; não é requisito de nenhuma atividade |
| POST /api/reenviar | {} | `{ok:true}` sem envio de confirmação |
| POST /api/perfil | name,school,grade,nick opcional,address opcional | `{ok:true}`; endereço omitido preserva valor atual |
| POST /api/progresso | chaves de estado permitidas | `{ok:true}`; ignora XP/completed falsificados |
| POST /api/estudo/iniciar | kind,subject,topic,previous opcional | `{id,kind,questions}` sem gabarito |
| POST /api/estudo/concluir | id,answers[] (texto da alternativa, ou null permitido em provas) | correct,total,blank,percentage,passed,xp,gained,completed; repetição tem repeated:true |
| GET /api/grupos | sessão | `{groups}` |
| GET /api/grupos/:id | criador ou membro aprovado | `{group,ranking,pending,invite}`; invite só para criador |
| POST /api/grupos/criar | name,description opcional,password | 201 `{id,mailSent}`; falha de e-mail não desfaz grupo |
| POST /api/grupos/entrar | token,password | `{ok,status,name}`; normalmente pending |
| POST /api/grupos/:id/aprovar | userId | `{ok:true}`; somente criador |
| POST /api/grupos/:id/recusar | userId | `{ok:true}`; bloqueia acesso |
| POST /api/grupos/:id/remover | userId | `{ok:true}`; somente criador, não pode remover a si mesmo |
| POST /api/grupos/:id/convite | password | `{ok,mailSent}`; renova senha, token/hash e segredo cifrado |
| POST /api/grupos/:id/reenviar | {} | `{ok,mailSent}`; reenvia convite ao criador |
| POST /api/grupos/:id/sair | {} | `{ok:true}`; criador não pode sair |

Nome até 80, escola obrigatória até 160 (texto preservado como recebido), série até 40, endereço até 250. Senhas novas de 6–128; login/entrada verificam hash e máximo 128, preservando senhas antigas. Nick opcional é gerado quando ausente; quando informado, 3–16 caracteres ASCII (letras, números, `_`), único sem diferenciar maiúsculas. Escola especial exata `Outra escola (não ranqueada)` fica fora do ranking por escola e classe.

## Rankings

Todas as rotas exigem sessão. Paginação `?page=1`, tamanho 50. A resposta paginada tem `ranking` e `pagination` (`page`, `pageSize`, `total`, `pages`). Ranking público expõe nick, escola, série e XP; nunca email/endereço/data de nascimento.

| GET | Conteúdo |
|---|---|
| /api/ranking/alunos?school=...&page=1 | geral, filtro opcional por escola; position,nick,school,grade,xp |
| /api/ranking/escolas?page=1 | position,school,students,totalXp,averageXp |
| /api/ranking/classe?page=1 | mesma escola+série do usuário; escola especial retorna lista vazia e aviso |
| /api/ranking/eu | generalPosition,classPosition,schoolPosition,groups e aviso quando aplicável |
| /api/ranking/grupo/:id?page=1 | somente membros aprovados, acesso controlado |

Desempates: XP decrescente, nick sem diferenciar maiúsculas, ID. Escolas usam totalXp decrescente e nome. Não recalcula nem apaga o ledger na migração.

Estudo: `duel` 12 questões, aprovação 10; `reading` 4, aprovação 3 e +20 uma vez; `ranked` 15, exige tópicos dominados e acerto de 15; `boss` 180. Respostas corretas geram +10 por questão uma única vez. Atividade expira após 24 h; transações e chaves únicas impedem XP duplicado. O servidor não confia em XP/correct enviados pelo cliente.

## Admin independente

`GET /admin/email` redireciona anônimo para `/conta?admin=1`; usuário normal fora de `ADMIN_EMAIL` recebe 403. Todos os headers com prefixo `oai-` são rejeitados (403), mesmo com cookie válido. Admin usa sessão normal, e allowlist no servidor normaliza e-mails e aceita lista separada por vírgulas.

Formulários admin POST são `application/x-www-form-urlencoded`, com CSRF oculto gerado no GET do painel. Rotas: `/admin/email/credencial` (secret), `/admin/email/conectar`, `/admin/email/testar`. Callback GET `/admin/email/retorno` (state,code) exige a sessão do admin e o estado OAuth vinculado à sua ID. OAuth usa PKCE S256 e estado consumido uma vez, validade 10 min. Envio de teste é limitado a um/minuto e só para MAIL_SENDER.

Status: 400 entrada inválida, 401 sem login/senha inválida, 403 autorização/CSRF, 404 recurso ausente, 409 duplicidade, 413 tamanho, 429 limite, 502 Gmail, 503 indisponibilidade. Consulte `server/accounts.mjs` para os formatos exatos de cada ramo; os formatos existentes foram preservados.
