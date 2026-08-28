/**
 * Teste de ponta a ponta dos fluxos do sistema de clãs.
 * Usa um mock da API do Discord (tests/mocks/discord.js) e um SQLite proprio,
 * entao roda sem token e sem servidor real.  ->  npm test
 */
import assert from 'node:assert/strict';
import { createMockGuild } from './mocks/discord.js';

// Guarda de seguranca: nunca rodar contra o banco de producao.
if (!/test/i.test(process.env.DATABASE_URL ?? '')) {
  console.error('Abortado: use um DATABASE_URL de teste (npm test já faz isso).');
  process.exit(1);
}

const { default: services } = await import('../src/services/index.js');
const { default: prisma } = await import('../src/database/prisma.js');
const { AppError } = await import('../src/utils/errors.js');

const { guildService, memberService, inviteService, permissionService, discordGuildService } = services;

const DG = '9999';
const discordGuild = createMockGuild(DG);
const owner = discordGuild.addUser('owner-1');
const invitee = discordGuild.addUser('member-2');
discordGuild.addUser('member-3');
const botUser = discordGuild.addUser('bot-9', { bot: true });

// limpeza
await prisma.guildAuditLog.deleteMany({});
await prisma.guildInvite.deleteMany({});
await prisma.guildMember.deleteMany({});
await prisma.guild.deleteMany({});

const ok = [];
const fail = [];
const test = async (name, fn) => {
  try { await fn(); ok.push(name); }
  catch (e) { fail.push(`${name}: ${e.message}`); }
};

let guild;

await test('cria clã com cargo, categoria e canais', async () => {
  guild = await guildService.createGuild(discordGuild, 'owner-1', {
    name: 'Dragons', tag: 'drg', color: '#f00', emoji: '🐉',
  });
  assert.equal(guild.name, 'Dragons');
  assert.equal(guild.tag, 'DRG');
  assert.equal(guild.color, '#FF0000');
  const role = await discordGuild.roles.fetch(guild.roleId);
  assert.equal(role.name, '🐉 [DRG] Dragons');
  assert.equal(role.color, '#FF0000');
  assert.equal(role.hoist, true);
  const cat = await discordGuild.channels.fetch(guild.categoryId);
  assert.equal(cat.name, '🐉 CLÃ - DRAGONS');
  const text = await discordGuild.channels.fetch(guild.textChannelId);
  assert.equal(text.name, '🐉・chat', 'nome default derivado do emoji');
  assert.equal(text.parentId, cat.id);
  const voice = await discordGuild.channels.fetch(guild.voiceChannelId);
  assert.equal(voice.name, '🐉・voz', 'nome default derivado do emoji');
});

await test('criador recebe o cargo e vira OWNER', async () => {
  assert.ok(owner.roles.cache.has(guild.roleId));
  const m = await prisma.guildMember.findFirst({ where: { guildId: guild.id, discordUserId: 'owner-1' } });
  assert.equal(m.role, 'OWNER');
});

await test('permissoes: todos veem o canal, so o clã lê e entra', async () => {
  const { PermissionFlagsBits } = await import('discord.js');
  const cat = await discordGuild.channels.fetch(guild.categoryId);

  const everyone = cat.overwrites.find((o) => o.id === 'everyone-role');
  assert.ok(everyone.allow.includes(PermissionFlagsBits.ViewChannel), '@everyone enxerga o canal');
  assert.ok(everyone.deny.includes(PermissionFlagsBits.ReadMessageHistory), '@everyone nao le o historico');
  assert.ok(everyone.deny.includes(PermissionFlagsBits.SendMessages), '@everyone nao escreve');
  assert.ok(everyone.deny.includes(PermissionFlagsBits.Connect), '@everyone nao entra na voz');
  assert.ok(!everyone.deny.includes(PermissionFlagsBits.ViewChannel), 'o canal nao fica escondido');

  const roleOw = cat.overwrites.find((o) => o.id === guild.roleId);
  for (const flag of [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ]) {
    assert.ok(roleOw.allow.includes(flag), 'o cargo do clã recupera o que o @everyone perdeu');
  }

  const ownerOw = cat.overwrites.find((o) => o.id === 'owner-1');
  assert.ok(ownerOw, 'lider deve ter overwrite de moderacao');
});

await test('nao concede permissao que o proprio bot nao tem (evita 50013)', async () => {
  const { PermissionFlagsBits } = await import('discord.js');
  const limitado = createMockGuild('8888');
  limitado.addUser('dono-x');
  // exatamente o que o convite padrao concede
  limitado.setBotPermissions([
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
  ]);

  const g = await guildService.createGuild(limitado, 'dono-x', {
    name: 'Limitados', tag: 'LIM', color: '#123456',
  });
  const cat = await limitado.channels.fetch(g.categoryId);
  const todas = cat.overwrites.flatMap((o) => [...(o.allow ?? []), ...(o.deny ?? [])]);

  assert.ok(!todas.includes(PermissionFlagsBits.ManageMessages), 'nao deve conceder ManageMessages');
  assert.ok(!todas.includes(PermissionFlagsBits.Connect), 'nao deve conceder Connect');
  assert.ok(
    cat.overwrites.find((o) => o.id === g.roleId).allow.includes(PermissionFlagsBits.ViewChannel),
    'o que o bot tem continua sendo concedido',
  );
  assert.equal(new Set(cat.overwrites.map((o) => o.id)).size, cat.overwrites.length, 'sem ids repetidos');

  const faltando = discordGuildService.missingGrantablePermissions(limitado);
  assert.ok(faltando.includes('Gerenciar Mensagens') && faltando.includes('Conectar'), 'reporta o que falta');
});

