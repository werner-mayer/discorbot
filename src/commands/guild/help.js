import { helpEmbeds, helpStaffEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla help — guia de comandos, com o bloco da staff só para quem é staff. */
export default async function help(interaction, { services }) {
  const embeds = helpEmbeds();
  if (services.permissionService.isServerAdmin(interaction.member)) {
    embeds.push(helpStaffEmbed());
  }
  return replyEphemeral(interaction, { embeds });
}
