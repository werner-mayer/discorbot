import { EmbedBuilder } from 'discord.js';
import { colorToInt } from './color.js';
import { ROLE_LABEL } from '../models/GuildMemberRole.js';
import { JOIN_POLICY_LABEL } from '../models/JoinPolicy.js';
import { WAR_STATUS_LABEL } from '../models/WarStatus.js';
import { AUDIT_LABEL } from '../models/AuditAction.js';

const COLORS = {
  success: 0x2ecc71,
  error: 0xe74c3c,
  warning: 0xf1c40f,
  info: 0x5865f2,
};

export function successEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${title}`).setDescription(description ?? null);
}

export function errorEmbed(description, title = 'Não foi possível continuar') {
  return new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${title}`).setDescription(description);
}

export function warningEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.warning).setTitle(`⚠️ ${title}`).setDescription(description ?? null);
}

export function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description ?? null);
}

/** Painel fixo do canal de criação de clãs. */
export function creationPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('⚔️ Sistema de Clãs')
    .setDescription(
      [
        'Crie seu próprio clã com cargo, categoria e canais privados.',
        '',
        'Ao clicar no botão abaixo você informa:',
        '**Nome**, **TAG**, **Cor** e (opcionalmente) os nomes dos canais.',
        '',
        'Cada usuário pode participar de **um clã por vez**.',
      ].join('\n'),
    )
    .setFooter({ text: 'Use /cla info para ver os dados do seu clã.' });
}

export function confirmationEmbed(draft) {
  return new EmbedBuilder()
    .setColor(colorToInt(draft.color))
    .setTitle('Criar clã?')
    .addFields(
      { name: 'Nome', value: draft.name, inline: true },
      { name: 'Tag', value: `[${draft.tag}]`, inline: true },
      { name: 'Cor', value: draft.color, inline: true },
      { name: 'Canal de texto', value: `#${draft.textChannelName}`, inline: true },
      { name: 'Canal de voz', value: draft.voiceChannelName, inline: true },
    )
    .setFooter({ text: 'Confirme para criar o cargo, a categoria e os canais.' });
}

export function guildInfoEmbed(
  guildRecord,
  { memberCount, members = [], progress = null, position = null, warStats = null, pendingRequests = 0 },
) {
  const owner = `<@${guildRecord.ownerId}>`;
  const limite = guildRecord.memberLimit ? `/${guildRecord.memberLimit}` : '';
  const embed = new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle(`[${guildRecord.tag}] ${guildRecord.name}`)
    .addFields(
      { name: 'Líder', value: owner, inline: true },
      { name: 'Membros', value: `${memberCount}${limite}`, inline: true },
      { name: 'Entrada', value: JOIN_POLICY_LABEL[guildRecord.joinPolicy] ?? '—', inline: true },
      {
        name: `Nível ${guildRecord.level}`,
        value: progress
          ? `${guildRecord.points} pts · faltam ${progress.missing} para o nível ${guildRecord.level + 1}`
          : `${guildRecord.points} pts`,
        inline: true,
      },
      {
        name: 'Ranking',
        value: position ? `#${position.position} de ${position.total}` : '—',
        inline: true,
      },
      { name: 'Cor', value: guildRecord.color, inline: true },
      { name: 'Cargo', value: `<@&${guildRecord.roleId}>`, inline: true },
      { name: 'Texto', value: `<#${guildRecord.textChannelId}>`, inline: true },
      { name: 'Voz', value: `<#${guildRecord.voiceChannelId}>`, inline: true },
    )
    .setFooter({ text: `Criado em ${guildRecord.createdAt.toLocaleDateString('pt-BR')}` });

  if (warStats && (warStats.total || warStats.emAndamento)) {
    embed.addFields({
      name: 'Guerras',
      value:
        `${warStats.vitorias}V · ${warStats.derrotas}D · ${warStats.empates}E` +
        (warStats.emAndamento ? ` · ${warStats.emAndamento} em andamento` : ''),
      inline: true,
    });
  }
  if (pendingRequests) {
    embed.addFields({
      name: 'Pedidos pendentes',
      value: `${pendingRequests} — veja com \`/cla requests\``,
      inline: true,
    });
  }

  if (guildRecord.description) embed.setDescription(guildRecord.description);
  if (guildRecord.iconUrl) embed.setThumbnail(guildRecord.iconUrl);

  if (members.length) {
    const preview = members
      .slice(0, 10)
      .map((member) => `${ROLE_LABEL[member.role] ?? member.role} — <@${member.discordUserId}>`)
      .join('\n');
    embed.addFields({
      name: 'Equipe',
      value: members.length > 10 ? `${preview}\n…e mais ${members.length - 10}` : preview,
    });
  }

  return embed;
}

