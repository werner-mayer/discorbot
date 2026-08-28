/**
 * Testes das features alem do MVP: oficiais, edicao do cla, politicas de
 * entrada, pedidos, pontos/niveis/ranking e guerras entre clas.
 * Usa o mesmo mock da API do Discord e um SQLite proprio.  ->  npm test
 */
import assert from 'node:assert/strict';
import { createMockGuild } from './mocks/discord.js';

if (!/test/i.test(process.env.DATABASE_URL ?? '')) {
  console.error('Abortado: use um DATABASE_URL de teste (npm test já faz isso).');
  process.exit(1);
}

const { default: services } = await import('../src/services/index.js');
const { default: prisma } = await import('../src/database/prisma.js');
const { JoinPolicy } = await import('../src/models/JoinPolicy.js');
const { GuildMemberRole } = await import('../src/models/GuildMemberRole.js');
const { WarStatus } = await import('../src/models/WarStatus.js');

const { guildService, memberService, settingsService, joinRequestService, rankingService, warService } =
  services;

const DG = '7777';
const dg = createMockGuild(DG);
for (const id of ['lider', 'oficial', 'membro', 'forasteiro', 'lider2', 'lider2x']) dg.addUser(id);

await prisma.guildWar.deleteMany({});
await prisma.guildJoinRequest.deleteMany({});
await prisma.guildAuditLog.deleteMany({});
await prisma.guildInvite.deleteMany({});
await prisma.guildMember.deleteMany({});
await prisma.guild.deleteMany({});

const ok = [];
const fail = [];
const test = async (nome, fn) => {
  try { await fn(); ok.push(nome); } catch (e) { fail.push(`${nome}: ${e.message}`); }
};

let cla = await guildService.createGuild(dg, 'lider', { name: 'Lobos', tag: 'LBS', color: '#8B4513' });
let rival = await guildService.createGuild(dg, 'lider2', { name: 'Corvos', tag: 'CRV', color: '#2C3E50' });

await test('promove membro a oficial e rebaixa de volta', async () => {
  await memberService.addMember(dg, cla, 'oficial', { actorId: 'lider' });
  const promovido = await memberService.promote(dg, cla, 'oficial', { actorId: 'lider' });
  assert.equal(promovido.role, GuildMemberRole.OFFICER);

  const rebaixado = await memberService.demote(dg, cla, 'oficial', { actorId: 'lider' });
  assert.equal(rebaixado.role, GuildMemberRole.MEMBER);
});

await test('lider nao pode ser rebaixado', async () => {
  await assert.rejects(() => memberService.demote(dg, cla, 'lider', {}), (e) => /não pode ser rebaixado/.test(e.message));
});

await test('oficial pode gerenciar membros, membro comum nao', async () => {
  await memberService.promote(dg, cla, 'oficial', { actorId: 'lider' });
  const oficial = await prisma.guildMember.findFirst({ where: { guildId: cla.id, discordUserId: 'oficial' } });
  const comum = await prisma.guildMember.findFirst({ where: { guildId: cla.id, discordUserId: 'membro' } });
  assert.equal(services.permissionService.canManageMembers(cla, oficial, dg.members.store.get('oficial')), true);
  assert.equal(services.permissionService.canManageMembers(cla, comum, dg.members.store.get('membro')), false);
});

await test('edita descricao, limite, boas-vindas e cor', async () => {
  const { guild, changed } = await settingsService.updateProfile(dg, cla, {
    description: 'A alcateia do norte',
    welcomeMessage: 'Uivos para {user}, novo membro de {cla}!',
    memberLimit: '5',
    color: 'roxo',
    iconUrl: '',
  }, { actorId: 'lider', memberCount: 2 });

  assert.equal(guild.description, 'A alcateia do norte');
  assert.equal(guild.memberLimit, 5);
  assert.equal(guild.color, '#9B59B6');
  assert.ok(changed.includes('description') && changed.includes('color'));

  const role = await dg.roles.fetch(guild.roleId);
  assert.equal(role.color, '#9B59B6', 'o cargo acompanha a cor nova');
  cla = guild;
});

await test('rejeita limite menor que o numero atual de membros', async () => {
  await assert.rejects(
    () => settingsService.updateProfile(dg, cla, { memberLimit: '1' }, { actorId: 'lider', memberCount: 2 }),
    (e) => /não pode ser menor/.test(e.message),
  );
});

await test('rejeita icone que nao e imagem https', async () => {
  await assert.rejects(
    () => settingsService.updateProfile(dg, cla, { iconUrl: 'http://x.com/a.exe' }, { actorId: 'lider' }),
    (e) => /link https/.test(e.message),
  );
});

await test('nao permite renomear para o nome de outro cla', async () => {
  await assert.rejects(
    () => settingsService.updateProfile(dg, cla, { name: 'Corvos' }, { actorId: 'lider' }),
    (e) => /Já existe um clã/.test(e.message),
  );
});

await test('mensagem de boas-vindas resolve os placeholders', async () => {
  const texto = settingsService.renderWelcome(cla, 'membro');
  assert.equal(texto, 'Uivos para <@membro>, novo membro de Lobos!');
});