await test('repara clã cujo dono nao esta em cache (not a cached User or Role)', async () => {
  const g2 = createMockGuild('6666');
  g2.addUser('dono-frio');
  const cla = await guildService.createGuild(g2, 'dono-frio', { name: 'Frios', tag: 'FRI', color: '#00AAFF' });

  // Apaga a categoria e esquece o dono, como acontece num reparo automatico
  // disparado sem interacao dele.
  await (await g2.channels.fetch(cla.categoryId)).delete();
  g2.uncache('dono-frio');

  const { guild: reparado, repaired } = await guildService.repairGuild(g2, cla, { actorId: 'admin' });
  assert.ok(repaired.includes('categoria'), 'categoria recriada sem estourar');

  const cat = await g2.channels.fetch(reparado.categoryId);
  assert.ok(cat.overwrites.find((o) => o.id === 'dono-frio'), 'dono volta a ter overwrite após ser buscado');
});

await test('ignora overwrite de quem saiu do servidor', async () => {
  const g3 = createMockGuild('5555');
  g3.addUser('dono-sumido');
  const cla = await guildService.createGuild(g3, 'dono-sumido', { name: 'Sumidos', tag: 'SUM', color: '#FF8800' });

  await (await g3.channels.fetch(cla.categoryId)).delete();
  g3.members.store.delete('dono-sumido'); // saiu do servidor de vez
  g3.uncache('dono-sumido');

  const { guild: reparado } = await guildService.repairGuild(g3, cla, { actorId: 'admin' });
  const cat = await g3.channels.fetch(reparado.categoryId);
  assert.equal(cat.overwrites.find((o) => o.id === 'dono-sumido'), undefined, 'sem overwrite para quem sumiu');
  assert.ok(cat.overwrites.find((o) => o.id === reparado.roleId), 'o clã continua com acesso');
});

await test('emoji invalido cai no default em vez de quebrar', async () => {
  const g = createMockGuild('4444');
  g.addUser('dono-e');
  const cla = await guildService.createGuild(g, 'dono-e', { name: 'Padrao', tag: 'PAD', color: '#fff', emoji: '<script>' });
  assert.equal(cla.emoji, '⚔️');
  assert.equal((await g.channels.fetch(cla.textChannelId)).name, '⚔️・chat');
});

await test('trocar o emoji renomeia cargo, categoria e canais', async () => {
  const g = createMockGuild('3333');
  g.addUser('dono-t');
  let cla = await guildService.createGuild(g, 'dono-t', { name: 'Trocas', tag: 'TRC', color: '#00ff00', emoji: '🐺' });
  assert.equal((await g.roles.fetch(cla.roleId)).name, '🐺 [TRC] Trocas');

  cla = await services.settingsService.setEmoji(g, cla, '🔥', { actorId: 'dono-t' });
  assert.equal(cla.emoji, '🔥');
  assert.equal((await g.roles.fetch(cla.roleId)).name, '🔥 [TRC] Trocas');
  assert.equal((await g.channels.fetch(cla.categoryId)).name, '🔥 CLÃ - TROCAS');
  assert.equal((await g.channels.fetch(cla.textChannelId)).name, '🔥・chat');
  assert.equal((await g.channels.fetch(cla.voiceChannelId)).name, '🔥・voz');

  await assert.rejects(() => services.settingsService.setEmoji(g, cla, 'xyz', {}), (e) => /Emoji inválido/.test(e.message));
});

await test('rejeita nome duplicado', async () => {
  await assert.rejects(
    () => guildService.createGuild(discordGuild, 'member-3', { name: 'dragons', tag: 'XPT', color: '#00FF00' }),
    (e) => e instanceof AppError && /Já existe um clã/.test(e.message),
  );
});

await test('rejeita TAG duplicada', async () => {
  await assert.rejects(
    () => guildService.createGuild(discordGuild, 'member-3', { name: 'Outra', tag: 'drg', color: '#00FF00' }),
    (e) => /TAG/.test(e.message),
  );
});

await test('rejeita cor invalida', async () => {
  await assert.rejects(
    () => guildService.createGuild(discordGuild, 'member-3', { name: 'Outra', tag: 'OUT', color: 'azulzao' }),
    (e) => /Cor inválida/.test(e.message),
  );
});

await test('rejeita segunda clã para o mesmo usuario', async () => {
  await assert.rejects(
    () => guildService.createGuild(discordGuild, 'owner-1', { name: 'Segunda', tag: 'SEG', color: '#0000FF' }),
    (e) => /já faz parte/.test(e.message),
  );
});

