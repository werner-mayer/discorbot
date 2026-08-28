/**
 * Convencao de customId das interacoes:  guild:<acao>[:<arg>...]
 * O router (src/interactions/router.js) usa apenas o prefixo `guild:<acao>`
 * para escolher o handler, e entrega o resto como argumentos.
 */
export const NAMESPACE = 'guild';

export const CustomId = Object.freeze({
  CREATE_BUTTON: 'guild:create',
  CREATE_MODAL: 'guild:create-modal',
  CONFIRM_CREATE: 'guild:confirm',
  CANCEL_CREATE: 'guild:cancel',
  INVITE_ACCEPT: 'guild:invite-accept',
  INVITE_DECLINE: 'guild:invite-decline',
  LEAVE_CONFIRM: 'guild:leave-confirm',
  DELETE_CONFIRM: 'guild:delete-confirm',
});

export function buildCustomId(base, ...args) {
  return [base, ...args].join(':');
}

export function parseCustomId(customId) {
  const parts = customId.split(':');
  // guild:invite-accept:<id>  ->  base "guild:invite-accept", args ["<id>"]
  return {
    namespace: parts[0],
    base: parts.slice(0, 2).join(':'),
    args: parts.slice(2),
  };
}