await test('boas-vindas e postada no canal do cla quando alguem entra', async () => {
  const canal = await dg.channels.fetch(cla.textChannelId);
  const antes = canal.sent.length;
  await memberService.addMember(dg, cla, 'membro', { actorId: 'lider' });
  assert.equal(canal.sent.length, antes + 1);
  assert.match(canal.sent.at(-1).content, /Uivos para <@membro>/);
});

await test('INVITE_ONLY recusa /cla join', async () => {
  await assert.rejects(
    () => joinRequestService.requestJoin(dg, cla, 'forasteiro'),
    (e) => /só aceita entrada por convite/.test(e.message),
  );
});

await test('APPROVAL cria pedido e aprovacao adiciona o membro', async () => {
  cla = await settingsService.setJoinPolicy(dg, cla, JoinPolicy.APPROVAL, { actorId: 'lider' });
  const { tipo, request } = await joinRequestService.requestJoin(dg, cla, 'forasteiro', 'quero entrar');
  assert.equal(tipo, 'REQUESTED');
  assert.equal(request.message, 'quero entrar');
  assert.equal(await joinRequestService.countPending(cla.id), 1);

  await joinRequestService.approve(dg, request.id, 'lider');
  const membro = await prisma.guildMember.findFirst({ where: { guildId: cla.id, discordUserId: 'forasteiro' } });
  assert.ok(membro, 'forasteiro virou membro');
  assert.ok(dg.members.store.get('forasteiro').roles.cache.has(cla.roleId), 'recebeu o cargo');
  assert.equal(await joinRequestService.countPending(cla.id), 0);
});

await test('pedido nao pode ser respondido duas vezes', async () => {
  const pedido = await prisma.guildJoinRequest.findFirst({ where: { discordUserId: 'forasteiro' } });
  await assert.rejects(() => joinRequestService.approve(dg, pedido.id, 'lider'), (e) => /já foi respondido/.test(e.message));
});

await test('OPEN faz entrar na hora', async () => {
  dg.addUser('avulso');
  rival = await settingsService.setJoinPolicy(dg, rival, JoinPolicy.OPEN, { actorId: 'lider2' });
  const { tipo, guild } = await joinRequestService.requestJoin(dg, rival, 'avulso');
  assert.equal(tipo, 'JOINED');
  assert.equal(guild.id, rival.id);
  assert.ok(dg.members.store.get('avulso').roles.cache.has(rival.roleId));
});

await test('respeita o limite de membros', async () => {
  dg.addUser('excedente');
  await settingsService.updateProfile(dg, rival, { memberLimit: '2' }, { actorId: 'lider2', memberCount: 2 });
  const atualizado = await prisma.guild.findUnique({ where: { id: rival.id } });
  await assert.rejects(
    () => joinRequestService.requestJoin(dg, atualizado, 'excedente'),
    (e) => /atingiu o limite/.test(e.message),
  );
});

await test('pedido recusado nao vira membro', async () => {
  dg.addUser('recusado');
  const { request } = await joinRequestService.requestJoin(dg, cla, 'recusado');
  await joinRequestService.reject(dg, request.id, 'lider');
  const membro = await prisma.guildMember.findFirst({ where: { guildId: cla.id, discordUserId: 'recusado' } });
  assert.equal(membro, null);
});

await test('pontos sobem o nivel na formula configurada', async () => {
  assert.equal(rankingService.levelFor(0), 1);
  assert.equal(rankingService.levelFor(99), 1);
  assert.equal(rankingService.levelFor(100), 2);
  assert.equal(rankingService.levelFor(250), 3);

  const { guild, leveledUp, previousLevel } = await rankingService.addPoints(DG, cla, 120, { actorId: 'admin' });
  assert.equal(guild.points, 120);
  assert.equal(guild.level, 2);
  assert.equal(leveledUp, true);
  assert.equal(previousLevel, 1);
  cla = guild;
});

await test('pontos nunca ficam negativos', async () => {
  const { guild } = await rankingService.addPoints(DG, cla, -500, { actorId: 'admin' });
  assert.equal(guild.points, 0);
  assert.equal(guild.level, 1);
  cla = await rankingService.addPoints(DG, guild, 120, { actorId: 'admin' }).then((r) => r.guild);
});

await test('rejeita ajuste de pontos invalido', async () => {
  await assert.rejects(() => rankingService.addPoints(DG, cla, 0, { actorId: 'a' }), (e) => /diferente de zero/.test(e.message));
});

await test('ranking ordena por pontos e informa a posicao', async () => {
  const top = await rankingService.ranking(DG, 10);
  assert.equal(top[0].id, cla.id, 'quem tem mais pontos vem primeiro');
  const { position, total } = await rankingService.positionOf(DG, cla.id);
  assert.equal(position, 1);
  assert.equal(total, 2);
});

