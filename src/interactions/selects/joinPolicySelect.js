import { CustomId } from '../../models/customIds.js';
import { JOIN_POLICY_DESCRIPTION, JOIN_POLICY_LABEL } from '../../models/JoinPolicy.js';
import { successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** Troca a politica de entrada do cla pelo select menu de /cla settings. */
export default {
  customId: CustomId.SETTINGS_SELECT,
  async execute(interaction, { services }) {
    await deferEphemeral(interaction);

    const { guild } = await services.guildService.requireUserGuild(
      interaction.guild.id,
      interaction.user.id,
    );
    services.permissionService.assertCanEditGuild(guild, interaction.member);

    const [policy] = interaction.values;
    const updated = await services.settingsService.setJoinPolicy(interaction.guild, guild, policy, {
      actorId: interaction.user.id,
    });

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          `Entrada: ${JOIN_POLICY_LABEL[updated.joinPolicy]}`,
          JOIN_POLICY_DESCRIPTION[updated.joinPolicy],
        ),
      ],
      components: [],
    });
  },
};
