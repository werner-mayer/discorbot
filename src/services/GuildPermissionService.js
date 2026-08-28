import { PermissionFlagsBits } from 'discord.js';
import config from '../config/index.js';
import { PermissionError } from '../utils/errors.js';
import { GuildMemberRole, ROLE_WEIGHT } from '../models/GuildMemberRole.js';

/**
 * Regras de "quem pode o que". Nenhum handler decide permissao sozinho:
 * todos perguntam aqui.
 */
export class GuildPermissionService {
  constructor({ configuration = config } = {}) {
    this.config = configuration;
  }

  /** Admin do servidor: permissao Administrator ou um dos ADMIN_ROLE_ID. */
  isServerAdmin(discordMember) {
    if (!discordMember) return false;
    if (discordMember.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (discordMember.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    return this.config.discord.adminRoleIds.some((roleId) => discordMember.roles.cache.has(roleId));
  }

  isOwner(guildRecord, userId) {
    return guildRecord?.ownerId === userId;
  }

  hasAtLeast(memberRecord, role) {
    if (!memberRecord) return false;
    return (ROLE_WEIGHT[memberRecord.role] ?? 0) >= (ROLE_WEIGHT[role] ?? 0);
  }

  canManageMembers(guildRecord, memberRecord, discordMember) {
    if (this.isServerAdmin(discordMember)) return true;
    if (this.isOwner(guildRecord, discordMember?.id)) return true;
    return this.hasAtLeast(memberRecord, GuildMemberRole.OFFICER);
  }

  canEditGuild(guildRecord, discordMember) {
    return this.isServerAdmin(discordMember) || this.isOwner(guildRecord, discordMember?.id);
  }

  canDeleteGuild(guildRecord, discordMember) {
    return this.canEditGuild(guildRecord, discordMember);
  }

  // --- versoes que lancam erro, para uso direto nos handlers ---------------

  assertServerAdmin(discordMember) {
    if (!this.isServerAdmin(discordMember)) {
      throw new PermissionError('Apenas administradores do servidor podem usar este comando.');
    }
  }

  assertCanManageMembers(guildRecord, memberRecord, discordMember) {
    if (!this.canManageMembers(guildRecord, memberRecord, discordMember)) {
      throw new PermissionError('Apenas o líder, oficiais ou administradores podem gerenciar membros.');
    }
  }

  assertCanEditGuild(guildRecord, discordMember) {
    if (!this.canEditGuild(guildRecord, discordMember)) {
      throw new PermissionError('Apenas o líder do clã ou um administrador pode fazer isso.');
    }
  }

  assertCanDeleteGuild(guildRecord, discordMember) {
    if (!this.canDeleteGuild(guildRecord, discordMember)) {
      throw new PermissionError('Apenas o líder do clã ou um administrador pode excluí-lo.');
    }
  }
}

export default GuildPermissionService;
