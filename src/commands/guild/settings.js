import { joinPolicyRow } from '../../interactions/components.js';
import { settingsEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla settings — painel de configurações do clã. */
export default async function settings(interaction, { services }) {
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);

  return replyEphemeral(interaction, {
    embeds: [settingsEmbed(guild)],
    components: [joinPolicyRow(guild)],
  });
}
