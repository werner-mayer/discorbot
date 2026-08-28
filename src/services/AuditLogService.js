import GuildAuditLogRepository from '../repositories/GuildAuditLogRepository.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AuditLogService');

/**
 * Registro de acoes administrativas. Ja grava desde o MVP para o painel de
 * logs futuro. Nunca deve derrubar a operacao principal.
 */
export class AuditLogService {
  constructor({ auditLogRepository = new GuildAuditLogRepository() } = {}) {
    this.auditLogs = auditLogRepository;
  }

  async record({ discordGuildId, guildId = null, action, actorId, targetId = null, metadata = null }) {
    try {
      await this.auditLogs.create({
        discordGuildId,
        guildId,
        action,
        actorId,
        targetId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (error) {
      logger.warn(`Falha ao registrar log ${action}`, error?.message);
    }
  }

  list(discordGuildId, take) {
    return this.auditLogs.listByServer(discordGuildId, take);
  }
}

export default AuditLogService;
