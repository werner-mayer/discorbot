import { successEmbed } from '../../utils/embeds.js';
import { deferEphemeral, replyEphemeral } from '../../utils/interactionReply.js';

/** /cla points <cla> <valor> [motivo] — administradores ajustam a pontuação. */
export default async function points(interaction, { services }) {
  services.permissionService.assertServerAdmin(interaction.member);

  const termo = interaction.options.getString('cla', true);
  const valor = interaction.options.getInteger('valor', true);
  const motivo = interaction.options.getString('motivo');
  await deferEphemeral(interaction);

  const alvo = await services.joinRequestService.resolveGuild(interaction.guild.id, termo);
  const { guild, leveledUp, previousLevel } = await services.rankingService.addPoints(
    interaction.guild.id,
    alvo,
    valor,
    { actorId: interaction.user.id, reason: motivo },
  );

  const sinal = valor > 0 ? `+${valor}` : String(valor);
  return replyEphemeral(interaction, {
    embeds: [
      successEmbed(
        `${sinal} pontos para ${guild.name}`,
        [
          `Total: **${guild.points}** pontos · nível **${guild.level}**`,
          leveledUp ? `🎉 Subiu do nível ${previousLevel} para o ${guild.level}!` : null,
          motivo ? `Motivo: ${motivo}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    ],
  });
}
