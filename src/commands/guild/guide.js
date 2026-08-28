import { ChannelType } from 'discord.js';
import config from '../../config/index.js';
import { helpEmbeds, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla guide — publica o guia público num canal (somente administradores). */
export default async function guide(interaction, { services }) {
  services.permissionService.assertServerAdmin(interaction.member);

  const canal =
    interaction.options.getChannel('canal') ??
    (config.discord.guildCreationChannelId
      ? await interaction.guild.channels.fetch(config.discord.guildCreationChannelId).catch(() => null)
      : interaction.channel);

  if (!canal || canal.type !== ChannelType.GuildText) {
    return replyEphemeral(interaction, {
      embeds: [errorEmbed('Informe um canal de texto válido.')],
    });
  }

  const mensagem = await canal.send({ embeds: helpEmbeds() });
  // Fixar exige Gerenciar Mensagens; se o bot não tiver, segue sem fixar.
  await mensagem.pin().catch(() => null);

  return replyEphemeral(interaction, {
    embeds: [successEmbed('Guia publicado', `O guia de comandos foi enviado em <#${canal.id}>.`)],
  });
}
