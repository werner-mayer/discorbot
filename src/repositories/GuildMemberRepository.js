import prisma from '../database/prisma.js';

export class GuildMemberRepository {
  constructor(client = prisma) {
    this.db = client;
  }

  create(data) {
    return this.db.guildMember.create({ data });
  }

  /** Membro do usuario dentro do servidor (regra: 1 guilda por usuario). */
  findByUser(discordGuildId, discordUserId) {
    return this.db.guildMember.findUnique({
      where: { discordGuildId_discordUserId: { discordGuildId, discordUserId } },
      include: { guild: true },
    });
  }

  findInGuild(guildId, discordUserId) {
    return this.db.guildMember.findUnique({
      where: { guildId_discordUserId: { guildId, discordUserId } },
    });
  }

  listByGuild(guildId) {
    return this.db.guildMember.findMany({
      where: { guildId },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  updateRole(id, role) {
    return this.db.guildMember.update({ where: { id }, data: { role } });
  }

  delete(id) {
    return this.db.guildMember.delete({ where: { id } });
  }

  deleteByUser(guildId, discordUserId) {
    return this.db.guildMember.deleteMany({ where: { guildId, discordUserId } });
  }
}

export default GuildMemberRepository;
