import config from '../config/index.js';
import GuildInviteRepository from '../repositories/GuildInviteRepository.js';
import GuildMemberRepository from '../repositories/GuildMemberRepository.js';
import GuildMemberService from './GuildMemberService.js';
import DiscordGuildService from './DiscordGuildService.js';
import AuditLogService from './AuditLogService.js';
import { AuditAction } from '../models/AuditAction.js';
import { InviteStatus } from '../models/InviteStatus.js';
import { ConflictError, NotFoundError, PermissionError, ValidationError } from '../utils/errors.js';

/** Ciclo de vida dos convites (criar, aceitar, recusar, expirar). */
export class GuildInviteService {
  constructor({
    inviteRepository = new GuildInviteRepository(),
    memberRepository = new GuildMemberRepository(),
    memberService = new GuildMemberService(),
    discordGuildService = new DiscordGuildService(),
    auditLogService = new AuditLogService(),
    configuration = config,
  } = {}) {
    this.invites = inviteRepository;
    this.members = memberRepository;
    this.memberService = memberService;
    this.discord = discordGuildService;
    this.audit = auditLogService;
    this.config = configuration;
  }

  async createInvite(discordGuild, guildRecord, inviterId, inviteeId) {
    if (inviterId === inviteeId) throw new ValidationError('Você não pode convidar a si mesmo.');

    const invitee = await this.discord.fetchMember(discordGuild, inviteeId);
    if (!invitee) throw new NotFoundError('Usuário não encontrado neste servidor.');
    if (invitee.user.bot) throw new ValidationError('Bots não podem entrar em guildas.');

    const existingMembership = await this.members.findByUser(discordGuild.id, inviteeId);
    if (existingMembership) {
      throw new ConflictError(
        existingMembership.guildId === guildRecord.id
          ? `${invitee.user.username} já faz parte da sua guilda.`
          : `${invitee.user.username} já faz parte da guilda **${existingMembership.guild.name}**.`,
      );
    }

    const pending = await this.invites.findPending(guildRecord.id, inviteeId);
    if (pending) {
      if (pending.expiresAt > new Date()) {
        throw new ConflictError(`${invitee.user.username} já possui um convite pendente para esta guilda.`);
      }
      await this.invites.updateStatus(pending.id, InviteStatus.EXPIRED);
    }

    const expiresAt = new Date(Date.now() + this.config.guild.inviteExpirationMinutes * 60_000);
    const invite = await this.invites.create({
      guildId: guildRecord.id,
      discordGuildId: discordGuild.id,
      inviterId,
      inviteeId,
      expiresAt,
    });

    await this.audit.record({
      discordGuildId: discordGuild.id,
      guildId: guildRecord.id,
      action: AuditAction.MEMBER_INVITED,
      actorId: inviterId,
      targetId: inviteeId,
    });

    return { invite, invitee };
  }

  /** Carrega um convite validando dono, status e expiracao. */
  async loadPendingInvite(inviteId, userId) {
    const invite = await this.invites.findById(inviteId);
    if (!invite) throw new NotFoundError('Convite não encontrado.');
    if (invite.inviteeId !== userId) throw new PermissionError('Este convite não é para você.');

    if (invite.status !== InviteStatus.PENDING) {
      throw new ConflictError('Este convite já foi respondido.');
    }
    if (invite.expiresAt <= new Date()) {
      await this.invites.updateStatus(invite.id, InviteStatus.EXPIRED);
      throw new ConflictError('Este convite expirou.');
    }
    if (!invite.guild) throw new NotFoundError('Essa guilda não existe mais.');

    return invite;
  }

  async accept(discordGuild, inviteId, userId) {
    const invite = await this.loadPendingInvite(inviteId, userId);
    const result = await this.memberService.addMember(discordGuild, invite.guild, userId, {
      actorId: invite.inviterId,
    });
    await this.invites.updateStatus(invite.id, InviteStatus.ACCEPTED);
    // Demais convites pendentes perdem o sentido: 1 guilda por usuario.
    await this.invites.expirePendingFor(userId);
    return result;
  }

  async decline(inviteId, userId) {
    const invite = await this.loadPendingInvite(inviteId, userId);
    await this.invites.updateStatus(invite.id, InviteStatus.DECLINED);
    return invite;
  }
}

export default GuildInviteService;
