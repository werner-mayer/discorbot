import GuildJoinRequestRepository from '../repositories/GuildJoinRequestRepository.js';
import GuildMemberRepository from '../repositories/GuildMemberRepository.js';
import GuildRepository from '../repositories/GuildRepository.js';
import GuildMemberService from './GuildMemberService.js';
import DiscordGuildService from './DiscordGuildService.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { JoinPolicy } from '../models/JoinPolicy.js';
import { JoinRequestStatus } from '../models/JoinRequestStatus.js';
import { ConflictError, NotFoundError, PermissionError, ValidationError } from '../utils/errors.js';
import { truncate } from '../utils/text.js';

/**
 * Entrada por iniciativa do usuario: `/cla join`.
 * - OPEN: entra na hora.
 * - APPROVAL: cria um pedido para a lideranca decidir.
 * - INVITE_ONLY: recusa e explica.
 */
export class GuildJoinRequestService {
  constructor({
    joinRequestRepository = new GuildJoinRequestRepository(),
    memberRepository = new GuildMemberRepository(),
    guildRepository = new GuildRepository(),
    memberService = new GuildMemberService(),
    discordGuildService = new DiscordGuildService(),
    auditLogService = new AuditLogService(),
  } = {}) {
    this.requests = joinRequestRepository;
    this.members = memberRepository;
    this.guilds = guildRepository;
    this.memberService = memberService;
    this.discord = discordGuildService;
    this.audit = auditLogService;
  }

  async #assertElegivel(discordGuild, guildRecord, userId) {
    const existing = await this.members.findByUser(discordGuild.id, userId);
    if (existing) {
      throw new ConflictError(
        existing.guildId === guildRecord.id
          ? `Você já faz parte de **${guildRecord.name}**.`
          : `Você já faz parte do clã **${existing.guild.name}**. Use \`/cla leave\` antes de entrar em outro.`,
      );
    }
  }

  /**
   * @returns {{ tipo: 'JOINED'|'REQUESTED', guild: object, request?: object }}
   */
  async requestJoin(discordGuild, guildRecord, userId, message = null) {
    await this.#assertElegivel(discordGuild, guildRecord, userId);

    if (guildRecord.joinPolicy === JoinPolicy.INVITE_ONLY) {
      throw new PermissionError(
        `**${guildRecord.name}** só aceita entrada por convite. Fale com <@${guildRecord.ownerId}>.`,
      );
    }

    if (guildRecord.joinPolicy === JoinPolicy.OPEN) {
      const { guild } = await this.memberService.addMember(discordGuild, guildRecord, userId, {
        actorId: userId,
      });
      await this.requests.cancelOthers(userId);
      return { tipo: 'JOINED', guild };
    }

    const pending = await this.requests.findPending(guildRecord.id, userId);
    if (pending) {
      throw new ConflictError(`Você já tem um pedido pendente para **${guildRecord.name}**.`);
    }

    const request = await this.requests.create({
      guildId: guildRecord.id,
      discordGuildId: discordGuild.id,
      discordUserId: userId,
      message: message ? truncate(String(message).trim(), 300) : null,
    });

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.JOIN_REQUESTED,
      actorId: userId,
      targetId: userId,
    });

    return { tipo: 'REQUESTED', guild: guildRecord, request };
  }

  listPending(guildId) {
    return this.requests.listPending(guildId);
  }

  countPending(guildId) {
    return this.requests.countPending(guildId);
  }

  async loadPending(requestId) {
    const request = await this.requests.findById(requestId);
    if (!request) throw new NotFoundError('Pedido não encontrado.');
    if (request.status !== JoinRequestStatus.PENDING) {
      throw new ConflictError('Esse pedido já foi respondido.');
    }
    if (!request.guild) throw new NotFoundError('Esse clã não existe mais.');
    return request;
  }

  async approve(discordGuild, requestId, actorId) {
    const request = await this.loadPending(requestId);

    const { guild } = await this.memberService.addMember(
      discordGuild,
      request.guild,
      request.discordUserId,
      { actorId },
    );

    await this.requests.respond(request.id, JoinRequestStatus.APPROVED, actorId);
    await this.requests.cancelOthers(request.discordUserId, request.id);

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guild.id,
      action: AuditAction.JOIN_APPROVED,
      actorId,
      targetId: request.discordUserId,
    });

    return { guild, request };
  }

  async reject(discordGuild, requestId, actorId) {
    const request = await this.loadPending(requestId);
    await this.requests.respond(request.id, JoinRequestStatus.REJECTED, actorId);

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: request.guildId,
      action: AuditAction.JOIN_REJECTED,
      actorId,
      targetId: request.discordUserId,
    });

    return request;
  }

  /** Resolve o cla pela TAG ou pelo nome digitado no comando. */
  async resolveGuild(discordGuildId, term) {
    const query = String(term ?? '').trim();
    if (!query) throw new ValidationError('Informe o nome ou a TAG do clã.');

    const [match] = await this.guilds.search(discordGuildId, query, 5);
    if (!match) throw new NotFoundError(`Nenhum clã encontrado para \`${query}\`.`);
    return match;
  }
}

export default GuildJoinRequestService;
