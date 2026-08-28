# 🏰 Discord Guild Bot

Bot de Discord que administra um **sistema de guildas**: cada guilda ganha cargo colorido,
categoria e canais privados, com permissões, persistência em banco e comandos de administração.

---

## Como rodar

```bash
npm install
npm run setup     # assistente: pede só o token e configura o resto
npm start
```

O `npm run setup` autentica com o token, descobre o **application id**, lista os servidores em que o
bot está, encontra (ou cria) o `#create-guild`, deixa você escolher os cargos de admin, checa a
**intent de membros** e a **posição do cargo do bot**, grava o `.env`, cria o banco, registra os
slash commands e publica o painel. Se o bot ainda não estiver em nenhum servidor, ele monta e
mostra o link de convite com as permissões certas.

### O que só você pode fazer

Criar a aplicação em https://discord.com/developers/applications → **New Application**, abrir a aba
**Bot** → **Reset Token** → **Copy**, e ativar o **SERVER MEMBERS INTENT** na mesma tela.
O token aparece uma única vez; é ele que o assistente pede.

### Configuração manual (alternativa)

```bash
cp .env.example .env      # preencha DISCORD_TOKEN, DISCORD_CLIENT_ID e DISCORD_SERVER_ID
npm run db:push
npm run deploy:commands
npm start
```

Permissões do convite: **Gerenciar Cargos**, **Gerenciar Canais**, **Ver Canais**, **Enviar Mensagens**
(e **Gerenciar Apelidos** se ligar `GUILD_APPLY_TAG_TO_NICKNAME`). No servidor, arraste o cargo do bot
**acima** dos cargos que ele vai criar — o Discord não deixa um bot gerenciar cargos acima do próprio.

### Publicar o painel

No canal `#create-guild`, rode `/guild panel` (admin). O bot publica o embed com o botão **Criar Guilda**.
Se `GUILD_CREATION_CHANNEL_ID` estiver configurado, o painel vai direto para lá.

---

## Fluxo de criação

```
#create-guild → [ Criar Guilda ] → modal (Nome, TAG, Cor, canal de texto, canal de voz)
              → embed de confirmação → [ Confirmar ]
```

Ao confirmar, o `GuildService` executa, nesta ordem:

1. valida nome, TAG e cor;
2. checa nome único no servidor;
3. checa TAG única no servidor;
4. checa que o usuário não está em outra guilda;
5. cria o cargo com a cor escolhida (`[TAG] Nome`, destacado na lista de membros);
6. cria a categoria `🏰 GUILD - NOME` com os overwrites de permissão;
7. cria o canal de texto e o canal de voz (herdam as permissões da categoria);
8. persiste a guilda e registra o criador como `OWNER` — em **uma escrita atômica**;
9. aplica o cargo ao criador;
10. grava o log de auditoria e responde com o resumo.

Se qualquer passo do Discord falhar, tudo que já foi criado é apagado (rollback).
Se o **banco** falhar depois da estrutura pronta, a estrutura também é desfeita — nunca sobra lixo.

---

## Comandos

| Comando | Quem pode | O que faz |
|---|---|---|
| `/guild create` | todos | Abre o modal de criação (mesmo fluxo do botão) |
| `/guild info [usuario]` | todos | Dados da guilda (cargo, canais, membros) |
| `/guild invite @usuario` | líder, oficiais, admin | Envia convite por DM (ou no canal, se DM fechada) |
| `/guild kick @usuario` | líder, oficiais, admin | Remove membro, cargo e acesso |
| `/guild members` | membros | Lista os membros e seus papéis |
| `/guild leave` | membros | Sai da guilda (com confirmação) |
| `/guild delete` | líder, admin | Apaga cargo, categoria, canais e registros |
| `/guild transfer @usuario` | líder, admin | Passa a liderança (o antigo líder vira oficial) |
| `/guild repair [todas]` | líder, admin | Recria o que foi apagado manualmente |
| `/guild panel [canal]` | admin | Publica o painel “Criar Guilda” |
| `/guild list` | admin | Lista todas as guildas do servidor |

Botões: `Criar Guilda`, `Confirmar`/`Cancelar`, `Aceitar`/`Recusar` convite, confirmações de saída e exclusão.

---

## Permissões dos canais

| Quem | Acesso |
|---|---|
| `@everyone` | `ViewChannel` e `Connect` **negados** |
| Cargo da guilda | ver, ler histórico, enviar mensagens, anexos, entrar e falar na voz |
| Líder e oficiais | tudo acima + gerenciar mensagens, mutar e mover na voz |
| Cargos em `ADMIN_ROLE_ID` | acesso completo de leitura/escrita/moderação |
| Admins do Discord | continuam com acesso pela permissão `Administrator` |
| Bot | ver e gerenciar os canais que criou |

