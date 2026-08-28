import { EmbedBuilder } from 'discord.js';
import { colorToInt } from './color.js';
import { ROLE_LABEL } from '../models/GuildMemberRole.js';

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

/** Painel fixo do canal #create-guild. */
export function creationPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🏰 Sistema de Guildas')
    .setDescription(
      [
        'Crie sua própria guilda com cargo, categoria e canais privados.',
        '',
        'Ao clicar no botão abaixo você informa:',
        '**Nome**, **TAG**, **Cor** e (opcionalmente) os nomes dos canais.',
        '',
        'Cada usuário pode participar de **uma guilda por vez**.',
      ].join('\n'),
    )
    .setFooter({ text: 'Use /guild info para ver os dados da sua guilda.' });
}

export function confirmationEmbed(draft) {
  return new EmbedBuilder()
    .setColor(colorToInt(draft.color))
    .setTitle('Criar guilda?')
    .addFields(
      { name: 'Nome', value: draft.name, inline: true },
      { name: 'Tag', value: `[${draft.tag}]`, inline: true },
      { name: 'Cor', value: draft.color, inline: true },
      { name: 'Canal de texto', value: `#${draft.textChannelName}`, inline: true },
      { name: 'Canal de voz', value: draft.voiceChannelName, inline: true },
    )
    .setFooter({ text: 'Confirme para criar o cargo, a categoria e os canais.' });
}

export function guildInfoEmbed(guildRecord, { memberCount, members = [] }) {
  const owner = `<@${guildRecord.ownerId}>`;
  const embed = new EmbedBuilder()
    .setColor(colorToInt(guildRecord.color))
    .setTitle(`[${guildRecord.tag}] ${guildRecord.name}`)
    .addFields(
      { name: 'Líder', value: owner, inline: true },
      { name: 'Membros', value: String(memberCount), inline: true },
      { name: 'Cor', value: guildRecord.color, inline: true },
      { name: 'Cargo', value: `<@&${guildRecord.roleId}>`, inline: true },
      { name: 'Texto', value: `<#${guildRecord.textChannelId}>`, inline: true },
      { name: 'Voz', value: `<#${guildRecord.voiceChannelId}>`, inline: true },
    )
    .setFooter({ text: `Criada em ${guildRecord.createdAt.toLocaleDateString('pt-BR')}` });

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
    .setTitle('📨 Convite de guilda')
    .setDescription(
      `Você foi convidado por <@${inviterId}> para entrar na guilda **${guildRecord.name}** [${guildRecord.tag}].`,
    );
}
