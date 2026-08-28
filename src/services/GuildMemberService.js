import config from '../config/index.js';
import GuildRepository from '../repositories/GuildRepository.js';
import GuildMemberRepository from '../repositories/GuildMemberRepository.js';
import DiscordGuildService from './DiscordGuildService.js';
import GuildService from './GuildService.js';
import GuildSettingsService from './GuildSettingsService.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { GuildMemberRole } from '../models/GuildMemberRole.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GuildMemberService');

/** Entrada, saida e administracao de membros de um clã. */
export class GuildMemberService {
  constructor({
    guildRepository = new GuildRepository(),
    memberRepository = new GuildMemberRepository(),
    discordGuildService = new DiscordGuildService(),
    guildService = new GuildService(),
    settingsService = new GuildSettingsService(),
    auditLogService = new AuditLogService(),
    configuration = config,
  } = {}) {
    this.guilds = guildRepository;
    this.members = memberRepository;
    this.discord = discordGuildService;
    this.guildService = guildService;
    this.settings = settingsService;
    this.audit = auditLogService;
    this.config = configuration;
  }

  async assertCanJoin(discordGuild, guildRecord, userId) {
    const existing = await this.members.findByUser(discordGuild.id, userId);
    if (existing) {
      const sameGuild = existing.guildId === guildRecord.id;
      throw new ConflictError(
        sameGuild
          ? `Você já faz parte do clã **${guildRecord.name}**.`
          : `Você já faz parte do clã **${existing.guild.name}**. Use \`/cla leave\` antes de entrar em outra.`,
      );
    }

    const limit = guildRecord.memberLimit ?? this.config.guild.maxMembers;
    if (limit && limit > 0) {
      const total = await this.guilds.countMembers(guildRecord.id);
      if (total >= limit) {
        throw new ConflictError(`O clã **${guildRecord.name}** atingiu o limite de ${limit} membros.`);
      }
    }
  }

