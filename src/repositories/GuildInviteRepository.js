import prisma from '../database/prisma.js';
import { InviteStatus } from '../models/InviteStatus.js';

export class GuildInviteRepository {
  constructor(client = prisma) {
    this.db = client;
  }

  create(data) {
    return this.db.guildInvite.create({ data });
  }

  findById(id) {
    return this.db.guildInvite.findUnique({ where: { id }, include: { guild: true } });
  }

  findPending(guildId, inviteeId) {
    return this.db.guildInvite.findFirst({
      where: { guildId, inviteeId, status: InviteStatus.PENDING },
    });
  }

  updateStatus(id, status) {
    return this.db.guildInvite.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });
  }

  expirePendingFor(inviteeId) {
    return this.db.guildInvite.updateMany({
      where: { inviteeId, status: InviteStatus.PENDING },
      data: { status: InviteStatus.EXPIRED, respondedAt: new Date() },
    });
  }
}

export default GuildInviteRepository;
