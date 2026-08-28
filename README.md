# ⚔️ Discord Clan Bot

Bot de Discord que administra um **sistema de clãs**: cada clã ganha cargo colorido,
categoria e canais privados, com permissões, persistência em banco e comandos de administração.

---

## Como rodar

```bash
npm install
npm run setup     # assistente: pede só o token e configura o resto
npm start
```

O `npm run setup` autentica com o token, descobre o **application id**, lista os servidores em que o
bot está, encontra (ou cria) o `#⚔️┃criar-clã`, deixa você escolher os cargos de admin, checa a
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

Permissões do convite: **Gerenciar Cargos**, **Gerenciar Canais**, **Ver Canais**, **Enviar Mensagens**,
**Gerenciar Mensagens**, **Silenciar/Ensurdecer/Mover Membros** (e **Gerenciar Apelidos** se ligar
`GUILD_APPLY_TAG_TO_NICKNAME`). O Discord recusa com `50013` qualquer overwrite que conceda uma permissão
que o próprio bot não tenha; o bot filtra os bits que não pode conceder para nunca quebrar a criação, mas
sem as quatro últimas o líder do clã não recebe moderação nos canais dele. No servidor, arraste o cargo do bot
**acima** dos cargos que ele vai criar — o Discord não deixa um bot gerenciar cargos acima do próprio.

### Publicar o painel e o guia

No canal `#⚔️┃criar-clã`, rode `/cla panel` (admin) para o embed com o botão **Criar Clã**,
e `/cla guide` para publicar o guia de comandos para os membros.
Qualquer pessoa também consulta o guia a qualquer momento com `/cla help` (resposta privada).
Se `GUILD_CREATION_CHANNEL_ID` estiver configurado, o painel vai direto para lá.

---

## Fluxo de criação

```
#⚔️┃criar-clã → [ Criar Clã ] → modal (Nome, TAG, Cor, canal de texto, canal de voz)
              → embed de confirmação → [ Confirmar ]
```

Ao confirmar, o `GuildService` executa, nesta ordem:

1. valida nome, TAG e cor;
2. checa nome único no servidor;
3. checa TAG única no servidor;
4. checa que o usuário não está em outro clã;
5. cria o cargo com a cor escolhida (`[TAG] Nome`, destacado na lista de membros);
6. cria a categoria `⚔️ CLÃ - NOME` com os overwrites de permissão;
7. cria o canal de texto e o canal de voz (herdam as permissões da categoria);
8. persiste o clã e registra o criador como `OWNER` — em **uma escrita atômica**;
9. aplica o cargo ao criador;
10. grava o log de auditoria e responde com o resumo.

Se qualquer passo do Discord falhar, tudo que já foi criado é apagado (rollback).
Se o **banco** falhar depois da estrutura pronta, a estrutura também é desfeita — nunca sobra lixo.

---

## Comandos

| Comando | Quem pode | O que faz |
|---|---|---|
| `/cla help` | todos | Guia de como funcionam os clãs e lista de comandos |
| `/cla create` | todos | Abre o modal de criação (mesmo fluxo do botão) |
| `/cla info [usuario]` | todos | Dados do clã: nível, pontos, ranking, guerras, canais |
| `/cla members` | membros | Lista os membros e seus papéis |
| `/cla leave` | membros | Sai do clã (com confirmação) |
| `/cla join <cla> [mensagem]` | todos | Entra ou pede entrada, conforme a política do clã |
| `/cla invite @usuario` | líder, oficiais, admin | Envia convite por DM (ou no canal, se DM fechada) |
| `/cla requests` | líder, oficiais, admin | Pedidos pendentes, com botões de aprovar/recusar |
| `/cla kick @usuario` | líder, oficiais, admin | Remove membro, cargo e acesso |
| `/cla promote @usuario` | líder, admin | Promove a **oficial** |
| `/cla demote @usuario` | líder, admin | Rebaixa oficial a membro |
| `/cla transfer @usuario` | líder, admin | Passa a liderança (o antigo líder vira oficial) |
| `/cla edit` | líder, admin | Modal: descrição, boas-vindas, ícone, limite e cor |
| `/cla settings` | líder, admin | Escolhe a política de entrada no menu |
| `/cla delete` | líder, admin | Apaga cargo, categoria, canais e registros |
| `/cla ranking [limite]` | todos | Clãs ordenados por pontos |
| `/cla points <cla> <valor> [motivo]` | admin | Dá ou tira pontos (autocomplete de clãs) |
| `/cla war challenge <cla> [pontos]` | líder, admin | Desafia outro clã |
| `/cla war list` | todos | Guerras pendentes e em andamento |
| `/cla war report <guerra> <placar>` | admin | Registra o resultado e distribui os pontos |
| `/cla war cancel <guerra>` | líderes envolvidos, admin | Cancela um desafio ou guerra |
| `/cla repair [todas]` | líder, admin | Recria o que foi apagado manualmente |
| `/cla panel [canal]` | admin | Publica o painel “Criar Clã” |
| `/cla list` | admin | Lista todos os clãs do servidor |
| `/cla guide [canal]` | admin | Publica o guia de comandos num canal |
| `/cla logs [limite]` | admin | Histórico administrativo do sistema |

As opções `<cla>` e `<guerra>` têm **autocomplete**.

Botões: `Criar Clã`, `Confirmar`/`Cancelar`, `Aceitar`/`Recusar` convite, confirmações de saída e exclusão.

