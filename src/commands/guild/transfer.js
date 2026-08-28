import { successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /guild transfer @usuario — passa a liderança para outro membro. */
export default async function transfer(interaction, { services }) {
  const target = interaction.options.getUser('usuario', true);
  await deferEphemeral(interaction);

  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);

  const updated = await services.memberService.transferOwnership(interaction.guild, guild, target.id, {
    actorId: interaction.user.id,
  });

  return replyEphemeral(interaction, {
    embeds: [
      successEmbed(
        'Liderança transferida',
        `<@${target.id}> agora é o líder de **${updated.name}**. Você passou a ser oficial.`,
      ),
    ],
  });
}
