# Validação — 02/10/2026

- Produção v26 (`3c19cbad0249e122ceae86ee0b23a3cd4d8232a2`): `node scripts/build.mjs && npm test` passou antes de qualquer adaptação. Inclui Gmail, contas, grupos, recuperação, sessão, XP, rankings, integração de scripts e validação curricular/conteúdo.
- Pacote independente: `npm test` passou (Gmail com mocks, contas, estudo, grupos, rankings e integração existente).
- `npm run test:local`: passou com Wrangler 4.147.0, `wrangler dev`, D1 local criado vazio, cadastro sem endereço, login, conta verificada, admin autorizado por sessão normal, rejeição de usuário fora da allowlist e de header oai, OAuth/Gmail simulado, recuperação e redefinição, duelo de 12 acertos com +120 XP, grupo, pedido de entrada, aprovação, rankings alunos/escolas/classe/eu/grupo.
- Teste local gera Worker especial em `.wrangler/smoke/`; respostas de Google e rota de inspeção do mail só existem nesse arquivo ignorado, NÃO em `server/` ou no build de produção. Nenhum envio real e nenhum acesso a banco de produção durante os testes.
- Ambiente do teste não permitia enumerar interfaces de rede; o harness usa fallback de loopback apenas nessa condição. Nenhuma mudança na infraestrutura remota.
- Export SQL reconstruído em SQLite vazio; comparação literal de todas as linhas/colunas com os dados lidos, chaves estrangeiras sem erros. Também importado pelo Wrangler em D1 local separado e conferido.
- Comparação das funções de cookie, sessão, PBKDF2, CSRF e AES com produção: idênticas.

Limites: OAuth/envio real do novo ambiente só pode ser confirmado depois de configurar a conta Google do proprietário; os testes usaram simulação. A origem não disponibilizou snapshot transacional nem a chave secreta original. Duas leituras completas idênticas comprovam estabilidade observada, sem garantia de instante atômico.
