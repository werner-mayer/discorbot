import prisma from '../database/prisma.js';

export class GuildAuditLogRepository {
  constructor(client = prisma) {
    this.db = client;
  }

  create(data) {
    return this.db.guildAuditLog.create({ data });
  }

  listByServer(discordGuildId, take = 25) {
    return this.db.guildAuditLog.findMany({
      where: { discordGuildId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}

export default GuildAuditLogRepository;
