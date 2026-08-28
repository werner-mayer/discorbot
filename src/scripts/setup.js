/**
 * Assistente de configuracao.
 *
 * Pede apenas o TOKEN do bot e descobre o resto sozinho pela API do Discord:
 * application id, servidor, canal de criacao, cargos de admin, intents e
 * posicao do cargo do bot. Depois grava o .env, cria o banco, registra os
 * slash commands e publica o painel.
 *
 *   npm run setup
 *   npm run setup -- --token=SEU_TOKEN     (modo nao interativo)
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const API = 'https://discord.com/api/v10';
const ENV_PATH = new URL('../../.env', import.meta.url).pathname;
const ENV_EXAMPLE_PATH = new URL('../../.env.example', import.meta.url).pathname;

// Manage Roles + Manage Channels + View Channels + Send Messages
// + Manage Messages + Mute/Deafen/Move Members: sem estas ultimas o bot nao
// consegue conceder moderacao ao lider do cla nos canais que ele cria.
const REQUIRED_PERMISSIONS = 297806864n;
const MANAGE_NICKNAMES = 134217728n;

// Flags de intent privilegiada na aplicacao (GET /applications/@me).
const GATEWAY_GUILD_MEMBERS = 1 << 14;
const GATEWAY_GUILD_MEMBERS_LIMITED = 1 << 15;

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[36m',
};
const ok = (m) => console.log(`${c.green}✓${c.reset} ${m}`);
const warn = (m) => console.log(`${c.yellow}!${c.reset} ${m}`);
const fail = (m) => console.log(`${c.red}✗${c.reset} ${m}`);
const step = (n, m) => console.log(`\n${c.bold}${c.blue}${n}${c.reset} ${c.bold}${m}${c.reset}`);

let rl = null;
const interactive = stdin.isTTY && stdout.isTTY;
const ask = async (question, fallback = '') => {
  if (!interactive) return fallback;
  rl ??= createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(question)).trim();
  return answer || fallback;
};
const confirm = async (question, def = true) => {
  const answer = await ask(`${question} ${def ? '[S/n]' : '[s/N]'} `, def ? 's' : 'n');
  return ['s', 'sim', 'y', 'yes'].includes(answer.toLowerCase());
};

// --------------------------------------------------------------------- API

let TOKEN = '';

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`${response.status} ${response.statusText} em ${path}: ${body.slice(0, 200)}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

// ------------------------------------------------------------------- .env

function readEnv() {
  if (!existsSync(ENV_PATH)) copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
  return readFileSync(ENV_PATH, 'utf8');
}

function currentValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) return '';
  const value = match[1].trim().replace(/^["']|["']$/g, '');
  // Placeholders do .env.example nao contam como valor configurado.
  return /^(coloque_|id_da_|id_do_)/.test(value) ? '' : value;
}

/** Reescreve preservando comentarios e ordem do arquivo. */
function writeEnv(content, values) {
  let output = content;
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    output = new RegExp(`^${key}=.*$`, 'm').test(output)
      ? output.replace(new RegExp(`^${key}=.*$`, 'm'), line)
      : `${output.trimEnd()}\n${line}\n`;
  }
  writeFileSync(ENV_PATH, output);
  return output;
}

function run(command, args, env = {}) {
  execFileSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
}

// ------------------------------------------------------------------- main

