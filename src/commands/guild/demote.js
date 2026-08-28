import { ROLE_LABEL } from '../../models/GuildMemberRole.js';
import { successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /cla demote @usuario — volta a ser membro comum. */
export default async function demote(interaction, { services }) {
  const target = interaction.options.getUser('usuario', true);
  await deferEphemeral(interaction);

  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);

  const updated = await services.memberService.demote(interaction.guild, guild, target.id, {
    actorId: interaction.user.id,
  });

  return replyEphemeral(interaction, {
    embeds: [successEmbed('Membro rebaixado', `<@${target.id}> voltou a ser **${ROLE_LABEL[updated.role]}**.`)],
  });
}
