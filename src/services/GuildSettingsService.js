import config from '../config/index.js';
import GuildRepository from '../repositories/GuildRepository.js';
import DiscordGuildService from './DiscordGuildService.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { JoinPolicy, isValidJoinPolicy } from '../models/JoinPolicy.js';
import { isValidClanEmoji } from '../models/ClanEmojis.js';
import { ConflictError, ValidationError } from '../utils/errors.js';
import { normalize, truncate } from '../utils/text.js';
import { parseColor } from '../utils/color.js';
import { validateGuildName, validateGuildTag } from '../utils/validators.js';

const IMAGE_URL = /^https:\/\/[^\s]+\.(png|jpe?g|gif|webp)(\?[^\s]*)?$/i;

/**
 * Edicao do cla depois de criado: identidade (nome, TAG, cor), apresentacao
 * (descricao, icone, mensagem de boas-vindas), limite de membros e politica
 * de entrada. Mantem Discord e banco em sincronia.
 */
export class GuildSettingsService {
  constructor({
    guildRepository = new GuildRepository(),
    discordGuildService = new DiscordGuildService(),
    auditLogService = new AuditLogService(),
    configuration = config,
  } = {}) {
    this.guilds = guildRepository;
    this.discord = discordGuildService;
    this.audit = auditLogService;
    this.config = configuration;
  }

  validateDescription(input) {
    const value = String(input ?? '').trim();
    if (!value) return null;
    const max = this.config.guild.maxDescriptionLength;
    if (value.length > max) {
      throw new ValidationError(`A descrição deve ter no máximo ${max} caracteres.`);
    }
    return value;
  }

  validateIconUrl(input) {
    const value = String(input ?? '').trim();
    if (!value) return null;
    if (!IMAGE_URL.test(value)) {
      throw new ValidationError(
        'O ícone deve ser um link https direto para uma imagem (`.png`, `.jpg`, `.gif` ou `.webp`).',
      );
    }
    return value;
  }

  validateMemberLimit(input) {
    const raw = String(input ?? '').trim();
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      throw new ValidationError('O limite de membros deve ser um número inteiro maior que zero.');
    }
    const teto = this.config.guild.maxMembers;
    if (teto > 0 && value > teto) {
      throw new ValidationError(`O limite máximo permitido pelo servidor é ${teto} membros.`);
    }
    return value;
  }

  validateWelcomeMessage(input) {
    const value = String(input ?? '').trim();
    if (!value) return null;
    return truncate(value, 500);
  }

  /**
   * Aplica a edicao vinda do modal. Campos vazios limpam o valor;
   * nome, TAG e cor em branco mantem o que ja existia.
   */
  async updateProfile(discordGuild, guildRecord, input, { actorId, memberCount = 0 } = {}) {
    const patch = {};

    if (input.name?.trim()) {
      const name = validateGuildName(input.name);
      const nameNormalized = normalize(name);
      if (nameNormalized !== guildRecord.nameNormalized) {
        const existing = await this.guilds.findByNormalizedName(discordGuild.id, nameNormalized);
        if (existing && existing.id !== guildRecord.id) {
          throw new ConflictError(`Já existe um clã chamado **${name}** neste servidor.`);
        }
        patch.name = name;
        patch.nameNormalized = nameNormalized;
      }
    }

    if (input.tag?.trim()) {
      const tag = validateGuildTag(input.tag);
      const tagNormalized = normalize(tag);
      if (tagNormalized !== guildRecord.tagNormalized) {
        const existing = await this.guilds.findByNormalizedTag(discordGuild.id, tagNormalized);
        if (existing && existing.id !== guildRecord.id) {
          throw new ConflictError(`A TAG **[${tag}]** já está em uso pelo clã **${existing.name}**.`);
        }
        patch.tag = tag;
        patch.tagNormalized = tagNormalized;
      }
    }

    if (input.color?.trim()) {
      const color = parseColor(input.color);
      if (color !== guildRecord.color) patch.color = color;
    }

    if (input.description !== undefined) patch.description = this.validateDescription(input.description);
    if (input.iconUrl !== undefined) patch.iconUrl = this.validateIconUrl(input.iconUrl);
    if (input.welcomeMessage !== undefined) {
      patch.welcomeMessage = this.validateWelcomeMessage(input.welcomeMessage);
    }

    if (input.memberLimit !== undefined) {
      const limit = this.validateMemberLimit(input.memberLimit);
      if (limit !== null && limit < memberCount) {
        throw new ValidationError(
          `O clã já tem ${memberCount} membros; o limite não pode ser menor que isso.`,
        );
      }
      patch.memberLimit = limit;
    }

    if (!Object.keys(patch).length) return { guild: guildRecord, changed: [] };

    const updated = await this.guilds.update(guildRecord.id, patch);

    // Nome, TAG ou cor mudaram: o cargo e a categoria acompanham.
    if (patch.name || patch.tag || patch.color) {
      await this.discord.renameStructure(discordGuild, updated, {
        name: updated.name,
        tag: updated.tag,
        color: updated.color,
      });
    }

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.SETTINGS_UPDATED,
      actorId,
      metadata: { campos: Object.keys(patch) },
    });

    return { guild: updated, changed: Object.keys(patch) };
  }

  /** Troca o emoji e propaga para cargo, categoria e canais. */
  async setEmoji(discordGuild, guildRecord, emoji, { actorId } = {}) {
    if (!isValidClanEmoji(emoji)) {
      throw new ValidationError('Emoji inválido. Escolha um da lista.');
    }
    if (emoji === guildRecord.emoji) return guildRecord;

    const updated = await this.guilds.update(guildRecord.id, { emoji });
    await this.discord.renameStructure(discordGuild, guildRecord, {
      name: updated.name,
      tag: updated.tag,
      color: updated.color,
      emoji,
    });

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.SETTINGS_UPDATED,
      actorId,
      metadata: { emoji: { de: guildRecord.emoji, para: emoji } },
    });
    return updated;
  }

  async setJoinPolicy(discordGuild, guildRecord, policy, { actorId } = {}) {
    if (!isValidJoinPolicy(policy)) {
      throw new ValidationError('Política de entrada inválida.');
    }
    if (policy === guildRecord.joinPolicy) return guildRecord;

    const updated = await this.guilds.update(guildRecord.id, { joinPolicy: policy });
    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.SETTINGS_UPDATED,
      actorId,
      metadata: { joinPolicy: { de: guildRecord.joinPolicy, para: policy } },
    });
    return updated;
  }

  /** Mensagem de boas-vindas com os placeholders resolvidos. */
  renderWelcome(guildRecord, userId) {
    const template = guildRecord.welcomeMessage ?? `Bem-vindo ao clã, {user}!`;
    return template
      .replaceAll('{user}', `<@${userId}>`)
      .replaceAll('{cla}', guildRecord.name)
      .replaceAll('{clã}', guildRecord.name)
      .replaceAll('{tag}', guildRecord.tag);
  }

  defaultPolicy() {
    return JoinPolicy.INVITE_ONLY;
  }
}

export default GuildSettingsService;
