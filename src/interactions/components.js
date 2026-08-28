import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import config from '../config/index.js';
import { CustomId, buildCustomId } from '../models/customIds.js';

export function createGuildButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.CREATE_BUTTON)
      .setLabel('Criar Clã')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Success),
  );
}

/** Modal de criacao. O Discord permite no maximo 5 campos por modal. */
export function createGuildModal() {
  const { guild } = config;

  const rows = [
    new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Nome do clã')
      .setPlaceholder('Dragons')
      .setStyle(TextInputStyle.Short)
      .setMinLength(guild.nameMinLength)
      .setMaxLength(guild.nameMaxLength)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('tag')
      .setLabel(`TAG (${guild.tagMinLength} a ${guild.tagMaxLength} caracteres)`)
      .setPlaceholder('DRG')
      .setStyle(TextInputStyle.Short)
      .setMinLength(guild.tagMinLength)
      .setMaxLength(guild.tagMaxLength)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Cor (hexadecimal ou nome)')
      .setPlaceholder('#FF0000 ou vermelho')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(20)
      .setRequired(true),
  ];

  if (guild.allowCustomChannelNames) {
    rows.push(
      new TextInputBuilder()
        .setCustomId('textChannelName')
        .setLabel('Nome do canal de texto (opcional)')
        .setPlaceholder(guild.defaultTextChannelName)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(90)
        .setRequired(false),
      new TextInputBuilder()
        .setCustomId('voiceChannelName')
        .setLabel('Nome do canal de voz (opcional)')
        .setPlaceholder(guild.defaultVoiceChannelName)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(90)
        .setRequired(false),
    );
  }

  return new ModalBuilder()
    .setCustomId(CustomId.CREATE_MODAL)
    .setTitle('Criar clã')
    .addComponents(rows.map((input) => new ActionRowBuilder().addComponents(input)));
}

export function confirmationRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomId.CONFIRM_CREATE)
      .setLabel('Confirmar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CustomId.CANCEL_CREATE)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );
}

export function inviteRow(inviteId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId(CustomId.INVITE_ACCEPT, inviteId))
      .setLabel('Aceitar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildCustomId(CustomId.INVITE_DECLINE, inviteId))
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Danger),
  );
}

export function dangerConfirmRow(customId, label = 'Confirmar exclusão') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(CustomId.CANCEL_CREATE)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );
}
