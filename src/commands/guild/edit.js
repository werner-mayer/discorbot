import { editGuildModal } from '../../interactions/components.js';

/** /cla edit — abre o modal de edição do clã. */
export default async function edit(interaction, { services }) {
  const { guild } = await services.guildService.requireUserGuild(interaction.guild.id, interaction.user.id);
  services.permissionService.assertCanEditGuild(guild, interaction.member);
  return interaction.showModal(editGuildModal(guild));
}
