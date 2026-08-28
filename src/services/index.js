import DiscordGuildService from './DiscordGuildService.js';
import GuildPermissionService from './GuildPermissionService.js';
import AuditLogService from './AuditLogService.js';
import GuildService from './GuildService.js';
import GuildSettingsService from './GuildSettingsService.js';
import GuildMemberService from './GuildMemberService.js';
import GuildInviteService from './GuildInviteService.js';
import GuildJoinRequestService from './GuildJoinRequestService.js';
import GuildRankingService from './GuildRankingService.js';
import GuildWarService from './GuildWarService.js';
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
const settingsService = new GuildSettingsService({ discordGuildService, auditLogService });
const memberService = new GuildMemberService({
  discordGuildService,
  guildService,
  settingsService,
  auditLogService,
});
const inviteService = new GuildInviteService({ discordGuildService, memberService, auditLogService });
const joinRequestService = new GuildJoinRequestService({
  discordGuildService,
  memberService,
  auditLogService,
});
const rankingService = new GuildRankingService({ auditLogService });
const warService = new GuildWarService({ rankingService, auditLogService });

export const services = {
  discordGuildService,
  permissionService,
  auditLogService,
  guildService,
  settingsService,
  memberService,
  inviteService,
  joinRequestService,
  rankingService,
  warService,
  guildDraftStore,
};

export default services;
