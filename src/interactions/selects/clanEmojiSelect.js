import { CustomId } from '../../models/customIds.js';
import { errorEmbed, successEmbed, settingsEmbed } from '../../utils/embeds.js';
import { confirmationPayload } from '../modals/createGuildModal.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** Emoji escolhido durante a criacao: atualiza o rascunho e redesenha a previa. */
export const createEmojiSelect = {
  customId: CustomId.EMOJI_CREATE,
  async execute(interaction, { services }) {
    const draft = services.guildDraftStore.get(interaction.guild.id, interaction.user.id);
    if (!draft) {
      return replyEphemeral(interaction, {
        embeds: [errorEmbed('Seu rascunho expirou. Clique em **Criar Clã** novamente.')],
        components: [],
      });
    }

    const [emoji] = interaction.values;
    const atualizado = services.guildDraftStore.save(interaction.guild.id, interaction.user.id, {
      ...draft,
      emoji,
    });

    return interaction.update(confirmationPayload(atualizado, services));
  },
};

/** Emoji trocado em /cla settings: renomeia cargo, categoria e canais. */
export const settingsEmojiSelect = {
  customId: CustomId.EMOJI_SETTINGS,
  async execute(interaction, { services }) {
    await deferEphemeral(interaction);

    const { guild } = await services.guildService.requireUserGuild(
      interaction.guild.id,
      interaction.user.id,
    );
    services.permissionService.assertCanEditGuild(guild, interaction.member);

    const [emoji] = interaction.values;
    const atualizado = await services.settingsService.setEmoji(interaction.guild, guild, emoji, {
      actorId: interaction.user.id,
    });

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(`Emoji alterado para ${atualizado.emoji}`, 'Cargo, categoria e canais foram renomeados.'),
        settingsEmbed(atualizado),
      ],
      components: [],
    });
  },
};
