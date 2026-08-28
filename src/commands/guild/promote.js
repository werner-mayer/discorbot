import { ROLE_LABEL } from '../../models/GuildMemberRole.js';
import { successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /cla promote @usuario — vira oficial. */
export default async function promote(interaction, { services }) {
  const target = interaction.options.getUser('usuario', true);
  await deferEphemeral(interaction);

  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);

  const updated = await services.memberService.promote(interaction.guild, guild, target.id, {
    actorId: interaction.user.id,
  });

  return replyEphemeral(interaction, {
    embeds: [
      successEmbed(
        'Membro promovido',
        `<@${target.id}> agora é **${ROLE_LABEL[updated.role]}** e pode convidar e remover membros.`,
      ),
    ],
  });
}
