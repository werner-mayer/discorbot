import prisma from '../database/prisma.js';
import { JoinRequestStatus } from '../models/JoinRequestStatus.js';

export class GuildJoinRequestRepository {
  constructor(client = prisma) {
    this.db = client;
  }

  create(data) {
    return this.db.guildJoinRequest.create({ data });
  }

  findById(id) {
    return this.db.guildJoinRequest.findUnique({ where: { id }, include: { guild: true } });
  }

  findPending(guildId, discordUserId) {
    return this.db.guildJoinRequest.findFirst({
      where: { guildId, discordUserId, status: JoinRequestStatus.PENDING },
    });
  }

  listPending(guildId) {
    return this.db.guildJoinRequest.findMany({
      where: { guildId, status: JoinRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  countPending(guildId) {
    return this.db.guildJoinRequest.count({
      where: { guildId, status: JoinRequestStatus.PENDING },
    });
  }

  respond(id, status, respondedBy) {
    return this.db.guildJoinRequest.update({
      where: { id },
      data: { status, respondedBy, respondedAt: new Date() },
    });
  }

  /** Os demais pedidos do usuario perdem o sentido quando ele entra em um cla. */
  cancelOthers(discordUserId, exceptId = null) {
    return this.db.guildJoinRequest.updateMany({
      where: {
        discordUserId,
        status: JoinRequestStatus.PENDING,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      data: { status: JoinRequestStatus.CANCELLED, respondedAt: new Date() },
    });
  }
}

export default GuildJoinRequestRepository;
