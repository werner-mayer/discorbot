import { CustomId, buildCustomId } from '../../models/customIds.js';
import { dangerConfirmRow } from '../../interactions/components.js';
import { warningEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/**
 * /cla delete [cla]
 *
 * Sem a opção `cla`, apaga o clã de quem chamou (uso do líder).
 * Com a opção, apaga o clã indicado — a permissão decide quem pode:
 * o líder só apaga o próprio, administradores apagam qualquer um.
 */
export default async function deleteGuild(interaction, { services }) {
  const termo = interaction.options.getString('cla');

  const guild = termo
    ? await services.joinRequestService.resolveGuild(interaction.guild.id, termo)
    : (await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id)).guild;

  services.permissionService.assertCanDeleteGuild(guild, interaction.member);

  const total = await services.guildService.countMembers(guild.id);
  const doOutro = guild.ownerId !== interaction.user.id;

  return replyEphemeral(interaction, {
    embeds: [
      warningEmbed(
        `Excluir o clã ${guild.name} [${guild.tag}]?`,
        [
          doOutro ? `Liderado por <@${guild.ownerId}>.` : null,
          `Cargo, categoria e canais serão apagados e ${total} membro(s) serão desvinculados.`,
          '**Esta ação é irreversível.**',
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    ],
    components: [dangerConfirmRow(buildCustomId(CustomId.DELETE_CONFIRM, guild.id))],
  });
}
