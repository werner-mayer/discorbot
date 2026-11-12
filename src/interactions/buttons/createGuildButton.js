import { CustomId } from '../../models/customIds.js';
import { createGuildModal } from '../components.js';
import { errorEmbed } from '../../utils/embeds.js';
import { replyEphemeral } from '../../utils/interactionReply.js';

/** Botao "Criar Clã" do painel: abre o modal. */
export default {
  customId: CustomId.CREATE_BUTTON,
  async execute(interaction, { services }) {
    const existing = await services.guildService.getUserGuild(interaction.guild.id, interaction.user.id);
    if (existing) {
      return replyEphemeral(interaction, {
        embeds: [
          errorEmbed(
            `Você já faz parte do clã **${existing.guild.name}** [${existing.guild.tag}].\nUse \`/cla leave\` antes de criar outra.`,
          ),
        ],
      });
    }
    await services.guildService.assertCanCreate(interaction.guild, interaction.user.id, {
      isAdmin: services.permissionService.isServerAdmin(interaction.member),
    });
    return interaction.showModal(createGuildModal());
  },
};