export function membersEmbed(guildRecord, members) {
  const lines = members.map(
    (member, index) =>
      `\`${String(index + 1).padStart(2, '0')}\` <@${member.discordUserId}> — **${ROLE_LABEL[member.role] ?? member.role}**`,
  );
  return new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle(`Membros de [${guildRecord.tag}] ${guildRecord.name}`)
    .setDescription(lines.join('\n') || 'Nenhum membro.')
    .setFooter({ text: `${members.length} membro(s)` });
}

export function inviteEmbed(guildRecord, inviterId) {
  return new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle('📨 Convite de clã')
    .setDescription(
      `Você foi convidado por <@${inviterId}> para entrar no clã **${guildRecord.name}** [${guildRecord.tag}].`,
    );
}


export function rankingEmbed(guilds, { pointsPerLevel }) {
  const medalha = ['🥇', '🥈', '🥉'];
  const linhas = guilds.map((guild, index) => {
    const posicao = medalha[index] ?? `\`${String(index + 1).padStart(2, '0')}\``;
    return (
      `${posicao} **[${guild.tag}] ${guild.name}** — ` +
      `nível ${guild.level} · ${guild.points} pts · ${guild._count?.members ?? 0} membro(s)`
    );
  });

  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🏆 Ranking de clãs')
    .setDescription(linhas.join('\n') || 'Nenhum clã pontuou ainda.')
    .setFooter({ text: `A cada ${pointsPerLevel} pontos o clã sobe um nível.` });
}

export function joinRequestEmbed(guildRecord, request, user) {
  const embed = new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle('📥 Pedido de entrada')
    .setDescription(`<@${request.discordUserId}> quer entrar em **${guildRecord.name}** [${guildRecord.tag}].`);

  if (request.message) embed.addFields({ name: 'Mensagem', value: request.message });
  if (user?.displayAvatarURL) embed.setThumbnail(user.displayAvatarURL());
  return embed;
}

export function requestsListEmbed(guildRecord, requests) {
  const linhas = requests.map(
    (request, index) =>
      `\`${String(index + 1).padStart(2, '0')}\` <@${request.discordUserId}>` +
      (request.message ? ` — _${request.message.slice(0, 80)}_` : ''),
  );
  return new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle(`Pedidos pendentes — [${guildRecord.tag}] ${guildRecord.name}`)
    .setDescription(linhas.join('\n') || 'Nenhum pedido pendente.')
    .setFooter({ text: `${requests.length} pedido(s)` });
}

export function warEmbed(war, { titulo = null } = {}) {
  const embed = new EmbedBuilder()
    .setColor(colorToInt(war.challenger.color))
    .setTitle(titulo ?? `⚔️ ${war.challenger.name} vs ${war.opponent.name}`)
    .addFields(
      { name: 'Desafiante', value: `**[${war.challenger.tag}] ${war.challenger.name}**`, inline: true },
      { name: 'Desafiado', value: `**[${war.opponent.tag}] ${war.opponent.name}**`, inline: true },
      { name: 'Status', value: WAR_STATUS_LABEL[war.status] ?? war.status, inline: true },
    );

  if (war.prize) embed.addFields({ name: 'Em disputa', value: `${war.prize} pontos`, inline: true });
  if (war.status === 'FINISHED') {
    embed.addFields(
      { name: 'Placar', value: `${war.challengerScore} x ${war.opponentScore}`, inline: true },
      {
        name: 'Resultado',
        value: war.winnerId
          ? `🏆 ${war.winnerId === war.challengerId ? war.challenger.name : war.opponent.name}`
          : '🤝 Empate',
        inline: true,
      },
    );
  }
  return embed;
}

export function warsListEmbed(wars) {
  const linhas = wars.map(
    (war) =>
      `${WAR_STATUS_LABEL[war.status] ?? war.status} — **${war.challenger.name}** vs **${war.opponent.name}**` +
      (war.prize ? ` · ${war.prize} pts` : ''),
  );
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('⚔️ Guerras em aberto')
    .setDescription(linhas.join('\n') || 'Nenhuma guerra em aberto.');
}

export function auditLogEmbed(logs, { resolveGuildName } = {}) {
  const linhas = logs.map((log) => {
    const quando = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
    const alvo = log.targetId ? ` → <@${log.targetId}>` : '';
    const cla = resolveGuildName?.(log.guildId);
    return `${quando} **${AUDIT_LABEL[log.action] ?? log.action}** por <@${log.actorId}>${alvo}${cla ? ` _(${cla})_` : ''}`;
  });
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📋 Log administrativo')
    .setDescription(linhas.join('\n') || 'Nenhuma ação registrada ainda.')
    .setFooter({ text: `${logs.length} registro(s) mais recentes` });
}

