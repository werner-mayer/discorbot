import { CustomId } from '../../models/customIds.js';
import { infoEmbed, successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';
import { NotFoundError } from '../../utils/errors.js';

/**
 * Botoes do convite. Como a mensagem pode chegar por DM, o servidor e
 * resolvido pelo convite (que guarda discordGuildId), nao pela interacao.
 */
async function resolveDiscordGuild(interaction, discordGuildId) {
  const discordGuild = await interaction.client.guilds.fetch(discordGuildId).catch(() => null);
  if (!discordGuild) throw new NotFoundError('Não consegui acessar o servidor desta guilda.');
  return discordGuild;
}

export const acceptInviteButton = {
  customId: CustomId.INVITE_ACCEPT,
  async execute(interaction, { args, services }) {
    const [inviteId] = args;
    await deferEphemeral(interaction);

    const invite = await services.inviteService.loadPendingInvite(inviteId, interaction.user.id);
    const discordGuild = await resolveDiscordGuild(interaction, invite.discordGuildId);
    const { guild } = await services.inviteService.accept(discordGuild, inviteId, interaction.user.id);

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          `Bem-vindo à guilda ${guild.name} [${guild.tag}]!`,
          `Você recebeu o cargo da guilda e já tem acesso a <#${guild.textChannelId}> e ao canal de voz.`,
        ),
      ],
      components: [],
    });
  },
};

export const declineInviteButton = {
  customId: CustomId.INVITE_DECLINE,
  async execute(interaction, { args, services }) {
    const [inviteId] = args;
    const invite = await services.inviteService.decline(inviteId, interaction.user.id);
    return replyEphemeral(interaction, {
      embeds: [infoEmbed('Convite recusado', `Você recusou o convite para **${invite.guild.name}**.`)],
      components: [],
    });
  },
};
