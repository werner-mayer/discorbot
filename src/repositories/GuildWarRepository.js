import prisma from '../database/prisma.js';
import { WarStatus } from '../models/WarStatus.js';

const WITH_CLANS = { challenger: true, opponent: true };

export class GuildWarRepository {
  constructor(client = prisma) {
    this.db = client;
  }

  create(data) {
    return this.db.guildWar.create({ data, include: WITH_CLANS });
  }

  findById(id) {
    return this.db.guildWar.findUnique({ where: { id }, include: WITH_CLANS });
  }

  /** Guerra pendente ou ativa envolvendo os dois clas, em qualquer ordem. */
  findBetween(aId, bId) {
    return this.db.guildWar.findFirst({
      where: {
        status: { in: [WarStatus.PENDING, WarStatus.ACTIVE] },
        OR: [
          { challengerId: aId, opponentId: bId },
          { challengerId: bId, opponentId: aId },
        ],
      },
      include: WITH_CLANS,
    });
  }

  listOpen(discordGuildId) {
    return this.db.guildWar.findMany({
      where: { discordGuildId, status: { in: [WarStatus.PENDING, WarStatus.ACTIVE] } },
      orderBy: { createdAt: 'desc' },
      include: WITH_CLANS,
    });
  }

  listByGuild(guildId, take = 10) {
    return this.db.guildWar.findMany({
      where: { OR: [{ challengerId: guildId }, { opponentId: guildId }] },
      orderBy: { createdAt: 'desc' },
      take,
      include: WITH_CLANS,
    });
  }

  update(id, data) {
    return this.db.guildWar.update({ where: { id }, data, include: WITH_CLANS });
  }
}

export default GuildWarRepository;