export function settingsEmbed(guildRecord) {
  return new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle(`Configurações — [${guildRecord.tag}] ${guildRecord.name}`)
    .addFields(
      { name: 'Entrada', value: JOIN_POLICY_LABEL[guildRecord.joinPolicy] ?? '—', inline: true },
      { name: 'Limite de membros', value: guildRecord.memberLimit ? String(guildRecord.memberLimit) : 'sem limite', inline: true },
      { name: 'Descrição', value: guildRecord.description || '_não definida_' },
      { name: 'Boas-vindas', value: guildRecord.welcomeMessage || '_padrão do bot_' },
      { name: 'Ícone', value: guildRecord.iconUrl || '_não definido_' },
    )
    .setFooter({ text: 'Use /cla edit para alterar textos e limite.' });
}


/**
 * Guia de comandos. Dividido por quem usa cada coisa, porque a lista corrida
 * de 20 subcomandos nao ajuda ninguem a comecar.
 */
export function helpEmbeds() {
  const comoFunciona = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('⚔️ Como funcionam os clãs')
    .setDescription(
      [
        'Cada clã tem **cargo colorido**, **categoria** e **canais de texto e voz privados**.',
        'Só quem é do clã enxerga esses canais — a staff do servidor mantém acesso.',
        '',
        'Você pode estar em **um clã por vez**.',
      ].join('\n'),
    )
    .addFields(
      {
        name: '1️⃣ Criar um clã',
        value:
          'Clique em **Criar Clã** no painel e preencha nome, TAG e cor.\n' +
          'O bot monta cargo, categoria e canais sozinho.',
      },
      {
        name: '2️⃣ Entrar em um clã existente',
        value:
          '`/cla join <clã>` — o nome aparece sozinho enquanto você digita.\n' +
          'Dependendo do clã você entra na hora, manda um pedido, ou precisa de convite.',
      },
      {
        name: '3️⃣ Chamar gente',
        value: '`/cla invite @usuário` — a pessoa recebe um convite com botões de aceitar e recusar.',
      },
    );

  const comandos = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📖 Comandos')
    .addFields(
      {
        name: '👥 Qualquer um',
        value: [
          '`/cla join <clã> [mensagem]` — entrar ou pedir entrada',
          '`/cla info [usuário]` — ver um clã: nível, pontos, membros, guerras',
          '`/cla ranking` — os clãs com mais pontos',
          '`/cla war list` — guerras acontecendo',
          '`/cla help` — este guia',
        ].join('\n'),
      },
      {
        name: '🛡️ Membros do clã',
        value: ['`/cla members` — quem está no seu clã', '`/cla leave` — sair do clã'].join('\n'),
      },
      {
        name: '⭐ Líder e oficiais',
        value: [
          '`/cla invite @usuário` — convidar',
          '`/cla requests` — aprovar ou recusar pedidos de entrada',
          '`/cla kick @usuário` — remover alguém',
        ].join('\n'),
      },
      {
        name: '👑 Só o líder',
        value: [
          '`/cla edit` — descrição, boas-vindas, ícone, limite e cor',
          '`/cla settings` — quem pode entrar: convite, aprovação ou livre',
          '`/cla promote @usuário` · `/cla demote @usuário` — oficiais',
          '`/cla transfer @usuário` — passar a liderança',
          '`/cla war challenge <clã>` — desafiar outro clã',
          '`/cla delete` — encerrar o clã',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'As respostas do bot só aparecem para você.' });

  return [comoFunciona, comandos];
}

/** Bloco extra do guia, para quem é da staff. */
export function helpStaffEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🔧 Comandos da staff')
    .addFields(
      {
        name: 'Administração',
        value: [
          '`/cla list` — todos os clãs do servidor',
          '`/cla logs [limite]` — histórico de tudo que aconteceu',
          '`/cla panel [canal]` — publicar o painel de criação',
          '`/cla guide [canal]` — publicar este guia',
          '`/cla repair todas:true` — recriar cargos e canais apagados na mão',
        ].join('\n'),
      },
      {
        name: 'Pontuação e guerras',
        value: [
          '`/cla points <clã> <valor> [motivo]` — dar ou tirar pontos',
          '`/cla war report <guerra> <placar>` — registrar o resultado',
          '`/cla war cancel <guerra>` — cancelar',
          '',
          'Quem reporta o placar é a staff, não os clãs envolvidos.',
        ].join('\n'),
      },
    );
}
