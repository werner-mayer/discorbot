import DiscordGuildService from './DiscordGuildService.js';
import GuildPermissionService from './GuildPermissionService.js';
import AuditLogService from './AuditLogService.js';
import GuildService from './GuildService.js';
import GuildMemberService from './GuildMemberService.js';
import GuildInviteService from './GuildInviteService.js';
import guildDraftStore from './GuildDraftStore.js';

/**
 * Container simples de dependencias: instancia cada service uma vez e injeta
 * as dependencias entre eles. Trocar uma implementacao (ex.: outro banco,
 * outra estrategia de permissao) e mexer so aqui.
 */
const discordGuildService = new DiscordGuildService();
const permissionService = new GuildPermissionService();
const auditLogService = new AuditLogService();

const guildService = new GuildService({ discordGuildService, auditLogService });
const memberService = new GuildMemberService({ discordGuildService, guildService, auditLogService });
const inviteService = new GuildInviteService({ discordGuildService, memberService, auditLogService });

export const services = {
  discordGuildService,
  permissionService,
  auditLogService,
  guildService,
  memberService,
  inviteService,
  guildDraftStore,
};

export default services;
