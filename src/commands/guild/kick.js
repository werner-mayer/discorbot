import { AuditAction } from '../../models/AuditAction.js';
import { successEmbed } from '../../utils/embeds.js';
import { ValidationError } from '../../utils/errors.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /cla kick @usuario */
export default async function kick(interaction, { services }) {
  const target = interaction.options.getUser('usuario', true);
  await deferEphemeral(interaction);

  const { guild, membership } = await services.guildService.requireUserGuild(
    interaction.guild.id,
    interaction.user.id,
  );
  services.permissionService.assertCanManageMembers(guild, membership, interaction.member);

  if (target.id === interaction.user.id) {
    throw new ValidationError('Para sair do clã use `/cla leave`.');
  }

  await services.memberService.removeMember(interaction.guild, guild, target.id, {
    actorId: interaction.user.id,
    action: AuditAction.MEMBER_KICKED,
  });

  return replyEphemeral(interaction, {
    embeds: [successEmbed('Membro removido', `<@${target.id}> foi removido de **${guild.name}**.`)],
  });
}
