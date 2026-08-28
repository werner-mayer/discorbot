import { createGuildModal } from '../../interactions/components.js';
import { errorEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';
import config from '../../config/index.js';

/** /guild create — mesmo fluxo do botao do painel. */
export default async function create(interaction, { services }) {
  const creationChannelId = config.discord.guildCreationChannelId;
  const existing = await services.guildService.getUserGuild(interaction.guild.id, interaction.user.id);

  if (existing) {
    return replyEphemeral(interaction, {
      embeds: [
        errorEmbed(
          `Você já faz parte da guilda **${existing.guild.name}** [${existing.guild.tag}].\nUse \`/guild leave\` antes de criar outra.`,
        ),
      ],
    });
  }

  if (creationChannelId && interaction.channelId !== creationChannelId) {
    return replyEphemeral(interaction, {
      embeds: [errorEmbed(`Use este comando em <#${creationChannelId}>.`)],
    });
  }

  return interaction.showModal(createGuildModal());
}