await test('convite: cria, aceita e concede cargo', async () => {
  const { invite } = await inviteService.createInvite(discordGuild, guild, 'owner-1', 'member-2');
  const { guild: joined } = await inviteService.accept(discordGuild, invite.id, 'member-2');
  assert.equal(joined.id, guild.id);
  assert.ok(invitee.roles.cache.has(guild.roleId));
  const m = await prisma.guildMember.findFirst({ where: { guildId: guild.id, discordUserId: 'member-2' } });
  assert.equal(m.role, 'MEMBER');
});

await test('convite nao pode ser aceito duas vezes', async () => {
  const inv = await prisma.guildInvite.findFirst({ where: { inviteeId: 'member-2' } });
  await assert.rejects(() => inviteService.accept(discordGuild, inv.id, 'member-2'), (e) => /já foi respondido/.test(e.message));
});

await test('convite so pode ser aceito por quem recebeu', async () => {
  const { invite } = await inviteService.createInvite(discordGuild, guild, 'owner-1', 'member-3');
  await assert.rejects(() => inviteService.accept(discordGuild, invite.id, 'member-2'), (e) => /não é para você/.test(e.message));
});

await test('bot nao pode ser convidado', async () => {
  await assert.rejects(() => inviteService.createInvite(discordGuild, guild, 'owner-1', 'bot-9'), (e) => /Bots/.test(e.message));
});

await test('membro sai e perde o cargo', async () => {
  await memberService.removeMember(discordGuild, guild, 'member-2', { actorId: 'member-2' });
  assert.equal(invitee.roles.cache.has(guild.roleId), false);
  const m = await prisma.guildMember.findFirst({ where: { guildId: guild.id, discordUserId: 'member-2' } });
  assert.equal(m, null);
});

await test('lider nao pode sair', async () => {
  await assert.rejects(() => memberService.removeMember(discordGuild, guild, 'owner-1', {}), (e) => /líder/.test(e.message));
});

await test('auto-reparo recria cargo e canal apagados manualmente', async () => {
  const role = await discordGuild.roles.fetch(guild.roleId);
  await role.delete();
  const text = await discordGuild.channels.fetch(guild.textChannelId);
  await text.delete();

  const { guild: fixed, repaired } = await guildService.repairGuild(discordGuild, guild, { actorId: 'owner-1' });
  assert.deepEqual(repaired.sort(), ['canal de texto', 'cargo']);
  assert.notEqual(fixed.roleId, guild.roleId);
  const newRole = await discordGuild.roles.fetch(fixed.roleId);
  assert.equal(newRole.name, '🐉 [DRG] Dragons');
  assert.ok(owner.roles.cache.has(fixed.roleId), 'membros recebem o cargo novo');
  guild = fixed;
});

await test('permissoes negadas para usuario comum', async () => {
  const membership = await prisma.guildMember.findFirst({ where: { guildId: guild.id, discordUserId: 'owner-1' } });
  const commonMember = discordGuild.members.store.get('member-3');
  assert.equal(permissionService.canManageMembers(guild, null, commonMember), false);
  assert.equal(permissionService.canDeleteGuild(guild, commonMember), false);
  assert.equal(permissionService.canManageMembers(guild, membership, discordGuild.members.store.get('owner-1')), true);
});

await test('transferencia de lideranca', async () => {
  const { invite } = await inviteService.createInvite(discordGuild, guild, 'owner-1', 'member-2');
  await inviteService.accept(discordGuild, invite.id, 'member-2');
  const updated = await memberService.transferOwnership(discordGuild, guild, 'member-2', { actorId: 'owner-1' });
  assert.equal(updated.ownerId, 'member-2');
  const old = await prisma.guildMember.findFirst({ where: { guildId: guild.id, discordUserId: 'owner-1' } });
  assert.equal(old.role, 'OFFICER');
  guild = updated;
});

await test('exclusao remove cargo, canais e registros', async () => {
  const roleId = guild.roleId, catId = guild.categoryId;
  await guildService.deleteGuild(discordGuild, guild, 'member-2');
  assert.equal(discordGuild.roles.store.has(roleId), false);
  assert.equal(discordGuild.channels.store.has(catId), false);
  assert.equal(await prisma.guild.count({ where: { id: guild.id } }), 0);
  assert.equal(await prisma.guildMember.count({ where: { guildId: guild.id } }), 0);
});

await test('registra logs de auditoria', async () => {
  const logs = await prisma.guildAuditLog.findMany({ where: { discordGuildId: DG } });
  const actions = new Set(logs.map((l) => l.action));
  for (const a of ['GUILD_CREATED', 'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_LEFT', 'OWNERSHIP_TRANSFERRED', 'GUILD_DELETED']) {
    assert.ok(actions.has(a), `faltou log ${a}`);
  }
});

console.log(`\n✓ ${ok.length} passaram`);
ok.forEach((n) => console.log('  ✓', n));
if (fail.length) { console.log(`\n✗ ${fail.length} falharam`); fail.forEach((n) => console.log('  ✗', n)); }
await prisma.$disconnect();
process.exit(fail.length ? 1 : 0);