async function main() {
  console.log(`\n${c.bold}🏰 Configuração do Discord Guild Bot${c.reset}`);

  let env = readEnv();
  const flags = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.replace(/^--/, '').split('=')),
  );

  // ---------------------------------------------------------------- token
  step('1/7', 'Token do bot');
  TOKEN = flags.token || currentValue(env, 'DISCORD_TOKEN');

  if (!TOKEN) {
    console.log(
      `${c.dim}Abra https://discord.com/developers/applications → sua aplicação → aba "Bot"\n` +
        `→ Reset Token → Copy. O token aparece uma única vez.${c.reset}`,
    );
    TOKEN = await ask('\nCole o token aqui: ');
  }
  if (!TOKEN) {
    fail('Sem token não dá para continuar. Rode `npm run setup` de novo quando tiver ele em mãos.');
    process.exit(1);
  }

  let application;
  try {
    application = await api('/applications/@me');
  } catch (error) {
    fail(error.status === 401 ? 'Token inválido ou expirado.' : `Falha ao falar com o Discord: ${error.message}`);
    process.exit(1);
  }
  ok(`Autenticado como ${c.bold}${application.name}${c.reset} (application id ${application.id})`);

  // -------------------------------------------------------------- intents
  step('2/7', 'Intent de membros');
  const hasMembersIntent =
    (application.flags & GATEWAY_GUILD_MEMBERS) !== 0 ||
    (application.flags & GATEWAY_GUILD_MEMBERS_LIMITED) !== 0;

  if (hasMembersIntent) {
    ok('SERVER MEMBERS INTENT está ativo.');
  } else {
    warn(
      'SERVER MEMBERS INTENT desligado — sem ele o bot não sobe.\n' +
        `  Ative em: ${c.bold}https://discord.com/developers/applications/${application.id}/bot${c.reset}\n` +
        '  (seção "Privileged Gateway Intents")',
    );
    if (interactive) await ask('  Pressione Enter depois de ativar... ');
  }

  // -------------------------------------------------------------- convite
  step('3/7', 'Servidor');
  let guilds = await api('/users/@me/guilds');

  if (!guilds.length) {
    const inviteUrl =
      `https://discord.com/oauth2/authorize?client_id=${application.id}` +
      `&permissions=${REQUIRED_PERMISSIONS}&scope=bot%20applications.commands`;
    warn('O bot ainda não está em nenhum servidor. Convide-o com este link:');
    console.log(`\n  ${c.bold}${inviteUrl}${c.reset}\n`);
    if (interactive) {
      await ask('  Pressione Enter depois de adicionar o bot ao servidor... ');
      guilds = await api('/users/@me/guilds');
    }
    if (!guilds.length) {
      fail('Nenhum servidor encontrado. Rode `npm run setup` de novo após convidar o bot.');
      process.exit(1);
    }
  }

  let server = guilds[0];
  if (guilds.length > 1) {
    console.log('\nEm quais servidores o bot está:');
    guilds.forEach((g, i) => console.log(`  ${c.bold}${i + 1}${c.reset}. ${g.name} ${c.dim}(${g.id})${c.reset}`));
    const choice = Number(await ask(`\nQual usar? [1-${guilds.length}] `, '1'));
    server = guilds[Number.isInteger(choice) && choice >= 1 && choice <= guilds.length ? choice - 1 : 0];
  }
  ok(`Servidor: ${c.bold}${server.name}${c.reset} (${server.id})`);

  // -------------------------------------------------- posicao do cargo do bot
  const [roles, botMember] = await Promise.all([
    api(`/guilds/${server.id}/roles`),
    api(`/guilds/${server.id}/members/${application.id}`),
  ]);
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const botTopPosition = Math.max(
    0,
    ...botMember.roles.map((id) => roleById.get(id)?.position ?? 0),
  );
  const rolesAbove = roles.filter((role) => role.position > botTopPosition && !role.managed && role.name !== '@everyone');

  if (rolesAbove.length) {
    warn(
      `Existem ${rolesAbove.length} cargo(s) acima do cargo do bot. Os cargos dos clãs nascem\n` +
        '  logo abaixo do bot — arraste o cargo dele para o topo em Configurações do Servidor → Cargos\n' +
        '  se quiser que os clãs apareçam acima dos cargos comuns.',
    );
  } else {
    ok('O cargo do bot está no topo da hierarquia.');
  }

  const permissoesBot = botMember.roles.reduce(
    (acc, id) => acc | BigInt(roleById.get(id)?.permissions ?? 0),
    0n,
  );
  const DESEJADAS = {
    'Gerenciar Mensagens': 8192n, 'Silenciar Membros': 4194304n,
    'Ensurdecer Membros': 8388608n, 'Mover Membros': 16777216n,
  };
  const faltando = Object.entries(DESEJADAS)
    .filter(([, bit]) => (permissoesBot & bit) === 0n && (permissoesBot & 8n) === 0n)
    .map(([nome]) => nome);
  if (faltando.length) {
    warn(
      `O bot não tem: ${faltando.join(', ')}.\n` +
        '  Os clãs funcionam, mas o líder não recebe moderação nos canais do próprio clã.\n' +
        `  Para liberar, reabra o convite: https://discord.com/oauth2/authorize?client_id=${application.id}` +
        `&permissions=${REQUIRED_PERMISSIONS}&scope=bot%20applications.commands`,
    );
  } else {
    ok('O bot tem todas as permissões necessárias.');
  }

  // ----------------------------------------------------------------- canal
  step('4/7', 'Canal de criação de clãs');
  const channels = await api(`/guilds/${server.id}/channels`);
  const textChannels = channels.filter((channel) => channel.type === 0);
  let creationChannel =
    textChannels.find((channel) => channel.id === currentValue(env, 'GUILD_CREATION_CHANNEL_ID')) ??
    textChannels.find((channel) => /create-?guild|criar-?clã/i.test(channel.name));

  if (creationChannel) {
    ok(`Canal encontrado: #${creationChannel.name} (${creationChannel.id})`);
  } else if (await confirm('Não achei um #create-guild. Crio o canal agora?')) {
    creationChannel = await api(`/guilds/${server.id}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name: 'create-guild', type: 0, topic: 'Crie e administre seu clã por aqui.' }),
    });
    ok(`Canal #${creationChannel.name} criado (${creationChannel.id})`);
  } else {
    warn('Sem canal fixo: `/cla panel` publicará o painel no canal onde for executado.');
  }

  // ------------------------------------------------------------ admin role
  step('5/7', 'Cargos administrativos');
  let adminRoleIds = currentValue(env, 'ADMIN_ROLE_ID');
  const staffRoles = roles.filter(
    (role) =>
      !role.managed &&
      role.name !== '@everyone' &&
      (BigInt(role.permissions) & 0x28n) !== 0n, // Administrator | Manage Guild
  );

  if (adminRoleIds) {
    ok(`Mantido o que já estava no .env: ${adminRoleIds}`);
  } else if (staffRoles.length && interactive) {
    console.log('\nCargos com poder administrativo no servidor:');
    staffRoles.forEach((role, i) => console.log(`  ${c.bold}${i + 1}${c.reset}. ${role.name} ${c.dim}(${role.id})${c.reset}`));
    const answer = await ask('\nQuais devem administrar os clãs? (números separados por vírgula, Enter para pular) ');
    adminRoleIds = answer
      .split(',')
      .map((index) => staffRoles[Number(index.trim()) - 1]?.id)
      .filter(Boolean)
      .join(',');
    if (adminRoleIds) ok(`Cargos administrativos: ${adminRoleIds}`);
    else warn('Nenhum cargo extra: só quem tem a permissão Administrator conta como admin.');
  } else {
    warn('Só quem tem a permissão Administrator do Discord contará como admin.');
  }

  // ------------------------------------------------------------------ .env
  step('6/7', 'Gravando .env, banco e comandos');
  env = writeEnv(env, {
    DISCORD_TOKEN: TOKEN,
    DISCORD_CLIENT_ID: application.id,
    DISCORD_SERVER_ID: server.id,
    GUILD_CREATION_CHANNEL_ID: creationChannel?.id ?? '',
    ADMIN_ROLE_ID: adminRoleIds ?? '',
  });
  ok('.env atualizado.');

  run('npx', ['prisma', 'db', 'push', '--skip-generate']);
  ok('Banco de dados pronto.');

  run('node', ['src/scripts/deployCommands.js']);
  ok('Slash commands registrados.');

  // ----------------------------------------------------------------- painel
  step('7/7', 'Painel de criação');
  if (creationChannel && (await confirm(`Publicar o painel em #${creationChannel.name} agora?`))) {
    const { creationPanelEmbed } = await import('../utils/embeds.js');
    const { createGuildButtonRow } = await import('../interactions/components.js');
    await api(`/channels/${creationChannel.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        embeds: [creationPanelEmbed().toJSON()],
        components: [createGuildButtonRow().toJSON()],
      }),
    });
    ok(`Painel publicado em #${creationChannel.name}.`);
  } else {
    warn('Painel não publicado. Rode `/cla panel` no Discord quando quiser.');
  }

  console.log(
    `\n${c.green}${c.bold}Tudo pronto.${c.reset} Suba o bot com ${c.bold}npm start${c.reset}` +
      `${hasMembersIntent ? '' : `\n${c.yellow}Lembre de ativar o SERVER MEMBERS INTENT antes.${c.reset}`}\n`,
  );
}

main()
  .catch((error) => {
    fail(error.message);
    process.exit(1);
  })
  .finally(() => rl?.close());
