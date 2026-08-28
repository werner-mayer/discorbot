import { infoEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla list — visao geral dos clãs do servidor (administradores). */
export default async function list(interaction, { services }) {
  services.permissionService.assertServerAdmin(interaction.member);

  const guilds = await services.guildService.listByServer(interaction.guild.id);
  const lines = guilds.map(
    (guild) =>
      `**[${guild.tag}] ${guild.name}** — <@&${guild.roleId}> · ${guild._count.members} membro(s) · líder <@${guild.ownerId}>`,
  );

  return replyEphemeral(interaction, {
    embeds: [
      infoEmbed(
        `Clãs do servidor (${guilds.length})`,
        lines.join('\n') || 'Nenhum clã criado ainda.',
      ),
    ],
  });
}
