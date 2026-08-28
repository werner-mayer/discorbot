import { MessageFlags } from 'discord.js';

/** Responde sempre de forma efemera, respeitando o estado da interacao. */
export async function replyEphemeral(interaction, options) {
  const payload = { ...options, flags: MessageFlags.Ephemeral };
  if (interaction.deferred || interaction.replied) {
    const { flags, ...editable } = payload;
    return interaction.editReply(editable);
  }
  return interaction.reply(payload);
}

export async function deferEphemeral(interaction) {
  if (interaction.deferred || interaction.replied) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}
