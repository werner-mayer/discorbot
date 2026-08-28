import { CustomId } from '../../models/customIds.js';
import { successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';
import { AuditAction } from '../../models/AuditAction.js';

/** Confirmacao de exclusao do clã (customId: guild:delete-confirm:<guildId>). */
export const deleteGuildButton = {
  customId: CustomId.DELETE_CONFIRM,
  async execute(interaction, { args, services }) {
    const [guildId] = args;
    await deferEphemeral(interaction);

    const guildRecord = await services.guildService.getById(guildId);
    services.permissionService.assertCanDeleteGuild(guildRecord, interaction.member);

    const { removedMembers } = await services.guildService.deleteGuild(
      interaction.guild,
      guildRecord,
      interaction.user.id,
    );

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          `Clã ${guildRecord.name} excluída`,
          `Cargo, categoria e canais removidos. ${removedMembers} membro(s) desvinculado(s).`,
        ),
      ],
      components: [],
    });
  },
};

/** Confirmacao de saida do clã (customId: guild:leave-confirm:<guildId>). */
export const leaveGuildButton = {
  customId: CustomId.LEAVE_CONFIRM,
  async execute(interaction, { args, services }) {
    const [guildId] = args;
    await deferEphemeral(interaction);

    const guildRecord = await services.guildService.getById(guildId);
    await services.memberService.removeMember(interaction.guild, guildRecord, interaction.user.id, {
      actorId: interaction.user.id,
      action: AuditAction.MEMBER_LEFT,
    });

    return replyEphemeral(interaction, {
      embeds: [
        successEmbed(
          `Você saiu de ${guildRecord.name}`,
          'O cargo foi removido e você perdeu o acesso aos canais do clã.',
        ),
      ],
      components: [],
    });
  },
};
