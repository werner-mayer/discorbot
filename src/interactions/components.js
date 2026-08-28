import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import config from '../config/index.js';
import { CustomId, buildCustomId } from '../models/customIds.js';
import { JoinPolicy, JOIN_POLICY_LABEL, JOIN_POLICY_DESCRIPTION } from '../models/JoinPolicy.js';

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


/**
 * Modal de edicao do cla. Campos em branco limpam descricao, limite,
 * boas-vindas e icone; nome/TAG/cor ficam no /cla edit-identidade do modal
 * de criacao para nao estourar o limite de 5 campos por modal.
 */
export function editGuildModal(guildRecord) {
  const campos = [
    new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Descrição do clã')
      .setPlaceholder('Aparece no /cla info e no ranking')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(config.guild.maxDescriptionLength)
      .setValue(guildRecord.description ?? '')
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('welcomeMessage')
      .setLabel('Boas-vindas ({user}, {cla}, {tag})')
      .setPlaceholder('Bem-vindo ao {cla}, {user}!')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(500)
      .setValue(guildRecord.welcomeMessage ?? '')
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('iconUrl')
      .setLabel('Ícone (link https direto da imagem)')
      .setPlaceholder('https://exemplo.com/logo.png')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(400)
      .setValue(guildRecord.iconUrl ?? '')
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('memberLimit')
      .setLabel('Limite de membros (vazio = sem limite)')
      .setPlaceholder('20')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(4)
      .setValue(guildRecord.memberLimit ? String(guildRecord.memberLimit) : '')
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('color')
      .setLabel('Cor (vazio = manter a atual)')
      .setPlaceholder(guildRecord.color)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(20)
      .setRequired(false),
  ];

  return new ModalBuilder()
    .setCustomId(CustomId.EDIT_MODAL)
    .setTitle(`Editar ${guildRecord.name}`.slice(0, 45))
    .addComponents(campos.map((campo) => new ActionRowBuilder().addComponents(campo)));
}

export function joinPolicyRow(guildRecord) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(CustomId.SETTINGS_SELECT)
    .setPlaceholder('Quem pode entrar no clã?')
    .addOptions(
      Object.values(JoinPolicy).map((policy) => ({
        label: JOIN_POLICY_LABEL[policy],
        description: JOIN_POLICY_DESCRIPTION[policy].slice(0, 100),
        value: policy,
        default: policy === guildRecord.joinPolicy,
      })),
    );
  return new ActionRowBuilder().addComponents(menu);
}

export function joinRequestRow(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId(CustomId.JOIN_APPROVE, requestId))
      .setLabel('Aprovar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildCustomId(CustomId.JOIN_REJECT, requestId))
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Danger),
  );
}

export function warChallengeRow(warId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId(CustomId.WAR_ACCEPT, warId))
      .setLabel('Aceitar guerra')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(buildCustomId(CustomId.WAR_DECLINE, warId))
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Secondary),
  );
}
