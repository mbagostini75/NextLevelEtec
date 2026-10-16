# Banco D1 (SQLite)

Onze tabelas na versão 26. Esquema executável em `SCHEMA.sql`, migrações históricas em `drizzle/`, modelo em `db/schema.ts`. Dados privados são entregues fora do GitHub.

## account_tokens

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| hash | TEXT | Sim | — | Sim |
| user_id | TEXT | Sim | — | Não |
| kind | TEXT | Sim | — | Não |
| expires_at | INTEGER | Sim | — | Não |

- FK `user_id` → `users.id`, exclusão `CASCADE`.
- Índice `sqlite_autoindex_account_tokens_1`, único: True.

## group_members

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| id | TEXT | Sim | — | Sim |
| group_id | TEXT | Sim | — | Não |
| user_id | TEXT | Sim | — | Não |
| status | TEXT | Sim | — | Não |
| requested_at | INTEGER | Sim | — | Não |

- FK `user_id` → `users.id`, exclusão `CASCADE`.
- FK `group_id` → `study_groups.id`, exclusão `CASCADE`.
- Índice `idx_group_members_user`, único: False.
- Índice `idx_group_members_group_status`, único: False.
- Índice `sqlite_autoindex_group_members_1`, único: True.

## mail_oauth

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| state_hash | TEXT | Sim | — | Sim |
| owner | TEXT | Sim | — | Não |
| verifier | TEXT | Sim | — | Não |
| expires_at | INTEGER | Sim | — | Não |

- Índice `sqlite_autoindex_mail_oauth_1`, único: True.

## mail_settings

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| id | TEXT | Sim | — | Sim |
| client_secret | TEXT | Sim | — | Não |
| refresh_token | TEXT | Não | — | Não |
| sender | TEXT | Não | — | Não |
| updated_at | INTEGER | Sim | — | Não |
| last_attempt_at | INTEGER | Não | — | Não |
| last_test_at | INTEGER | Não | — | Não |
| last_message_id | TEXT | Não | — | Não |

- Índice `sqlite_autoindex_mail_settings_1`, único: True.

## rate_limits

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| key | TEXT | Sim | — | Sim |
| count | INTEGER | Sim | — | Não |
| expires_at | INTEGER | Sim | — | Não |

- Índice `sqlite_autoindex_rate_limits_1`, único: True.

## sessions

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| hash | TEXT | Sim | — | Sim |
| user_id | TEXT | Sim | — | Não |
| expires_at | INTEGER | Sim | — | Não |

- FK `user_id` → `users.id`, exclusão `CASCADE`.
- Índice `idx_sessions_user`, único: False.
- Índice `sqlite_autoindex_sessions_1`, único: True.

## study_attempts

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| id | TEXT | Sim | — | Sim |
| user_id | TEXT | Sim | — | Não |
| kind | TEXT | Sim | — | Não |
| subject | TEXT | Não | — | Não |
| topic | TEXT | Não | — | Não |
| question_ids | TEXT | Sim | — | Não |
| created_at | INTEGER | Sim | — | Não |
| submitted | INTEGER | Sim | 0 | Não |
| result | TEXT | Não | — | Não |

- FK `user_id` → `users.id`, exclusão `CASCADE`.
- Índice `sqlite_autoindex_study_attempts_1`, único: True.

## study_groups

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| id | TEXT | Sim | — | Sim |
| owner_id | TEXT | Sim | — | Não |
| name | TEXT | Sim | — | Não |
| description | TEXT | Sim | '' | Não |
| password_hash | TEXT | Sim | — | Não |
| invite_hash | TEXT | Sim | — | Não |
| invite_secret | TEXT | Sim | — | Não |
| created_at | INTEGER | Sim | — | Não |

- FK `owner_id` → `users.id`, exclusão `NO ACTION`.
- Índice `study_groups_invite_hash_unique`, único: True.
- Índice `sqlite_autoindex_study_groups_1`, único: True.

## user_public_profiles

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| user_id | TEXT | Sim | — | Sim |
| nick | TEXT | Sim | — | Não |

- FK `user_id` → `users.id`, exclusão `CASCADE`.
- Índice `user_public_profiles_nick_unique`, único: True.
- Índice `sqlite_autoindex_user_public_profiles_1`, único: True.

## users

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| id | TEXT | Sim | — | Sim |
| email | TEXT | Sim | — | Não |
| name | TEXT | Sim | — | Não |
| birth_date | TEXT | Sim | — | Não |
| school | TEXT | Sim | — | Não |
| grade | TEXT | Sim | — | Não |
| address | TEXT | Sim | — | Não |
| password_hash | TEXT | Sim | — | Não |
| verified | INTEGER | Sim | 0 | Não |
| created_at | INTEGER | Sim | — | Não |
| saved_state | TEXT | Sim | '{}' | Não |
| completed | TEXT | Sim | '{}' | Não |

- Índice `users_email_unique`, único: True.
- Índice `sqlite_autoindex_users_1`, único: True.

## xp_ledger

| Coluna | Tipo | Obrigatória | Padrão | PK |
|---|---|---|---|---|
| id | TEXT | Sim | — | Sim |
| user_id | TEXT | Sim | — | Não |
| activity_key | TEXT | Sim | — | Não |
| xp | INTEGER | Sim | — | Não |
| earned_at | INTEGER | Sim | — | Não |

- FK `user_id` → `users.id`, exclusão `CASCADE`.
- Índice `idx_xp_ledger_user`, único: False.
- Índice `sqlite_autoindex_xp_ledger_1`, único: True.

## Semântica e preservação

- `users`: conta privada; `saved_state` e `completed` são JSON em texto; datas de nascimento AAAA-MM-DD.
- `user_public_profiles`: nick público, unicidade COLLATE NOCASE no SQL.
- `sessions` e `account_tokens`: apenas hashes de tokens, com vencimento Unix em segundos.
- `study_groups`: senha PBKDF2; invite_hash é SHA-256; invite_secret AES-GCM.
- `group_members`: ID grupo|usuário; approved/pending/blocked.
- `study_attempts`: IDs de questões JSON e resultado JSON, submitted impede reaplicação.
- `xp_ledger`: fonte de verdade do XP; ID usuário|atividade, INSERT OR IGNORE.
- `rate_limits`: contadores temporários.
- `mail_settings`: client_secret e refresh_token cifrados.
- `mail_oauth`: verifier cifrado; estado hash e admin ID.
- Cifra AES-GCM, IV de 12 bytes, AAD `NextLevel:gmail:v1`, chave GMAIL_STORAGE_KEY de 32 bytes. Não é possível recuperar texto sem a chave.
- IDs, timestamps, hashes e JSON do export são preservados literalmente. O esquema não contém a chave.
- O export se destina a um banco vazio. O código não executa reset de XP nem apaga progresso.
