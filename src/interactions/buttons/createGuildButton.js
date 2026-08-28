import { CustomId } from '../../models/customIds.js';
import { createGuildModal } from '../components.js';
import { errorEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** Botao "Criar Guilda" do painel: abre o modal. */
export default {
  customId: CustomId.CREATE_BUTTON,
  async execute(interaction, { services }) {
    const existing = await services.guildService.getUserGuild(interaction.guild.id, interaction.user.id);
    if (existing) {
      return replyEphemeral(interaction, {
        embeds: [
          errorEmbed(
            `Você já faz parte da guilda **${existing.guild.name}** [${existing.guild.tag}].\nUse \`/guild leave\` antes de criar outra.`,
          ),
        ],
      });
    }
    return interaction.showModal(createGuildModal());
  },
};
