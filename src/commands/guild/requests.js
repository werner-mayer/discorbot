import { requestsListEmbed } from '../../utils/embeds.js';
import { joinRequestRow } from '../../interactions/components.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla requests — pedidos de entrada pendentes, com botões de decisão. */
export default async function requests(interaction, { services }) {
  const { guild, membership } = await services.guildService.requireUserGuild(
    interaction.guild.id,
    interaction.user.id,
  );
  services.permissionService.assertCanManageMembers(guild, membership, interaction.member);

  const pendentes = await services.joinRequestService.listPending(guild.id);

  return replyEphemeral(interaction, {
    embeds: [requestsListEmbed(guild, pendentes)],
    // Um conjunto de botões por pedido, respeitando o limite de 5 linhas.
    components: pendentes.slice(0, 5).map((pedido) => joinRequestRow(pedido.id)),
  });
}
