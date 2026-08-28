import { guildInfoEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla info — dados do clã do usuário (ou do clã de outro membro). */
export default async function info(interaction, { services }) {
  const target = interaction.options.getUser('usuario') ?? interaction.user;
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, target.id);

  // Reconcilia com o Discord antes de exibir IDs de cargo/canais.
  const { guild: current } = await services.guildService.repairGuild(interaction.guild, guild, {
    actorId: interaction.user.id,
    reassignRoles: false,
  });

  const [members, position, warStats, pendingRequests] = await Promise.all([
    services.memberService.listMembers(current.id),
    services.rankingService.positionOf(interaction.guild.id, current.id),
    services.warService.statsFor(current.id),
    services.joinRequestService.countPending(current.id),
  ]);

  return replyEphemeral(interaction, {
    embeds: [
      guildInfoEmbed(current, {
        memberCount: members.length,
        members,
        progress: services.rankingService.progressFor(current.points),
        position,
        warStats,
        pendingRequests,
      }),
    ],
  });
}
