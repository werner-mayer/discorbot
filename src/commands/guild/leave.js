import { CustomId, buildCustomId } from '../../models/customIds.js';
import { dangerConfirmRow } from '../../interactions/components.js';
import { warningEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla leave — pede confirmacao antes de remover o cargo e o acesso. */
export default async function leave(interaction, { services }) {
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);

  return replyEphemeral(interaction, {
    embeds: [
      warningEmbed(
        `Sair de ${guild.name} [${guild.tag}]?`,
        'Você perderá o cargo e o acesso aos canais do clã.',
      ),
    ],
    components: [dangerConfirmRow(buildCustomId(CustomId.LEAVE_CONFIRM, guild.id), 'Sair do clã')],
  });
}