await test('guerra: desafio, aceite, placar e premio', async () => {
  const guerra = await warService.declare(dg, cla, rival, 'lider', 80);
  assert.equal(guerra.status, WarStatus.PENDING);
  assert.equal(guerra.prize, 80);

  const aceita = await warService.accept(dg, guerra.id, 'lider2');
  assert.equal(aceita.status, WarStatus.ACTIVE);

  const pontosAntes = (await prisma.guild.findUnique({ where: { id: cla.id } })).points;
  const { war, winner, premiado } = await warService.report(dg, guerra.id, 3, 1, 'admin');
  assert.equal(war.status, WarStatus.FINISHED);
  assert.equal(winner.id, cla.id);
  assert.equal(premiado.guild.points, pontosAntes + 80);
  cla = premiado.guild;
});

await test('guerra: empate nao move pontos', async () => {
  const guerra = await warService.declare(dg, rival, cla, 'lider2', 50);
  await warService.accept(dg, guerra.id, 'lider');
  const antes = (await prisma.guild.findUnique({ where: { id: cla.id } })).points;
  const { winner } = await warService.report(dg, guerra.id, 2, 2, 'admin');
  assert.equal(winner, null);
  assert.equal((await prisma.guild.findUnique({ where: { id: cla.id } })).points, antes);
});

await test('guerra: nao duplica desafio entre os mesmos clas', async () => {
  const guerra = await warService.declare(dg, cla, rival, 'lider', 10);
  await assert.rejects(() => warService.declare(dg, cla, rival, 'lider', 10), (e) => /desafio pendente/.test(e.message));
  await assert.rejects(() => warService.declare(dg, rival, cla, 'lider2', 10), (e) => /desafio pendente/.test(e.message));
  await warService.cancel(dg, guerra.id, 'lider');
});

await test('guerra: cla nao guerreia consigo mesmo', async () => {
  await assert.rejects(() => warService.declare(dg, cla, cla, 'lider'), (e) => /contra si mesmo/.test(e.message));
});

await test('guerra: so o lider desafiado responde', async () => {
  const guerra = await warService.declare(dg, cla, rival, 'lider', 20);
  assert.throws(() => warService.assertPodeResponder(guerra, 'lider', false), (e) => /líder do clã desafiado/.test(e.message));
  assert.doesNotThrow(() => warService.assertPodeResponder(guerra, 'lider2', false));
  assert.doesNotThrow(() => warService.assertPodeResponder(guerra, 'qualquer', true), 'admin tambem pode');
  await warService.cancel(dg, guerra.id, 'lider');
});

await test('guerra: so reporta placar de guerra ativa', async () => {
  const guerra = await warService.declare(dg, cla, rival, 'lider', 20);
  await assert.rejects(() => warService.report(dg, guerra.id, 1, 0, 'admin'), (e) => /em andamento/.test(e.message));
  await warService.cancel(dg, guerra.id, 'lider');
});

await test('estatisticas de guerra do cla', async () => {
  const stats = await warService.statsFor(cla.id);
  assert.equal(stats.vitorias, 1);
  assert.equal(stats.empates, 1);
  assert.equal(stats.total, 2);
});

await test('busca de clas por nome e por TAG', async () => {
  assert.equal((await guildService.searchGuilds(DG, 'lob'))[0].tag, 'LBS');
  assert.equal((await guildService.searchGuilds(DG, 'crv'))[0].name, 'Corvos');
  assert.equal((await guildService.searchGuilds(DG, '')).length, 2);
});

await test('admin apaga o clã de outra pessoa; líder de fora nao', async () => {
  const admin = dg.addUser('staff', { admin: true });
  const alvo = await guildService.createGuild(dg, 'lider2x', { name: 'Alvos', tag: 'ALV', color: '#123123' });

  // o líder de outro clã nao pode apagar este
  assert.equal(services.permissionService.canDeleteGuild(alvo, dg.members.store.get('lider')), false);
  // o admin do servidor pode
  assert.equal(services.permissionService.canDeleteGuild(alvo, admin), true);
  // e o proprio dono tambem
  assert.equal(services.permissionService.canDeleteGuild(alvo, dg.members.store.get('lider2x')), true);

  const roleId = alvo.roleId;
  await guildService.deleteGuild(dg, alvo, 'staff');
  assert.equal(dg.roles.store.has(roleId), false, 'cargo apagado');
  assert.equal(await prisma.guild.count({ where: { id: alvo.id } }), 0, 'registro apagado');
});

await test('resolve o clã pelo termo do autocomplete (TAG ou nome)', async () => {
  const porTag = await joinRequestService.resolveGuild(DG, 'LBS');
  const porNome = await joinRequestService.resolveGuild(DG, 'corvo');
  assert.equal(porTag.name, 'Lobos');
  assert.equal(porNome.tag, 'CRV');
  await assert.rejects(() => joinRequestService.resolveGuild(DG, 'nao-existe'), (e) => /Nenhum clã encontrado/.test(e.message));
});

console.log(`\n✓ ${ok.length} passaram`);
ok.forEach((n) => console.log('  ✓', n));
if (fail.length) { console.log(`\n✗ ${fail.length} falharam`); fail.forEach((n) => console.log('  ✗', n)); }
await prisma.$disconnect();
process.exit(fail.length ? 1 : 0);
