// Mock minimo da API do Discord usada pelo DiscordGuildService.
let seq = 1000;
const nextId = () => String(++seq);

class MockRole {
  constructor(guild, data) { Object.assign(this, data); this.id = nextId(); this.guild = guild; this.deleted = false; }
  async edit(data) { Object.assign(this, data); return this; }
  async delete() { this.deleted = true; this.guild.roles.store.delete(this.id); return this; }
}
class MockChannel {
  constructor(guild, data) {
    Object.assign(this, data);
    this.id = nextId();
    this.guild = guild;
    this.parentId = data.parent ?? null;
    this.overwrites = data.permissionOverwrites ?? [];
    this.children = { cache: new Map() };
    this.permissionOverwrites = {
      set: async (list) => { this.overwrites = list; return this; },
    };
  }
  async lockPermissions() { return this; }
  async setParent(id) { this.parentId = id; return this; }
  async setName(name) { this.name = name; return this; }
  async delete() { this.guild.channels.store.delete(this.id); return this; }
}
class MockMember {
  constructor(guild, id, { bot = false, admin = false } = {}) {
    this.id = id; this.guild = guild; this.user = { id, bot, username: `user${id}`, send: async () => true };
    this.nickname = null; this.manageable = true;
    this.roles = {
      cache: new Map(),
      add: async (role) => { this.roles.cache.set(role.id, role); },
      remove: async (role) => { this.roles.cache.delete(role.id); },
    };
    this.permissions = { has: () => admin };
  }
  async setNickname(n) { this.nickname = n; return this; }
}

export function createMockGuild(id = '9999') {
  const guild = { id, name: 'Servidor de Teste' };
  guild.client = { user: { id: 'bot-1' } };
  const everyone = { id: 'everyone-role' };

  guild.roles = {
    store: new Map(),
    everyone,
    cache: new Map(),
    create: async (data) => { const r = new MockRole(guild, data); guild.roles.store.set(r.id, r); return r; },
    fetch: async (rid) => guild.roles.store.get(rid) ?? Promise.reject(new Error('unknown role')),
  };
  guild.channels = {
    store: new Map(),
    create: async (data) => {
      const c = new MockChannel(guild, data);
      guild.channels.store.set(c.id, c);
      if (c.parentId) guild.channels.store.get(c.parentId)?.children.cache.set(c.id, c);
      return c;
    },
    fetch: async (cid) => guild.channels.store.get(cid) ?? Promise.reject(new Error('unknown channel')),
  };
  guild.members = {
    store: new Map(),
    me: new MockMember(guild, 'bot-1', { admin: true }),
    fetch: async (uid) => guild.members.store.get(uid) ?? Promise.reject(new Error('unknown member')),
  };
  guild.members.me.permissions = { has: () => true };
  guild.addUser = (uid, opts) => { const m = new MockMember(guild, uid, opts); guild.members.store.set(uid, m); return m; };
  return guild;
}