Os overwrites vivem **na categoria**; os canais herdam. Existe um único lugar de verdade
(`DiscordGuildService.buildCategoryOverwrites`) e `syncPermissions` reaplica quando algo muda.

---

## Resiliência

Todo objeto do Discord é referenciado por **ID** (nomes podem mudar) e toda leitura devolve
`null` quando o objeto foi apagado à mão, em vez de estourar exceção.

`GuildService.repairGuild()` reconcilia banco × Discord: recria cargo, categoria e canais faltantes,
reatribui o cargo aos membros, reanexa canais órfãos e reaplica permissões. É chamado
automaticamente antes de operações sensíveis (`/guild info`, entrada de membro) e manualmente
com `/guild repair` (ou `/guild repair todas:true` para varrer o servidor inteiro).

Quem sai do servidor é removido da guilda pelo evento `guildMemberRemove`. Se quem saiu era o
líder, o registro é preservado e um aviso vai para o log — a decisão fica com um admin.

---

## Arquitetura

```
src/
├── index.js                  bootstrap do client + shutdown limpo
├── config/                   TODA a configuração vem do .env (zero IDs hardcoded)
├── commands/guild/           handlers finos: leem opções e delegam
├── interactions/             botões, modais e o router de customId
├── events/                   ready, interactionCreate (erro centralizado), guildMemberRemove
├── services/                 regras de negócio
│   ├── GuildService            criar / reparar / excluir guilda
│   ├── GuildMemberService      entrada, saída, kick, papéis, transferência
│   ├── GuildInviteService      ciclo de vida dos convites
│   ├── DiscordGuildService     cargos, categorias, canais, overwrites
│   ├── GuildPermissionService  quem pode o quê
│   ├── AuditLogService         histórico de ações
│   └── GuildDraftStore         rascunho do modal até a confirmação (TTL)
├── repositories/             único ponto que fala com o banco (Prisma)
├── models/                   enums (papéis, status, ações) e customIds
├── utils/                    validadores, cores, textos, embeds, erros, logger
└── scripts/deployCommands.js
```

**Regra de dependência:** `commands/interactions → services → repositories → banco`.
Handler nenhum chama repositório ou a API do Discord diretamente.
`src/services/index.js` é o container que instancia e injeta tudo uma única vez.

### Convenção de `customId`

`guild:<ação>[:<arg>]` — o router (`src/interactions/router.js`) usa o prefixo para escolher o
handler e entrega o resto como argumentos (ex.: `guild:invite-accept:<inviteId>`).

---

## Banco de dados

SQLite por padrão (`data/guilds.db`). Para PostgreSQL, troque `provider` em `prisma/schema.prisma`
e o `DATABASE_URL` — nenhum service muda, porque o acesso está isolado nos repositórios.

- **Guild** — nome, tag, cor, `roleId`, `categoryId`, `textChannelId`, `voiceChannelId`, `ownerId`
  (+ campos já reservados: `description`, `iconUrl`, `memberLimit`, `level`, `points`)
- **GuildMember** — vínculo usuário × guilda com papel `OWNER | OFFICER | MEMBER`
- **GuildInvite** — convites com status e expiração
- **GuildAuditLog** — histórico de ações administrativas

Unicidade garantida **no banco**, não só no código:
nome e TAG únicos por servidor, e um usuário em **uma guilda por vez**
(`@@unique([discordGuildId, discordUserId])`).

---

## Testes

```bash
npm test
```

18 cenários de ponta a ponta (criação, unicidade, permissões, convites, saída, auto-reparo,
transferência, exclusão e auditoria) contra um mock da API do Discord e um SQLite separado —
roda sem token e sem servidor real.

---

## Próximos passos já preparados

| Feature | O que já existe |
|---|---|
| Descrição, logo, limite de membros | colunas no schema + `maxMembers` na config |
| Níveis, ranking, pontos | colunas `level` e `points` |
| Officers / sub-líderes | papel `OFFICER`, hierarquia por peso e `changeMemberRole()` |
| Transferência de liderança | `/guild transfer` implementado |
| Logs administrativos | `GuildAuditLog` + `AuditLogService` gravando desde já |
| Painel administrativo | `/guild list`, `/guild repair todas` |
| Aprovação de entrada | `GuildInvite` com máquina de status pronta para inverter o fluxo |
| Guerras entre guildas | services isolados; basta um `GuildWarService` + entidade nova |
