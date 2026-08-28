import { CustomId } from '../../models/customIds.js';
import { infoEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

export default {
  customId: CustomId.CANCEL_CREATE,
  async execute(interaction, { services }) {
    services.guildDraftStore.clear(interaction.guild.id, interaction.user.id);
    return replyEphemeral(interaction, {
      embeds: [infoEmbed('Operação cancelada', 'Nada foi criado ou alterado.')],
      components: [],
    });
  },
};
