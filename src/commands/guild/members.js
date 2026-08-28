import { membersEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla members */
export default async function members(interaction, { services }) {
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  const list = await services.memberService.listMembers(guild.id);
  return replyEphemeral(interaction, { embeds: [membersEmbed(guild, list)] });
}
