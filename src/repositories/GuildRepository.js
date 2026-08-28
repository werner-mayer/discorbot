import prisma from '../database/prisma.js';

/**
 * Unico ponto do sistema que fala com a tabela Guild.
 * Trocar de banco (SQLite -> Postgres) ou de ORM nao afeta os services.
 */
export class GuildRepository {
  constructor(client = prisma) {
    this.db = client;
  }

  create(data) {
    return this.db.guild.create({ data });
  }

  findById(id) {
    return this.db.guild.findUnique({ where: { id } });
  }

  findByIdWithMembers(id) {
    return this.db.guild.findUnique({ where: { id }, include: { members: true } });
  }

  findByNormalizedName(discordGuildId, nameNormalized) {
    return this.db.guild.findUnique({
      where: { discordGuildId_nameNormalized: { discordGuildId, nameNormalized } },
    });
  }

  findByNormalizedTag(discordGuildId, tagNormalized) {
    return this.db.guild.findUnique({
      where: { discordGuildId_tagNormalized: { discordGuildId, tagNormalized } },
    });
  }

  findByRoleId(discordGuildId, roleId) {
    return this.db.guild.findFirst({ where: { discordGuildId, roleId } });
  }

  listByServer(discordGuildId) {
    return this.db.guild.findMany({
      where: { discordGuildId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { members: true } } },
    });
  }

  update(id, data) {
    return this.db.guild.update({ where: { id }, data });
  }

  delete(id) {
    return this.db.guild.delete({ where: { id } });
  }

  countMembers(guildId) {
    return this.db.guildMember.count({ where: { guildId } });
  }
}

export default GuildRepository;