---

## Permissões dos canais

| Quem | Acesso |
|---|---|
| `@everyone` | `ViewChannel` e `Connect` **negados** |
| Cargo do clã | ver, ler histórico, enviar mensagens, anexos, entrar e falar na voz |
| Líder e oficiais | tudo acima + gerenciar mensagens, mutar e mover na voz |
| Cargos em `ADMIN_ROLE_ID` | acesso completo de leitura/escrita/moderação |
| Admins do Discord | continuam com acesso pela permissão `Administrator` |
| Bot | ver e gerenciar os canais que criou |

Os overwrites vivem **na categoria**; os canais herdam. Existe um único lugar de verdade
(`DiscordGuildService.buildCategoryOverwrites`) e `syncPermissions` reaplica quando algo muda.

---

## Entrada de membros

Cada clã escolhe em `/cla settings` como recebe gente nova:

| Política | Comportamento |
|---|---|
| **Somente convite** (padrão) | Ninguém entra sem `/cla invite`. `/cla join` é recusado com um aviso. |
| **Mediante aprovação** | `/cla join` cria um pedido; a liderança decide por botão no canal do clã ou em `/cla requests`. |
| **Entrada livre** | `/cla join` entra na hora. |

Ao entrar, o clã posta a mensagem de boas-vindas configurada em `/cla edit`,
com os placeholders `{user}`, `{cla}` e `{tag}`. Um usuário continua podendo
pertencer a **um clã por vez**: entrar em um cancela os pedidos pendentes nos outros.

---

## Progressão e guerras

Pontos são a moeda do sistema: `/cla points` (admin) ajusta manualmente e as guerras
premiam o vencedor. O nível é derivado — `nível = ⌊pontos / GUILD_POINTS_PER_LEVEL⌋ + 1` —
e fica gravado para ordenar o `/cla ranking` sem recalcular.

Uma guerra segue: líder desafia → líder adversário aceita pelo botão → fica **em andamento**
→ um **administrador** reporta o placar. Quem reporta é a organização, não os envolvidos,
para o resultado não virar discussão entre os dois clãs. O vencedor leva os pontos em
disputa; empate não move pontuação.

---

## Resiliência

Todo objeto do Discord é referenciado por **ID** (nomes podem mudar) e toda leitura devolve
`null` quando o objeto foi apagado à mão, em vez de estourar exceção.

`GuildService.repairGuild()` reconcilia banco × Discord: recria cargo, categoria e canais faltantes,
reatribui o cargo aos membros, reanexa canais órfãos e reaplica permissões. É chamado
automaticamente antes de operações sensíveis (`/cla info`, entrada de membro) e manualmente
com `/cla repair` (ou `/cla repair todas:true` para varrer o servidor inteiro).

Quem sai do servidor é removido do clã pelo evento `guildMemberRemove`. Se quem saiu era o
líder, o registro é preservado e um aviso vai para o log — a decisão fica com um admin.

---

## Arquitetura

```
src/
├── index.js                  bootstrap do client + shutdown limpo
├── config/                   TODA a configuração vem do .env (zero IDs hardcoded)
├── commands/cla/           handlers finos: leem opções e delegam
├── interactions/             botões, modais e o router de customId
├── events/                   ready, interactionCreate (erro centralizado), guildMemberRemove
├── services/                 regras de negócio
│   ├── GuildService            criar / reparar / excluir clã
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

SQLite por padrão (`data/clas.db`). Para PostgreSQL, troque `provider` em `prisma/schema.prisma`
e o `DATABASE_URL` — nenhum service muda, porque o acesso está isolado nos repositórios.

- **Guild** — nome, tag, cor, `roleId`, `categoryId`, `textChannelId`, `voiceChannelId`, `ownerId`
  (+ campos já reservados: `description`, `iconUrl`, `memberLimit`, `level`, `points`)
- **GuildMember** — vínculo usuário × clã com papel `OWNER | OFFICER | MEMBER`
- **GuildInvite** — convites com status e expiração
- **GuildAuditLog** — histórico de ações administrativas

Unicidade garantida **no banco**, não só no código:
nome e TAG únicos por servidor, e um usuário em **um clã por vez**
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

## Estado das features

| Feature | Status |
|---|---|
| Criação completa (cargo, categoria, canais, permissões, banco) | ✅ |
| Convites, entrada, saída, kick | ✅ |
| Officers / sub-líderes | ✅ `/cla promote` · `/cla demote` |
| Transferência de liderança | ✅ `/cla transfer` |
| Descrição, logo/ícone, limite de membros | ✅ `/cla edit` |
| Mensagens personalizadas | ✅ boas-vindas com placeholders |
| Sistema de aprovação para entrada | ✅ `/cla settings` + `/cla requests` |
| Pontos e níveis | ✅ `/cla points`, nível derivado |
| Ranking | ✅ `/cla ranking` |
| Guerras entre clãs | ✅ `/cla war` |
| Logs administrativos | ✅ `/cla logs` |
| Painel administrativo | ✅ `/cla list`, `/cla logs`, `/cla repair todas` |

Ideias que a arquitetura já comporta sem refatoração: temporadas com reset de
pontuação, recompensas automáticas por nível, campeonatos com chaveamento
(o `GuildWar` já guarda placar e vencedor) e um painel web lendo os mesmos
repositórios.
