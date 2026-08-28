import { ChannelType } from 'discord.js';
import config from '../../config/index.js';
import { creationPanelEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createGuildButtonRow } from '../../interactions/components.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla panel — publica o painel "Criar Clã" (somente administradores). */
export default async function panel(interaction, { services }) {
  services.permissionService.assertServerAdmin(interaction.member);

  const targetChannel =
    interaction.options.getChannel('canal') ??
    (config.discord.guildCreationChannelId
      ? await interaction.guild.channels.fetch(config.discord.guildCreationChannelId).catch(() => null)
      : interaction.channel);

  if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
    return replyEphemeral(interaction, {
      embeds: [
        errorEmbed(
          'Canal inválido. Informe um canal de texto ou configure `GUILD_CREATION_CHANNEL_ID` no `.env`.',
        ),
      ],
    });
  }

  await targetChannel.send({ embeds: [creationPanelEmbed()], components: [createGuildButtonRow()] });

  return replyEphemeral(interaction, {
    embeds: [successEmbed('Painel publicado', `O painel de criação foi enviado em <#${targetChannel.id}>.`)],
  });
}
