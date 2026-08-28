import { joinPolicyRow, clanEmojiRow } from '../../interactions/components.js';
import { CustomId } from '../../models/customIds.js';
import { settingsEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** /cla settings — painel de configurações do clã. */
export default async function settings(interaction, { services }) {
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);

  return replyEphemeral(interaction, {
    embeds: [settingsEmbed(guild)],
    components: [joinPolicyRow(guild), clanEmojiRow(CustomId.EMOJI_SETTINGS, guild.emoji)],
  });
}