  /** Adiciona o usuario o clã: banco + cargo + acesso aos canais. */
  async addMember(discordGuild, guildRecord, userId, { role = GuildMemberRole.MEMBER, actorId = null } = {}) {
    await this.assertCanJoin(discordGuild, guildRecord, userId);

    const discordMember = await this.discord.fetchMember(discordGuild, userId);
    if (!discordMember) throw new NotFoundError('Usuário não encontrado neste servidor.');
    if (discordMember.user.bot) throw new ValidationError('Bots não podem entrar em clãs.');

    // Garante que cargo/canais ainda existem antes de conceder acesso.
    const { guild } = await this.guildService.repairGuild(discordGuild, guildRecord, {
      actorId,
      reassignRoles: false,
    });

    const membership = await this.members.create({
      guildId: guild.id,
      discordGuildId: discordGuild.id,
      discordUserId: userId,
      role,
    });

    await this.discord.assignRole(discordGuild, userId, guild.roleId, `Entrou no clã ${guild.name}`);
    await this.discord.applyTagToNickname(discordGuild, userId, guild.tag);

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guild.id,
      action: AuditAction.MEMBER_JOINED,
      actorId: actorId ?? userId,
      targetId: userId,
    });

    await this.#anunciarEntrada(discordGuild, guild, userId);

    logger.info(`${userId} entrou no clã ${guild.name}`);
    return { guild, membership };
  }

  /** Remove o usuario do clã: banco + cargo (perde acesso automaticamente). */
  async removeMember(discordGuild, guildRecord, userId, { actorId = null, action = AuditAction.MEMBER_LEFT } = {}) {
    const membership = await this.members.findInGuild(guildRecord.id, userId);
    if (!membership) throw new NotFoundError('Esse usuário não faz parte deste clã.');

    if (membership.role === GuildMemberRole.OWNER) {
      const total = await this.guilds.countMembers(guildRecord.id);
      throw new ConflictError(
        total > 1
          ? 'O líder não pode sair do clã. Transfira a liderança ou exclua o clã com `/cla delete`.'
          : 'Você é o líder e único membro. Use `/cla delete` para encerrar o clã.',
      );
    }

    await this.members.delete(membership.id);
    await this.discord.removeRole(discordGuild, userId, guildRecord.roleId, `Saiu do clã ${guildRecord.name}`);
    await this.discord.clearTagFromNickname(discordGuild, userId, guildRecord.tag);

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action,
      actorId: actorId ?? userId,
      targetId: userId,
    });

    logger.info(`${userId} saiu do clã ${guildRecord.name} (${action})`);
    return membership;
  }

  listMembers(guildId) {
    return this.members.listByGuild(guildId);
  }

  /**
   * Muda o cargo interno de um membro (OWNER/OFFICER/MEMBER).
   * Base para transferencia de lideranca e sub-lideres.
   */
  async changeMemberRole(discordGuild, guildRecord, userId, newRole, { actorId = null } = {}) {
    const membership = await this.members.findInGuild(guildRecord.id, userId);
    if (!membership) throw new NotFoundError('Esse usuário não faz parte deste clã.');

    const updated = await this.members.updateRole(membership.id, newRole);

    await this.guildService.repairGuild(discordGuild, guildRecord, { actorId, reassignRoles: false });
    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      actorId: actorId ?? userId,
      targetId: userId,
      metadata: { from: membership.role, to: newRole },
    });

    return updated;
  }

  /** Boas-vindas no canal do cla. Falhar aqui nunca derruba a entrada. */
  async #anunciarEntrada(discordGuild, guildRecord, userId) {
    try {
      const canal = await this.discord.fetchChannel(discordGuild, guildRecord.textChannelId);
      if (!canal?.isTextBased?.()) return;
      await canal.send({ content: this.settings.renderWelcome(guildRecord, userId) });
    } catch (error) {
      logger.warn('Não consegui postar a mensagem de boas-vindas', error?.message);
    }
  }

  /** Promove a oficial: passa a poder convidar e remover membros. */
  async promote(discordGuild, guildRecord, userId, { actorId } = {}) {
    const membership = await this.members.findInGuild(guildRecord.id, userId);
    if (!membership) throw new NotFoundError('Esse usuário não faz parte deste clã.');
    if (membership.role === GuildMemberRole.OWNER) {
      throw new ConflictError('O líder já tem o cargo máximo do clã.');
    }
    if (membership.role === GuildMemberRole.OFFICER) {
      throw new ConflictError(`<@${userId}> já é oficial.`);
    }
    return this.changeMemberRole(discordGuild, guildRecord, userId, GuildMemberRole.OFFICER, { actorId });
  }

  /** Rebaixa um oficial de volta a membro comum. */
  async demote(discordGuild, guildRecord, userId, { actorId } = {}) {
    const membership = await this.members.findInGuild(guildRecord.id, userId);
    if (!membership) throw new NotFoundError('Esse usuário não faz parte deste clã.');
    if (membership.role === GuildMemberRole.OWNER) {
      throw new ConflictError('O líder não pode ser rebaixado. Use `/cla transfer` para passar a liderança.');
    }
    if (membership.role === GuildMemberRole.MEMBER) {
      throw new ConflictError(`<@${userId}> já é membro comum.`);
    }
    return this.changeMemberRole(discordGuild, guildRecord, userId, GuildMemberRole.MEMBER, { actorId });
  }

  /** Transfere a lideranca; o lider anterior vira oficial. */
  async transferOwnership(discordGuild, guildRecord, newOwnerId, { actorId = null } = {}) {
    const target = await this.members.findInGuild(guildRecord.id, newOwnerId);
    if (!target) throw new NotFoundError('O novo líder precisa ser membro do clã.');
    if (guildRecord.ownerId === newOwnerId) throw new ConflictError('Esse usuário já é o líder do clã.');

    await this.changeMemberRole(discordGuild, guildRecord, guildRecord.ownerId, GuildMemberRole.OFFICER, { actorId });
    await this.changeMemberRole(discordGuild, guildRecord, newOwnerId, GuildMemberRole.OWNER, { actorId });
    const updated = await this.guilds.update(guildRecord.id, { ownerId: newOwnerId });

    await this.guildService.repairGuild(discordGuild, updated, { actorId, reassignRoles: false });
    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.OWNERSHIP_TRANSFERRED,
      actorId: actorId ?? guildRecord.ownerId,
      targetId: newOwnerId,
    });

    return updated;
  }
}

export default GuildMemberService;
