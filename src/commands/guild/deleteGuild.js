import { CustomId, buildCustomId } from '../../models/customIds.js';
import { dangerConfirmRow } from '../../interactions/components.js';
import { warningEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla delete — apenas lider ou administrador. */
export default async function deleteGuild(interaction, { services }) {
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanDeleteGuild(guild, interaction.member);

  const total = await services.guildService.countMembers(guild.id);

  return replyEphemeral(interaction, {
    embeds: [
      warningEmbed(
        `Excluir o clã ${guild.name} [${guild.tag}]?`,
        `Cargo, categoria e canais serão apagados e ${total} membro(s) serão desvinculados. **Esta ação é irreversível.**`,
      ),
    ],
    components: [dangerConfirmRow(buildCustomId(CustomId.DELETE_CONFIRM, guild.id))],
  });
}
